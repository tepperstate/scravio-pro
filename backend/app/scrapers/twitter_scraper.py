"""
Twitter Email Scraper
Extract emails from Twitter using public Nitter instances (bypassing authentication)
"""

import asyncio
import re
import random
from typing import List, Optional, Dict
import httpx
from bs4 import BeautifulSoup

from app.scrapers.base_scraper import BaseScraper, ProfileResult

class TwitterScraper(BaseScraper):
    """Scraper for Twitter profiles using Nitter"""
    
    platform_name = "twitter"
    base_url = "https://twitter.com"

    NITTER_INSTANCES = [
        "https://nitter.net",
        "https://nitter.cz",
        "https://nitter.privacydev.net",
        "https://nitter.projectsegfau.lt"
    ]

    USER_AGENTS = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ]

    async def scrape(self, query: str, max_results: int = 50, progress_callback=None) -> List[ProfileResult]:
        """Scrape Twitter for emails"""
        results = []

        if 'twitter.com' in query.lower() or 'x.com' in query.lower():
            username = self._extract_username(query)
            if username:
                result = await self._scrape_profile(username)
                results.append(result)
        else:
            username = query.lstrip('@')
            result = await self._scrape_profile(username)
            results.append(result)

        return results

    async def _fetch_profile_data(self, profile_identifier: str) -> Optional[dict]:
        """Fetch profile from a random working Nitter instance"""
        random.shuffle(self.NITTER_INSTANCES)
        
        for instance in self.NITTER_INSTANCES:
            try:
                url = f"{instance}/{profile_identifier}"
                async with httpx.AsyncClient(timeout=10.0) as client:
                    res = await client.get(url, headers={'User-Agent': self.USER_AGENTS[0]})
                    
                    if res.status_code == 200:
                        data = self._extract_from_html(res.text)
                        data['twitter_url'] = f"https://twitter.com/{profile_identifier}"
                        data['username'] = profile_identifier
                        return data
            except Exception as e:
                print(f"Failed to fetch from {instance}: {e}")
                continue
                
        return None

    def _extract_from_html(self, html: str) -> dict:
        data = {}
        soup = BeautifulSoup(html, 'html.parser')
        
        # Nitter DOM parsing
        name_tag = soup.find('a', class_='profile-card-fullname')
        if name_tag:
            data['full_name'] = name_tag.text.strip()
            
        bio_tag = soup.find('div', class_='profile-bio')
        if bio_tag:
            data['biography'] = bio_tag.text.strip()
            
        loc_tag = soup.find('div', class_='profile-location')
        if loc_tag:
            data['location'] = loc_tag.text.strip()
            
        # Stats
        stat_tags = soup.find_all('span', class_='profile-stat-num')
        if len(stat_tags) >= 3:
            data['following'] = int(stat_tags[1].text.replace(',', ''))
            data['followers'] = int(stat_tags[2].text.replace(',', ''))
            
        return data

    def _extract_username(self, url: str) -> Optional[str]:
        match = re.search(r'(?:twitter\.com|x\.com)/([a-zA-Z0-9_]+)', url)
        if match:
            return match.group(1)
        return None

    def extract_emails_from_about(self, about_text: str) -> List[str]:
        emails = []
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        # Also catch formatted emails like name[at]domain.com
        obfuscated_pattern = r'([a-zA-Z0-9._%+-]+)\s*(?:\[at\]|\(at\)|@)\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})'
        
        found = re.findall(email_pattern, about_text)
        obfuscated = re.findall(obfuscated_pattern, about_text)
        
        for email in found:
            emails.append(email.lower())
            
        for user, domain in obfuscated:
            emails.append(f"{user}@{domain}".lower())
            
        return list(set(emails))