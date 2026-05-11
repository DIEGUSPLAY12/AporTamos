#!/usr/bin/env python3
"""
Database Schema Verification Script for AporTamos

This script verifies that all 9 required tables have been created in Supabase
and checks that they have the correct structure.

Usage:
    python verify_schema.py

Requirements:
    - SUPABASE_URL environment variable set
    - SUPABASE_SERVICE_ROLE_KEY environment variable set
    - psycopg2 library installed
"""

import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
from urllib.parse import urlparse
from typing import List, Dict, Tuple

# Expected 9 tables
EXPECTED_TABLES = [
    'users',
    'households',
    'household_members',
    'weekly_task_schedules',
    'tasks',
    'task_assignments',
    'task_completions',
    'chat_channels',
    'chat_messages'
]

# Expected columns for each table
EXPECTED_COLUMNS = {
    'users': {
        'id', 'email', 'password_hash', 'google_id', 'name',
        'created_at', 'updated_at', 'deleted_at'
    },
    'households': {
        'id', 'owner_id', 'name', 'timezone_id', 'daily_streak',
        'last_completion_date', 'created_at', 'updated_at', 'deleted_at'
    },
    'household_members': {
        'id', 'household_id', 'user_id', 'role',
        'joined_at', 'updated_at'
    },
    'weekly_task_schedules': {
        'id', 'household_id', 'version',
        'created_at', 'updated_at', 'active_from', 'active_until', 'deleted_at'
    },
    'tasks': {
        'id', 'schedule_id', 'name', 'description', 'day_of_week',
        'effort_weight', 'assignment_type', 'assigned_user_id', 'frequency',
        'created_at', 'updated_at'
    },
    'task_assignments': {
        'id', 'task_id', 'household_id', 'assigned_to_user_id',
        'assignment_date', 'is_completed', 'completed_at',
        'created_at', 'updated_at'
    },
    'task_completions': {
        'id', 'assignment_id', 'user_id', 'photo_url',
        'completed_at', 'created_at'
    },
    'chat_channels': {
        'id', 'household_id', 'created_at', 'updated_at'
    },
    'chat_messages': {
        'id', 'channel_id', 'sender_id', 'message_type',
        'content', 'media_url', 'created_at'
    }
}


def get_db_connection() -> psycopg2.extensions.connection:
    """
    Create a connection to the Supabase PostgreSQL database.
    
    Reads credentials from environment variables:
    - SUPABASE_URL: Full Supabase project URL
    - SUPABASE_SERVICE_ROLE_KEY: Service role key (not used for connection, but needed for auth)
    
    Alternatively, reads from .env file if not in environment.
    """
    # Try to load from environment first
    supabase_url = os.getenv('SUPABASE_URL')
    
    if not supabase_url:
        # Try to load from .env file
        from dotenv import load_dotenv
        load_dotenv()
        supabase_url = os.getenv('SUPABASE_URL')
    
    if not supabase_url or supabase_url == 'https://your-project.supabase.co':
        raise ValueError(
            "Supabase credentials not configured. "
            "Please set SUPABASE_URL in your .env file. "
            "Format: https://[project-ref].supabase.co"
        )
    
    # Extract host from URL
    # URL format: https://xxxx.supabase.co
    parsed = urlparse(supabase_url)
    host = parsed.netloc
    
    # Supabase PostgreSQL uses postgres.db subdomain
    db_host = host.replace('supabase.co', 'db.supabase.co')
    
    # For local development or testing, prompt user for credentials
    print(f"Connecting to: {db_host}")
    print("\nEnter PostgreSQL connection details:")
    
    db_user = input("Database user (default: postgres): ").strip() or "postgres"
    db_password = input("Database password: ").strip()
    db_name = input("Database name (default: postgres): ").strip() or "postgres"
    
    try:
        conn = psycopg2.connect(
            host=db_host,
            database=db_name,
            user=db_user,
            password=db_password,
            port=5432,
            sslmode='require'
        )
        return conn
    except psycopg2.Error as e:
        raise RuntimeError(f"Failed to connect to database: {e}")


def get_existing_tables(conn: psycopg2.extensions.connection) -> List[str]:
    """Query information_schema to get all user-created tables."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        """)
        return [row['table_name'] for row in cur.fetchall()]


def get_table_columns(conn: psycopg2.extensions.connection, table_name: str) -> set:
    """Get all column names for a specific table."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = %s
            ORDER BY column_name
        """, (table_name,))
        return {row['column_name'] for row in cur.fetchall()}


