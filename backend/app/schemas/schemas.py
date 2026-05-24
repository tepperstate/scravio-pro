from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class PlatformEnum(str, Enum):
    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"
    TWITTER = "twitter"
    YOUTUBE = "youtube"
    LINKEDIN = "linkedin"
    TIKTOK = "tiktok"


class VerificationStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    INVALID = "invalid"
    RISKY = "risky"
    CATCH_ALL = "catch_all"


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    company: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: int
    is_active: Optional[bool] = True
    is_premium: Optional[bool] = False
    is_admin: Optional[bool] = False
    credits_remaining: Optional[int] = 0
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class ScraperRequest(BaseModel):
    platform: PlatformEnum
    query: str = Field(..., description="Username, hashtag, or URL to scrape")
    max_results: int = Field(default=50, le=500)


class ScraperResponse(BaseModel):
    campaign_id: int
    status: str
    message: str


class EmailData(BaseModel):
    id: int
    email: str
    platform: str
    source_username: Optional[str] = None
    source_url: Optional[str] = None
    source_profile_url: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    bio: Optional[str] = None
    follower_count: Optional[int] = None
    verification_status: VerificationStatus
    verification_details: Optional[dict] = None
    created_at: datetime

    class Config:
        from_attributes = True


class EmailListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    emails: List[EmailData]


class ExportRequest(BaseModel):
    campaign_id: int
    format: str = Field(default="csv", pattern="^(csv|xlsx|json)$")
    include_unverified: bool = False


class VerificationResult(BaseModel):
    syntax_valid: bool
    domain_valid: bool
    mx_valid: bool
    smtp_verified: bool
    is_catch_all: bool
    is_disposable: bool
    risk_score: float
    overall_status: VerificationStatus


class CreditBalance(BaseModel):
    credits_remaining: int
    credits_used_this_month: int
    reset_date: Optional[datetime]


class CampaignStatus(BaseModel):
    id: int
    name: str
    platform: str
    status: str
    total_scraped: int
    valid_emails: int
    progress: float
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class HealthCheck(BaseModel):
    status: str
    version: str
    timestamp: datetime