"""
Configuration and error handling for AporTamos backend.
"""

import logging
import logging.handlers
import os
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings


class LogLevel(str, Enum):
    """Logging levels."""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # App Configuration
    app_name: str = "AporTamos"
    app_version: str = "1.0.0"
    debug: bool = False
    environment: str = "development"
    
    # Supabase Configuration
    supabase_url: str = ""
    supabase_key: str = ""
    supabase_service_role_key: str = ""
    
    # Database Configuration
    database_url: str = ""
    sqlalchemy_echo: bool = False
    
    # JWT Configuration
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    
    # Google OAuth
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    google_oauth_redirect_uri: str = "http://localhost:8000/auth/google/callback"

    # Email (Gmail SMTP) for household invitations
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: Optional[str] = None          # your Gmail address
    smtp_password: Optional[str] = None      # Gmail App Password (not your login password)
    smtp_from_name: str = "AporTamos"

    # Logging Configuration
    log_level: LogLevel = LogLevel.INFO
    log_dir: str = "logs"
    
    # CORS
    cors_origins: list = [
        "http://localhost:3000",
        "http://localhost:8081",
        "http://localhost:19000",
        "http://localhost:19001",
    ]
    
    # Storage Configuration
    max_photo_size: int = 5242880  # 5MB
    photo_bucket_name: str = "task-proofs"
    chat_bucket_name: str = "chat-media"
    
    # Email Configuration
    sendgrid_api_key: Optional[str] = None
    sender_email: str = "noreply@aportamos.com"
    
    # Security
    # "*" allows any Host header. Needed for platforms like Render that serve on a
    # generated hostname. Real security is handled by JWT auth + Supabase, not by
    # TrustedHostMiddleware. Override via ALLOWED_HOSTS env if you want to restrict.
    allowed_hosts: list = ["*"]
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()


class AporTamosException(Exception):
    """Base exception for AporTamos application."""
    
    def __init__(self, message: str, error_code: str = "INTERNAL_ERROR", status_code: int = 500):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        super().__init__(self.message)


class ValidationException(AporTamosException):
    """Raised when input validation fails."""
    
    def __init__(self, message: str, field: Optional[str] = None):
        super().__init__(message, "VALIDATION_ERROR", 400)
        self.field = field


class AuthenticationException(AporTamosException):
    """Raised when authentication fails."""
    
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, "AUTHENTICATION_ERROR", 401)


class AuthorizationException(AporTamosException):
    """Raised when user lacks permission."""
    
    def __init__(self, message: str = "Access denied"):
        super().__init__(message, "AUTHORIZATION_ERROR", 403)


class ResourceNotFoundException(AporTamosException):
    """Raised when a resource is not found."""
    
    def __init__(self, resource: str, identifier: str):
        message = f"{resource} with identifier '{identifier}' not found"
        super().__init__(message, "NOT_FOUND", 404)
        self.resource = resource
        self.identifier = identifier


class ConflictException(AporTamosException):
    """Raised when a conflict occurs (e.g., duplicate resource)."""
    
    def __init__(self, message: str, conflict_field: Optional[str] = None):
        super().__init__(message, "CONFLICT", 409)
        self.conflict_field = conflict_field


class RateLimitException(AporTamosException):
    """Raised when rate limit is exceeded."""
    
    def __init__(self, message: str = "Rate limit exceeded"):
        super().__init__(message, "RATE_LIMIT_EXCEEDED", 429)


class ExternalServiceException(AporTamosException):
    """Raised when external service fails."""
    
    def __init__(self, service: str, message: str):
        full_message = f"{service} service error: {message}"
        super().__init__(full_message, "SERVICE_ERROR", 502)
        self.service = service


class DatabaseException(AporTamosException):
    """Raised when database operation fails."""
    
    def __init__(self, message: str, operation: Optional[str] = None):
        super().__init__(message, "DATABASE_ERROR", 500)
        self.operation = operation


class LoggerConfig:
    """Configures logging for the application."""
    
    _logger: Optional[logging.Logger] = None
    
    @classmethod
    def get_logger(cls, name: str = "aportamos") -> logging.Logger:
        """Get or create logger instance."""
        if cls._logger is not None:
            return cls._logger
        
        # Create logs directory if it doesn't exist
        log_dir = Path(settings.log_dir)
        log_dir.mkdir(parents=True, exist_ok=True)
        
        # Create logger
        logger = logging.getLogger(name)
        logger.setLevel(getattr(logging, settings.log_level.value))
        
        # Prevent duplicate handlers
        if logger.handlers:
            return logger
        
        # Console handler (always enabled)
        console_handler = logging.StreamHandler()
        console_handler.setLevel(getattr(logging, settings.log_level.value))
        console_formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
        console_handler.setFormatter(console_formatter)
        logger.addHandler(console_handler)
        
        # File handler (rotating logs)
        log_file = log_dir / f"aportamos-{datetime.now().strftime('%Y-%m-%d')}.log"
        file_handler = logging.handlers.RotatingFileHandler(
            log_file,
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5
        )
        file_handler.setLevel(getattr(logging, settings.log_level.value))
        file_formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s"
        )
        file_handler.setFormatter(file_formatter)
        logger.addHandler(file_handler)
        
        # Error file handler (errors and above)
        error_log_file = log_dir / f"aportamos-errors-{datetime.now().strftime('%Y-%m-%d')}.log"
        error_handler = logging.handlers.RotatingFileHandler(
            error_log_file,
            maxBytes=10 * 1024 * 1024,
            backupCount=5
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(file_formatter)
        logger.addHandler(error_handler)
        
        cls._logger = logger
        return logger


# Create global logger instance
logger = LoggerConfig.get_logger()


def log_error(message: str, exception: Optional[Exception] = None, **kwargs):
    """Log an error with optional exception details."""
    if exception:
        logger.error(f"{message}: {str(exception)}", exc_info=True, extra=kwargs)
    else:
        logger.error(message, extra=kwargs)


def log_info(message: str, **kwargs):
    """Log info message."""
    logger.info(message, extra=kwargs)


def log_debug(message: str, **kwargs):
    """Log debug message."""
    logger.debug(message, extra=kwargs)


def log_warning(message: str, **kwargs):
    """Log warning message."""
    logger.warning(message, extra=kwargs)
