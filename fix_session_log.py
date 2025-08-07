#!/usr/bin/env python3
"""
Migration script to fix historical session log data.

This script converts old confusing session log format to the new clean format:
- Old: "> timestamp | arbitrary_set_name | Category Review: actual_category"
- New: "> timestamp | actual_category | Category Review"
"""

import re
import shutil
from datetime import datetime

def fix_session_log(log_path='session_log.txt'):
    """Fix the session log format for better category plotting."""
    
    # Create backup
    backup_path = f"{log_path}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    shutil.copy2(log_path, backup_path)
    print(f"✓ Created backup: {backup_path}")
    
    fixed_lines = []
    changes_made = 0
    
    with open(log_path, 'r', encoding='utf-8') as file:
        lines = file.readlines()
    
    for line in lines:
        original_line = line
        line = line.strip()
        
        # Only process session headers (lines starting with >)
        if not line.startswith('>'):
            fixed_lines.append(original_line)
            continue
        
        # Parse session header: > timestamp | set_name | session_type
        header_match = re.match(r'^> (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \| (.+?) \| (.+)$', line)
        if not header_match:
            fixed_lines.append(original_line)
            continue
        
        timestamp, set_name, session_type = header_match.groups()
        
        # Fix Category Review sessions
        if 'Category Review:' in session_type:
            # Extract the actual category from session_type
            category_match = re.search(r'Category Review: (.+?)(?:\s*\([^)]+\))?$', session_type)
            if category_match:
                actual_category = category_match.group(1).strip()
                
                # Add back any parenthetical info if it exists
                paren_match = re.search(r'\(([^)]+)\)$', session_type)
                if paren_match:
                    actual_category += f" ({paren_match.group(1)})"
                
                # Create new clean format
                new_line = f"> {timestamp} | {actual_category} | Category Review\n"
                fixed_lines.append(new_line)
                changes_made += 1
                print(f"Fixed: {set_name} → {actual_category}")
                continue
        
        # Fix other confusing patterns
        if 'Difficult Category Review:' in session_type:
            category_match = re.search(r'Difficult Category Review: (.+?)(?:\s*\([^)]+\))?$', session_type)
            if category_match:
                actual_category = category_match.group(1).strip()
                
                # Add back any parenthetical info
                paren_match = re.search(r'\(([^)]+)\)$', session_type)
                if paren_match:
                    actual_category += f" ({paren_match.group(1)})"
                
                # Add (Difficult) to the category name
                new_line = f"> {timestamp} | {actual_category} (Difficult) | Difficult Category Review\n"
                fixed_lines.append(new_line)
                changes_made += 1
                print(f"Fixed difficult: {set_name} → {actual_category} (Difficult)")
                continue
        
        # Keep all other lines as-is (regular set practice, SRS, etc.)
        fixed_lines.append(original_line)
    
    # Write the fixed content back
    with open(log_path, 'w', encoding='utf-8') as file:
        file.writelines(fixed_lines)
    
    print(f"\n✓ Migration complete!")
    print(f"  - {changes_made} session headers fixed")
    print(f"  - Backup saved as: {backup_path}")
    print(f"  - Original log updated: {log_path}")

def preview_changes(log_path='session_log.txt'):
    """Preview what changes would be made without actually modifying the file."""
    
    print("=== PREVIEW MODE - No changes will be made ===\n")
    
    changes_count = 0
    
    with open(log_path, 'r', encoding='utf-8') as file:
        lines = file.readlines()
    
    for line_num, line in enumerate(lines, 1):
        line = line.strip()
        
        if not line.startswith('>'):
            continue
        
        header_match = re.match(r'^> (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \| (.+?) \| (.+)$', line)
        if not header_match:
            continue
        
        timestamp, set_name, session_type = header_match.groups()
        
        # Show what would change for Category Review sessions
        if 'Category Review:' in session_type:
            category_match = re.search(r'Category Review: (.+?)(?:\s*\([^)]+\))?$', session_type)
            if category_match:
                actual_category = category_match.group(1).strip()
                paren_match = re.search(r'\(([^)]+)\)$', session_type)
                if paren_match:
                    actual_category += f" ({paren_match.group(1)})"
                
                print(f"Line {line_num}:")
                print(f"  OLD: {set_name} | {session_type}")
                print(f"  NEW: {actual_category} | Category Review")
                print()
                changes_count += 1
        
        elif 'Difficult Category Review:' in session_type:
            category_match = re.search(r'Difficult Category Review: (.+?)(?:\s*\([^)]+\))?$', session_type)
            if category_match:
                actual_category = category_match.group(1).strip()
                paren_match = re.search(r'\(([^)]+)\)$', session_type)
                if paren_match:
                    actual_category += f" ({paren_match.group(1)})"
                
                print(f"Line {line_num}:")
                print(f"  OLD: {set_name} | {session_type}")
                print(f"  NEW: {actual_category} (Difficult) | Difficult Category Review")
                print()
                changes_count += 1
    
    print(f"Total changes that would be made: {changes_count}")

if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == '--preview':
        preview_changes()
    else:
        print("Session Log Migration Script")
        print("=" * 30)
        print("This will fix historical session logs for better category plotting.")
        print("A backup will be created before making changes.")
        print()
        
        response = input("Proceed with migration? (y/N): ").strip().lower()
        if response == 'y':
            fix_session_log()
        else:
            print("Migration cancelled.")
            print("Run with --preview to see what changes would be made.")