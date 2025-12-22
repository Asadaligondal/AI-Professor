"""Application configuration using Pydantic Settings"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Database
    database_url: str = "postgresql://postgres:postgres@localhost:5432/ai_saas_db"
    
    # API Keys
    openai_api_key: str = ""
    clerk_secret_key: str = ""
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    
    # CORS
    cors_origins: str = "http://localhost:3000"
    
    # Application
    app_name: str = "AI SaaS API"
    app_version: str = "1.0.0"
    debug: bool = False
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
