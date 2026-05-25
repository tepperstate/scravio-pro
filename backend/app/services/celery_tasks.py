"""
Celery Tasks for Background Scraping
Handles long-running scrape jobs asynchronously
"""

from celery import Celery
from celery.utils.log import get_task_logger
from typing import Dict, List
import asyncio

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.user import Campaign, ScrapedEmail, PlatformEnum, VerificationStatusEnum
from app.scrapers import get_scraper
from app.services.dedup_engine import GlobalDeduplication
from app.services.email_verifier import verifier

logger = get_task_logger(__name__)

# Initialize Celery
celery_app = Celery(
    'SocialScravio',
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour max
    worker_prefetch_multiplier=1,
)


@celery_app.task(bind=True, name='scrape_platform')
def scrape_platform(self, user_id: int, platform: str, query: str, 
                    max_results: int, campaign_id: int):
    """
    Main scraping task - runs platform scraper in background
    
    Args:
        user_id: User performing the scrape
        platform: Platform to scrape (instagram, twitter, etc.)
        query: Search query (username, hashtag, URL)
        max_results: Maximum results to scrape
        campaign_id: Campaign ID to track progress
    """
    db = SessionLocal()
    
    try:
        # Update campaign status
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if campaign:
            campaign.status = 'running'
            db.commit()

        # Create scraper instance
        scraper = get_scraper(platform)

        # Run async scraper
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        results = loop.run_until_complete(
            scraper.scrape(query, max_results, progress_callback=None)
        )
        
        loop.close()

        # Process results
        total_scraped = 0
        valid_emails = 0
        
        all_emails = []
        
        for result in results:
            if not result.success:
                continue
                
            total_scraped += 1
            
            # Extract emails from result
            if result.emails_found:
                for email_data in result.emails_found:
                    verification = email_data.get('verification', {})
                    status = verification.get('overall_status', 'pending')
                    
                    # Map status string to enum
                    try:
                        status_enum = VerificationStatusEnum[status.upper()]
                    except:
                        status_enum = VerificationStatusEnum.PENDING
                    
                    email_record = {
                        'email': email_data['email'],
                        'platform': platform.upper(),
                        'source_username': email_data.get('source_username'),
                        'source_profile_url': result.profile_data.get('profile_url') if result.profile_data else None,
                        'first_name': result.profile_data.get('first_name') if result.profile_data else None,
                        'last_name': result.profile_data.get('last_name') if result.profile_data else None,
                        'bio': result.profile_data.get('bio') if result.profile_data else None,
                        'follower_count': result.profile_data.get('follower_count') if result.profile_data else None,
                        'verification_status': status.upper(),
                        'verification': verification,
                    }
                    all_emails.append(email_record)
                    
                    if status in ['verified', 'risky']:
                        valid_emails += 1

        # Bulk add to database with deduplication
        GlobalDeduplication.bulk_add(db, all_emails, user_id)

        # Update campaign status
        if campaign:
            campaign.status = 'completed'
            campaign.total_scraped = total_scraped
            campaign.valid_emails = valid_emails
            from datetime import datetime
            campaign.completed_at = datetime.utcnow()
            db.commit()

        # Deduct credits
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.credits_remaining -= total_scraped
            db.commit()

        return {
            'status': 'completed',
            'total_scraped': total_scraped,
            'valid_emails': valid_emails,
            'campaign_id': campaign_id,
        }

    except Exception as e:
        logger.error(f"Scrape task failed: {str(e)}")
        
        # Update campaign status
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if campaign:
            campaign.status = 'failed'
            db.commit()
        
        return {
            'status': 'failed',
            'error': str(e),
            'campaign_id': campaign_id,
        }
        
    finally:
        db.close()


@celery_app.task(name='verify_emails_batch')
def verify_emails_batch(email_ids: List[int]):
    """
    Background task to verify a batch of emails
    
    Args:
        email_ids: List of email record IDs to verify
    """
    db = SessionLocal()
    
    try:
        emails = db.query(ScrapedEmail).filter(
            ScrapedEmail.id.in_(email_ids)
        ).all()
        
        verified_count = 0
        
        for email in emails:
            result = verifier.verify(email.email)
            
            email.verification_status = VerificationStatusEnum[result.overall_status.upper()]
            email.verification_details = str(result.to_dict())
            
            verified_count += 1
            
            # Batch commit every 100
            if verified_count % 100 == 0:
                db.commit()
        
        db.commit()
        
        return {
            'status': 'completed',
            'verified_count': verified_count,
        }
        
    except Exception as e:
        logger.error(f"Verify batch failed: {str(e)}")
        return {'status': 'failed', 'error': str(e)}
        
    finally:
        db.close()


@celery_app.task(name='cleanup_old_campaigns')
def cleanup_old_campaigns(days_old: int = 30):
    """
    Periodic task to clean up old campaign data
    
    Args:
        days_old: Number of days after which to clean up
    """
    from datetime import datetime, timedelta
    
    db = SessionLocal()
    
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)
        
        # Delete old campaigns (but keep emails)
        deleted_count = db.query(Campaign).filter(
            Campaign.created_at < cutoff_date,
            Campaign.status == 'completed'
        ).delete()
        
        db.commit()
        
        return {
            'status': 'completed',
            'deleted_campaigns': deleted_count,
        }
        
    except Exception as e:
        logger.error(f"Cleanup failed: {str(e)}")
        return {'status': 'failed', 'error': str(e)}
        
    finally:
        db.close()


@celery_app.task(name='reset_monthly_credits')
def reset_monthly_credits():
    """Reset monthly credits for all users"""
    from datetime import datetime
    
    db = SessionLocal()
    
    try:
        # Reset credits for users whose reset date has passed
        users = db.query(User).filter(
            User.credits_reset_date <= datetime.utcnow()
        ).all()
        
        reset_count = 0
        
        for user in users:
            user.credits_remaining = settings.FREE_CREDITS_MONTHLY
            # Set next reset date to next month
            user.credits_reset_date = datetime.utcnow().replace(day=1)
            if user.credits_reset_date.month == 12:
                user.credits_reset_date = user.credits_reset_date.replace(year=user.credits_reset_date.year + 1, month=1)
            else:
                user.credits_reset_date = user.credits_reset_date.replace(month=user.credits_reset_date.month + 1)
            reset_count += 1
        
        db.commit()
        
        return {
            'status': 'completed',
            'reset_users': reset_count,
        }
        
    except Exception as e:
        logger.error(f"Credit reset failed: {str(e)}")
        return {'status': 'failed', 'error': str(e)}
        
    finally:
        db.close()


# Import User model
from app.models.user import User

# Celery Beat schedule for periodic tasks
celery_app.conf.beat_schedule = {
    'cleanup-old-campaigns-daily': {
        'task': 'cleanup_old_campaigns',
        'schedule': 86400.0,  # Daily (24 hours)
        'args': (30,),
    },
    'reset-monthly-credits': {
        'task': 'reset_monthly_credits',
        'schedule': 2592000.0,  # Monthly (~30 days)
        'args': (),
    },
}