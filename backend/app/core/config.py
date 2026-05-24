from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    PROJECT_NAME: str = "Scravio Email Scraper"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/scravio"
    )
    
    # Redis / Celery
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
    CELERY_RESULT_BACKEND: str = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")
    
    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    
    # Groq AI
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Proxy
    PROXY_LIST: list = [
        "http://proxy1:port",
        "http://proxy2:port",
    ]
    USE_PROXIES: bool = os.getenv("USE_PROXIES", "false").lower() == "true"
    
    # Scraping
    SCRAPE_TIMEOUT: int = 30
    MAX_RETRIES: int = 3
    REQUEST_DELAY: float = 2.0
    
    # Email Verification
    SMTP_TIMEOUT: int = 10
    CATCH_ALL_CHECK_ENABLED: bool = True
    
    # Credits
    FREE_CREDITS_MONTHLY: int = 100
    CREDITS_PER_PROFILE: int = 1
    
    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()