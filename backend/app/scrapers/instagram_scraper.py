"""
Instagram Email Scraper
Extract emails from Instagram using modern unauthenticated GraphQL and web endpoints
"""

import asyncio
import re
import json
import random
from typing import List, Optional, Dict
import httpx

from app.scrapers.base_scraper import BaseScraper, ProfileResult

class InstagramScraper(BaseScraper):
    """Scraper for Instagram profiles using modern endpoints"""
    
    platform_name = "instagram"
    base_url = "https://instagram.com"

    USER_AGENTS = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
    ]

    def __init__(self):
        super().__init__()
        self.session_id = None
        self.csrf_token = None

    async def _init_session(self):
        if not self.csrf_token:
            async with httpx.AsyncClient() as client:
                try:
                    res = await client.get('https://www.instagram.com/', headers={'User-Agent': random.choice(self.USER_AGENTS)})
                    self.csrf_token = res.cookies.get('csrftoken', 'missing')
                except:
                    self.csrf_token = 'fallback_token'

    async def scrape(self, query: str, max_results: int = 50, progress_callback=None) -> List[ProfileResult]:
        await self._init_session()
        results = []

        if query.startswith('#'):
            profiles = await self._get_hashtag_posts(query, max_results)
        elif '/' in query:
            username = self._extract_username_from_url(query)
            profiles = [username] if username else []
        else:
            profiles = [query.lstrip('@')] if query else []

        for i, profile_id in enumerate(profiles):
            result = await self._scrape_profile(profile_id)
            results.append(result)
            if progress_callback:
                progress_callback(i + 1, len(profiles), result)
            await self.rate_limit()

        return results

    async def _fetch_profile_data(self, profile_identifier: str) -> Optional[dict]:
        username = profile_identifier.lstrip('@')
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                headers = {
                    'User-Agent': random.choice(self.USER_AGENTS),
                    'x-ig-app-id': '936619743392459', # Instagram Web App ID
                    'x-ig-www-claim': '0',
                    'sec-fetch-site': 'same-origin',
                }
                
                # Use the web API endpoint instead of the standard page to avoid HTML parsing logic blocks
                res = await client.get(f"https://www.instagram.com/api/v1/users/web_profile_info/?username={username}", headers=headers)
                
                if res.status_code == 200:
                    data = res.json()
                    user = data.get('data', {}).get('user', {})
                    if user:
                        return {
                            'username': user.get('username'),
                            'full_name': user.get('full_name'),
                            'biography': user.get('biography', ''),
                            'followers': user.get('edge_followed_by', {}).get('count', 0),
                            'instagram_url': f"https://instagram.com/{user.get('username')}",
                        }
        except Exception as e:
            print(f"Error fetching Instagram profile {profile_identifier}: {e}")
        return None

    async def _get_hashtag_posts(self, hashtag: str, max_results: int) -> List[str]:
        # Minimal implementation for unauthenticated hashtag search
        return []

    async def get_followers(self, username: str, max_results: int = 1000) -> List[str]:
        # Requires auth in 2025/2026 for server-side. Browser extension injection handles this.
        return []

    def _extract_username_from_url(self, url: str) -> Optional[str]:
        patterns = [r'instagram\.com/([a-zA-Z0-9._]+)/?', r'instagram\.com/([a-zA-Z0-9._]+)$']
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                username = match.group(1)
                excluded = ['p', 'reel', 'explore', 'accounts', 'login', 'about']
                if username.lower() not in excluded:
                    return username
        return None