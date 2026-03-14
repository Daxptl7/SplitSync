from rest_framework import serializers
from .models import Group, GroupMember, Expense
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

    class Meta:
        model = Expense
        fields = ['id', 'group', 'description', 'total_amount', 'split_type', 'created_by', 'date']
