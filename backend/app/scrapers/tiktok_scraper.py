"""
TikTok Email Scraper
Extract emails from TikTok creator profiles
"""

import asyncio
import re
from typing import List, Optional, Dict

from app.scrapers.base_scraper import BaseScraper, ProfileResult


class TikTokScraper(BaseScraper):
    """Scraper for TikTok profiles"""
    
    platform_name = "tiktok"
    base_url = "https://tiktok.com"

    async def scrape(self, query: str, max_results: int = 50,
                     progress_callback=None) -> List[ProfileResult]:
        """
        Scrape TikTok for emails
        
        Args:
            query: TikTok username or profile URL
            max_results: Maximum profiles to scrape
        """
        results = []

        if 'tiktok.com' in query.lower():
            # Profile URL
            username = self._extract_username_from_url(query)
            result = await self._scrape_profile(username or query)
            results.append(result)
        else:
            # Search for profiles
            profiles = await self._search_profiles(query, max_results)
            for profile_id in profiles:
                result = await self._scrape_profile(profile_id)
                results.append(result)
                await self.rate_limit()

        return results

    async def _fetch_profile_data(self, profile_identifier: str) -> Optional[dict]:
        """Fetch TikTok profile data"""
        try:
            username = profile_identifier.lstrip('@')
            
            # Try TikTokApi (unofficial API)
            try:
                from TikTokApi import TikTokApi
                
                async with TikTokApi() as api:
                    user = await api.user(username=username)
                    user_data = await user.info()
                    
                    if user_data:
                        return self._parse_tiktok_response(user_data)
            except ImportError:
                pass
            
            # Fallback to web scraping
            return await self._fetch_profile_web(username)

        except Exception as e:
            print(f"Error fetching TikTok profile {profile_identifier}: {e}")
            return await self._fetch_profile_web(profile_identifier.lstrip('@'))

    USER_AGENTS = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
    ]

    async def _fetch_profile_web(self, username: str) -> Optional[dict]:
        """Fetch TikTok profile via web scraping with backoff"""
        import requests
        import time
        import random
        from app.services.proxy_manager import proxy_manager
        
        url = f"https://www.tiktok.com/@{username.lstrip('@')}"
        max_retries = 3
        
        for attempt in range(max_retries):
            try:
                proxy = proxy_manager.get_proxy()
                user_agent = random.choice(self.USER_AGENTS)
                
                response = requests.get(
                    url,
                    headers={
                        'User-Agent': user_agent,
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Sec-Fetch-Site': 'none',
                        'Sec-Fetch-Mode': 'navigate',
                        'Sec-Fetch-Dest': 'document'
                    },
                    proxies=proxy,
                    timeout=15
                )

                if response.status_code == 200:
                    # TikTok embeds JSON data in the page
                    import re
                    
                    # Try to find embedded JSON
                    patterns = [
                        r'"user":(\{[^}]+\})',
                        r'"uniqueId":"([^"]+)".*?"nickname":"([^"]+)".*?"signature":"([^"]*)"',
                    ]
                    
                    for pattern in patterns:
                        match = re.search(pattern, response.text)
                        if match:
                            # Parse the JSON data
                            try:
                                import json
                                data = json.loads(match.group(0).replace('"user":', '').replace('\\"', '"'))
                                return {
                                    'username': data.get('uniqueId', username),
                                    'nickname': data.get('nickname', ''),
                                    'signature': data.get('signature', ''),
                                    'bio': data.get('signature', ''),
                                    'follower_count': data.get('followerCount', 0),
                                    'following_count': data.get('followingCount', 0),
                                    'heart_count': data.get('heartCount', 0),
                                    'video_count': data.get('videoCount', 0),
                                    'verified': data.get('verified', False),
                                    'tiktok_url': url,
                                }
                            except:
                                pass
                            
                    # Simpler extraction from text
                    return {
                        'username': username,
                        'tiktok_url': url,
                        'raw_html': response.text[:3000],
                    }
                    
            except Exception as e:
                print(f"TikTok scrape attempt {attempt+1} failed: {e}")
                
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt + random.uniform(0.5, 1.5))
                
        return None

    def _parse_tiktok_response(self, data: dict) -> dict:
        """Parse TikTok API response"""
        user = data.get('user', {})
        
        return {
            'username': user.get('uniqueId'),
            'nickname': user.get('nickname'),
            'signature': user.get('signature'),
            'bio': user.get('signature'),
            'follower_count': user.get('followerCount'),
            'following_count': user.get('followingCount'),
            'heart_count': user.get('heartCount'),
            'video_count': user.get('videoCount'),
            'verified': user.get('verified'),
            'profile_image': user.get('avatarLarger'),
            'tiktok_url': f"https://tiktok.com/@{user.get('uniqueId')}",
        }

    async def _search_profiles(self, query: str, max_results: int) -> List[str]:
        """Search for TikTok profiles"""
        # TikTok search API requires authentication
        # This is a simplified implementation
        return [query.lstrip('@')] if query else []

    def _extract_username_from_url(self, url: str) -> Optional[str]:
        """Extract username from TikTok URL"""
        pattern = r'tiktok\.com/@([a-zA-Z0-9._]+)'
        match = re.search(pattern, url)
        return match.group(1) if match else None

    def extract_emails_from_bio(self, bio: str) -> List[str]:
        """Extract emails from TikTok bio"""
        emails = []
        
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        found = re.findall(email_pattern, bio)
        
        for email in found:
            emails.append(email.lower())
                
        return emails

    async def get_trending_creators(self, max_results: int = 50) -> List[str]:
        """Get trending TikTok creators"""
        # Would need TikTok API access
        return []