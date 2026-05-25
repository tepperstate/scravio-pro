"""
Facebook Email Scraper
Extract emails from Facebook public pages and profiles
"""

import asyncio
import re
from typing import List, Optional, Dict

from app.scrapers.base_scraper import BaseScraper, ProfileResult


class FacebookScraper(BaseScraper):
    """Scraper for Facebook pages and profiles"""
    
    platform_name = "facebook"
    base_url = "https://facebook.com"

    async def scrape(self, query: str, max_results: int = 50,
                     progress_callback=None) -> List[ProfileResult]:
        """
        Scrape Facebook for emails
        
        Args:
            query: Facebook page/profile URL or username
            max_results: Maximum profiles to scrape
        """
        results = []

        if 'facebook.com' in query.lower():
            # Profile/Page URL
            identifier = self._extract_page_id_from_url(query)
            if identifier:
                result = await self._scrape_profile(identifier)
                results.append(result)
        else:
            # Search for pages
            pages = await self._search_pages(query, max_results)
            for page_id in pages:
                result = await self._scrape_profile(page_id)
                results.append(result)
                await self.rate_limit()

        return results

    async def _fetch_profile_data(self, profile_identifier: str) -> Optional[dict]:
        """Fetch Facebook page/profile data"""
        try:
            # Try using facebook-scraper library
            try:
                from facebook_scraper import get_page_info
                
                page_info = get_page_info(profile_identifier)
                return self._parse_facebook_response(page_info)
            except ImportError:
                pass
            
            # Fallback to web scraping
            return await self._fetch_page_web(profile_identifier)

        except Exception as e:
            print(f"Error fetching Facebook profile {profile_identifier}: {e}")
            return await self._fetch_page_web(profile_identifier)

    async def _fetch_page_web(self, identifier: str) -> Optional[dict]:
        """Fetch Facebook page via web scraping"""
        import requests
        from app.services.proxy_manager import proxy_manager
        
        try:
            # Handle both page names and IDs
            if identifier.isdigit():
                url = f"https://www.facebook.com/pages/public/{identifier}"
            else:
                url = f"https://www.facebook.com/{identifier.lstrip('/')}"
            
            proxy = proxy_manager.get_proxy()
            response = requests.get(
                url,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml',
                },
                proxies=proxy,
                timeout=10
            )

            if response.status_code == 200:
                # Facebook has complex page rendering
                # Extract what we can from the HTML
                data = self._extract_from_html(response.text)
                data['facebook_url'] = url
                return data
                
        except Exception as e:
            print(f"Facebook web scraping error: {e}")
            
        return None

    def _extract_from_html(self, html: str) -> dict:
        """Extract profile data from Facebook HTML"""
        import re
        
        data = {}
        
        # Try to find name
        name_pattern = r'"name":"([^"]+)"'
        name_match = re.search(name_pattern, html)
        if name_match:
            data['name'] = name_match.group(1)
        
        # Try to find about section
        about_pattern = r'"about":"([^"]*)"'
        about_match = re.search(about_pattern, html)
        if about_match:
            data['about'] = about_match.group(1).replace('\\n', ' ').replace('\\"', '"')
        
        # Try to find page info
        category_pattern = r'"category":"([^"]+)"'
        category_match = re.search(category_pattern, html)
        if category_match:
            data['category'] = category_match.group(1)
            
        return data

    def _parse_facebook_response(self, data: dict) -> dict:
        """Parse facebook-scraper response"""
        return {
            'facebook_url': data.get('url'),
            'name': data.get('name'),
            'about': data.get('about'),
            'description': data.get('description'),
            'mission': data.get('mission'),
            'products': data.get('products'),
            'category': data.get('category'),
            'founded': data.get('founded'),
            'company_overview': data.get('company_overview'),
            'likes': data.get('likes'),
            'followers': data.get('followers'),
        }

    async def _search_pages(self, query: str, max_results: int) -> List[str]:
        """Search for Facebook pages"""
        # Would need Facebook Graph API or search engine
        # Simplified - return as direct page handle
        return [query.replace(' ', '').lower()]

    def _extract_page_id_from_url(self, url: str) -> Optional[str]:
        """Extract page identifier from Facebook URL"""
        # Handle various Facebook URL formats
        patterns = [
            r'facebook\.com/([a-zA-Z0-9._-]+)/?$',
            r'facebook\.com/pages/[^/]+/(\d+)',
            r'facebook\.com/groups/(\d+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
                
        # Try simple extraction
        match = re.search(r'facebook\.com/([^?]+)', url)
        if match:
            identifier = match.group(1).rstrip('/')
            # Skip common paths
            if identifier not in ['pages', 'groups', 'photo', 'video', 'permalink']:
                return identifier
                
        return None

    def extract_emails_from_about(self, about_text: str) -> List[str]:
        """Extract emails from Facebook page About section"""
        emails = []
        
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        found = re.findall(email_pattern, about_text)
        
        for email in found:
            emails.append(email.lower())
                
        return emails


class FacebookGroupScraper(BaseScraper):
    """Scraper for Facebook groups (to get member profiles)"""
    
    platform_name = "facebook_group"

    async def scrape_group_members(self, group_id: str, max_results: int = 100) -> List[str]:
        """Get member profiles from a Facebook group"""
        # Facebook groups require authentication and have strict limits
        # Would need Graph API access
        return []

    async def scrape_group_posts(self, group_id: str, max_posts: int = 50) -> List[dict]:
        """Get posts from a Facebook group"""
        posts = []
        
        try:
            from facebook_scraper import get_posts
            
            for i, post in enumerate(get_posts(group=group_id, pages=max_posts)):
                if i >= max_posts:
                    break
                    
                posts.append({
                    'post_id': post.get('post_id'),
                    'text': post.get('text'),
                    'time': post.get('time'),
                    'likes': post.get('likes'),
                    'comments': post.get('comments'),
                    'shares': post.get('shares'),
                    'author': post.get('author'),
                })
                
        except Exception as e:
            print(f"Error scraping group: {e}")
            
        return posts