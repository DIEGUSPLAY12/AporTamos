"""
FastAPI application initialization and configuration for AporTamos.

This module:
- Initializes the FastAPI application
- Configures CORS for frontend access (React Native/Expo, web)
- Sets up middleware for error handling, logging, and security
- Defines health check and status endpoints
- Manages app startup and shutdown events
"""

from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, Request, status, Query
from fastapi.exceptions import RequestValidationError
from fastapi.middleware import Middleware
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.gzip import GZipMiddleware

from app.config import (
    AporTamosException,
    AuthenticationException,
    AuthorizationException,
    ConflictException,
    DatabaseException,
    ExternalServiceException,
    RateLimitException,
    ResourceNotFoundException,
    ValidationException,
    logger,
    log_debug,
    log_error,
    log_info,
    log_warning,
    settings,
)
from app.routers import auth_router, households_router, tasks_router, completions_router, stats_router, chat_router


# ============================================================================
# Custom Middleware
# ============================================================================


class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log HTTP requests and responses."""

    async def dispatch(self, request: Request, call_next):
        """Log incoming request and outgoing response."""
        # Extract request info
        method = request.method
        path = request.url.path
        client_ip = request.client.host if request.client else "unknown"

        # Log incoming request
        log_debug(
            f"Incoming request",
            extra={
                "method": method,
                "path": path,
                "client_ip": client_ip,
            },
        )

        try:
            # Process request
            response = await call_next(request)
            
            # Log response
            log_debug(
                f"Request completed",
                extra={
                    "method": method,
                    "path": path,
                    "status_code": response.status_code,
                },
            )
            
            return response
        except Exception as exc:
            log_error(
                f"Request failed",
                exc,
                extra={
                    "method": method,
                    "path": path,
                    "client_ip": client_ip,
                },
            )
            raise


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Middleware to add security headers to responses."""

    async def dispatch(self, request: Request, call_next):
        """Add security headers to response."""
        response = await call_next(request)
        
        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        return response


# ============================================================================
# Exception Handlers
# ============================================================================


async def aportamos_exception_handler(request: Request, exc: AporTamosException):
    """Handle AporTamosException and return JSON error response."""
    log_warning(
        f"AporTamos exception: {exc.error_code}",
        extra={
            "error_code": exc.error_code,
            "message": exc.message,
            "path": request.url.path,
            "method": request.method,
        },
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.error_code,
                "message": exc.message,
                "timestamp": datetime.utcnow().isoformat(),
            }
        },
    )


async def validation_exception_handler(request: Request, exc: ValidationException):
    """Handle ValidationException."""
    log_warning(
        f"Validation error: {exc.message}",
        extra={
            "field": exc.field,
            "path": request.url.path,
        },
    )
    
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": exc.message,
                "field": exc.field,
                "timestamp": datetime.utcnow().isoformat(),
            }
        },
    )


async def authentication_exception_handler(request: Request, exc: AuthenticationException):
    """Handle AuthenticationException."""
    log_warning(
        "Authentication failed",
        extra={
            "path": request.url.path,
            "method": request.method,
        },
    )
    
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={
            "error": {
                "code": "AUTHENTICATION_ERROR",
                "message": exc.message,
                "timestamp": datetime.utcnow().isoformat(),
            }
        },
        headers={"WWW-Authenticate": "Bearer"},
    )


async def authorization_exception_handler(request: Request, exc: AuthorizationException):
    """Handle AuthorizationException."""
    log_warning(
        "Authorization failed",
        extra={
            "path": request.url.path,
            "user_ip": request.client.host if request.client else "unknown",
        },
    )
    
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={
            "error": {
                "code": "AUTHORIZATION_ERROR",
                "message": exc.message,
                "timestamp": datetime.utcnow().isoformat(),
            }
        },
    )


async def resource_not_found_handler(request: Request, exc: ResourceNotFoundException):
    """Handle ResourceNotFoundException."""
    log_debug(
        f"Resource not found: {exc.resource}",
        extra={
            "resource": exc.resource,
            "identifier": exc.identifier,
        },
    )
    
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={
            "error": {
                "code": "NOT_FOUND",
                "message": exc.message,
                "resource": exc.resource,
                "timestamp": datetime.utcnow().isoformat(),
            }
        },
    )


