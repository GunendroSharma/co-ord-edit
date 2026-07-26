import os
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")


class Settings:
    MONGO_URL = os.environ["MONGO_URL"]
    DB_NAME = os.environ["DB_NAME"]
    MOCK_MODE = os.environ.get("MOCK_MODE", "True").lower() == "true"
    JWT_SECRET = os.environ.get("JWT_SECRET", "dev_secret")
    JWT_REFRESH_SECRET = os.environ.get("JWT_REFRESH_SECRET", "dev_refresh")
    JWT_ALG = "HS256"
    ACCESS_TOKEN_MIN = 60 * 24  # 1 day for demo
    REFRESH_TOKEN_DAYS = 30

    IMAGEKIT_PUBLIC_KEY = os.environ.get("IMAGEKIT_PUBLIC_KEY", "")
    IMAGEKIT_PRIVATE_KEY = os.environ.get("IMAGEKIT_PRIVATE_KEY", "")
    IMAGEKIT_URL_ENDPOINT = os.environ.get("IMAGEKIT_URL_ENDPOINT", "")

    RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
    RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")
    PAYU_MERCHANT_KEY = os.environ.get("PAYU_MERCHANT_KEY", "")
    PAYU_SALT = os.environ.get("PAYU_SALT", "")

    SHIPROCKET_EMAIL = os.environ.get("SHIPROCKET_EMAIL", "")
    SHIPROCKET_PASSWORD = os.environ.get("SHIPROCKET_PASSWORD", "")

    EMAIL_PROVIDER = os.environ.get("EMAIL_PROVIDER", "mock")
    EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "Loom & Pastel Co.")
    EMAIL_FROM_ADDRESS = os.environ.get("EMAIL_FROM_ADDRESS", "hello@loompastel.co")


settings = Settings()
