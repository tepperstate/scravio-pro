"""
Authentication Routes
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from app.core.database import get_db
from app.core.security import (
    verify_password, get_password_hash, create_access_token
)
from app.core.config import settings
from app.models.user import User
from app.schemas.schemas import (
    UserCreate, UserLogin, UserResponse, TokenResponse
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    # Check if email exists
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    from datetime import datetime
    from dateutil.relativedelta import relativedelta
    
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name,
        company=user.company,
        credits_remaining=settings.FREE_CREDITS_MONTHLY,
        credits_reset_date=datetime.utcnow() + relativedelta(months=1),
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user


@router.post("/login", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login and get access token"""
    user = db.query(User).filter(User.email == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is inactive"
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=access_token_expires
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get current user info"""
    return current_user


@router.post("/refresh-credits")
async def refresh_credits(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Refresh monthly credits if reset date has passed"""
    from datetime import datetime
    from dateutil.relativedelta import relativedelta
    
    if current_user.credits_reset_date and current_user.credits_reset_date <= datetime.utcnow():
        current_user.credits_remaining = settings.FREE_CREDITS_MONTHLY
        current_user.credits_reset_date = datetime.utcnow() + relativedelta(months=1)
        db.commit()
    
    return {
        "credits_remaining": current_user.credits_remaining,
        "credits_reset_date": current_user.credits_reset_date,
        "message": "Credits refreshed successfully" if current_user.credits_reset_date > datetime.utcnow() else None
    }


# Import the dependency
from app.core.security import get_current_active_user