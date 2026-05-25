import requests
import random
import time
from typing import List, Optional

class ProxyManager:
    """
    Manages fetching and rotating free SOCKS5 proxies
    """
    
    def __init__(self):
        self.proxies: List[str] = []
        self.last_fetch_time = 0
        self.cache_duration = 3600  # 1 hour
        
        self.proxy_sources = [
            "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks5.txt",
            "https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks5&timeout=10000&country=all&ssl=all&anonymity=all"
        ]

    def _fetch_proxies(self):
        """Fetch fresh proxies from public APIs"""
        new_proxies = set()
        
        for source in self.proxy_sources:
            try:
                response = requests.get(source, timeout=10)
                if response.status_code == 200:
                    lines = response.text.strip().split('\n')
                    for line in lines:
                        line = line.strip()
                        if line and ':' in line:
                            # Ensure it has ip:port format
                            new_proxies.add(f"socks5://{line}")
            except Exception as e:
                print(f"Failed to fetch proxies from {source}: {e}")
                
        if new_proxies:
            self.proxies = list(new_proxies)
            self.last_fetch_time = time.time()
            print(f"Successfully loaded {len(self.proxies)} SOCKS5 proxies.")

    def get_proxy(self) -> Optional[dict]:
        """Get a random proxy formatted for python-requests"""
        if not self.proxies or (time.time() - self.last_fetch_time) > self.cache_duration:
            self._fetch_proxies()
            
        if not self.proxies:
            return None
            
        proxy_url = random.choice(self.proxies)
        return {
            'http': proxy_url,
            'https': proxy_url
        }

# Global proxy manager instance
proxy_manager = ProxyManager()