def check_rls_policies(conn: psycopg2.extensions.connection, table_name: str) -> List[str]:
    """Check if RLS policies are enabled for a table."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        # Check if RLS is enabled
        cur.execute("""
            SELECT COUNT(*) as policy_count
            FROM pg_policies
            WHERE tablename = %s
        """, (table_name,))
        result = cur.fetchone()
        return result['policy_count'] > 0 if result else False


def check_indexes(conn: psycopg2.extensions.connection, table_name: str) -> List[str]:
    """Get all indexes for a table."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT indexname
            FROM pg_indexes
            WHERE tablename = %s
            ORDER BY indexname
        """, (table_name,))
        return [row['indexname'] for row in cur.fetchall()]


def verify_schema() -> Tuple[bool, List[str]]:
    """
    Main verification function.
    
    Returns:
        Tuple of (success: bool, messages: List[str])
    """
    messages = []
    all_passed = True
    
    try:
        # Connect to database
        print("Connecting to Supabase PostgreSQL database...")
        conn = get_db_connection()
        messages.append("✓ Connected to database")
        
        # Get existing tables
        existing_tables = get_existing_tables(conn)
        messages.append(f"\nFound {len(existing_tables)} tables in public schema")
        
        # Check all expected tables exist
        messages.append("\n" + "="*60)
        messages.append("TABLE VERIFICATION")
        messages.append("="*60)
        
        missing_tables = []
        for table in EXPECTED_TABLES:
            if table in existing_tables:
                messages.append(f"✓ Table '{table}' exists")
            else:
                messages.append(f"✗ Table '{table}' MISSING")
                missing_tables.append(table)
                all_passed = False
        
        if missing_tables:
            messages.append(f"\n✗ ERROR: {len(missing_tables)} tables missing: {', '.join(missing_tables)}")
        else:
            messages.append(f"\n✓ All {len(EXPECTED_TABLES)} required tables exist!")
        
        # Check table structure
        messages.append("\n" + "="*60)
        messages.append("COLUMN VERIFICATION")
        messages.append("="*60)
        
        for table in EXPECTED_TABLES:
            if table not in existing_tables:
                continue
            
            existing_cols = get_table_columns(conn, table)
            expected_cols = EXPECTED_COLUMNS.get(table, set())
            
            missing_cols = expected_cols - existing_cols
            extra_cols = existing_cols - expected_cols
            
            if missing_cols or extra_cols:
                messages.append(f"\n✗ Table '{table}':")
                if missing_cols:
                    messages.append(f"  Missing columns: {', '.join(sorted(missing_cols))}")
                    all_passed = False
                if extra_cols:
                    messages.append(f"  Extra columns: {', '.join(sorted(extra_cols))}")
            else:
                messages.append(f"✓ Table '{table}' has all expected columns ({len(expected_cols)})")
        
        # Check RLS policies
        messages.append("\n" + "="*60)
        messages.append("RLS POLICY VERIFICATION")
        messages.append("="*60)
        
        sensitive_tables = [
            'households', 'household_members', 'tasks', 'task_assignments',
            'task_completions', 'chat_channels', 'chat_messages'
        ]
        
        for table in sensitive_tables:
            if table in existing_tables:
                has_rls = check_rls_policies(conn, table)
                if has_rls:
                    messages.append(f"✓ Table '{table}' has RLS policies")
                else:
                    messages.append(f"✗ Table '{table}' missing RLS policies")
                    all_passed = False
        
        # Check indexes
        messages.append("\n" + "="*60)
        messages.append("INDEX VERIFICATION")
        messages.append("="*60)
        
        for table in EXPECTED_TABLES:
            if table in existing_tables:
                indexes = check_indexes(conn, table)
                if indexes:
                    messages.append(f"✓ Table '{table}' has {len(indexes)} indexes")
                else:
                    messages.append(f"✗ Table '{table}' has no indexes")
        
        conn.close()
        
        # Final summary
        messages.append("\n" + "="*60)
        if all_passed:
            messages.append("✓ VERIFICATION PASSED: Schema is complete")
        else:
            messages.append("✗ VERIFICATION FAILED: Schema has issues")
        messages.append("="*60)
        
        return all_passed, messages
        
    except Exception as e:
        messages.append(f"✗ Error during verification: {e}")
        import traceback
        messages.append(traceback.format_exc())
        return False, messages


if __name__ == '__main__':
    try:
        success, messages = verify_schema()
        
        # Print all messages
        for msg in messages:
            print(msg)
        
        # Exit with appropriate code
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        print("\nVerification cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
