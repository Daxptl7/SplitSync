from collections import defaultdict
from decimal import Decimal
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from .models import Group, GroupMember, Expense, Settlement, PaymentLog
from .serializers import GroupSerializer, GroupMemberSerializer, ExpenseSerializer, SettlementSerializer
from apps.friends.models import FriendRequest
from django.contrib.auth.models import User
from django.db.models import Q

class GroupViewSet(viewsets.ModelViewSet):
    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Group.objects.filter(Q(created_by=user) | Q(members__user=user, members__status='accepted')).distinct().order_by('-created_at')

    def perform_create(self, serializer):
        group = serializer.save(created_by=self.request.user)
        GroupMember.objects.create(group=group, user=self.request.user, added_by=self.request.user, status='accepted')
        
        members = self.request.data.get('members', [])
        for friend_id in members:
            try:
                friend = User.objects.get(id=friend_id)
                is_friend = FriendRequest.objects.filter(status='accepted').filter(
                    Q(sender=self.request.user, receiver=friend) | Q(sender=friend, receiver=self.request.user)
                ).exists()
                if is_friend:
                    GroupMember.objects.create(group=group, user=friend, added_by=self.request.user, status='accepted')
            except User.DoesNotExist:
                pass

    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        group = self.get_object()
        friend_id = request.data.get('user_id')
        if not friend_id:
            return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            friend = User.objects.get(id=friend_id)
        except User.DoesNotExist:
            return Response({'error': 'Friend not found'}, status=status.HTTP_404_NOT_FOUND)
            
        if GroupMember.objects.filter(group=group, user=friend).exists():
            return Response({'error': 'User is already invited or a member'}, status=status.HTTP_400_BAD_REQUEST)
            
        member = GroupMember.objects.create(group=group, user=friend, added_by=self.request.user, status='accepted')
        
        # Auto-create a friendship if one doesn't already exist
        existing = FriendRequest.objects.filter(
            Q(sender=request.user, receiver=friend) | Q(sender=friend, receiver=request.user)
        ).first()
        if not existing:
            FriendRequest.objects.create(sender=request.user, receiver=friend, status='accepted')
        elif existing.status != 'accepted':
            existing.status = 'accepted'
            existing.save(update_fields=['status'])
        
        return Response(GroupMemberSerializer(member).data, status=status.HTTP_201_CREATED)

class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        groups = Group.objects.filter(Q(created_by=user) | Q(members__user=user, members__status='accepted')).distinct()
        return Expense.objects.filter(group__in=groups).order_by('-date', '-created_at')

    def perform_create(self, serializer):
        expense = serializer.save(created_by=self.request.user)
        # Recalculate settlements for this group after adding an expense
        _recalculate_settlements(expense.group)


def _recalculate_settlements(group):
    """
    Min-cash-flow algorithm: compute the minimum number of transfers
    needed to settle all expenses in a group.
    
    For each expense, the payer paid for everyone. In 'equal' split,
    each member owes (total / member_count) to the payer.
    """
    # Get all accepted members of the group
    member_ids = list(
        GroupMember.objects.filter(group=group, status='accepted')
        .values_list('user_id', flat=True)
    )
    
    if len(member_ids) < 2:
        return
    
    # Calculate net balance for each user across all expenses in this group
    # Positive balance = user is owed money, Negative = user owes money
    balances = defaultdict(Decimal)
    
    expenses = Expense.objects.filter(group=group)
    for expense in expenses:
        payer_id = expense.created_by_id
        if not payer_id:
            continue
        
        amount = expense.total_amount
        
        if expense.split_type == 'equal':
            share = amount / len(member_ids)
            # Payer paid the full amount
            balances[payer_id] += amount
            # Everyone (including payer) owes their share
            for mid in member_ids:
                balances[mid] -= share
        elif expense.split_type == 'payer_excluded':
            # Split among everyone except the payer
            others = [m for m in member_ids if m != payer_id]
            if others:
                share = amount / len(others)
                balances[payer_id] += amount
                for mid in others:
                    balances[mid] -= share
        else:
            # Default to equal split for other types
            share = amount / len(member_ids)
            balances[payer_id] += amount
            for mid in member_ids:
                balances[mid] -= share
    
    # Delete old pending settlements for this group and recreate
    Settlement.objects.filter(group=group, status='pending').delete()
    
    # Separate into creditors (positive balance) and debtors (negative balance)
    creditors = []  # (user_id, amount_owed_to_them)
    debtors = []    # (user_id, amount_they_owe)
    
    for uid, balance in balances.items():
        # Round to 2 decimal places to avoid floating point drift
        bal = round(balance, 2)
        if bal > 0:
            creditors.append([uid, bal])
        elif bal < 0:
            debtors.append([uid, -bal])
    
    # Sort both lists descending by amount for greedy matching
    creditors.sort(key=lambda x: x[1], reverse=True)
    debtors.sort(key=lambda x: x[1], reverse=True)
    
    # Greedy min-cash-flow: match largest debtor with largest creditor
    settlements_to_create = []
    i, j = 0, 0
    while i < len(debtors) and j < len(creditors):
        debtor_id, debt = debtors[i]
        creditor_id, credit = creditors[j]
        
        transfer = min(debt, credit)
        if transfer > Decimal('0.01'):
            settlements_to_create.append(
                Settlement(
                    group=group,
                    from_user_id=debtor_id,
                    to_user_id=creditor_id,
                    amount=transfer,
                    status='pending',
                    notes=f'Settlement for {group.name}',
                )
            )
        
        debtors[i][1] -= transfer
        creditors[j][1] -= transfer
        
        if debtors[i][1] < Decimal('0.01'):
            i += 1
        if creditors[j][1] < Decimal('0.01'):
            j += 1
    
    if settlements_to_create:
        Settlement.objects.bulk_create(settlements_to_create)


class SettlementViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SettlementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Settlement.objects.filter(
            Q(from_user=user) | Q(to_user=user)
        ).order_by('-created_at')

    @action(detail=False, methods=['post'])
    def create_manual(self, request):
        """Manually create a settlement record."""
        email = request.data.get('email')
        amount = request.data.get('amount')
        group_id = request.data.get('group_id')
        notes = request.data.get('notes', '')
        
        if not email or not amount or not group_id:
            return Response({'error': 'email, amount, and group_id are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from_user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'error': 'User not found with that email'}, status=status.HTTP_404_NOT_FOUND)
        
        if from_user == request.user:
            return Response({'error': 'Cannot create a settlement with yourself'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            group = Group.objects.get(id=group_id)
        except Group.DoesNotExist:
            return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)
        
        settlement = Settlement.objects.create(
            group=group,
            from_user=from_user,
            to_user=request.user,
            amount=amount,
            status='pending',
            notes=notes or f'Settlement for {group.name}',
        )
        
        serializer = self.get_serializer(settlement)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def mark_completed(self, request, pk=None):
        settlement = self.get_object()
        if settlement.status == 'completed':
            return Response({'error': 'Already completed'}, status=status.HTTP_400_BAD_REQUEST)
        
        settlement.status = 'completed'
        settlement.completed_at = timezone.now()
        settlement.save()
        
        serializer = self.get_serializer(settlement)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def create_order(self, request, pk=None):
        """Create a Razorpay order for this settlement."""
        import razorpay
        import os
        
        settlement = self.get_object()
        if settlement.status == 'completed':
            return Response({'error': 'Settlement already completed'}, status=status.HTTP_400_BAD_REQUEST)
        
        key_id = os.environ.get('RAZORPAY_KEY_ID', '')
        key_secret = os.environ.get('RAZORPAY_KEY_SECRET', '')
        
        if not key_id or not key_secret:
            return Response({'error': 'Razorpay not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.'}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        client = razorpay.Client(auth=(key_id, key_secret))
        
        # Amount in paise (smallest currency unit)
        amount_paise = int(settlement.amount * 100)
        
        try:
            order_data = {
                'amount': amount_paise,
                'currency': settlement.group.currency or 'INR',
                'notes': {
                    'settlement_id': str(settlement.id),
                    'group': settlement.group.name,
                    'from_user': settlement.from_user.email,
                    'to_user': settlement.to_user.email,
                }
            }
            razorpay_order = client.order.create(data=order_data)
        except Exception as e:
            return Response({'error': f'Failed to create Razorpay order: {str(e)}'}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Log the payment attempt
        PaymentLog.objects.create(
            settlement=settlement,
            razorpay_order_id=razorpay_order['id'],
            amount=settlement.amount,
            currency=settlement.group.currency or 'INR',
            status='created',
            paid_by=request.user,
        )
        
        return Response({
            'order_id': razorpay_order['id'],
            'amount': amount_paise,
            'currency': settlement.group.currency or 'INR',
            'key_id': key_id,
            'settlement_id': settlement.id,
        })

    @action(detail=True, methods=['post'])
    def verify_payment(self, request, pk=None):
        """Verify Razorpay payment and mark settlement as completed."""
        import razorpay
        import os
        
        settlement = self.get_object()
        
        razorpay_order_id = request.data.get('razorpay_order_id')
        razorpay_payment_id = request.data.get('razorpay_payment_id')
        razorpay_signature = request.data.get('razorpay_signature')
        
        if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature]):
            return Response({'error': 'Missing payment verification data'}, status=status.HTTP_400_BAD_REQUEST)
        
        key_id = os.environ.get('RAZORPAY_KEY_ID', '')
        key_secret = os.environ.get('RAZORPAY_KEY_SECRET', '')
        client = razorpay.Client(auth=(key_id, key_secret))
        
        # Verify signature
        try:
            client.utility.verify_payment_signature({
                'razorpay_order_id': razorpay_order_id,
                'razorpay_payment_id': razorpay_payment_id,
                'razorpay_signature': razorpay_signature,
            })
        except razorpay.errors.SignatureVerificationError:
            # Update payment log as failed
            PaymentLog.objects.filter(razorpay_order_id=razorpay_order_id).update(
                status='failed',
                razorpay_payment_id=razorpay_payment_id,
            )
            return Response({'error': 'Payment verification failed'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Update payment log as paid
        PaymentLog.objects.filter(razorpay_order_id=razorpay_order_id).update(
            status='paid',
            razorpay_payment_id=razorpay_payment_id,
            razorpay_signature=razorpay_signature,
        )
        
        # Mark settlement as completed
        settlement.status = 'completed'
        settlement.completed_at = timezone.now()
        settlement.save()
        
        serializer = self.get_serializer(settlement)
        return Response(serializer.data)
