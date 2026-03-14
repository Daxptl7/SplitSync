from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from .models import FriendRequest
from .serializers import FriendRequestSerializer
from django.contrib.auth.models import User
from django.db.models import Q

class FriendRequestViewSet(viewsets.ModelViewSet):
    serializer_class = FriendRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Users can only see requests where they are sender or receiver
        user = self.request.user
        return FriendRequest.objects.filter(Q(sender=user) | Q(receiver=user)).order_by('-created_at')

    @action(detail=False, methods=['get'])
    def accepted(self, request):
        """Get all accepted friends."""
        user = request.user
        friendships = FriendRequest.objects.filter(
            Q(status='accepted') & (Q(sender=user) | Q(receiver=user))
        ).order_by('-created_at')
        
        serializer = self.get_serializer(friendships, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get pending requests received by the user."""
        user = request.user
        requests = FriendRequest.objects.filter(receiver=user, status='pending').order_by('-created_at')
        serializer = self.get_serializer(requests, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def send_request(self, request):
        email = request.data.get('email')
        if email:
            email = email.lower().strip()
            
        if not email:
            return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

        if email == request.user.email:
            return Response({'error': 'You cannot send a request to yourself'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            receiver = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        # check if request already exists
        existing = FriendRequest.objects.filter(
            Q(sender=request.user, receiver=receiver) |
            Q(sender=receiver, receiver=request.user)
        ).first()

        if existing:
            return Response({'error': f'Request already exists or you are already friends (Status: {existing.status})'}, status=status.HTTP_400_BAD_REQUEST)

        friend_request = FriendRequest.objects.create(sender=request.user, receiver=receiver)
        serializer = self.get_serializer(friend_request)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        friend_request = self.get_object()
        if friend_request.receiver != request.user:
            return Response({'error': 'Only the receiver can accept the request'}, status=status.HTTP_403_FORBIDDEN)
        
        friend_request.status = 'accepted'
        friend_request.save()
        serializer = self.get_serializer(friend_request)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        friend_request = self.get_object()
        if friend_request.receiver != request.user:
            return Response({'error': 'Only the receiver can reject the request'}, status=status.HTTP_403_FORBIDDEN)
        
        friend_request.status = 'rejected'
        friend_request.save()
        serializer = self.get_serializer(friend_request)
        return Response(serializer.data)
