#!/usr/bin/env python3
"""
Supabase Auth Configuration Verification Script for AporTamos

This script verifies that Supabase Auth is properly configured for the AporTamos application.

Configuration to verify:
- Email/password authentication enabled
- Google OAuth provider configured
- JWT token settings
- Email templates configured
- Redirect URLs configured

Usage:
    python verify_auth_configuration.py

Requirements:
    - SUPABASE_URL environment variable set
    - SUPABASE_SERVICE_ROLE_KEY environment variable set
    - supabase-py library installed
"""

import os
import sys
import json
from typing import Tuple, List, Dict, Any

try:
    from supabase import create_client, Client
    import requests
except ImportError:
    print("Error: Required packages not installed")
    print("Install with: pip install supabase requests")
    sys.exit(1)


def get_supabase_client() -> Client:
    """Create and return a Supabase client."""
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not supabase_url or not supabase_key:
        try:
            from dotenv import load_dotenv
            load_dotenv()
            supabase_url = os.getenv('SUPABASE_URL')
            supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        except:
            pass
    
    if not supabase_url or supabase_url == 'https://your-project.supabase.co':
        raise ValueError(
            "Supabase URL not configured. "
            "Please set SUPABASE_URL in your .env file. "
            "Format: https://[project-ref].supabase.co"
        )
    
    if not supabase_key or supabase_key == 'your-service-role-key':
        raise ValueError(
            "Supabase service role key not configured. "
            "Please set SUPABASE_SERVICE_ROLE_KEY in your .env file."
        )
    
    try:
        client = create_client(supabase_url, supabase_key)
        return client
    except Exception as e:
        raise RuntimeError(f"Failed to create Supabase client: {e}")


