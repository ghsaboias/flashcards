#!/usr/bin/env python3
import os
import re
from datetime import datetime

def convert_logs():
    """Convert session_log.txt to new compact format"""
    input_file = "session_log.txt"
    output_file = "session_log_converted.txt"
    backup_file = "session_log_backup.txt"

    print(f"Converting {input_file} to compact format...")

    # Create backup
    if os.path.exists(input_file):
        with open(input_file, 'r', encoding='utf-8') as f:
            content = f.read()
        with open(backup_file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Backup created: {backup_file}")

    # Read and convert
    converted_lines = []

    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except FileNotFoundError:
        print(f"Error: {input_file} not found")
        return

    for line in lines:
        line = line.rstrip('\n')
        
        # Skip empty lines
        if not line.strip():
            converted_lines.append("")
            continue
        
        # Convert SESSION START
        session_start_match = re.match(r'^--- SESSION START: (.+?) \| Set: (.+?) \| Type: (.+?) ---$', line)
        if session_start_match:
            timestamp = session_start_match.group(1)
            set_name = session_start_match.group(2)
            session_type = session_start_match.group(3)
            converted_lines.append(f"> {timestamp} | {set_name} | {session_type}")
            continue
        
        # Convert SESSION END
        session_end_match = re.match(r'^--- SESSION END: (.+?) \| Duration: (.+?)s \| Score: (.+?) correct ---$', line)
        if session_end_match:
            timestamp = session_end_match.group(1)
            duration = session_end_match.group(2)
            score = session_end_match.group(3)
            # Extract just the time part from timestamp
            try:
                time_only = datetime.fromisoformat(timestamp.replace('Z', '+00:00')).strftime('%H:%M:%S')
            except:
                time_only = timestamp.split()[-1] if ' ' in timestamp else timestamp
            converted_lines.append(f"< {time_only} {duration}s {score}")
            continue
        
        # Convert CORRECT entries
        correct_match = re.match(r'^\[CORRECT\] Q: (.+?) \((.+?)s\)$', line)
        if correct_match:
            question = correct_match.group(1)
            duration = correct_match.group(2)
            converted_lines.append(f"✓ {question} ({duration}s)")
            continue
        
        # Convert INCORRECT entries
        incorrect_match = re.match(r'^\[INCORRECT\] Q: (.+?) \(Your Answer: (.+?)\) \((.+?)s\)$', line)
        if incorrect_match:
            question = incorrect_match.group(1)
            answer = incorrect_match.group(2)
            duration = incorrect_match.group(3)
            converted_lines.append(f"✗ {question} A:{answer} ({duration}s)")
            continue
        
        # Keep any other lines as-is
        converted_lines.append(line)

    # Write converted file
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(converted_lines) + '\n')

    print("Conversion complete!")
    print(f"Original lines: {len(lines)}")
    print(f"Converted lines: {len(converted_lines)}")

    # Calculate token savings
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            original_content = f.read()
        with open(output_file, 'r', encoding='utf-8') as f:
            converted_content = f.read()
        
        original_size = len(original_content)
        converted_size = len(converted_content)
        savings = round(((original_size - converted_size) / original_size * 100), 1) if original_size > 0 else 0

        print(f"File size: {original_size} → {converted_size} bytes ({savings}% reduction)")
    except Exception as e:
        print(f"Could not calculate size savings: {e}")

    print("\nTo apply changes:")
    print(f"  mv {output_file} {input_file}")
    print("\nTo restore backup:")
    print(f"  mv {backup_file} {input_file}")

if __name__ == "__main__":
    convert_logs()