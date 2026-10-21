from fastapi import APIRouter, HTTPException, status
from ..schemas import Token, LoginRequest
from ..auth import DEMO_USERS, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=Token)
def login(req: LoginRequest):
    # Match against demo users or accept standard credentials
    user = DEMO_USERS.get(req.username.lower())
    if not user:
        # Create a generic user if not found
        user = {
            "email": req.username,
            "display_name": req.username.split("@")[0].capitalize(),
            "role": "cxo",
            "function_name": None,
            "team_name": None
        }
    token = create_access_token({"sub": user["email"], "role": user["role"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/users")
def list_demo_users():
    return list(DEMO_USERS.values())
