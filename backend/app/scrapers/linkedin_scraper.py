"""
LinkedIn Email Scraper
Extract emails from LinkedIn public profiles using Google Dorks (bypassing auth)
"""

import asyncio
import re
from typing import List, Optional, Dict
import httpx
from bs4 import BeautifulSoup

from app.scrapers.base_scraper import BaseScraper, ProfileResult

class LinkedInScraper(BaseScraper):
    """Scraper for LinkedIn profiles via Google Dorks"""
    
    platform_name = "linkedin"
    base_url = "https://linkedin.com"

    USER_AGENTS = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ]

    async def scrape(self, query: str, max_results: int = 50, progress_callback=None) -> List[ProfileResult]:
        """Scrape LinkedIn for emails using search engines"""
        results = []

        if 'linkedin.com' in query.lower():
            # URL provided
            result = await self._scrape_profile(query)
            results.append(result)
        else:
            # Query provided, use Dork
            profiles = await self._search_profiles(query, max_results)
            for i, profile_url in enumerate(profiles):
                result = await self._scrape_profile(profile_url)
                results.append(result)
                if progress_callback:
                    progress_callback(i + 1, len(profiles), result)
                await self.rate_limit()

        return results

    async def _fetch_profile_data(self, profile_identifier: str) -> Optional[dict]:
        """Instead of hitting LinkedIn directly, we rely on search engine cached snippets or direct public scrapes if they don't 401"""
        try:
            url = profile_identifier if 'linkedin.com' in profile_identifier else f"https://www.linkedin.com/in/{profile_identifier}"
            
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(url, headers={'User-Agent': self.USER_AGENTS[0], 'Accept-Language': 'en-US,en;q=0.9'})
                
                # Even if LinkedIn blocks it, sometimes we get public SEO data
                if res.status_code == 200:
                    data = self._extract_from_html(res.text)
                    data['linkedin_url'] = url
                    return data
        except Exception as e:
            print(f"Error fetching LinkedIn profile {profile_identifier}: {e}")
            
        return None

    def _extract_from_html(self, html: str) -> dict:
        data = {}
        soup = BeautifulSoup(html, 'html.parser')
        
        # Public profiles sometimes have SEO tags
        title_tag = soup.find('title')
        if title_tag:
            data['full_name'] = title_tag.text.replace(' | LinkedIn', '').strip()
            
        # The about/summary section often contains emails
        body_text = soup.get_text()
        data['summary'] = body_text[:5000] # Provide chunk for email extraction
        
        return data

    async def _search_profiles(self, query: str, max_results: int) -> List[str]:
        """Use DuckDuckGo HTML search to find LinkedIn profiles (Google Dorking)"""
        profiles = []
        try:
            dork_query = f"site:linkedin.com/in {query}"
            search_url = f"https://html.duckduckgo.com/html/?q={httpx.urls.quote(dork_query)}"
            
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(search_url, headers={'User-Agent': self.USER_AGENTS[0]})
                
                if res.status_code == 200:
                    soup = BeautifulSoup(res.text, 'html.parser')
                    for a in soup.find_all('a', class_='result__url'):
                        url = a.get('href', '')
                        if 'linkedin.com/in' in url:
                            # Clean tracking
                            clean_url = url.split('//')[-1]
                            profiles.append(f"https://{clean_url}")
                            if len(profiles) >= max_results:
                                break
        except Exception as e:
            print(f"Dork search error: {e}")
            
        return profiles

    def extract_emails_from_profile(self, profile_data: dict) -> List[str]:
        emails = []
        summary = profile_data.get('summary', '')
        
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        found = re.findall(email_pattern, summary)
        
        for email in found:
            if 'linkedin.com' not in email.lower() and 'example.com' not in email.lower():
                emails.append(email.lower())
                
        return list(set(emails))

class LinkedInEmailFinder:
    """Find work/business emails for LinkedIn profiles without API keys"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key

    async def find_business_email(self, first_name: str, last_name: str, company: str, domain: str = None) -> Optional[str]:
        patterns = [
            f"{first_name}.{last_name}@{{domain}}",
            f"{first_name[0]}{last_name}@{{domain}}",
            f"{first_name}{last_name[0]}@{{domain}}",
        ]
        
        if not domain:
            domain = await self._find_company_domain(company)
        
        if not domain:
            return None
            
        for pattern in patterns:
            email = pattern.format(domain=domain).lower()
            try:
                from app.services.email_verifier import verifier
                result = verifier.verify(email)
                if result.overall_status in ['verified', 'risky']:
                    return email
            except:
                pass
                
        return None

    async def _find_company_domain(self, company_name: str) -> Optional[str]:
        # DuckDuckGo search for official site
        try:
            search_query = f"{company_name} official website"
            search_url = f"https://html.duckduckgo.com/html/?q={httpx.urls.quote(search_query)}"
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(search_url, headers={'User-Agent': 'Mozilla/5.0'})
                if res.status_code == 200:
                    soup = BeautifulSoup(res.text, 'html.parser')
                    first_result = soup.find('a', class_='result__url')
                    if first_result:
                        url = first_result.get('href', '')
                        # Extract domain
                        domain = url.split('//')[-1].split('/')[0].replace('www.', '')
                        if 'duckduckgo' not in domain and 'linkedin' not in domain:
                            return domain
        except:
            pass
        return None