async def conflict_exception_handler(request: Request, exc: ConflictException):
    """Handle ConflictException."""
    log_warning(
        "Conflict detected",
        extra={
            "message": exc.message,
            "conflict_field": exc.conflict_field,
        },
    )
    
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={
            "error": {
                "code": "CONFLICT",
                "message": exc.message,
                "conflict_field": exc.conflict_field,
                "timestamp": datetime.utcnow().isoformat(),
            }
        },
    )


async def rate_limit_exception_handler(request: Request, exc: RateLimitException):
    """Handle RateLimitException."""
    log_warning(
        "Rate limit exceeded",
        extra={
            "path": request.url.path,
            "client_ip": request.client.host if request.client else "unknown",
        },
    )
    
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "error": {
                "code": "RATE_LIMIT_EXCEEDED",
                "message": exc.message,
                "timestamp": datetime.utcnow().isoformat(),
            }
        },
        headers={"Retry-After": "60"},
    )


async def external_service_exception_handler(request: Request, exc: ExternalServiceException):
    """Handle ExternalServiceException."""
    log_error(
        f"External service error: {exc.service}",
        exc,
        extra={
            "service": exc.service,
            "path": request.url.path,
        },
    )
    
    return JSONResponse(
        status_code=status.HTTP_502_BAD_GATEWAY,
        content={
            "error": {
                "code": "SERVICE_ERROR",
                "message": exc.message,
                "service": exc.service,
                "timestamp": datetime.utcnow().isoformat(),
            }
        },
    )


async def database_exception_handler(request: Request, exc: DatabaseException):
    """Handle DatabaseException."""
    log_error(
        f"Database error: {exc.message}",
        exc,
        extra={
            "operation": exc.operation,
            "path": request.url.path,
        },
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "DATABASE_ERROR",
                "message": "Database operation failed",
                "timestamp": datetime.utcnow().isoformat(),
            }
        },
    )


def _make_errors_serializable(errors: list) -> list:
    result = []
    for error in errors:
        safe = {}
        for k, v in error.items():
            if k == "ctx" and isinstance(v, dict):
                safe[k] = {ck: str(cv) for ck, cv in v.items()}
            elif isinstance(v, (str, int, float, bool, list, dict, type(None))):
                safe[k] = v
            else:
                safe[k] = str(v)
        result.append(safe)
    return result


async def validation_error_handler(request: Request, exc: RequestValidationError):
    """Handle FastAPI validation errors."""
    log_warning(
        "Request validation failed",
        extra={
            "path": request.url.path,
            "errors_count": len(exc.errors()),
        },
    )

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request data",
                "details": _make_errors_serializable(exc.errors()),
                "timestamp": datetime.utcnow().isoformat(),
            }
        },
    )


