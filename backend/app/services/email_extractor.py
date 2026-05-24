"""
Email Extraction Engine
Extracts email addresses from text, bios, websites, and social media profiles
"""

import re
from typing import List, Optional, Set
from urllib.parse import urlparse
import requests
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session

from app.models.user import ScrapedEmail, PlatformEnum


# Email regex pattern - comprehensive
EMAIL_PATTERN = re.compile(
    r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
    re.IGNORECASE
)

# Common disposable email domains to filter out
DISPOSABLE_DOMAINS = {
    'tempmail.com', 'throwaway.email', 'guerrillamail.com', 'mailinator.com',
    '10minutemail.com', 'temp-mail.org', 'fakeinbox.com', 'trashmail.com',
    'yopmail.com', 'getnada.com', 'maildrop.cc', 'mohmal.com', 'tempail.com',
    'dispostable.com', 'mailnesia.com', 'spamgourmet.com', 'mintemail.com',
    'mytrashmail.com', 'mailcatch.com', 'sharklasers.com', 'guerrillamailblock.com',
}

# Known email providers that shouldn't be scraped as business emails
PUBLIC_EMAIL_PROVIDERS = {
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
    'icloud.com', 'protonmail.com', 'mail.com', 'zoho.com', 'yandex.com',
    'gmx.com', 'fastmail.com', 'tutanota.com', 'hey.com', 'skiff.com',
}


class EmailExtractor:
    """Extract emails from various sources"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
    
    def extract_from_text(self, text: str) -> List[str]:
        """Extract emails from plain text"""
        if not text:
            return []
        
        emails = set()
        found = EMAIL_PATTERN.findall(text)
        
        for email in found:
            email_lower = email.lower()
            # Filter out disposable emails
            domain = email_lower.split('@')[1] if '@' in email_lower else ''
            if domain and domain not in DISPOSABLE_DOMAINS:
                emails.add(email_lower)
        
        return list(emails)
    
    def extract_from_url(self, url: str, timeout: int = 10) -> List[str]:
        """Extract emails from a URL's page content"""
        if not url:
            return []
        
        try:
            response = self.session.get(url, timeout=timeout, allow_redirects=True)
            if response.status_code == 200:
                return self.extract_from_text(response.text)
        except Exception as e:
            print(f"Error fetching URL {url}: {e}")
        
        return []
    
    def find_social_links(self, text: str) -> dict:
        """Find social media profile links in text"""
        social_patterns = {
            'instagram': r'instagram\.com/([a-zA-Z0-9._]+)',
            'twitter': r'twitter\.com/([a-zA-Z0-9._]+)',
            'youtube': r'youtube\.com/(@?[a-zA-Z0-9_]+)',
            'linkedin': r'linkedin\.com/in/([a-zA-Z0-9_-]+)',
            'tiktok': r'tiktok\.com/@([a-zA-Z0-9._]+)',
            'facebook': r'facebook\.com/([a-zA-Z0-9._]+)',
            'website': r'(https?://(?!.*(?:instagram|twitter|youtube|linkedin|tiktok|facebook))[^\s]+)',
        }
        
        found = {}
        for platform, pattern in social_patterns.items():
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                found[platform] = matches
        
        return found
    
    def extract_from_bio_with_link_crawl(self, bio: str, username: str, platform: PlatformEnum, max_depth: int = 2) -> List[dict]:
        """Extract emails from a bio by following external links"""
        if not bio:
            return []
        
        results = []
        
        # First, extract emails directly from bio
        direct_emails = self.extract_from_text(bio)
        for email in direct_emails:
            results.append({
                'email': email,
                'source': 'bio_direct',
                'source_username': username,
                'confidence': 'high'
            })
        
        # Find URLs in bio that might lead to contact pages
        url_pattern = r'https?://[^\s]+'
        urls = re.findall(url_pattern, bio)
        
        for url in urls:
            if len(results) >= 5:  # Limit results
                break
            
            # Clean up URL
            url = url.rstrip('.,;:')
            
            # Skip known social platforms, focus on personal websites
            skip_platforms = ['instagram.com', 'twitter.com', 'youtube.com', 
                             'linkedin.com', 'tiktok.com', 'facebook.com',
                             'threads.net', 'snapchat.com']
            
            should_skip = any(platform in url.lower() for platform in skip_platforms)
            
            if not should_skip:
                emails = self.extract_from_url(url)
                for email in emails:
                    # Skip public email providers for contact pages
                    domain = email.split('@')[1].lower()
                    if domain not in PUBLIC_EMAIL_PROVIDERS:
                        results.append({
                            'email': email,
                            'source': f'linked_website:{url}',
                            'source_username': username,
                            'confidence': 'medium'
                        })
        
        return results
    
    def is_potential_business_email(self, email: str) -> bool:
        """Check if an email looks like a business email (not personal)"""
        domain = email.split('@')[1].lower() if '@' in email else ''
        
        # Filter out public email providers
        if domain in PUBLIC_EMAIL_PROVIDERS:
            return False
        
        # Filter out disposable domains
        if domain in DISPOSABLE_DOMAINS:
            return False
        
        return True


