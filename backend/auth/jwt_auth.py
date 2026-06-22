import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from settings import app_settings
from typing import Optional

class JWTBearer:
    """
    JWT Bearer token authentication middleware for FastAPI
    """
    def __init__(self, auto_error: bool = True):
        self.auto_error = auto_error
        self.model = HTTPBearer(auto_error=auto_error)
        self.jwt_secret = app_settings.jwt_secret

    async def __call__(self, credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False))):
        if credentials:
            if not credentials.scheme == "Bearer":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, 
                    detail="Invalid authentication scheme."
                )
            
            user_id = self.verify_jwt(credentials.credentials)
            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, 
                    detail="Invalid token or expired token."
                )
            return user_id
        elif self.auto_error:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="Not authenticated"
            )
        return None

    def verify_jwt(self, jwtoken: str) -> Optional[str]:
        """
        Verify the JWT token and return the user_id if valid
        """
        try:
            payload = jwt.decode(
                jwtoken, 
                self.jwt_secret, 
                algorithms=["HS256"],
                options={"verify_signature": True},
                audience="authenticated"
            )
            user_id = payload.get("sub")
            if not user_id:
                return None
            return user_id
        except jwt.PyJWTError:
            return None

# Create an instance to be used as a dependency
jwt_auth = JWTBearer() 