#!/usr/bin/env python3
"""
RLS Policy Verification Script for AporTamos

This script verifies that Row Level Security (RLS) policies are enabled and
properly configured on all sensitive tables in Supabase.

Usage:
    python verify_rls_policies.py

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

# 7 sensitive tables that MUST have RLS policies
SENSITIVE_TABLES = [
    'households',
    'household_members',
    'tasks',
    'task_assignments',
    'task_completions',
    'chat_channels',
    'chat_messages'
]

# Expected RLS policies per table
EXPECTED_RLS_POLICIES = {
    'households': {
        'households_select': {'type': 'SELECT'},
        'households_update': {'type': 'UPDATE'},
        'households_delete': {'type': 'DELETE'}
    },
    'household_members': {
        'household_members_select': {'type': 'SELECT'}
    },
    'tasks': {
        'tasks_select': {'type': 'SELECT'}
    },
    'task_assignments': {
        'task_assignments_select': {'type': 'SELECT'},
        'task_assignments_update': {'type': 'UPDATE'}
    },
    'task_completions': {
        'task_completions_select': {'type': 'SELECT'}
    },
    'chat_channels': {
        'chat_channels_select': {'type': 'SELECT'}
    },
    'chat_messages': {
        'chat_messages_select': {'type': 'SELECT'},
        'chat_messages_insert': {'type': 'INSERT'}
    }
}


def get_db_connection() -> psycopg2.extensions.connection:
    """Create a connection to the Supabase PostgreSQL database."""
    supabase_url = os.getenv('SUPABASE_URL')
    
    if not supabase_url:
        try:
            from dotenv import load_dotenv
            load_dotenv()
            supabase_url = os.getenv('SUPABASE_URL')
        except:
            pass
    
    if not supabase_url or supabase_url == 'https://your-project.supabase.co':
        raise ValueError(
            "Supabase credentials not configured. "
            "Please set SUPABASE_URL in your .env file. "
            "Format: https://[project-ref].supabase.co"
        )
    
    parsed = urlparse(supabase_url)
    host = parsed.netloc
    db_host = host.replace('supabase.co', 'db.supabase.co')
    
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


def get_table_rls_status(conn: psycopg2.extensions.connection, table_name: str) -> Dict:
    """Check if RLS is enabled for a table."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT schemaname, tablename, rowsecurity
            FROM pg_tables
            WHERE schemaname = 'public' AND tablename = %s
        """, (table_name,))
        result = cur.fetchone()
        
        if result:
            return {
                'exists': True,
                'rls_enabled': result['rowsecurity'],
                'table_name': result['tablename']
            }
        else:
            return {'exists': False, 'rls_enabled': False}


def get_table_policies(conn: psycopg2.extensions.connection, table_name: str) -> List[Dict]:
    """Get all RLS policies for a table."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT 
                schemaname,
                tablename,
                policyname,
                permissive,
                roles,
                qual,
                with_check,
                cmd
            FROM pg_policies
            WHERE schemaname = 'public' AND tablename = %s
            ORDER BY policyname
        """, (table_name,))
        return cur.fetchall()


def test_policy_functionality(conn: psycopg2.extensions.connection, table_name: str) -> bool:
    """
    Test if RLS policies are actually functioning.
    
    This is a basic test - checks if policies exist and reference auth.uid()
    """
    policies = get_table_policies(conn, table_name)
    
    # Check if any policy references auth.uid()
    for policy in policies:
        qual = policy.get('qual', '') or ''
        with_check = policy.get('with_check', '') or ''
        
        if 'auth.uid()' in qual or 'auth.uid()' in with_check:
            return True
    
    return False


def verify_rls_policies() -> Tuple[bool, List[str]]:
    """Main verification function for RLS policies."""
    messages = []
    all_passed = True
    
    try:
        # Connect to database
        print("Connecting to Supabase PostgreSQL database...")
        conn = get_db_connection()
        messages.append("✓ Connected to database")
        
        # Verify all sensitive tables
        messages.append("\n" + "="*60)
        messages.append("RLS STATUS VERIFICATION")
        messages.append("="*60)
        
        rls_status_summary = {
            'total_tables': len(SENSITIVE_TABLES),
            'rls_enabled': 0,
            'rls_disabled': 0,
            'tables_not_found': 0
        }
        
        for table_name in SENSITIVE_TABLES:
            status = get_table_rls_status(conn, table_name)
            
            if not status['exists']:
                messages.append(f"✗ Table '{table_name}' NOT FOUND")
                rls_status_summary['tables_not_found'] += 1
                all_passed = False
            elif status['rls_enabled']:
                messages.append(f"✓ Table '{table_name}' - RLS ENABLED")
                rls_status_summary['rls_enabled'] += 1
            else:
                messages.append(f"✗ Table '{table_name}' - RLS DISABLED")
                rls_status_summary['rls_disabled'] += 1
                all_passed = False
        
        # RLS Policies Verification
        messages.append("\n" + "="*60)
        messages.append("RLS POLICIES VERIFICATION")
        messages.append("="*60)
        
        policies_status = {
            'total_expected': 0,
            'total_found': 0,
            'missing': []
        }
        
        for table_name in SENSITIVE_TABLES:
            if table_name not in [t for t in SENSITIVE_TABLES if get_table_rls_status(conn, t)['exists']]:
                continue
            
            expected_policies = EXPECTED_RLS_POLICIES.get(table_name, {})
            found_policies = get_table_policies(conn, table_name)
            found_policy_names = [p['policyname'] for p in found_policies]
            
            policies_status['total_expected'] += len(expected_policies)
            policies_status['total_found'] += len(found_policies)
            
            messages.append(f"\nTable '{table_name}':")
            messages.append(f"  Expected policies: {len(expected_policies)}")
            messages.append(f"  Found policies: {len(found_policies)}")
            
            if len(found_policies) > 0:
                for policy in found_policies:
                    policy_type = policy.get('cmd', 'UNKNOWN').upper()
                    messages.append(f"    ✓ {policy['policyname']} ({policy_type})")
                    
                    # Check if policy uses auth.uid()
                    qual = policy.get('qual', '') or ''
                    with_check = policy.get('with_check', '') or ''
                    if 'auth.uid()' in qual or 'auth.uid()' in with_check:
                        messages.append(f"      → References auth.uid() ✓")
                    else:
                        messages.append(f"      ⚠ No auth.uid() reference")
            else:
                messages.append(f"    ✗ NO POLICIES FOUND")
                all_passed = False
            
            # Check for missing expected policies
            for expected_name, expected_info in expected_policies.items():
                if expected_name not in found_policy_names:
                    policies_status['missing'].append({
                        'table': table_name,
                        'policy': expected_name,
                        'type': expected_info['type']
                    })
        
        # Policy Functionality Test
        messages.append("\n" + "="*60)
        messages.append("RLS POLICY FUNCTIONALITY TEST")
        messages.append("="*60)
        
        functionality_check = {
            'auth_references': 0,
            'no_auth_references': 0
        }
        
        for table_name in SENSITIVE_TABLES:
            if table_name not in [t for t in SENSITIVE_TABLES if get_table_rls_status(conn, t)['exists']]:
                continue
            
            if test_policy_functionality(conn, table_name):
                messages.append(f"✓ Table '{table_name}' policies reference auth.uid()")
                functionality_check['auth_references'] += 1
            else:
                messages.append(f"✗ Table '{table_name}' policies do NOT reference auth.uid()")
                functionality_check['no_auth_references'] += 1
                all_passed = False
        
        # Summary Statistics
        messages.append("\n" + "="*60)
        messages.append("SUMMARY")
        messages.append("="*60)
        messages.append(f"\nRLS Status:")
        messages.append(f"  Total sensitive tables: {rls_status_summary['total_tables']}")
        messages.append(f"  RLS enabled: {rls_status_summary['rls_enabled']}")
        messages.append(f"  RLS disabled: {rls_status_summary['rls_disabled']}")
        messages.append(f"  Tables not found: {rls_status_summary['tables_not_found']}")
        
        messages.append(f"\nPolicies:")
        messages.append(f"  Total expected: {policies_status['total_expected']}")
        messages.append(f"  Total found: {policies_status['total_found']}")
        messages.append(f"  Missing: {len(policies_status['missing'])}")
        
        if policies_status['missing']:
            messages.append(f"\n  Missing policies:")
            for missing in policies_status['missing']:
                messages.append(f"    - {missing['table']}.{missing['policy']} ({missing['type']})")
        
        messages.append(f"\nFunctionality:")
        messages.append(f"  Using auth.uid(): {functionality_check['auth_references']}")
        messages.append(f"  Not using auth.uid(): {functionality_check['no_auth_references']}")
        
        # Final verdict
        messages.append("\n" + "="*60)
        if all_passed:
            messages.append("✓ VERIFICATION PASSED: RLS policies configured correctly")
        else:
            messages.append("✗ VERIFICATION FAILED: RLS policies have issues")
        messages.append("="*60)
        
        conn.close()
        return all_passed, messages
        
    except Exception as e:
        messages.append(f"✗ Error during verification: {e}")
        import traceback
        messages.append(traceback.format_exc())
        return False, messages


if __name__ == '__main__':
    try:
        success, messages = verify_rls_policies()
        
        for msg in messages:
            print(msg)
        
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        print("\nVerification cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
