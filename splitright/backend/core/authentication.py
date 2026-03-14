import json
import time
import requests as http_requests
import jwt  # PyJWT
from cryptography.x509 import load_pem_x509_certificate
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth.models import User

# Firebase project ID
FIREBASE_PROJECT_ID = 'breach06-26'

# Google's public key endpoint for Firebase Auth
GOOGLE_CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'

# Cache for Google public keys
_cached_keys = None
_cache_expiry = 0


def _get_google_public_keys():
    """Fetch and cache Google's public keys for Firebase token verification."""
    global _cached_keys, _cache_expiry
    now = time.time()
    
    if _cached_keys and now < _cache_expiry:
        return _cached_keys
    
    try:
        resp = http_requests.get(GOOGLE_CERTS_URL, timeout=10)
        resp.raise_for_status()
        _cached_keys = resp.json()
        # Cache for 1 hour
        _cache_expiry = now + 3600
        return _cached_keys
    except Exception as e:
        print(f"Error fetching Google public keys: {e}")
        if _cached_keys:
            return _cached_keys
        raise AuthenticationFailed('Unable to fetch token verification keys')


def verify_firebase_token(id_token):
    """
    Manually verify a Firebase ID token using Google's public certificates.
    This avoids the need for a Firebase Admin SDK service account JSON.
    """
    # Decode the header to get the key ID (kid)
    try:
        unverified_header = jwt.get_unverified_header(id_token)
    except jwt.exceptions.DecodeError:
        raise AuthenticationFailed('Invalid token format')
    
    kid = unverified_header.get('kid')
    if not kid:
        raise AuthenticationFailed('Token missing key ID')
    
    # Get the matching public key
    public_keys = _get_google_public_keys()
    cert_str = public_keys.get(kid)
    if not cert_str:
        # Try refreshing keys in case they rotated
        global _cache_expiry
        _cache_expiry = 0
        public_keys = _get_google_public_keys()
        cert_str = public_keys.get(kid)
        if not cert_str:
            raise AuthenticationFailed('Token key ID not found in Google certs')
    
    # Extract the RSA public key from the X.509 certificate
    try:
        certificate = load_pem_x509_certificate(cert_str.encode('utf-8'))
        public_key = certificate.public_key()
    except Exception as e:
        raise AuthenticationFailed(f'Failed to parse public key certificate: {str(e)}')
    
    # Verify and decode the token
    try:
        decoded = jwt.decode(
            id_token,
            public_key,
            algorithms=['RS256'],
            audience=FIREBASE_PROJECT_ID,
            issuer=f'https://securetoken.google.com/{FIREBASE_PROJECT_ID}',
        )
    except jwt.ExpiredSignatureError:
        raise AuthenticationFailed('Token has expired')
    except jwt.InvalidAudienceError:
        raise AuthenticationFailed('Token has invalid audience')
    except jwt.InvalidIssuerError:
        raise AuthenticationFailed('Token has invalid issuer')
    except Exception as e:
        raise AuthenticationFailed(f'Token verification failed: {str(e)}')
    
    return decoded


class FirebaseAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        if not auth_header:
            return None

        if not auth_header.startswith('Bearer '):
            return None

        id_token = auth_header.split(' ').pop()

        try:
            decoded_token = verify_firebase_token(id_token)
            uid = decoded_token.get('user_id') or decoded_token.get('sub')
            email = decoded_token.get('email', '')
            name = decoded_token.get('name', '')

            user, created = User.objects.get_or_create(
                username=uid, 
                defaults={'email': email, 'first_name': name}
            )
            
            # Update email if it changed
            if not created and user.email != email and email:
                user.email = email
                user.save(update_fields=['email'])
            
            # Attach the raw decoded token to the user for easy access in views
            user.firebase_uid = uid
            user.firebase_email = email
            user.firebase_name = name

            return (user, decoded_token)
            
        except AuthenticationFailed:
            raise
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise AuthenticationFailed('Invalid or expired Firebase token')

    def authenticate_header(self, request):
        return 'Bearer'
