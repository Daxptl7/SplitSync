from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from .models import Group, GroupMember, Expense
from .serializers import GroupSerializer, GroupMemberSerializer, ExpenseSerializer
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
                # verify friendship exists before adding
                is_friend = FriendRequest.objects.filter(status='accepted').filter(
                    Q(sender=self.request.user, receiver=friend) | Q(sender=friend, receiver=self.request.user)
                ).exists()
                if is_friend:
                    GroupMember.objects.create(group=group, user=friend, added_by=self.request.user, status='pending')
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
            
        member = GroupMember.objects.create(group=group, user=friend, added_by=self.request.user, status='pending')
        return Response(GroupMemberSerializer(member).data, status=status.HTTP_201_CREATED)

class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        groups = Group.objects.filter(Q(created_by=user) | Q(members__user=user, members__status='accepted')).distinct()
        return Expense.objects.filter(group__in=groups).order_by('-date', '-created_at')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
