"""
Twitter/X Email Scraper
Extract emails from Twitter/X public profiles
"""

import asyncio
import re
from typing import List, Optional, Dict
import snscrape.modules.twitter as sntwitter
from datetime import datetime

from app.scrapers.base_scraper import BaseScraper, ProfileResult


class TwitterScraper(BaseScraper):
    """Scraper for Twitter/X profiles"""
    
    platform_name = "twitter"
    base_url = "https://twitter.com"

    async def scrape(self, query: str, max_results: int = 50,
                     progress_callback=None) -> List[ProfileResult]:
        """
        Scrape Twitter for emails
        
        Args:
            query: Can be a username, search query, or hashtag
            max_results: Maximum profiles to scrape
        """
        results = []

        # Determine search type
        if query.startswith('#'):
            # Hashtag search
            profiles = await self._search_by_hashtag(query, max_results)
        elif query.startswith('@'):
            # Direct username
            profile_id = query.lstrip('@')
            result = await self._scrape_profile(profile_id)
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
        """Fetch Twitter profile data"""
        try:
            username = profile_identifier.lstrip('@')
            
            # Get user profile
            user = sntwitter.TwitterUserScraper(username).get_items()
            user_data = next(user, None)
            
            if not user_data:
                return None

            return {
                'username': user_data.username,
                'name': user_data.displayname,
                'description': user_data.description,
                'followers_count': user_data.followers,
                'following_count': user_data.following,
                'tweets_count': user_data.statuses,
                'created': user_data.date.timestamp() if hasattr(user_data, 'date') else None,
                'location': user_data.location,
                'verified': user_data.verified,
                'twitter_url': f"https://twitter.com/{user_data.username}",
                'raw_bio': user_data.description,
            }
        except Exception as e:
            print(f"Error fetching Twitter profile {profile_identifier}: {e}")
            return None

    async def _search_profiles(self, query: str, max_results: int) -> List[str]:
        """Search for Twitter profiles by keyword"""
        profiles = []
        
        try:
            # Search for users matching the query
            search_query = f"from:{query}" if not query.startswith('#') else query
            
            for i, tweet in enumerate(sntwitter.TwitterSearchScraper(search_query).get_items()):
                if i >= max_results:
                    break
                
                if tweet.user and tweet.user.username not in profiles:
                    profiles.append(tweet.user.username)
                    
        except Exception as e:
            print(f"Error searching profiles: {e}")
            
        return profiles

    async def _search_by_hashtag(self, hashtag: str, max_results: int) -> List[str]:
        """Get profiles that tweeted with a hashtag"""
        profiles = []
        
        try:
            for i, tweet in enumerate(sntwitter.TwitterHashtagScraper(hashtag).get_items()):
                if i >= max_results:
                    break
                
                if tweet.user and tweet.user.username not in profiles:
                    profiles.append(tweet.user.username)
                    
        except Exception as e:
            print(f"Error searching by hashtag: {e}")
            
        return profiles

    async def get_followers(self, username: str, max_results: int = 1000) -> List[str]:
        """Get followers of a user"""
        followers = []
        
        try:
            for i, follower in enumerate(sntwitter.TwitterFollowersScraper(username).get_items()):
                if i >= max_results:
                    break
                followers.append(follower.username)
        except Exception as e:
            print(f"Error getting followers: {e}")
            
        return followers

    def extract_emails_from_bio(self, bio: str) -> List[str]:
        """Extract emails from Twitter bio"""
        emails = []
        
        # Twitter bio can contain emails
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        found = re.findall(email_pattern, bio)
        
        for email in found:
            # Filter out common twitter handles that look like emails
            if '@twitter' not in email.lower() and '@x.com' not in email.lower():
                emails.append(email.lower())
                
        return emails


class TwitterAPIv2Scraper:
    """Scraper using Twitter API v2 (requires API key)"""
    
    def __init__(self, bearer_token: str):
        self.bearer_token = bearer_token
        self.base_url = "https://api.twitter.com/2"
    
    async def get_user_by_username(self, username: str) -> Optional[dict]:
        """Get user info via API v2"""
        import requests
        
        url = f"{self.base_url}/users/by/username/{username.lstrip('@')}"
        headers = {"Authorization": f"Bearer {self.bearer_token}"}
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                return data.get('data')
        except Exception as e:
            print(f"API Error: {e}")
            
        return None

    async def get_user_tweets(self, user_id: str, max_results: int = 100) -> List[dict]:
        """Get user's recent tweets"""
        import requests
        
        url = f"{self.base_url}/users/{user_id}/tweets"
        headers = {"Authorization": f"Bearer {self.bearer_token}"}
        params = {"max_results": min(max_results, 100)}
        
        try:
            response = requests.get(url, headers=headers, params=params, timeout=10)
            if response.status_code == 200:
                return response.json().get('data', [])
        except Exception as e:
            print(f"API Error: {e}")
            
        return []