def extract_profile_data(raw_data: dict, platform: PlatformEnum) -> dict:
    """Normalize profile data from different platforms"""
    normalized = {
        'platform': platform,
        'username': None,
        'full_name': None,
        'bio': None,
        'follower_count': None,
        'profile_url': None,
        'external_url': None,
    }
    
    if platform == PlatformEnum.INSTAGRAM:
        normalized['username'] = raw_data.get('username') or raw_data.get('username')
        normalized['full_name'] = raw_data.get('full_name') or raw_data.get('full_name', '')
        normalized['bio'] = raw_data.get('biography') or raw_data.get('bio', '')
        normalized['follower_count'] = raw_data.get('followers') or raw_data.get('follower_count', 0)
        normalized['profile_url'] = f"https://instagram.com/{normalized['username']}"
        normalized['external_url'] = raw_data.get('external_url') or raw_data.get('website')
        
    elif platform == PlatformEnum.TWITTER:
        normalized['username'] = raw_data.get('username') or raw_data.get('screen_name')
        normalized['full_name'] = raw_data.get('name')
        normalized['bio'] = raw_data.get('description') or raw_data.get('bio', '')
        normalized['follower_count'] = raw_data.get('followers_count', 0)
        normalized['profile_url'] = f"https://twitter.com/{normalized['username']}"
        
    elif platform == PlatformEnum.YOUTUBE:
        normalized['username'] = raw_data.get('channel_id') or raw_data.get('handle')
        normalized['full_name'] = raw_data.get('title')
        normalized['bio'] = raw_data.get('description', '')
        normalized['follower_count'] = raw_data.get('subscriber_count', 0)
        normalized['profile_url'] = f"https://youtube.com/channel/{raw_data.get('channel_id')}"
        
    elif platform == PlatformEnum.LINKEDIN:
        normalized['username'] = raw_data.get('urn') or raw_data.get('public_id')
        normalized['full_name'] = raw_data.get('full_name') or raw_data.get('first_name', '') + ' ' + raw_data.get('last_name', '')
        normalized['bio'] = raw_data.get('headline', '') + ' ' + raw_data.get('summary', '')
        normalized['profile_url'] = raw_data.get('linkedin_url')
        
    elif platform == PlatformEnum.TIKTOK:
        normalized['username'] = raw_data.get('username') or raw_data.get('unique_id')
        normalized['full_name'] = raw_data.get('nickname')
        normalized['bio'] = raw_data.get('signature') or raw_data.get('bio', '')
        normalized['follower_count'] = raw_data.get('follower_count', 0)
        normalized['profile_url'] = f"https://tiktok.com/@{normalized['username']}"
        
    elif platform == PlatformEnum.FACEBOOK:
        normalized['username'] = raw_data.get('username') or raw_data.get('id')
        normalized['full_name'] = raw_data.get('name')
        normalized['bio'] = raw_data.get('about', '') or raw_data.get('description', '')
        normalized['profile_url'] = raw_data.get('facebook_url')

    return normalized