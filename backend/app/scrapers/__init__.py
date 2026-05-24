from app.scrapers.base_scraper import BaseScraper, ProfileResult
from app.scrapers.instagram_scraper import InstagramScraper
from app.scrapers.twitter_scraper import TwitterScraper
from app.scrapers.youtube_scraper import YouTubeScraper
from app.scrapers.linkedin_scraper import LinkedInScraper, LinkedInEmailFinder
from app.scrapers.tiktok_scraper import TikTokScraper
from app.scrapers.facebook_scraper import FacebookScraper, FacebookGroupScraper

__all__ = [
    'BaseScraper',
    'ProfileResult',
    'InstagramScraper',
    'TwitterScraper',
    'YouTubeScraper',
    'LinkedInScraper',
    'LinkedInEmailFinder',
    'TikTokScraper',
    'FacebookScraper',
    'FacebookGroupScraper',
]


def get_scraper(platform: str, **kwargs):
    """Factory function to get the appropriate scraper"""
    scrapers = {
        'instagram': InstagramScraper,
        'twitter': TwitterScraper,
        'youtube': YouTubeScraper,
        'linkedin': LinkedInScraper,
        'tiktok': TikTokScraper,
        'facebook': FacebookScraper,
    }
    
    scraper_class = scrapers.get(platform.lower())
    if scraper_class:
        return scraper_class(**kwargs)
    raise ValueError(f"Unknown platform: {platform}")