async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions."""
    log_error(
        "Unhandled exception",
        exc,
        extra={
            "path": request.url.path,
            "method": request.method,
        },
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
                "timestamp": datetime.utcnow().isoformat(),
            }
        },
    )


# ============================================================================
# Startup and Shutdown Events
# ============================================================================


async def startup_event():
    """Application startup event handler."""
    log_info(
        f"Starting {settings.app_name} v{settings.app_version}",
        extra={
            "environment": settings.environment,
            "debug": settings.debug,
        },
    )
    log_info(f"Supabase URL: {settings.supabase_url[:20]}...", extra={})


async def shutdown_event():
    """Application shutdown event handler."""
    log_info(f"Shutting down {settings.app_name}", extra={})


# ============================================================================
# Application Factory
# ============================================================================


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        await startup_event()
        yield
        await shutdown_event()

    # Define middleware stack
    middleware = [
        Middleware(
            TrustedHostMiddleware,
            allowed_hosts=settings.allowed_hosts,
        ),
        Middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_credentials=True,
            allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
            allow_headers=[
                "Content-Type",
                "Authorization",
                "Accept",
                "Origin",
                "User-Agent",
                "DNT",
                "Cache-Control",
                "X-Mx-ReqToken",
                "Keep-Alive",
            ],
            expose_headers=[
                "Content-Length",
                "X-Request-ID",
                "X-Response-Time",
            ],
            max_age=3600,
        ),
        Middleware(GZipMiddleware, minimum_size=1000),
    ]
    
    # Create FastAPI app
    app = FastAPI(
        title=settings.app_name,
        description="Household task management and gamification platform API",
        version=settings.app_version,
        middleware=middleware,
        debug=settings.debug,
        lifespan=lifespan,
    )
    
    # Add custom middleware
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(LoggingMiddleware)
    
    # Register exception handlers
    app.add_exception_handler(AporTamosException, aportamos_exception_handler)
    app.add_exception_handler(ValidationException, validation_exception_handler)
    app.add_exception_handler(AuthenticationException, authentication_exception_handler)
    app.add_exception_handler(AuthorizationException, authorization_exception_handler)
    app.add_exception_handler(ResourceNotFoundException, resource_not_found_handler)
    app.add_exception_handler(ConflictException, conflict_exception_handler)
    app.add_exception_handler(RateLimitException, rate_limit_exception_handler)
    app.add_exception_handler(ExternalServiceException, external_service_exception_handler)
    app.add_exception_handler(DatabaseException, database_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(Exception, general_exception_handler)
    
    # Define routes
    
    @app.get("/health", tags=["Health"])
    async def health_check() -> Dict[str, Any]:
        """Health check endpoint."""
        return {
            "status": "healthy",
            "app": settings.app_name,
            "version": settings.app_version,
            "timestamp": datetime.utcnow().isoformat(),
        }
    
    @app.get("/join", response_class=HTMLResponse, tags=["Invitations"])
    async def join_bridge(to: str = Query(..., description="App deep link to open")) -> str:
        """HTML bridge page for household invitations.

        Email clients only make http(s) links tappable, so the invitation email
        points here. This page then redirects to the app's deep link (`to`),
        which opens AporTamos and joins the household.
        """
        # Escape the URL for safe embedding in HTML/JS attributes
        import html as _html
        safe = _html.escape(to, quote=True)
        return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Abrir AporTamos</title>
  <meta http-equiv="refresh" content="0; url={safe}">
  <script>window.location.replace("{safe}");</script>
  <style>
    body {{ font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
           background:#fcf8ff;color:#1b1b23;display:flex;min-height:100vh;margin:0;
           align-items:center;justify-content:center;text-align:center;padding:24px }}
    .card {{ max-width:360px }}
    .logo {{ font-size:30px;font-weight:800;color:#4648d4;margin-bottom:12px }}
    a.btn {{ display:inline-block;background:#4648d4;color:#fff;text-decoration:none;
            font-weight:700;padding:14px 28px;border-radius:9999px;margin-top:20px }}
    p {{ color:#464554;line-height:1.5 }}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🏠 AporTamos</div>
    <h2>Abriendo la app…</h2>
    <p>Si no se abre automáticamente, pulsa el botón:</p>
    <a class="btn" href="{safe}">Abrir AporTamos</a>
  </div>
</body>
</html>"""

    @app.get("/", tags=["Status"])
    async def root() -> Dict[str, Any]:
        """Root endpoint with API information."""
        return {
            "name": settings.app_name,
            "version": settings.app_version,
            "environment": settings.environment,
            "endpoints": {
                "health": "/health",
                "docs": "/docs",
                "redoc": "/redoc",
                "openapi": "/openapi.json",
            },
        }
    
    @app.get("/status", tags=["Status"])
    async def status() -> Dict[str, Any]:
        """Detailed status endpoint."""
        return {
            "app": {
                "name": settings.app_name,
                "version": settings.app_version,
                "environment": settings.environment,
                "debug": settings.debug,
            },
            "server": {
                "timestamp": datetime.utcnow().isoformat(),
                "uptime_since": datetime.utcnow().isoformat(),
            },
            "config": {
                "supabase_configured": bool(settings.supabase_url),
                "cors_origins_count": len(settings.cors_origins),
                "log_level": settings.log_level.value,
            },
        }
    
    # Include routers
    app.include_router(auth_router)
    app.include_router(households_router)
    app.include_router(tasks_router)
    app.include_router(completions_router)
    app.include_router(stats_router)
    app.include_router(chat_router)
    
    return app


# ============================================================================
# Application Instance
# ============================================================================

# Create the FastAPI application instance
app = create_app()

# This allows the app to be run with: uvicorn app.main:app --reload
if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_level=settings.log_level.value.lower(),
    )
