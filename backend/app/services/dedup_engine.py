"""
Deduplication Engine
Ensures all exported emails are unique and not duplicates
"""

from typing import List, Set, Optional, Dict
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.user import ScrapedEmail


class DeduplicationEngine:
    """
    Handles deduplication of scraped emails at multiple levels:
    1. Within current scrape batch
    2. Against all previously scraped emails (global dedup)
    3. Against user's suppression list
    """

    def __init__(self, db: Session = None, user_id: int = None):
        self.db = db
        self.user_id = user_id
        self._seen_emails: Set[str] = set()
        self._loaded = False

    def load_existing_emails(self) -> Set[str]:
        """Load all existing emails from database for fast lookup"""
        if not self.db:
            return set()
        
        try:
            # Load all emails
            query = self.db.query(ScrapedEmail.email)
            if self.user_id:
                # Option to limit to user's scope
                query = query.filter(ScrapedEmail.user_id == self.user_id)
            
            self._seen_emails = set(email[0].lower() for email in query.all())
            self._loaded = True
            return self._seen_emails
        except Exception as e:
            print(f"Error loading existing emails: {e}")
            return set()

    def deduplicate_batch(self, emails: List[Dict]) -> tuple[List[Dict], List[Dict]]:
        """
        Deduplicate a batch of emails
        
        Returns:
            (unique_emails, duplicates)
        """
        if not self._loaded:
            self.load_existing_emails()
        
        unique = []
        duplicates = []
        
        for email_data in emails:
            email = email_data.get('email', '').lower()
            
            if not email:
                continue
            
            # Check if already seen (in batch or database)
            if email in self._seen_emails:
                email_data['duplicate_reason'] = 'already_scraped'
                duplicates.append(email_data)
            else:
                # Add to seen set
                self._seen_emails.add(email)
                email_data['is_duplicate'] = False
                unique.append(email_data)
        
        return unique, duplicates

    def check_suppression_list(self, emails: List[Dict], 
                               suppression_list: List[str] = None) -> List[Dict]:
        """Filter out emails that are on the suppression list"""
        if not suppression_list:
            return emails
        
        suppression_set = set(e.lower() for e in suppression_list)
        
        filtered = []
        for email_data in emails:
            email = email_data.get('email', '').lower()
            if email not in suppression_set:
                filtered.append(email_data)
            else:
                email_data['suppressed'] = True
                
        return filtered

    def get_duplicate_count(self) -> int:
        """Return count of unique emails seen"""
        return len(self._seen_emails)

    def clear_cache(self):
        """Clear the in-memory cache"""
        self._seen_emails.clear()
        self._loaded = False


class GlobalDeduplication:
    """
    Global deduplication service - shared across all scrapers
    Uses database for persistence
    """

    @staticmethod
    def is_duplicate(db: Session, email: str) -> bool:
        """Check if email exists in database"""
        normalized_email = email.lower().strip()
        
        existing = db.query(ScrapedEmail).filter(
            ScrapedEmail.email == normalized_email
        ).first()
        
        return existing is not None

    @staticmethod
    def add_email(db: Session, email_data: dict, user_id: int) -> ScrapedEmail:
        """Add a new email to the database"""
        from app.models.user import PlatformEnum, VerificationStatusEnum
        
        email = email_data.get('email', '').lower().strip()
        
        # Check again before inserting
        existing = db.query(ScrapedEmail).filter(
            ScrapedEmail.email == email
        ).first()
        
        if existing:
            existing.is_duplicate = True
            existing.duplicate_count = getattr(existing, 'duplicate_count', 0) + 1
            db.commit()
            return existing
        
        # Create new record
        new_email = ScrapedEmail(
            email=email,
            platform=PlatformEnum[email_data.get('platform', 'INSTAGRAM').upper()],
            source_username=email_data.get('source_username'),
            source_url=email_data.get('source_url'),
            source_profile_url=email_data.get('source_profile_url'),
            user_id=user_id,
            first_name=email_data.get('first_name'),
            last_name=email_data.get('last_name'),
            bio=email_data.get('bio'),
            follower_count=email_data.get('follower_count'),
            verification_status=VerificationStatusEnum[email_data.get('verification_status', 'PENDING').upper()],
            verification_details=str(email_data.get('verification', {})),
            is_duplicate=False,
        )
        
        db.add(new_email)
        db.commit()
        db.refresh(new_email)
        
        return new_email

    @staticmethod
    def bulk_add(db: Session, emails: List[dict], user_id: int) -> List[ScrapedEmail]:
        """Add multiple emails efficiently"""
        from app.models.user import PlatformEnum, VerificationStatusEnum
        
        results = []
        seen = set()
        
        # Get existing emails in batch
        existing_emails = db.query(ScrapedEmail.email).filter(
            ScrapedEmail.email.in_([e.get('email', '').lower() for e in emails])
        ).all()
        seen.update(email[0].lower() for email in existing_emails)
        
        for email_data in emails:
            email = email_data.get('email', '').lower().strip()
            
            if not email or email in seen:
                continue
            
            new_email = ScrapedEmail(
                email=email,
                platform=PlatformEnum[email_data.get('platform', 'INSTAGRAM').upper()],
                source_username=email_data.get('source_username'),
                source_url=email_data.get('source_url'),
                source_profile_url=email_data.get('source_profile_url'),
                user_id=user_id,
                first_name=email_data.get('first_name'),
                last_name=email_data.get('last_name'),
                bio=email_data.get('bio'),
                follower_count=email_data.get('follower_count'),
                verification_status=VerificationStatusEnum[email_data.get('verification_status', 'PENDING').upper()],
                is_duplicate=False,
            )
            
            db.add(new_email)
            seen.add(email)
            results.append(new_email)
        
        if results:
            db.commit()
            for email in results:
                db.refresh(email)
        
        return results


# Utility functions
def merge_email_lists(list1: List[dict], list2: List[dict]) -> List[dict]:
    """Merge two email lists, removing duplicates"""
    seen = set()
    merged = []
    
    for email_data in list1 + list2:
        email = email_data.get('email', '').lower()
        if email and email not in seen:
            seen.add(email)
            merged.append(email_data)
    
    return merged


def group_by_domain(emails: List[dict]) -> Dict[str, List[dict]]:
    """Group emails by their domain"""
    groups = {}
    
    for email_data in emails:
        email = email_data.get('email', '')
        domain = email.split('@')[1] if '@' in email else 'unknown'
        
        if domain not in groups:
            groups[domain] = []
        groups[domain].append(email_data)
    
    return groups


def filter_by_quality(emails: List[dict], min_verification_score: float = 0.5) -> List[dict]:
    """Filter emails by verification quality"""
    filtered = []
    
    for email_data in emails:
        verification = email_data.get('verification', {})
        risk_score = verification.get('risk_score', 1.0)
        
        if risk_score <= min_verification_score:
            filtered.append(email_data)
    
    return filtered