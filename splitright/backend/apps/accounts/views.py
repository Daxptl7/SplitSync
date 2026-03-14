from datetime import date
from decimal import Decimal
from itertools import chain
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Sum

class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import UserProfile
        user = request.user
        profile, _ = UserProfile.objects.get_or_create(user=user)
        
        return Response({
            "uid": user.firebase_uid,
            "email": user.firebase_email,
            "name": user.firebase_name,
            "expenditure_limit": float(profile.expenditure_limit) if profile.expenditure_limit else None,
        })
        
    def patch(self, request):
        from .models import UserProfile
        user = request.user
        profile, _ = UserProfile.objects.get_or_create(user=user)
        
        limit = request.data.get('expenditure_limit')
        if limit is not None:
            if limit == "":
                profile.expenditure_limit = None
            else:
                profile.expenditure_limit = Decimal(str(limit))
            profile.save()
            
        return Response({
            "uid": user.firebase_uid,
            "email": user.firebase_email,
            "name": user.firebase_name,
            "expenditure_limit": float(profile.expenditure_limit) if profile.expenditure_limit else None,
        })


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import UserProfile
        user = request.user
        profile, _ = UserProfile.objects.get_or_create(user=user)
        
        return Response({
            "display_name": profile.display_name or user.firebase_name,
            "email": user.firebase_email,
            "default_currency": profile.default_currency,
            "upi_handle": profile.upi_handle,
            "phone": profile.phone
        })
        
    def put(self, request):
        from .models import UserProfile
        user = request.user
        profile, _ = UserProfile.objects.get_or_create(user=user)
        
        display_name = request.data.get('display_name')
        default_currency = request.data.get('default_currency')
        upi_handle = request.data.get('upi_handle')
        phone = request.data.get('phone')
        
        if display_name is not None:
            profile.display_name = display_name
        if default_currency is not None:
            profile.default_currency = default_currency
        if upi_handle is not None:
            profile.upi_handle = upi_handle
        if phone is not None:
            profile.phone = phone
            
        profile.save()
        
        return Response({
            "display_name": profile.display_name or user.firebase_name,
            "email": user.firebase_email,
            "default_currency": profile.default_currency,
            "upi_handle": profile.upi_handle,
            "phone": profile.phone
        })


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.groups.models import Group, GroupMember, Expense, Settlement
        
        user = request.user
        
        # Total groups the user is in
        groups = Group.objects.filter(
            Q(created_by=user) | Q(members__user=user, members__status='accepted')
        ).distinct()
        total_groups = groups.count()
        
        # You owe: sum of pending settlements where user is from_user
        you_owe = Settlement.objects.filter(
            from_user=user, status='pending'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        # Owed to you: sum of pending settlements where user is to_user
        owed_to_you = Settlement.objects.filter(
            to_user=user, status='pending'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        # This month's expenses across all user's groups
        today = date.today()
        this_month_expenses = Expense.objects.filter(
            group__in=groups,
            date__year=today.year,
            date__month=today.month,
        ).aggregate(total=Sum('total_amount'))['total'] or Decimal('0')
        
        # Recent activity: combine expenses and settlements, sorted by date
        recent_expenses = list(
            Expense.objects.filter(group__in=groups)
            .order_by('-created_at')[:5]
            .values('id', 'description', 'total_amount', 'created_at', 'created_by__first_name', 'created_by__email')
        )
        
        recent_settlements = list(
            Settlement.objects.filter(Q(from_user=user) | Q(to_user=user))
            .order_by('-created_at')[:5]
            .values('id', 'amount', 'status', 'created_at', 
                    'from_user__first_name', 'from_user__email',
                    'to_user__first_name', 'to_user__email')
        )
        
        # Build activity list
        activity = []
        for exp in recent_expenses:
            payer = exp.get('created_by__first_name') or (exp.get('created_by__email', '').split('@')[0])
            activity.append({
                'id': f"exp-{exp['id']}",
                'entry_type': 'expense',
                'description': f"{payer} added \"{exp['description']}\" — ₹{exp['total_amount']}",
                'amount': float(exp['total_amount']),
                'created_at': exp['created_at'].isoformat() if exp['created_at'] else None,
            })
        
        for stl in recent_settlements:
            from_name = stl.get('from_user__first_name') or (stl.get('from_user__email', '').split('@')[0])
            to_name = stl.get('to_user__first_name') or (stl.get('to_user__email', '').split('@')[0])
            status_label = "settled" if stl['status'] == 'completed' else "owes"
            activity.append({
                'id': f"stl-{stl['id']}",
                'entry_type': 'settlement',
                'description': f"{from_name} {status_label} {to_name} — ₹{stl['amount']}",
                'amount': float(stl['amount']),
                'created_at': stl['created_at'].isoformat() if stl['created_at'] else None,
            })
        
        # Sort by created_at descending
        activity.sort(key=lambda x: x.get('created_at') or '', reverse=True)
        activity = activity[:10]
        
        return Response({
            'you_owe': float(you_owe),
            'owed_to_you': float(owed_to_you),
            'total_groups': total_groups,
            'this_month_expenses': float(this_month_expenses),
            'recent_activity': activity,
        })
