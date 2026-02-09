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
    
    # Payment Gateways - Safepay
    safepay_api_key: str = ""
    safepay_secret_key: str = ""
    safepay_environment: str = "sandbox"
    safepay_webhook_secret: str = ""
    
    # Payment Gateways - JazzCash
    jazzcash_merchant_id: str = ""
    jazzcash_password: str = ""
    jazzcash_hash_key: str = ""
    jazzcash_return_url: str = "http://localhost:3000/payment/success"
    jazzcash_environment: str = "sandbox"
    
    # Payment Gateways - Easypaisa
    easypaisa_store_id: str = ""
    easypaisa_hash_key: str = ""
    easypaisa_return_url: str = "http://localhost:3000/payment/success"
    easypaisa_environment: str = "sandbox"
    
    # URLs
    frontend_url: str = "http://localhost:3000"
    
    # CORS
    cors_origins: str = "http://localhost:3000"
    
    # Application
    app_name: str = "AI SaaS API"
    app_version: str = "1.0.0"
    debug: bool = False
    
    # Pydantic v2 configuration: allow extra env vars (ignore unknown keys)
    model_config = {
        "env_file": ".env",
        "case_sensitive": False,
        "extra": "ignore",
    }

@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
