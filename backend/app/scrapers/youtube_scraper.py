"""
YouTube Email Scraper
Extract emails from YouTube channel About pages and video descriptions
"""

import asyncio
import re
from typing import List, Optional, Dict
from datetime import datetime

from app.scrapers.base_scraper import BaseScraper, ProfileResult


class YouTubeScraper(BaseScraper):
    """Scraper for YouTube channels"""
    
    platform_name = "youtube"
    base_url = "https://youtube.com"

    def __init__(self, api_key: str = None):
        super().__init__()
        self.api_key = api_key
        self.youtube = None
        
        if api_key:
            from googleapiclient.discovery import build
            self.youtube = build('youtube', 'v3', developerKey=api_key)

    async def scrape(self, query: str, max_results: int = 50,
                     progress_callback=None) -> List[ProfileResult]:
        """
        Scrape YouTube for emails
        
        Args:
            query: Can be a channel ID, username, or search query
            max_results: Maximum channels to scrape
        """
        results = []

        if self.youtube:
            # Use YouTube Data API v3
            channels = await self._search_channels_api(query, max_results)
        else:
            # Fallback to web scraping
            channels = await self._search_channels_web(query, max_results)

        for i, channel_id in enumerate(channels):
            result = await self._scrape_channel(channel_id)
            results.append(result)

            if progress_callback:
                progress_callback(i + 1, len(channels), result)

            await self.rate_limit()

        return results

    async def _fetch_profile_data(self, channel_identifier: str) -> Optional[dict]:
        """Fetch YouTube channel data"""
        try:
            if self.youtube:
                # Using YouTube Data API
                if channel_identifier.startswith('UC'):
                    # Channel ID
                    response = self.youtube.channels().list(
                        part='snippet,statistics,brandingSettings,contentDetails',
                        id=channel_identifier
                    ).execute()
                else:
                    # Handle or username
                    response = self.youtube.channels().list(
                        part='snippet,statistics,brandingSettings,contentDetails',
                        forHandle=channel_identifier.lstrip('@')
                    ).execute()

                if response.get('items'):
                    channel = response['items'][0]
                    snippet = channel['snippet']
                    stats = channel['statistics']

                    return {
                        'channel_id': channel['id'],
                        'title': snippet.get('title'),
                        'description': snippet.get('description', ''),
                        'custom_url': snippet.get('customUrl', ''),
                        ' subscriber_count': stats.get('subscriberCount', 0),
                        'video_count': stats.get('videoCount', 0),
                        'view_count': stats.get('viewCount', 0),
                        'published_at': snippet.get('publishedAt'),
                        'youtube_url': f"https://youtube.com/channel/{channel['id']}",
                        'profile_image': snippet.get('thumbnails', {}).get('high', {}).get('url'),
                        'banner_image': channel.get('brandingSettings', {}).get('image', {}).get('bannerExternalUrl'),
                    }
            else:
                # Web scraping fallback
                return await self._fetch_channel_web(channel_identifier)

        except Exception as e:
            print(f"Error fetching YouTube channel {channel_identifier}: {e}")
            return None

    async def _fetch_channel_web(self, channel_identifier: str) -> Optional[dict]:
        """Fetch channel data via web scraping"""
        import requests
        
        try:
            if channel_identifier.startswith('UC'):
                url = f"https://youtube.com/channel/{channel_identifier}/about"
            else:
                handle = channel_identifier.lstrip('@')
                url = f"https://youtube.com/@{handle}/about"
            
            response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=10)
            
            if response.status_code == 200:
                # Extract channel info from page
                # YouTube embeds JSON data in the page
                import re
                pattern = r'"channelId":"([^"]+)".*?"title":"([^"]+)".*?"description":"([^"]*)"'
                match = re.search(pattern, response.text)
                
                if match:
                    return {
                        'channel_id': match.group(1),
                        'title': match.group(2),
                        'description': match.group(3),
                        'youtube_url': f"https://youtube.com/channel/{match.group(1)}",
                    }
        except Exception as e:
            print(f"Web scraping error: {e}")
            
        return None

    async def _search_channels_api(self, query: str, max_results: int) -> List[str]:
        """Search for channels using YouTube Data API"""
        channel_ids = []
        
        try:
            search_response = self.youtube.search().list(
                q=query,
                type='channel',
                part='id,snippet',
                maxResults=min(max_results, 50)
            ).execute()

            for item in search_response.get('items', []):
                if item['id']['kind'] == 'youtube#channel':
                    channel_ids.append(item['id']['channelId'])

        except Exception as e:
            print(f"Search error: {e}")
            
        return channel_ids

    async def _search_channels_web(self, query: str, max_results: int) -> List[str]:
        """Search for channels via web scraping"""
        # Simplified - would need more complex implementation
        return []

    async def _scrape_channel(self, channel_identifier: str) -> ProfileResult:
        """Scrape a YouTube channel for emails"""
        return await self._scrape_profile(channel_identifier)

    def extract_emails_from_description(self, description: str) -> List[str]:
        """Extract emails from channel/video description"""
        emails = []
        
        # Look for email patterns in description
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        found = re.findall(email_pattern, description)
        
        for email in found:
            # Filter out YouTube-related emails
            if 'youtube' not in email.lower():
                emails.append(email.lower())
                
        return emails

    async def get_channel_videos(self, channel_id: str, max_results: int = 50) -> List[dict]:
        """Get recent videos from a channel (to extract emails from descriptions)"""
        videos = []
        
        try:
            if self.youtube:
                response = self.youtube.search().list(
                    channelId=channel_id,
                    type='video',
                    part='id,snippet',
                    maxResults=max_results
                ).execute()

                for item in response.get('items', []):
                    video_id = item['id']['videoId']
                    snippet = item['snippet']
                    
                    videos.append({
                        'video_id': video_id,
                        'title': snippet.get('title'),
                        'description': snippet.get('description'),
                        'published_at': snippet.get('publishedAt'),
                    })
                    
        except Exception as e:
            print(f"Error getting videos: {e}")
            
        return videos