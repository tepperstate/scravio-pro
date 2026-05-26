"""
Facebook Email Scraper
Extract emails from Facebook public pages and profiles
"""

import asyncio
import re
import json
import random
from typing import List, Optional, Dict
import httpx

from app.scrapers.base_scraper import BaseScraper, ProfileResult

class FacebookScraper(BaseScraper):
    """Scraper for Facebook pages and profiles"""
    
    platform_name = "facebook"
    base_url = "https://facebook.com"

    USER_AGENTS = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ]

    async def scrape(self, query: str, max_results: int = 50,
                     progress_callback=None) -> List[ProfileResult]:
        """Scrape Facebook for emails"""
        results = []

        if 'facebook.com' in query.lower():
            identifier = self._extract_page_id_from_url(query)
            if identifier:
                result = await self._scrape_profile(identifier)
                results.append(result)
        else:
            pages = await self._search_pages(query, max_results)
            for page_id in pages:
                result = await self._scrape_profile(page_id)
                results.append(result)
                await self.rate_limit()

        return results

    async def _fetch_profile_data(self, profile_identifier: str) -> Optional[dict]:
        """Fetch Facebook page/profile data via modern GraphQL simulation"""
        try:
            url = f"https://www.facebook.com/{profile_identifier.lstrip('/')}"
            
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(url, headers={
                    'User-Agent': random.choice(self.USER_AGENTS),
                    'Accept-Language': 'en-US,en;q=0.9',
                    'sec-fetch-site': 'none'
                })
                
                if res.status_code == 200:
                    data = self._extract_from_html(res.text)
                    data['facebook_url'] = url
                    return data
        except Exception as e:
            print(f"Error fetching Facebook profile {profile_identifier}: {e}")
        return None

    def _extract_from_html(self, html: str) -> dict:
        data = {}
        # Try to find name
        name_match = re.search(r'"name":"([^"]+)"', html)
        if name_match:
            data['name'] = name_match.group(1)
        
        # Try to find about section via embedded JSON strings
        about_match = re.search(r'"about":"([^"]*)"', html)
        if about_match:
            data['about'] = about_match.group(1).replace('\\n', ' ').replace('\\"', '"')
        
        # Check emails specifically embedded in the page
        email_pattern = r'([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})'
        emails = re.findall(email_pattern, html)
        # Filter out common FB emails
        filtered_emails = [e for e in emails if 'facebook' not in e.lower() and 'fb.com' not in e.lower()]
        
        # Merge discovered emails into the 'about' string so the base scraper picks it up
        if filtered_emails:
            data['about'] = data.get('about', '') + " " + " ".join(filtered_emails)
            
        return data

    async def _search_pages(self, query: str, max_results: int) -> List[str]:
        return [query.replace(' ', '').lower()]

    def _extract_page_id_from_url(self, url: str) -> Optional[str]:
        patterns = [
            r'facebook\.com/([a-zA-Z0-9._-]+)/?$',
            r'facebook\.com/pages/[^/]+/(\d+)',
            r'facebook\.com/groups/(\d+)',
        ]
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
                
        match = re.search(r'facebook\.com/([^?]+)', url)
        if match:
            identifier = match.group(1).rstrip('/')
            if identifier not in ['pages', 'groups', 'photo', 'video', 'permalink']:
                return identifier
        return None

    def extract_emails_from_about(self, about_text: str) -> List[str]:
        emails = []
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        found = re.findall(email_pattern, about_text)
        for email in found:
            emails.append(email.lower())
        return emails