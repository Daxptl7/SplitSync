from rest_framework import serializers
from .models import Group, GroupMember, Expense, Settlement
from apps.accounts.serializers import UserSerializer

class GroupMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = GroupMember
        fields = ['id', 'user', 'status', 'created_at']

class GroupSerializer(serializers.ModelSerializer):
    members = GroupMemberSerializer(many=True, read_only=True)
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = Group
        fields = ['id', 'name', 'currency', 'created_by', 'members', 'created_at']

class ExpenseSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    group = GroupSerializer(read_only=True)
    group_id = serializers.PrimaryKeyRelatedField(
        queryset=Group.objects.all(), source='group', write_only=True
    )

    class Meta:
        model = Expense
        fields = ['id', 'group', 'group_id', 'description', 'total_amount', 'split_type', 'created_by', 'date']

class SettlementUserSerializer(serializers.ModelSerializer):
    """Lightweight user serializer for settlement display."""
    display_name = serializers.SerializerMethodField()

    class Meta:
        from django.contrib.auth.models import User
        model = User
        fields = ['id', 'email', 'first_name', 'display_name']

    def get_display_name(self, obj):
        return obj.first_name or obj.email.split('@')[0] if obj.email else str(obj.id)

class SettlementSerializer(serializers.ModelSerializer):
    from_user = SettlementUserSerializer(read_only=True)
    to_user = SettlementUserSerializer(read_only=True)

    class Meta:
        model = Settlement
        fields = ['id', 'group', 'from_user', 'to_user', 'amount', 'status', 'notes', 'created_at', 'completed_at']
