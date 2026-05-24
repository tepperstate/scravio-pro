from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text, Enum as SQLEnum
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class PlatformEnum(enum.Enum):
    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"
    TWITTER = "twitter"
    YOUTUBE = "youtube"
    LINKEDIN = "linkedin"
    TIKTOK = "tiktok"


class VerificationStatusEnum(enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    INVALID = "invalid"
    RISKY = "risky"
    CATCH_ALL = "catch_all"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    company = Column(String(255))
    is_active = Column(Boolean, default=True)
    is_premium = Column(Boolean, default=False)
    credits_remaining = Column(Integer, default=100)
    credits_reset_date = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class ScrapedEmail(Base):
    __tablename__ = "scraped_emails"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    platform = Column(SQLEnum(PlatformEnum), nullable=False)
    source_username = Column(String(255))
    source_url = Column(String(512))
    source_profile_url = Column(String(512))
    user_id = Column(Integer)  # Who scraped this
    first_name = Column(String(100))
    last_name = Column(String(100))
    bio = Column(Text)
    follower_count = Column(Integer)
    verification_status = Column(SQLEnum(VerificationStatusEnum), default=VerificationStatusEnum.PENDING)
    verification_details = Column(Text)  # JSON string with verification results
    is_duplicate = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    name = Column(String(255), nullable=False)
    platform = Column(SQLEnum(PlatformEnum), nullable=False)
    search_query = Column(String(255))  # hashtag, username, etc
    total_scraped = Column(Integer, default=0)
    valid_emails = Column(Integer, default=0)
    status = Column(String(50), default="pending")  # pending, running, completed, failed
    created_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime)


class ExportHistory(Base):
    __tablename__ = "export_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    campaign_id = Column(Integer)
    filename = Column(String(255))
    format = Column(String(10))  # csv, xlsx, json
    record_count = Column(Integer)
    created_at = Column(DateTime, server_default=func.now())