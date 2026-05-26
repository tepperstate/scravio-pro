from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Any

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import User
from app.models.lead import Campaign, ScrapedEmail
from app.schemas.schemas import ExtensionSyncPayload, VerificationStatus
from app.services.email_verifier import verifier
from datetime import datetime

router = APIRouter(tags=["Extension"])

def verify_email_task(db: Session, email_id: int):
    """Background task to verify a single email"""
    # Create a new session for the background task
    from app.core.database import SessionLocal
    bg_db = SessionLocal()
    try:
        email_record = bg_db.query(ScrapedEmail).filter(ScrapedEmail.id == email_id).first()
        if not email_record or not email_record.email:
            return
            
        result = verifier.verify(email_record.email)
        
        email_record.verification_status = result.overall_status
        email_record.verification_details = result.verification_details
        bg_db.commit()
        
        # Update campaign stats
        campaign = bg_db.query(Campaign).filter(Campaign.id == email_record.campaign_id).first()
        if campaign and result.overall_status == "verified":
            # Recalculate valid emails
            valid_count = bg_db.query(ScrapedEmail).filter(
                ScrapedEmail.campaign_id == campaign.id,
                ScrapedEmail.verification_status == "verified"
            ).count()
            campaign.valid_emails = valid_count
            bg_db.commit()
            
    except Exception as e:
        bg_db.rollback()
        print(f"Error in background email verification: {e}")
    finally:
        bg_db.close()


@router.post("/extension/sync", response_model=dict)
def sync_extension_data(
    payload: ExtensionSyncPayload,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Sync scraped profiles from the Chrome Extension to the backend.
    """
    campaign_id = payload.campaign_id
    
    # If no campaign ID provided, create a default "Extension Sync" campaign
    if not campaign_id:
        campaign = Campaign(
            user_id=current_user.id,
            name=f"Extension Sync - {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
            platform=payload.platform.value,
            status="completed",
            progress=100.0,
            total_scraped=len(payload.profiles),
            completed_at=datetime.utcnow()
        )
        db.add(campaign)
        db.commit()
        db.refresh(campaign)
        campaign_id = campaign.id
    else:
        campaign = db.query(Campaign).filter(
            Campaign.id == campaign_id,
            Campaign.user_id == current_user.id
        ).first()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
            
        # Update campaign stats
        campaign.total_scraped += len(payload.profiles)
        db.commit()

    processed_count = 0
    new_emails_to_verify = []

    for profile in payload.profiles:
        # Check if we already have this user in this campaign
        existing = db.query(ScrapedEmail).filter(
            ScrapedEmail.campaign_id == campaign_id,
            ScrapedEmail.source_username == profile.username
        ).first()
        
        if existing:
            continue
            
        # Create new record
        email_record = ScrapedEmail(
            campaign_id=campaign_id,
            email=profile.email or "",
            platform=payload.platform.value,
            source_username=profile.username,
            source_url=profile.external_url,
            first_name=profile.full_name,
            bio=profile.biography,
            follower_count=profile.follower_count,
            verification_status=VerificationStatus.PENDING if profile.email else VerificationStatus.INVALID,
        )
        db.add(email_record)
        db.commit()
        db.refresh(email_record)
        
        processed_count += 1
        
        # If it has an email, queue it for verification
        if profile.email:
            new_emails_to_verify.append(email_record.id)

    # Queue background tasks for verification
    for email_id in new_emails_to_verify:
        background_tasks.add_task(verify_email_task, db, email_id)

    return {
        "success": True,
        "message": f"Synced {processed_count} profiles",
        "campaign_id": campaign_id,
        "queued_for_verification": len(new_emails_to_verify)
    }
