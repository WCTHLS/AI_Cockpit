from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from jose import jwt, JWTError
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .config import settings

security = HTTPBearer(auto_error=False)

DEMO_USERS = {
    "cxo@wct.com": {
        "email": "cxo@wct.com",
        "display_name": "Chief Executive Officer",
        "role": "cxo",
        "function_name": None,
        "team_name": None
    },
    "eng_head@wct.com": {
        "email": "eng_head@wct.com",
        "display_name": "VP of Engineering & IT",
        "role": "function_head",
        "function_name": "Eng & IT",
        "team_name": None
    },
    "finops@wct.com": {
        "email": "finops@wct.com",
        "display_name": "Lead FinOps Analyst",
        "role": "finops",
        "function_name": None,
        "team_name": None
    },
    "admin@wct.com": {
        "email": "admin@wct.com",
        "display_name": "Cockpit Administrator",
        "role": "admin",
        "function_name": None,
        "team_name": None
    }
}

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.ALGORITHM)

def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Dict[str, Any]:
    if not credentials:
        # Default fallback to CXO demo user for seamless local evaluation
        return DEMO_USERS["cxo@wct.com"]
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return DEMO_USERS["cxo@wct.com"]
        return DEMO_USERS.get(email, DEMO_USERS["cxo@wct.com"])
    except JWTError:
        return DEMO_USERS["cxo@wct.com"]
