"""
TikTok Email Scraper
Extract emails from TikTok creator profiles via SIGI_STATE embedded JSON
"""

import asyncio
import re
import json
import random
from typing import List, Optional, Dict
import httpx
from bs4 import BeautifulSoup

from app.scrapers.base_scraper import BaseScraper, ProfileResult

class TikTokScraper(BaseScraper):
    """Scraper for TikTok profiles using web requests"""
    
    platform_name = "tiktok"
    base_url = "https://tiktok.com"

    USER_AGENTS = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ]

    async def scrape(self, query: str, max_results: int = 50, progress_callback=None) -> List[ProfileResult]:
        results = []

        if 'tiktok.com' in query.lower():
            username = self._extract_username_from_url(query)
            result = await self._scrape_profile(username or query)
            results.append(result)
        else:
            profiles = [query.lstrip('@')]
            for profile_id in profiles:
                result = await self._scrape_profile(profile_id)
                results.append(result)
                await self.rate_limit()

        return results

    async def _fetch_profile_data(self, profile_identifier: str) -> Optional[dict]:
        """Fetch TikTok profile data from the embedded SIGI_STATE object"""
        username = profile_identifier.lstrip('@')
        url = f"https://www.tiktok.com/@{username}"
        
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(url, headers={
                    'User-Agent': self.USER_AGENTS[0],
                    'Accept': 'text/html,application/xhtml+xml',
                    'sec-fetch-mode': 'navigate'
                })
                
                if res.status_code == 200:
                    data = self._extract_sigi_state(res.text)
                    if data:
                        data['tiktok_url'] = url
                        data['username'] = username
                        return data
        except Exception as e:
            print(f"Error fetching TikTok profile {profile_identifier}: {e}")
            
        return None

    def _extract_sigi_state(self, html: str) -> dict:
        """Parse TikTok's universal state object from the DOM"""
        data = {}
        try:
            match = re.search(r'id="SIGI_STATE">(.*?)</script>', html)
            if match:
                sigi_state = json.loads(match.group(1))
                
                # Navigate standard TikTok state structure
                user_module = sigi_state.get('UserModule', {})
                users = user_module.get('users', {})
                
                if users:
                    # Usually only one user in this dictionary for a profile page
                    user_id = list(users.keys())[0]
                    user_data = users[user_id]
                    
                    data['nickname'] = user_data.get('nickname', '')
                    data['bio'] = user_data.get('signature', '')
                    data['follower_count'] = user_data.get('followerCount', 0)
                    data['following_count'] = user_data.get('followingCount', 0)
                    data['heart_count'] = user_data.get('heartCount', 0)
                    data['video_count'] = user_data.get('videoCount', 0)
                    data['verified'] = user_data.get('verified', False)
                    data['profile_image'] = user_data.get('avatarLarger', '')
        except Exception as e:
            print(f"JSON extract error: {e}")
            
        return data

    def _extract_username_from_url(self, url: str) -> Optional[str]:
        pattern = r'tiktok\.com/@([a-zA-Z0-9._]+)'
        match = re.search(pattern, url)
        return match.group(1) if match else None

    def extract_emails_from_bio(self, bio: str) -> List[str]:
        emails = []
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        obfuscated_pattern = r'([a-zA-Z0-9._%+-]+)\s*(?:\[at\]|\(at\)|@)\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})'
        
        found = re.findall(email_pattern, bio)
        obfuscated = re.findall(obfuscated_pattern, bio)
        
        for email in found:
            emails.append(email.lower())
            
        for user, domain in obfuscated:
            emails.append(f"{user}@{domain}".lower())
                
        return list(set(emails))