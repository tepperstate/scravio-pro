"""
LinkedIn Email Scraper
Extract emails from LinkedIn public profiles
Note: LinkedIn has strict anti-scraping measures. Uses Proxycurl API for reliable access.
"""

import asyncio
import re
from typing import List, Optional, Dict
import httpx

from app.scrapers.base_scraper import BaseScraper, ProfileResult


class LinkedInScraper(BaseScraper):
    """Scraper for LinkedIn profiles"""
    
    platform_name = "linkedin"
    base_url = "https://linkedin.com"

    def __init__(self, proxycurl_api_key: str = None):
        super().__init__()
        self.proxycurl_api_key = proxycurl_api_key
        self.proxycurl_base = "https://nubela.co/proxycurl/api/v2"

    async def scrape(self, query: str, max_results: int = 50,
                     progress_callback=None) -> List[ProfileResult]:
        """
        Scrape LinkedIn for emails
        
        Args:
            query: LinkedIn profile URL or public identifier
            max_results: Maximum profiles to scrape
        """
        results = []

        # Handle single profile or multiple
        if 'linkedin.com' in query.lower():
            # Single profile URL
            result = await self._scrape_profile(query)
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
        """Fetch LinkedIn profile data via Proxycurl API"""
        try:
            # Extract profile identifier from URL
            if 'linkedin.com/in/' in profile_identifier:
                username = profile_identifier.split('linkedin.com/in/')[-1].split('?')[0]
            else:
                username = profile_identifier

            headers = {"Authorization": f"Bearer {self.proxycurl_api_key}"} if self.proxycurl_api_key else {}

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.proxycurl_base}/linkedin",
                    params={"linkedin_profile_url": f"https://linkedin.com/in/{username}"},
                    headers=headers
                )

                if response.status_code == 200:
                    data = response.json()
                    return self._parse_proxycurl_response(data)
                elif response.status_code == 404:
                    return None
                else:
                    print(f"Proxycurl API error: {response.status_code}")
                    # Fallback to web scraping
                    return await self._fetch_profile_web(username)

        except Exception as e:
            print(f"Error fetching LinkedIn profile {profile_identifier}: {e}")
            return await self._fetch_profile_web(username)

    def _parse_proxycurl_response(self, data: dict) -> dict:
        """Parse Proxycurl API response into our format"""
        return {
            'linkedin_url': data.get('linkedin_profile_url'),
            'full_name': data.get('full_name'),
            'first_name': data.get('first_name'),
            'last_name': data.get('last_name'),
            'headline': data.get('headline'),
            'summary': data.get('summary'),
            'occupation': data.get('occupation'),
            'company': data.get('experiences', [{}])[0].get('company_name') if data.get('experiences') else None,
            'job_title': data.get('experiences', [{}])[0].get('title') if data.get('experiences') else None,
            'location': data.get('location'),
            'country': data.get('country'),
            'connections': data.get('connections'),
            'profile_picture': data.get('profile_picture_url'),
            'email': data.get('public_identifier'),  # May not include email from API
            'skills': data.get('skills', []),
            'experience': data.get('experiences', []),
            'education': data.get('education', []),
        }

    async def _fetch_profile_web(self, username: str) -> Optional[dict]:
        """Fallback web scraping for LinkedIn profiles"""
        import requests
        
        try:
            url = f"https://www.linkedin.com/in/{username}"
            response = requests.get(
                url,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml',
                },
                timeout=10
            )

            if response.status_code == 200:
                # LinkedIn embeds profile data in JavaScript
                # This is a simplified extraction
                return {
                    'linkedin_url': url,
                    'username': username,
                    'raw_html': response.text[:5000],  # First 5000 chars for analysis
                }
        except Exception as e:
            print(f"Web scraping error: {e}")
            
        return None

    async def _search_profiles(self, query: str, max_results: int) -> List[str]:
        """Search for LinkedIn profiles"""
        profiles = []
        
        try:
            if self.proxycurl_api_key:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.get(
                        f"{self.proxycurl_base}/linkedin/search",
                        params={
                            'keywords': query,
                            'enrich_profiles': 'false',
                            'page_size': max_results,
                        },
                        headers={"Authorization": f"Bearer {self.proxycurl_api_key}"}
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        profiles = [p.get('linkedin_profile_url') for p in data.get('profiles', [])]
                        
        except Exception as e:
            print(f"Search error: {e}")
            
        return profiles

    def extract_emails_from_profile(self, profile_data: dict) -> List[str]:
        """Extract emails from LinkedIn profile data"""
        emails = []
        
        # LinkedIn doesn't typically show emails on profiles
        # But we might find them in:
        # - Contact info section
        # - About/Summary section
        # - Company websites linked
        
        # Check summary/about section
        summary = profile_data.get('summary', '') or ''
        headline = profile_data.get('headline', '') or ''
        
        text_to_search = f"{summary} {headline}"
        
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        found = re.findall(email_pattern, text_to_search)
        
        for email in found:
            if 'linkedin.com' not in email.lower():
                emails.append(email.lower())
                
        # Check experience for company websites
        for exp in profile_data.get('experience', []):
            company = exp.get('company_name', '')
            # Company name might hint at business email pattern
            # e.g., Acme Corp -> contact@acme.com
            
        return emails


class LinkedInEmailFinder:
    """Find work/business emails for LinkedIn profiles"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key
        self.apollo_api_key = api_key  # Could use Apollo.io or similar

    async def find_business_email(self, first_name: str, last_name: str, company: str, 
                                   domain: str = None) -> Optional[str]:
        """
        Find business email for a person
        
        Args:
            first_name: Person's first name
            last_name: Person's last name
            company: Company name
            domain: Company domain (if known)
        """
        # Common email patterns
        patterns = [
            f"{first_name}.{last_name}@{{domain}}",
            f"{first_name[0]}{last_name}@{{domain}}",
            f"{first_name}{last_name[0]}@{{domain}}",
            f"{first_name}.{last_name[0]}@{{domain}}",
            f"{first_name.lower()}.{last_name.lower()}@{{domain}}",
            f"{first_name[0].lower()}{last_name.lower()}@{{domain}}",
        ]
        
        if not domain:
            # Try to find domain from company name
            domain = await self._find_company_domain(company)
        
        if not domain:
            return None
            
        # Test each pattern
        for pattern in patterns:
            email = pattern.format(domain=domain)
            # Verify the email
            from app.services.email_verifier import verifier
            result = verifier.verify(email)
            
            if result.overall_status in ['verified', 'risky']:
                return email
                
        return None

    async def _find_company_domain(self, company_name: str) -> Optional[str]:
        """Find company domain from company name"""
        # Use Google search or company database API
        # Simplified implementation
        import requests
        
        try:
            # Use DuckDuckGo or similar for quick domain lookup
            search_query = f"{company_name} official website"
            # This would need a search API implementation
            pass
        except Exception:
            pass
            
        return None