"""
Instagram Email Scraper
Extract emails from Instagram profiles, hashtags, followers, and commenters
"""

import asyncio
import re
import instaloader
from typing import List, Optional, Dict
from datetime import datetime

from app.scrapers.base_scraper import BaseScraper, ProfileResult, ProfileSearchResult


class InstagramScraper(BaseScraper):
    """Scraper for Instagram profiles"""
    
    platform_name = "instagram"
    base_url = "https://instagram.com"

    def __init__(self):
        super().__init__()
        self.loader = instaloader.Instaloader(
            download_pictures=False,
            download_videos=False,
            download_video_thumbnails=False,
            download_comments=False,
            save_metadata=False,
            compress_json=False,
        )
        # Optional: login for more access
        # self.loader.login(username, password)

    async def scrape(self, query: str, max_results: int = 50,
                     progress_callback=None) -> List[ProfileResult]:
        """
        Scrape Instagram for emails
        
        Args:
            query: Can be a username, hashtag (with #), or profile URL
            max_results: Maximum profiles to scrape
        """
        results = []

        # Determine search type
        if query.startswith('#'):
            # Hashtag search
            profiles = await self._get_hashtag_followers(query, max_results)
        elif '/' in query:
            # Profile URL - extract username
            username = self._extract_username_from_url(query)
            profiles = [username] if username else []
        else:
            # Single username or search
            profiles = await self._search_profiles(query, max_results)

        # Scrape each profile
        for i, profile_id in enumerate(profiles):
            result = await self._scrape_profile(profile_id)
            results.append(result)

            if progress_callback:
                progress_callback(i + 1, len(profiles), result)

            # Rate limit
            await self.rate_limit()

        return results

    async def _fetch_profile_data(self, profile_identifier: str) -> Optional[dict]:
        """Fetch Instagram profile data"""
        try:
            username = profile_identifier.lstrip('@')
            
            # Using the public API scraper instead of instaloader to prevent hanging on rate limits
            return await InstagramAPIScraper.get_profile_public(username)
            
        except Exception as e:
            print(f"Error fetching Instagram profile {profile_identifier}: {e}")
            return None

    async def _search_profiles(self, query: str, max_results: int) -> List[str]:
        """Search for Instagram profiles"""
        # For username search, just return the username
        # Instagram doesn't have a public search API
        return [query.lstrip('@')] if query else []

    async def _get_hashtag_followers(self, hashtag: str, max_results: int) -> List[str]:
        """Get profiles that posted with a specific hashtag"""
        profiles = []
        
        try:
            hashtag_name = hashtag.lstrip('#')
            count = 0
            
            # Use instaloader to get posts with hashtag
            for post in instaloader.Hashtag.from_name(self.loader.context, hashtag_name).get_posts():
                if count >= max_results:
                    break
                
                # Get the profile that posted
                if post.owner_profile:
                    username = post.owner_profile.username
                    if username not in profiles:
                        profiles.append(username)
                        count += 1
                        
        except Exception as e:
            print(f"Error getting hashtag followers: {e}")
        
        return profiles

    async def get_followers(self, username: str, max_results: int = 1000) -> List[str]:
        """Get list of followers for a profile"""
        followers = []
        
        try:
            profile = instaloader.Profile.from_username(self.loader.context, username)
            
            for count, follower in enumerate(profile.get_followers()):
                if count >= max_results:
                    break
                followers.append(follower.username)
                
        except Exception as e:
            print(f"Error getting followers: {e}")
            
        return followers

    async def get_post_commenters(self, shortcode: str, max_results: int = 100) -> List[str]:
        """Get users who commented on a post"""
        commenters = []
        
        try:
            post = instaloader.Post.from_shortcode(self.loader.context, shortcode)
            
            for count, comment in enumerate(post.get_comments()):
                if count >= max_results:
                    break
                username = comment.owner.username
                if username not in commenters:
                    commenters.append(username)
                    
        except Exception as e:
            print(f"Error getting commenters: {e}")
            
        return commenters

    def _extract_username_from_url(self, url: str) -> Optional[str]:
        """Extract username from Instagram URL"""
        patterns = [
            r'instagram\.com/([a-zA-Z0-9._]+)/?',
            r'instagram\.com/([a-zA-Z0-9._]+)$',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                username = match.group(1)
                # Exclude common non-profile paths
                excluded = ['p', 'reel', 'explore', 'accounts', 'login', 'about', 'blog', 'help']
                if username.lower() not in excluded:
                    return username
        return None


# For simpler use without login
class InstagramAPIScraper:
    """Alternative scraper using public endpoints (limited)"""
    
    USER_AGENTS = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
    ]
    
    @staticmethod
    async def get_profile_public(username: str) -> Optional[dict]:
        """Get public profile info via web scraping with exponential backoff"""
        import requests
        import time
        import random
        from app.services.proxy_manager import proxy_manager
        
        max_retries = 3
        for attempt in range(max_retries):
            try:
                proxy = proxy_manager.get_proxy()
                user_agent = random.choice(InstagramAPIScraper.USER_AGENTS)
                
                response = requests.get(
                    f"https://instagram.com/{username}/",
                    headers={
                        'User-Agent': user_agent,
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                        'Sec-Fetch-Dest': 'document',
                        'Sec-Fetch-Mode': 'navigate',
                        'Sec-Fetch-Site': 'none'
                    },
                    proxies=proxy,
                    timeout=15
                )
                
                if response.status_code == 200:
                    # Find JSON data in page - multiple regex strategies
                    import re
                    
                    # Pattern 1: Direct meta tags
                    followers_meta = re.search(r'<meta content="([\d.,]+)\s*Followers', response.text, re.IGNORECASE)
                    
                    # Pattern 2: Shared data JSON
                    pattern = r'"username":"([^"]+)".*?"full_name":"([^"]+)".*?"biography":"([^"]*)".*?"followers_count":(\d+)'
                    match = re.search(pattern, response.text)
                    
                    if match:
                        return {
                            'username': match.group(1),
                            'full_name': match.group(2),
                            'biography': match.group(3).replace('\\n', '\n'),
                            'followers': int(match.group(4)),
                            'instagram_url': f"https://instagram.com/{match.group(1)}",
                        }
                    elif followers_meta:
                        followers_str = followers_meta.group(1).replace(',', '').replace('.', '')
                        return {
                            'username': username,
                            'full_name': username,
                            'biography': '',
                            'followers': int(followers_str) if followers_str.isdigit() else 0,
                            'instagram_url': f"https://instagram.com/{username}",
                        }
                        
            except Exception as e:
                print(f"Instagram scrape attempt {attempt+1} failed: {e}")
                
            if attempt < max_retries - 1:
                # Exponential backoff
                await asyncio.sleep(2 ** attempt + random.uniform(0.5, 1.5))
                
        return None