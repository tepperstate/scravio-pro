"""
Scraping API Routes
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.core.config import settings
from app.models.user import User, Campaign, ScrapedEmail, PlatformEnum, VerificationStatusEnum
from app.schemas.schemas import (
    ScraperRequest, ScraperImportRequest, ScraperResponse, EmailData, EmailListResponse,
    CampaignStatus, CreditBalance, PlatformEnum as PlatformEnumSchema, CampaignUpdateRequest,
    CampaignBatchDeleteRequest, EmailBatchDeleteRequest
)
from app.scrapers import get_scraper
from app.services.dedup_engine import GlobalDeduplication, DeduplicationEngine
from app.services.email_verifier import verifier

router = APIRouter(prefix="/scrape", tags=["Scraping"])


@router.post("/start", response_model=ScraperResponse)
async def start_scraping(
    request: ScraperRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Start a new scraping job
    
    Args:
        request: Contains platform, query, and max_results
    """
    # Check credits
    if current_user.credits_remaining < request.max_results:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Insufficient credits. Need {request.max_results}, have {current_user.credits_remaining}"
        )
    
    # Create campaign
    campaign = Campaign(
        user_id=current_user.id,
        name=f"{request.platform.value.title()} - {request.query}",
        platform=PlatformEnum[request.platform.value.upper()],
        search_query=request.query,
        total_scraped=0,
        valid_emails=0,
        status="pending",
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    
    # Queue background task
    try:
        from app.services.celery_tasks import scrape_platform
        scrape_platform.delay(
            user_id=current_user.id,
            platform=request.platform.value,
            query=request.query,
            max_results=request.max_results,
            campaign_id=campaign.id
        )
    except Exception as e:
        campaign.status = "failed"
        db.commit()
        raise HTTPException(
            status_code=500,
            detail=f"Background task queue failed. Ensure Redis is running and CELERY_BROKER_URL is correctly set. Error: {str(e)}"
        )

    
    return ScraperResponse(
        campaign_id=campaign.id,
        status="queued",
        message=f"Scraping job queued for {request.platform.value}. You will be notified when complete."
    )


@router.post("/import", response_model=ScraperResponse)
async def import_scraping(
    request: ScraperImportRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Import a list of usernames from the extension to scrape
    """
    if not request.usernames:
        raise HTTPException(status_code=400, detail="Usernames list cannot be empty")
        
    num_profiles = len(request.usernames)
    
    # Check credits
    if current_user.credits_remaining < num_profiles:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Insufficient credits. Need {num_profiles}, have {current_user.credits_remaining}"
        )
    
    # Create campaign
    campaign = Campaign(
        user_id=current_user.id,
        name=request.name or f"{request.platform.value.title()} Import",
        platform=PlatformEnum[request.platform.value.upper()],
        search_query=f"Import of {num_profiles} profiles",
        total_scraped=0,
        valid_emails=0,
        status="pending",
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    
    # Queue background task
    try:
        from app.services.celery_tasks import scrape_platform_batch
        scrape_platform_batch.delay(
            user_id=current_user.id,
            platform=request.platform.value,
            profiles=request.usernames,
            campaign_id=campaign.id
        )
    except Exception as e:
        campaign.status = "failed"
        db.commit()
        raise HTTPException(
            status_code=500,
            detail=f"Background task queue failed. Ensure Redis is running and CELERY_BROKER_URL is correctly set. Error: {str(e)}"
        )
    
    return ScraperResponse(
        campaign_id=campaign.id,
        status="queued",
        message=f"Batch scraping job queued for {num_profiles} profiles."
    )


@router.get("/campaign/{campaign_id}", response_model=CampaignStatus)
async def get_campaign_status(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get status of a scraping campaign"""
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.user_id == current_user.id
    ).first()
    
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    # Calculate progress
    progress = 0.0
    if campaign.status == "completed":
        progress = 100.0
    elif campaign.status == "running" and campaign.total_scraped > 0:
        progress = 50.0  # Estimated
    
    return CampaignStatus(
        id=campaign.id,
        name=campaign.name,
        platform=campaign.platform.value,
        status=campaign.status,
        total_scraped=campaign.total_scraped,
        valid_emails=campaign.valid_emails,
        progress=progress,
        created_at=campaign.created_at,
        completed_at=campaign.completed_at
    )


@router.patch("/campaign/{campaign_id}", response_model=CampaignStatus)
async def update_campaign(
    campaign_id: int,
    request: CampaignUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a campaign's details"""
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.user_id == current_user.id
    ).first()
    
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
        
    if request.name is not None:
        campaign.name = request.name
        
    db.commit()
    db.refresh(campaign)
    
    progress = 0.0
    if campaign.status == "completed":
        progress = 100.0
    elif campaign.status == "running" and campaign.total_scraped > 0:
        progress = 50.0
        
    return CampaignStatus(
        id=campaign.id,
        name=campaign.name,
        platform=campaign.platform.value,
        status=campaign.status,
        total_scraped=campaign.total_scraped,
        valid_emails=campaign.valid_emails,
        progress=progress,
        created_at=campaign.created_at,
        completed_at=campaign.completed_at
    )


@router.delete("/campaign/{campaign_id}")
async def delete_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a campaign"""
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.user_id == current_user.id
    ).first()
    
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
        
    db.delete(campaign)
    db.commit()
    
    return {"status": "success", "message": "Campaign deleted"}


@router.post("/campaigns/batch-delete")
async def delete_campaigns_batch(
    request: CampaignBatchDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete multiple campaigns"""
    campaigns = db.query(Campaign).filter(
        Campaign.id.in_(request.campaign_ids),
        Campaign.user_id == current_user.id
    ).all()
    
    deleted_count = len(campaigns)
    for campaign in campaigns:
        db.delete(campaign)
        
    db.commit()
    return {"status": "success", "deleted_count": deleted_count}


@router.post("/emails/batch-delete")
async def delete_emails_batch(
    request: EmailBatchDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete multiple emails"""
    emails = db.query(ScrapedEmail).filter(
        ScrapedEmail.id.in_(request.email_ids),
        ScrapedEmail.user_id == current_user.id
    ).all()
    
    deleted_count = len(emails)
    for email in emails:
        db.delete(email)
        
    db.commit()
    return {"status": "success", "deleted_count": deleted_count}


@router.get("/campaigns", response_model=List[CampaignStatus])
async def list_campaigns(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all campaigns for current user"""
    campaigns = db.query(Campaign).filter(
        Campaign.user_id == current_user.id
    ).order_by(Campaign.created_at.desc()).offset(skip).limit(limit).all()
    
    return [
        CampaignStatus(
            id=c.id,
            name=c.name,
            platform=c.platform.value,
            status=c.status,
            total_scraped=c.total_scraped,
            valid_emails=c.valid_emails,
            progress=100.0 if c.status == "completed" else (50.0 if c.status == "running" else 0.0),
            created_at=c.created_at,
            completed_at=c.completed_at
        )
        for c in campaigns
    ]


@router.get("/emails", response_model=EmailListResponse)
async def list_emails(
    platform: str = None,
    campaign_id: int = None,
    verification_status: str = None,
    page: int = 1,
    page_size: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List scraped emails with filters
    
    Args:
        platform: Filter by platform
        campaign_id: Filter by campaign
        verification_status: Filter by verification status
        page: Page number (1-indexed)
        page_size: Items per page (max 100)
    """
    query = db.query(ScrapedEmail).filter(ScrapedEmail.user_id == current_user.id)
    
    if platform:
        query = query.filter(ScrapedEmail.platform == PlatformEnum[platform.upper()])
    
    if campaign_id:
        query = query.filter(ScrapedEmail.source_url.like(f"%campaign_{campaign_id}%"))
    
    if verification_status:
        query = query.filter(ScrapedEmail.verification_status == VerificationStatusEnum[verification_status.upper()])
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * page_size
    emails = query.order_by(ScrapedEmail.created_at.desc()).offset(offset).limit(page_size).all()
    
    return EmailListResponse(
        total=total,
        page=page,
        page_size=page_size,
        emails=[
            EmailData(
                id=e.id,
                email=e.email,
                platform=e.platform.value,
                source_username=e.source_username,
                source_url=e.source_url,
                source_profile_url=e.source_profile_url,
                first_name=e.first_name,
                last_name=e.last_name,
                bio=e.bio,
                follower_count=e.follower_count,
                verification_status=e.verification_status,
                verification_details=eval(e.verification_details) if e.verification_details else None,
                created_at=e.created_at
            )
            for e in emails
        ]
    )


@router.post("/verify/{email_id}")
async def verify_email(
    email_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Verify a single email"""
    email_record = db.query(ScrapedEmail).filter(
        ScrapedEmail.id == email_id,
        ScrapedEmail.user_id == current_user.id
    ).first()
    
    if not email_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not found"
        )
    
    # Run verification
    result = verifier.verify(email_record.email)
    
    # Update record
    email_record.verification_status = VerificationStatusEnum[result.overall_status.upper()]
    email_record.verification_details = str(result.to_dict())
    db.commit()
    
    return {
        "email_id": email_id,
        "verification_result": result.to_dict()
    }


@router.post("/verify-batch")
async def verify_emails_batch(
    email_ids: List[int],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Verify multiple emails in background"""
    # Verify all belong to user
    count = db.query(ScrapedEmail).filter(
        ScrapedEmail.id.in_(email_ids),
        ScrapedEmail.user_id == current_user.id
    ).count()
    
    if count != len(email_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Some email IDs do not belong to you"
        )
    
    # Queue background task
    from app.services.celery_tasks import verify_emails_batch
    verify_emails_batch.delay(email_ids)
    
    return {
        "message": f"Verification job queued for {len(email_ids)} emails",
        "email_count": len(email_ids)
    }


@router.get("/credits", response_model=CreditBalance)
async def get_credits(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's credit balance"""
    from datetime import datetime
    
    # Check if credits need refresh
    if current_user.credits_reset_date and current_user.credits_reset_date <= datetime.utcnow():
        current_user.credits_remaining = settings.FREE_CREDITS_MONTHLY
        from dateutil.relativedelta import relativedelta
        current_user.credits_reset_date = datetime.utcnow() + relativedelta(months=1)
        db.commit()
    
    credits_used = settings.FREE_CREDITS_MONTHLY - current_user.credits_remaining
    
    return CreditBalance(
        credits_remaining=current_user.credits_remaining,
        credits_used_this_month=credits_used if credits_used > 0 else 0,
        reset_date=current_user.credits_reset_date
    )