import re
import os
from .set_manager import SetManager

class SessionTracker:
    def __init__(self, set_manager):
        self.set_manager = set_manager

    def get_all_session_results(self):
        """Parse session_log.txt and return all session results for current set"""
        if not os.path.exists("session_log.txt"):
            return []
        
        all_sessions = []
        current_session = None
        current_set_display = self.set_manager.display_set_name(self.set_manager.current_set)
        
        try:
            with open("session_log.txt", 'r', encoding='utf-8') as file:
                lines = file.readlines()
                
                for line in lines:
                    line = line.strip()
                    
                    # Session start line: "> 2024-01-01 10:00:00 | Set Name | Session Type"
                    if line.startswith(">") and current_set_display in line:
                        current_session = {"questions": [], "score": None}
                    
                    # Session end line: "< 10:05:23 67.8s 8/10"
                    elif current_session and line.startswith("<"):
                        # Extract score using regex
                        match = re.search(r'(\d+)/(\d+)$', line)
                        if match:
                            current_session["score"] = f"{match.group(1)}/{match.group(2)}"
                            all_sessions.append(current_session)
                        current_session = None
                    
                    # Question result lines: "✓ Question text (2.1s)" or "✗ Question text A:wrong_answer (3.4s)"
                    elif current_session and (line.startswith("✓") or line.startswith("✗")):
                        current_session["questions"].append(line)
        
        except Exception as e:
            print(f"Warning: Could not parse session log: {e}")
            return []
        
        return all_sessions

    def get_last_session_results(self):
        """Get the most recent session results"""
        all_sessions = self.get_all_session_results()
        return all_sessions[-1] if all_sessions else None