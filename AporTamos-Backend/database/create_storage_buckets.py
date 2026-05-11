#!/usr/bin/env python3
"""
Supabase Storage Bucket Creation Script for AporTamos

This script creates the required Supabase Storage buckets for task proofs and chat media.

Buckets to create:
- task-proofs: For storing task completion photo proofs (private)
- chat-media: For storing chat media (images, audio) (private)

Usage:
    python create_storage_buckets.py

Requirements:
    - SUPABASE_URL environment variable set
    - SUPABASE_SERVICE_ROLE_KEY environment variable set
    - supabase-py library installed
"""

import os
import sys
import json
from typing import Tuple, List, Dict

try:
    from supabase import create_client, Client
except ImportError:
    print("Error: supabase-py not installed")
    print("Install with: pip install supabase")
    sys.exit(1)


# Buckets to create
BUCKETS_TO_CREATE = [
    {
        'name': 'task-proofs',
        'public': False,  # Private
        'description': 'Task completion photo proofs for task verification'
    },
    {
        'name': 'chat-media',
        'public': False,  # Private
        'description': 'Chat media files (images, audio) for household communication'
    }
]


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
            "Supabase credentials not configured. "
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


def list_existing_buckets(client: Client) -> List[str]:
    """List all existing buckets in Supabase Storage."""
    try:
        response = client.storage.list_buckets()
        if response:
            return [bucket.name for bucket in response]
        return []
    except Exception as e:
        print(f"Warning: Could not list existing buckets: {e}")
        return []


def create_bucket(client: Client, bucket_config: Dict) -> Tuple[bool, str]:
    """
    Create a single storage bucket.
    
    Args:
        client: Supabase client
        bucket_config: Dictionary with bucket configuration
        
    Returns:
        Tuple of (success: bool, message: str)
    """
    bucket_name = bucket_config['name']
    is_public = bucket_config['public']
    
    try:
        # Try to create the bucket
        response = client.storage.create_bucket(
            name=bucket_name,
            options={
                'public': is_public
            }
        )
        
        return True, f"✓ Bucket '{bucket_name}' created successfully"
    
    except Exception as e:
        error_msg = str(e)
        
        # Check if bucket already exists
        if 'already exists' in error_msg or 'Duplicate' in error_msg:
            return True, f"✓ Bucket '{bucket_name}' already exists (skipped)"
        
        # Other errors
        return False, f"✗ Failed to create bucket '{bucket_name}': {error_msg}"


def get_bucket_info(client: Client, bucket_name: str) -> Dict:
    """Get information about a specific bucket."""
    try:
        # Try to get bucket info via list
        buckets = client.storage.list_buckets()
        for bucket in buckets:
            if bucket.name == bucket_name:
                return {
                    'name': bucket.name,
                    'id': bucket.id,
                    'created_at': bucket.created_at,
                    'updated_at': bucket.updated_at,
                    'public': bucket.public,
                    'exists': True
                }
        
        return {'exists': False, 'name': bucket_name}
    except Exception as e:
        return {
            'exists': False,
            'name': bucket_name,
            'error': str(e)
        }


def create_storage_buckets() -> Tuple[bool, List[str]]:
    """Main function to create all storage buckets."""
    messages = []
    all_passed = True
    
    try:
        # Connect to Supabase
        print("Connecting to Supabase...")
        client = get_supabase_client()
        messages.append("✓ Connected to Supabase")
        
        # List existing buckets
        print("\nChecking existing buckets...")
        existing = list_existing_buckets(client)
        messages.append(f"\nExisting buckets: {', '.join(existing) if existing else 'None'}")
        
        # Create each bucket
        messages.append("\n" + "="*60)
        messages.append("CREATING STORAGE BUCKETS")
        messages.append("="*60)
        
        for bucket_config in BUCKETS_TO_CREATE:
            success, message = create_bucket(client, bucket_config)
            messages.append(message)
            
            if not success:
                all_passed = False
        
        # Verify buckets were created
        messages.append("\n" + "="*60)
        messages.append("VERIFICATION")
        messages.append("="*60)
        
        for bucket_config in BUCKETS_TO_CREATE:
            bucket_name = bucket_config['name']
            info = get_bucket_info(client, bucket_name)
            
            if info.get('exists'):
                messages.append(f"✓ Bucket '{bucket_name}' verified")
                messages.append(f"  ID: {info.get('id', 'N/A')}")
                messages.append(f"  Public: {info.get('public', 'N/A')}")
                messages.append(f"  Created: {info.get('created_at', 'N/A')}")
            else:
                messages.append(f"✗ Bucket '{bucket_name}' not found after creation")
                all_passed = False
        
        # Summary
        messages.append("\n" + "="*60)
        if all_passed:
            messages.append("✓ BUCKET CREATION SUCCESSFUL")
        else:
            messages.append("✗ BUCKET CREATION HAD ISSUES")
        messages.append("="*60)
        
        return all_passed, messages
        
    except Exception as e:
        messages.append(f"✗ Error during bucket creation: {e}")
        import traceback
        messages.append(traceback.format_exc())
        return False, messages


if __name__ == '__main__':
    try:
        success, messages = create_storage_buckets()
        
        # Print all messages
        for msg in messages:
            print(msg)
        
        # Exit with appropriate code
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        print("\nBucket creation cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
