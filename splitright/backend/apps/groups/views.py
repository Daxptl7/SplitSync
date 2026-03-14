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
        _recalculate_settlements(group)
        
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
        _recalculate_settlements(expense.group)

    def perform_update(self, serializer):
        expense = serializer.save()
        _recalculate_settlements(expense.group)

    def perform_destroy(self, instance):
        group = instance.group
        instance.delete()
        _recalculate_settlements(group)

    @action(detail=False, methods=['post'])
    def check_limit(self, request):
        from apps.accounts.models import UserProfile
        from datetime import date
        from django.db.models import Q
        
        user = request.user
        profile, _ = UserProfile.objects.get_or_create(user=user)
        
        if not profile.expenditure_limit:
            return Response({'limit_exceeded': False})
            
        group_id = request.data.get('group_id')
        try:
            amount = Decimal(str(request.data.get('amount', 0)))
        except (ValueError, TypeError):
            return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)
            
        split_type = request.data.get('split_type', 'equal')
        split_data = request.data.get('split_data', {})
        
        try:
            group = Group.objects.get(id=group_id)
        except Group.DoesNotExist:
            return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)
            
        def calculate_member_share(user_id, exp_amount, exp_split_type, exp_payer_id, exp_group, exp_split_data=None):
            if exp_split_type == 'percentage' and exp_split_data:
                try:
                    pct_val = exp_split_data.get(str(user_id), 0)
                    if not pct_val: pct_val = 0
                    pct = Decimal(str(pct_val))
                    return round((exp_amount * pct) / Decimal('100'), 2)
                except Exception:
                    return Decimal('0')
            
            total_members = GroupMember.objects.filter(group=exp_group, status='accepted').count()
            if total_members == 0: total_members = 1
            
            if exp_split_type == 'payer_excluded':
                if user_id == exp_payer_id:
                    return Decimal('0')
                return exp_amount / Decimal(str(max(1, total_members - 1)))
            return exp_amount / Decimal(str(max(1, total_members)))
            
        new_expense_share = calculate_member_share(user.id, amount, split_type, user.id, group, split_data)
        
        # Calculate existing share this month
        today = date.today()
        user_groups = Group.objects.filter(
            Q(created_by=user) | Q(members__user=user, members__status='accepted')
        ).distinct()
        
        this_month_expenses = Expense.objects.filter(
            group__in=user_groups,
            date__year=today.year,
            date__month=today.month,
        )
        
        current_spent = Decimal('0')
        for exp in this_month_expenses:
            current_spent += calculate_member_share(user.id, exp.total_amount, exp.split_type, exp.created_by_id, exp.group, exp.split_data)
            
        if (current_spent + new_expense_share) > profile.expenditure_limit:
            return Response({
                'limit_exceeded': True,
                'current_spent': float(current_spent),
                'new_share': float(new_expense_share),
                'limit': float(profile.expenditure_limit)
            })
            
        return Response({
            'limit_exceeded': False
        })
        
    @action(detail=False, methods=['get'])
    def limit_status(self, request):
        from apps.accounts.models import UserProfile
        from datetime import date
        from django.db.models import Q
        
        user = request.user
        profile, _ = UserProfile.objects.get_or_create(user=user)
        
        if not profile.expenditure_limit:
            return Response({'limit_exceeded': False})
            
        def calculate_member_share(user_id, exp_amount, exp_split_type, exp_payer_id, exp_group, exp_split_data=None):
            if exp_split_type == 'percentage' and exp_split_data:
                try:
                    pct_val = exp_split_data.get(str(user_id), 0)
                    if not pct_val: pct_val = 0
                    pct = Decimal(str(pct_val))
                    return round((exp_amount * pct) / Decimal('100'), 2)
                except Exception:
                    return Decimal('0')
            
            total_members = GroupMember.objects.filter(group=exp_group, status='accepted').count()
            if total_members == 0: total_members = 1
            
            if exp_split_type == 'payer_excluded':
                if user_id == exp_payer_id:
                    return Decimal('0')
                return exp_amount / Decimal(str(max(1, total_members - 1)))
            return exp_amount / Decimal(str(max(1, total_members)))
            
        today = date.today()
        user_groups = Group.objects.filter(
            Q(created_by=user) | Q(members__user=user, members__status='accepted')
        ).distinct()
        
        this_month_expenses = Expense.objects.filter(
            group__in=user_groups,
            date__year=today.year,
            date__month=today.month,
        )
        
        current_spent = Decimal('0')
        for exp in this_month_expenses:
            current_spent += calculate_member_share(user.id, exp.total_amount, exp.split_type, exp.created_by_id, exp.group, exp.split_data)
            
        if current_spent > profile.expenditure_limit:
            return Response({
                'limit_exceeded': True,
                'current_spent': float(current_spent),
                'limit': float(profile.expenditure_limit)
            })
            
        return Response({
            'limit_exceeded': False,
            'current_spent': float(current_spent),
            'limit': float(profile.expenditure_limit)
        })


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
        elif expense.split_type == 'percentage' and expense.split_data:
            # split_data is { "userId": percentageValue }
            balances[payer_id] += amount
            for uid_str, pct_val in expense.split_data.items():
                try:
                    uid = int(uid_str)
                    if not pct_val: pct_val = 0
                    pct = Decimal(str(pct_val))
                    share = round((amount * pct) / Decimal('100'), 2)
                    balances[uid] -= share
                except Exception:
                    continue
        else:
            # Default to equal split for other types
            share = amount / len(member_ids)
            balances[payer_id] += amount
            for mid in member_ids:
                balances[mid] -= share
    
    # Subtract completed settlements from balances to avoid double-charging
    completed_settlements = Settlement.objects.filter(group=group, status='completed')
    for s in completed_settlements:
        balances[s.from_user_id] += s.amount
        balances[s.to_user_id] -= s.amount
    
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

    @action(detail=False, methods=['get'])
    def risk_score(self, request):
        """
        Calculate risk score for a specific user.
        Query params: ?user_id=<id>
        
        Risk Score = 0.4 × normalized_avg_delay + 0.3 × unsettled_ratio + 0.3 × outstanding_balance_ratio
        """
        from django.db.models import Sum, Avg, Count, F
        
        target_user_id = request.query_params.get('user_id')
        if not target_user_id:
            return Response({'error': 'user_id query param required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            target_user = User.objects.get(id=target_user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        risk_data = _calculate_risk_score(target_user)
        return Response(risk_data)

    @action(detail=False, methods=['get'])
    def group_risk(self, request):
        """
        Calculate risk scores for all members in a group.
        Query params: ?group_id=<id>
        """
        group_id = request.query_params.get('group_id')
        if not group_id:
            return Response({'error': 'group_id query param required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            group = Group.objects.get(id=group_id)
        except Group.DoesNotExist:
            return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)
        
        member_ids = GroupMember.objects.filter(
            group=group, status='accepted'
        ).values_list('user_id', flat=True)
        
        results = []
        for uid in member_ids:
            if uid == request.user.id:
                continue  # Skip the current user (payer)
            try:
                member = User.objects.get(id=uid)
                risk_data = _calculate_risk_score(member)
                results.append(risk_data)
            except User.DoesNotExist:
                pass
        
        return Response(results)

    @action(detail=True, methods=['post'])
    def mark_completed(self, request, pk=None):
        settlement = self.get_object()
        if settlement.status == 'completed':
            return Response({'error': 'Already completed'}, status=status.HTTP_400_BAD_REQUEST)
        
        settlement.status = 'completed'
        settlement.completed_at = timezone.now()
        settlement.save()
        _recalculate_settlements(settlement.group)
        
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
        _recalculate_settlements(settlement.group)
        
        serializer = self.get_serializer(settlement)
        return Response(serializer.data)


def _calculate_risk_score(target_user):
    from django.db.models import Sum
    from collections import defaultdict
    
    settlements = Settlement.objects.filter(from_user=target_user)
    total_count = settlements.count()
    
    if total_count == 0:
        return {
            "user_id": target_user.id,
            "name": target_user.first_name or target_user.email.split('@')[0],
            "risk_score": 0.0,
            "risk_level": "Low Risk",
            "factors": {
                "total_transactions": 0,
                "delayed_payments": 0,
                "avg_delay_days": 0,
                "unsettled_expenses": 0,
                "outstanding_balance": 0,
            },
            "reason": "No transaction history."
        }
        
    pending_settlements = settlements.filter(status='pending')
    completed_settlements = settlements.filter(status='completed')
    
    unsettled_count = pending_settlements.count()
    unsettled_ratio = unsettled_count / total_count
    
    outstanding_balance = pending_settlements.aggregate(total=Sum('amount'))['total'] or Decimal('0')
    total_borrowed = settlements.aggregate(total=Sum('amount'))['total'] or Decimal('0')
    
    outstanding_ratio = float(outstanding_balance) / float(total_borrowed) if total_borrowed > 0 else 0.0
    
    # Calculate delays
    delays = []
    delayed_count = 0
    for s in completed_settlements:
        if s.completed_at:
            delay = (s.completed_at - s.created_at).days
            # Even if delay is < 0 slightly due to timezone differences, bound it to 0
            delay = max(0, delay)
            delays.append(delay)
            if delay > 7:
                delayed_count += 1
                
    avg_delay = sum(delays) / len(delays) if delays else 0
    # Normalize delay (assume 30+ days is max risk)
    normalized_delay = min(avg_delay / 30.0, 1.0)
    
    risk_score = (0.4 * normalized_delay) + (0.3 * unsettled_ratio) + (0.3 * outstanding_ratio)
    risk_score = round(risk_score, 2)
    
    if risk_score <= 0.3:
        risk_level = "Low Risk"
    elif risk_score <= 0.6:
        risk_level = "Medium Risk"
    else:
        risk_level = "High Risk"
        
    if risk_score <= 0.3:
        reason = "Good repayment history."
    else:
        reason = f"{delayed_count} delayed payments and ₹{outstanding_balance} outstanding balance."
        
    return {
        "user_id": target_user.id,
        "name": target_user.first_name or target_user.email.split('@')[0],
        "risk_score": risk_score,
        "risk_level": risk_level,
        "factors": {
            "total_transactions": total_count,
            "delayed_payments": delayed_count,
            "avg_delay_days": round(avg_delay, 1),
            "unsettled_expenses": unsettled_count,
            "outstanding_balance": float(outstanding_balance),
        },
        "reason": reason
    }
