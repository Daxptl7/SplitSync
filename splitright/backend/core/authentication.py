import firebase_admin
from firebase_admin import credentials, auth
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth.models import User
import os

# Initialize Firebase Admin SDK
# For development, if no credentials JSON is found, fallback to default (or dummy)
try:
    if not firebase_admin._apps:
        cred_path = os.environ.get("FIREBASE_CREDENTIALS_PATH")
        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            default_app = firebase_admin.initialize_app(cred)
        else:
            # Fallback for dev mode where token verification is mocked or handled via default GOOGLE_APPLICATION_CREDENTIALS
            from google.oauth2 import service_account
            # Just initialize a default app
            default_app = firebase_admin.initialize_app()
except ValueError as e:
    pass

class FirebaseAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        if not auth_header:
            return None

        if not auth_header.startswith('Bearer '):
            return None

        id_token = auth_header.split(' ').pop()

        try:
            # Verify the token against Firebase
            decoded_token = auth.verify_id_token(id_token)
            uid = decoded_token.get('uid')
            email = decoded_token.get('email')
            name = decoded_token.get('name', '')

            # Instead of relying strictly on a Django User table, we can just return a synthetic User object
            # Because this backend is purely a bridge to Firestore
            user, created = User.objects.get_or_create(username=uid, defaults={'email': email, 'first_name': name})
            
            # Attach the raw decoded token to the user for easy access in views
            user.firebase_uid = uid
            user.firebase_email = email
            user.firebase_name = name

            return (user, decoded_token)
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise AuthenticationFailed('Invalid or expired Firebase token')

    def authenticate_header(self, request):
        return 'Bearer'
