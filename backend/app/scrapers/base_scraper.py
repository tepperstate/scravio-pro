"""
Base Scraper Class - Common functionality for all platform scrapers
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Optional, Callable
import asyncio
import time
from dataclasses import dataclass

from app.services.email_extractor import EmailExtractor, extract_profile_data
from app.services.email_verifier import verifier
from app.core.config import settings


@dataclass
class ProfileResult:
    """Result from scraping a single profile"""
    success: bool
    profile_data: Optional[dict] = None
    emails_found: List[dict] = None
    error: Optional[str] = None
    credits_used: int = 1


class BaseScraper(ABC):
    """Base class for all social media scrapers"""

    platform_name: str = ""
    base_url: str = ""

    def __init__(self):
        self.email_extractor = EmailExtractor()
        self.rate_limit_delay = settings.REQUEST_DELAY
        self.max_retries = settings.MAX_RETRIES
        self.use_proxies = settings.USE_PROXIES
        self.proxy_list = settings.PROXY_LIST if self.use_proxies else []

    async def scrape(self, query: str, max_results: int = 50, 
                     progress_callback: Optional[Callable] = None) -> List[ProfileResult]:
        """
        Main scraping method - to be implemented by each platform
        Args:
            query: Search query (username, hashtag, URL, etc.)
            max_results: Maximum number of profiles to scrape
            progress_callback: Optional callback for progress updates
        Returns:
        """
        raise NotImplementedError

    async def scrape_batch(self, profiles: List[str], max_results: int = None, 
                           progress_callback: Optional[Callable] = None) -> List[ProfileResult]:
        """
        Scrape an explicit list of profiles
        """
        results = []
        limit = max_results if max_results else len(profiles)
        
        for i, profile_id in enumerate(profiles[:limit]):
            result = await self._scrape_profile(profile_id)
            results.append(result)

            if progress_callback:
                progress_callback(i + 1, limit, result)

            await self.rate_limit()

        return results

    async def _scrape_profile(self, profile_identifier: str) -> ProfileResult:
        """
        Scrape a single profile for emails
        Args:
            profile_identifier: Profile URL, username, or ID
        Returns:
            ProfileResult with found emails
        """
        try:
            # Get raw profile data
            raw_data = await self._fetch_profile_data(profile_identifier)
            if not raw_data:
                return ProfileResult(success=False, error="Profile not found or inaccessible")

            # Normalize profile data
            from app.models.user import PlatformEnum
            normalized = extract_profile_data(raw_data, PlatformEnum[self.platform_name.upper()])

            # Extract emails from bio
            emails = []
            bio = normalized.get('bio', '') or ''
            external_url = normalized.get('external_url', '')

            # Combine bio and external URL for email extraction
            text_to_scan = bio
            if external_url:
                text_to_scan += f"\n{external_url}"

            # Extract emails from text
            found_emails = self.email_extractor.extract_from_text(text_to_scan)
            for email in found_emails:
                if self.email_extractor.is_potential_business_email(email):
                    emails.append({
                        'email': email,
                        'source': 'bio',
                        'source_username': normalized.get('username'),
                        'confidence': 'high'
                    })

            # If bio has links, crawl them for more emails
            if external_url and len(emails) < 3:
                linked_emails = self.email_extractor.extract_from_bio_with_link_crawl(
                    bio, normalized.get('username', ''), PlatformEnum[self.platform_name.upper()]
                )
                for email_data in linked_emails:
                    # Avoid duplicates
                    existing = [e['email'] for e in emails]
                    if email_data['email'] not in existing:
                        emails.append(email_data)

            # If we found emails, verify them
            verified_results = []
            for email_data in emails:
                result = verifier.verify(email_data['email'])
                email_data['verification'] = result.to_dict()
                email_data['is_verified'] = result.overall_status in ['verified', 'risky']
                verified_results.append(email_data)

            return ProfileResult(
                success=True,
                profile_data=normalized,
                emails_found=verified_results,
                credits_used=1
            )

        except Exception as e:
            return ProfileResult(success=False, error=str(e))

    @abstractmethod
    async def _fetch_profile_data(self, profile_identifier: str) -> Optional[dict]:
        """Fetch raw profile data from the platform - to be implemented per platform"""
        pass

    async def _search_profiles(self, query: str, max_results: int) -> List[str]:
        """
        Search for profiles matching a query - to be implemented per platform
        Returns list of profile identifiers (usernames, URLs, IDs)
        """
        raise NotImplementedError

    async def rate_limit(self):
        """Apply rate limiting between requests"""
        await asyncio.sleep(self.rate_limit_delay)

    def get_next_proxy(self) -> Optional[str]:
        """Get next proxy from the pool (round-robin)"""
        if not self.proxy_list:
            return None
        proxy = self.proxy_list[self._proxy_index % len(self.proxy_list)]
        self._proxy_index = (self._proxy_index + 1) % len(self.proxy_list)
        return proxy

    _proxy_index = 0


class ProfileSearchResult:
    """Result of a profile search"""
    def __init__(self, identifier: str, relevance_score: float = 1.0, metadata: dict = None):
        self.identifier = identifier
        self.relevance_score = relevance_score
        self.metadata = metadata or {}