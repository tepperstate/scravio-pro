"""
YouTube Email Scraper
Extract emails from YouTube channel About pages using InnerTube API (bypassing official quotas)
"""

import asyncio
import re
import json
from typing import List, Optional, Dict
import httpx
from bs4 import BeautifulSoup

from app.scrapers.base_scraper import BaseScraper, ProfileResult

class YouTubeScraper(BaseScraper):
    """Scraper for YouTube channels using InnerTube API"""
    
    platform_name = "youtube"
    base_url = "https://youtube.com"

    USER_AGENTS = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ]

    async def scrape(self, query: str, max_results: int = 50, progress_callback=None) -> List[ProfileResult]:
        results = []

        # Convert simple query to channel handle or ID if it's a URL
        channel_id = self._extract_channel_id(query)
        if not channel_id:
            channel_id = query if query.startswith('@') or query.startswith('UC') else f"@{query}"

        result = await self._scrape_profile(channel_id)
        if result:
            results.append(result)

        return results

    async def _fetch_profile_data(self, channel_identifier: str) -> Optional[dict]:
        """Fetch YouTube channel data via InnerTube / Web scraping"""
        try:
            if channel_identifier.startswith('UC'):
                url = f"https://youtube.com/channel/{channel_identifier}/about"
            else:
                handle = channel_identifier.lstrip('@')
                url = f"https://youtube.com/@{handle}/about"
            
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(url, headers={'User-Agent': self.USER_AGENTS[0]})
                
                if response.status_code == 200:
                    return self._extract_yt_initial_data(response.text)
        except Exception as e:
            print(f"Web scraping error: {e}")
            
        return None

    def _extract_yt_initial_data(self, html: str) -> dict:
        """Extract ytInitialData from page source"""
        data = {}
        try:
            match = re.search(r'var ytInitialData = (\{.*?\});</script>', html)
            if match:
                json_data = json.loads(match.group(1))
                
                # Digging into InnerTube JSON structure
                header = json_data.get('header', {}).get('c4TabbedHeaderRenderer', {})
                metadata = json_data.get('metadata', {}).get('channelMetadataRenderer', {})
                
                data['channel_id'] = metadata.get('externalId', '')
                data['title'] = metadata.get('title', '')
                data['description'] = metadata.get('description', '')
                data['youtube_url'] = metadata.get('channelUrl', '')
                
                if header:
                    stats = header.get('subscriberCountText', {}).get('simpleText', '')
                    data['subscriber_count_raw'] = stats
        except Exception as e:
            print(f"JSON extract error: {e}")
            
        return data

    def _extract_channel_id(self, url: str) -> Optional[str]:
        match = re.search(r'youtube\.com/(?:channel/|@|c/|user/)([a-zA-Z0-9_-]+)', url)
        if match:
            return match.group(1)
        return None

    def extract_emails_from_description(self, description: str) -> List[str]:
        emails = []
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        obfuscated_pattern = r'([a-zA-Z0-9._%+-]+)\s*(?:\[at\]|\(at\)|@)\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})'
        
        found = re.findall(email_pattern, description)
        obfuscated = re.findall(obfuscated_pattern, description)
        
        for email in found:
            if 'youtube' not in email.lower() and 'google' not in email.lower():
                emails.append(email.lower())
                
        for user, domain in obfuscated:
            emails.append(f"{user}@{domain}".lower())
                
        return list(set(emails))