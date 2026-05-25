from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User, Campaign, ScrapedEmail
from app.schemas.schemas import UserResponse, CampaignStatus, AdminStats, UserUpdateRequest

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

@router.get("/stats", response_model=AdminStats)
async def get_system_stats(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Get system-wide statistics for the admin dashboard"""
    total_users = db.query(User).count()
    total_campaigns = db.query(Campaign).count()
    
    total_scraped = db.query(func.sum(Campaign.total_scraped)).scalar() or 0
    total_valid = db.query(func.sum(Campaign.valid_emails)).scalar() or 0
    total_credits = db.query(func.sum(User.credits_remaining)).scalar() or 0
    
    return AdminStats(
        total_users=total_users,
        total_campaigns=total_campaigns,
        total_emails_scraped=total_scraped,
        total_valid_emails=total_valid,
        total_credits_distributed=total_credits
    )

@router.get("/campaigns", response_model=List[CampaignStatus])
async def list_all_campaigns(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """List all campaigns in the system (for monitoring)"""
    campaigns = db.query(Campaign).order_by(Campaign.created_at.desc()).offset(skip).limit(limit).all()
    
    campaigns_data = []
    for c in campaigns:
        campaigns_data.append(
            CampaignStatus(
                id=c.id,
                name=f"{c.name or 'Unnamed'} (User #{c.user_id})",
                platform=getattr(c.platform, 'value', str(c.platform)) if c.platform else "unknown",
                status=c.status or "pending",
                total_scraped=c.total_scraped or 0,
                valid_emails=c.valid_emails or 0,
                progress=100.0 if c.status == "completed" else (50.0 if c.status == "running" else 0.0),
                created_at=c.created_at,
                completed_at=c.completed_at
            )
        )
    return campaigns_data

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

@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    request: UserUpdateRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Update user role or status"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    if request.is_admin is not None:
        user.is_admin = request.is_admin
    if request.is_active is not None:
        user.is_active = request.is_active
    if request.is_premium is not None:
        user.is_premium = request.is_premium
    if request.credits_remaining is not None:
        user.credits_remaining = request.credits_remaining
        
    db.commit()
    db.refresh(user)
    return user

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Delete a user permanently"""
    if user_id == admin_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own admin account")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    db.delete(user)
    db.commit()
    return None

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
        
    user.credits_remaining = (user.credits_remaining or 0) + request.amount
    db.commit()
    db.refresh(user)
    
    return user