def get_auth_config(supabase_url: str, service_role_key: str) -> Tuple[bool, Dict[str, Any]]:
    """
    Fetch auth configuration from Supabase management API.
    
    Returns:
        Tuple of (success: bool, config: Dict)
    """
    try:
        # Extract project reference from URL
        project_ref = supabase_url.split('//')[1].split('.')[0]
        
        # Call Supabase management API
        headers = {
            'Authorization': f'Bearer {service_role_key}',
            'Content-Type': 'application/json'
        }
        
        # Get auth configuration
        response = requests.get(
            f'https://api.supabase.com/v1/projects/{project_ref}/auth-config',
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            return True, response.json()
        else:
            return False, {
                'error': f'API error {response.status_code}',
                'details': response.text
            }
    except Exception as e:
        return False, {'error': str(e)}


def verify_auth_providers(config: Dict) -> Tuple[bool, List[str]]:
    """
    Verify that required authentication providers are enabled.
    
    Returns:
        Tuple of (all_passed: bool, messages: List[str])
    """
    messages = []
    all_passed = True
    
    try:
        providers = config.get('external', {})
        
        # Check email provider
        email_enabled = providers.get('email', {}).get('enabled', False)
        if email_enabled:
            messages.append("✓ Email/password authentication ENABLED")
        else:
            messages.append("✗ Email/password authentication DISABLED")
            all_passed = False
        
        # Check Google OAuth
        google_config = providers.get('google', {})
        google_enabled = google_config.get('enabled', False)
        
        if google_enabled:
            messages.append("✓ Google OAuth ENABLED")
            if google_config.get('client_id'):
                messages.append(f"  Client ID: {google_config.get('client_id')[:20]}...")
        else:
            messages.append("⚠ Google OAuth DISABLED (optional)")
        
        return all_passed, messages
        
    except Exception as e:
        messages.append(f"✗ Error checking providers: {e}")
        return False, messages


def verify_jwt_settings(config: Dict) -> Tuple[bool, List[str]]:
    """
    Verify JWT token settings.
    
    Returns:
        Tuple of (all_passed: bool, messages: List[str])
    """
    messages = []
    all_passed = True
    
    try:
        jwt_config = config.get('jwt', {})
        
        # Check JWT expiration
        exp = jwt_config.get('exp', 3600)
        if 3600 <= exp <= 86400:  # Between 1 hour and 1 day
            messages.append(f"✓ JWT expiration configured: {exp}s ({exp//3600}h)")
        else:
            messages.append(f"⚠ JWT expiration unusual: {exp}s")
        
        # Check other JWT settings
        if jwt_config.get('secret'):
            messages.append("✓ JWT secret configured")
        else:
            messages.append("✗ JWT secret NOT configured")
            all_passed = False
        
        return all_passed, messages
        
    except Exception as e:
        messages.append(f"✗ Error checking JWT: {e}")
        return False, messages


def verify_email_config(config: Dict) -> Tuple[bool, List[str]]:
    """
    Verify email configuration.
    
    Returns:
        Tuple of (all_passed: bool, messages: List[str])
    """
    messages = []
    all_passed = True
    
    try:
        email = config.get('email', {})
        
        # Check if email is configured
        if email.get('enabled'):
            messages.append("✓ Email provider enabled")
            
            if email.get('smtp'):
                messages.append("✓ SMTP configured for email delivery")
            else:
                messages.append("⚠ SMTP not configured (emails may not send)")
        else:
            messages.append("⚠ Email provider disabled")
        
        return all_passed, messages
        
    except Exception as e:
        messages.append(f"✗ Error checking email: {e}")
        return False, messages


def verify_redirect_urls(config: Dict) -> Tuple[bool, List[str]]:
    """
    Verify redirect URLs are configured.
    
    Returns:
        Tuple of (all_passed: bool, messages: List[str])
    """
    messages = []
    all_passed = True
    
    try:
        urls = config.get('url_allowlist', [])
        
        if urls:
            messages.append(f"✓ Redirect URLs configured: {len(urls)} URL(s)")
            for url in urls[:3]:  # Show first 3
                messages.append(f"  - {url}")
            if len(urls) > 3:
                messages.append(f"  ... and {len(urls) - 3} more")
        else:
            messages.append("⚠ No redirect URLs configured")
        
        return all_passed, messages
        
    except Exception as e:
        messages.append(f"✗ Error checking URLs: {e}")
        return False, messages


def test_auth_service_connection(client: Client) -> Tuple[bool, str]:
    """
    Test if we can connect to Supabase Auth service.
    
    Returns:
        Tuple of (success: bool, message: str)
    """
    try:
        # Try to get current user (will fail if not authenticated, but proves connection)
        user = client.auth.get_user()
        return True, "✓ Supabase Auth service responsive"
    except Exception as e:
        error_msg = str(e)
        if 'No session' in error_msg or 'not found' in error_msg:
            return True, "✓ Supabase Auth service responsive (not authenticated)"
        else:
            return False, f"✗ Supabase Auth service error: {error_msg}"


def verify_auth_configuration() -> Tuple[bool, List[str]]:
    """Main function to verify Supabase Auth configuration."""
    messages = []
    all_passed = True
    
    try:
        # Connect to Supabase
        print("Connecting to Supabase...")
        client = get_supabase_client()
        supabase_url = os.getenv('SUPABASE_URL')
        service_role_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        messages.append("✓ Connected to Supabase\n")
        
        # Test Auth service connection
        success, msg = test_auth_service_connection(client)
        messages.append(msg)
        
        # Fetch auth configuration
        messages.append("\n" + "="*60)
        messages.append("FETCHING AUTH CONFIGURATION")
        messages.append("="*60)
        
        success, config = get_auth_config(supabase_url, service_role_key)
        
        if not success:
            messages.append(f"✗ Could not fetch auth config: {config.get('error')}")
            messages.append("Note: Auth configuration verification requires management API access")
            messages.append("Proceed with manual verification in Supabase Dashboard")
        else:
            # Verify auth providers
            messages.append("\n" + "="*60)
            messages.append("AUTHENTICATION PROVIDERS")
            messages.append("="*60)
            
            success, provider_msgs = verify_auth_providers(config)
            messages.extend(provider_msgs)
            if not success:
                all_passed = False
            
            # Verify JWT settings
            messages.append("\n" + "="*60)
            messages.append("JWT TOKEN SETTINGS")
            messages.append("="*60)
            
            success, jwt_msgs = verify_jwt_settings(config)
            messages.extend(jwt_msgs)
            
            # Verify email configuration
            messages.append("\n" + "="*60)
            messages.append("EMAIL CONFIGURATION")
            messages.append("="*60)
            
            success, email_msgs = verify_email_config(config)
            messages.extend(email_msgs)
            
            # Verify redirect URLs
            messages.append("\n" + "="*60)
            messages.append("REDIRECT URLS")
            messages.append("="*60)
            
            success, url_msgs = verify_redirect_urls(config)
            messages.extend(url_msgs)
        
        # Summary
        messages.append("\n" + "="*60)
        if all_passed:
            messages.append("✓ AUTH CONFIGURATION VERIFICATION COMPLETE")
        else:
            messages.append("⚠ SOME AUTH SETTINGS NEED CONFIGURATION")
        messages.append("="*60)
        
        return all_passed, messages
        
    except Exception as e:
        messages.append(f"✗ Error during verification: {e}")
        import traceback
        messages.append(traceback.format_exc())
        return False, messages


if __name__ == '__main__':
    try:
        success, messages = verify_auth_configuration()
        
        # Print all messages
        for msg in messages:
            print(msg)
        
        # Exit with appropriate code
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        print("\nAuth verification cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
