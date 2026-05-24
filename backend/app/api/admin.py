from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.schemas.schemas import UserResponse

router = APIRouter(prefix="/admin", tags=["Admin"])

class AddCreditsRequest(BaseModel):
    amount: int

def get_current_admin_user(current_user: User = Depends(get_current_active_user)):
    """Dependency to check if the current user is an admin"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action"
        )
    return current_user

@router.get("/users", response_model=List[UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """List all registered users"""
    users = db.query(User).order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    return users

@router.post("/users/{user_id}/add-credits", response_model=UserResponse)
async def add_credits(
    user_id: int,
    request: AddCreditsRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Add or subtract credits to a user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    user.credits_remaining += request.amount
    db.commit()
    db.refresh(user)
    
    return user
