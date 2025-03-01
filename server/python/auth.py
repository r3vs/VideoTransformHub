from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from typing import Optional
from pydantic import BaseModel

class User(BaseModel):
    id: int
    username: str

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """
    Validate token and return current user
    This will be integrated with the existing Node.js auth system
    """
    try:
        # TODO: Validate token with Node.js auth system
        # For now, return mock user
        return User(id=1, username="test")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
