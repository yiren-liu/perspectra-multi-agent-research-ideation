from settings import app_settings
from fastapi import HTTPException, status, Request
from fastapi.security import HTTPBearer
import jwt
import base64
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.backends import default_backend

# Add these constants for JWT configuration
JWT_SECRET = app_settings.jwt_secret
JWT_ALGORITHM = "HS256"
security = HTTPBearer()

def decrypt_data(encrypted_data, key):
    if not encrypted_data.strip():
        return encrypted_data.strip()
    encrypted_data_bytes = base64.b64decode(encrypted_data)
    key_bytes = key.encode('utf-8')
    backend = default_backend()
    cipher = Cipher(algorithms.AES(key_bytes), modes.ECB(), backend=backend)
    decryptor = cipher.decryptor()
    decrypted_padded_data = decryptor.update(encrypted_data_bytes) + decryptor.finalize()
    unpadder = padding.PKCS7(128).unpadder()
    decrypted_data = unpadder.update(decrypted_padded_data) + unpadder.finalize()
    return decrypted_data.decode()

def decode_jwt(token: str) -> dict:
    try:
        decoded_token = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM], audience="authenticated")
        return decoded_token
    except jwt.ExpiredSignatureError:
        return None  # Token has expired
    except jwt.InvalidTokenError:
        return None  # Invalid token

def get_current_user(token, request: Request):
    decoded_token = decode_jwt(token)
    if not decoded_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")
    return decoded_token

def auth_middleware(request: Request):
    token = request.headers.get("Authorization")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")
    return get_current_user(token, request)