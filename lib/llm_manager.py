

import os
import re
import subprocess
import time
import tempfile

class LLMManager:
    def __init__(self, session_tracker):
        self.session_tracker = session_tracker
        self.llm_session_active = False
        self.llm_provider = None

    def bring_terminal_to_front(self):
        """Bring terminal to front using AppleScript"""
        try:
            subprocess.run(["osascript", "-e", 'tell application "Terminal" to activate'], 
                         check=False, capture_output=True)
        except (subprocess.SubprocessError, FileNotFoundError):
            pass

    def ask_use_llm(self, session_type, set_name):
        """Ask user if they want to use an LLM for collaborative learning"""
        print(f"\n--- {session_type}: {set_name} ---")
        print("Would you like to use an LLM for collaborative learning?")
        print("1. Gemini")
        print("2. Claude")
        print("3. No, practice without LLM")
        
        try:
            choice = input("Select an option (1-3): ").strip()
            if choice == "1":
                self.llm_provider = "gemini"
                return True
            elif choice == "2":
                self.llm_provider = "claude"
                return True
            else:
                return False
        except (EOFError, KeyboardInterrupt):
            return False

    def start_llm_session(self, session_type, set_name):
        """Start collaborative mode with a selected LLM provider"""
        try:
            # Check if osascript is available (macOS only)
            subprocess.run(["which", "osascript"], check=True, capture_output=True)
        except (subprocess.SubprocessError, FileNotFoundError):
            return False
        
        terminal_split_created = False
        if not self.llm_session_active:
            # Only split terminal and launch LLM if not already active
            subprocess.run(["osascript", "-e", 'tell application "System Events" to keystroke "d" using {command down}'], 
                         check=False, capture_output=True)
            time.sleep(1)
            subprocess.run(["osascript", "-e", f'tell application "System Events" to keystroke "{self.llm_provider}"'], 
                         check=False, capture_output=True)
            time.sleep(0.5)
            subprocess.run(["osascript", "-e", 'tell application "System Events" to keystroke return'], 
                         check=False, capture_output=True)
            if self.llm_provider == "gemini":
                time.sleep(3)
            else:
                time.sleep(2)
            self.llm_session_active = True
            terminal_split_created = True
        else:
            # Switch to existing LLM pane
            subprocess.run(["osascript", "-e", 'tell application "System Events" to keystroke "]" using {command down}'], 
                         check=False, capture_output=True)
            time.sleep(0.5)
        
        # Send message to LLM with session context using clipboard to handle Unicode
        message = f"I am starting a {session_type} session with {set_name}. Please monitor my learning progress and provide insights only when you notice important patterns or have specific tips. Just observe for now."
        subprocess.run(["pbcopy"], input=message, text=True, encoding='utf-8', check=False, capture_output=True)
        subprocess.run(["osascript", "-e", 'tell application "System Events" to keystroke "v" using {command down}'], 
                     check=False, capture_output=True)
        time.sleep(0.3)
        subprocess.run(["osascript", "-e", 'tell application "System Events" to keystroke return'], 
                     check=False, capture_output=True)
        
        # Switch back to the original terminal pane using Cmd+[
        time.sleep(0.5)
        subprocess.run(["osascript", "-e", 'tell application "System Events" to keystroke "[" using {command down}'], 
                     check=False, capture_output=True)
        
        return terminal_split_created

    def analyze_session_mistakes_from_data(self, question_results):
        """Analyze mistakes from session data"""
        mistakes = []
        idk_count = 0
        wrong_attempts = []
        
        # Parse the session questions for detailed analysis
        for result in question_results:
            if result.startswith("✗"):
                # Extract question and wrong answer from format: "✗ question A:wrong_answer (time)"
                match = re.search(r'✗ (.+?) A:(.+?) \(', result)
                if match:
                    question = match.group(1).strip()
                    wrong_answer = match.group(2).strip()
                    
                    if wrong_answer.lower() == "idk":
                        idk_count += 1
                    else:
                        wrong_attempts.append({"question": question, "answer": wrong_answer})
                    mistakes.append(question)
        
        analysis = ""
        total_mistakes = len(mistakes)
        
        if total_mistakes > 0:
            analysis += "MISTAKE DETAILS:"
            
            # IDK analysis
            if idk_count > 0:
                idk_percentage = round((idk_count / total_mistakes) * 100)
                analysis += f" {idk_count}/{total_mistakes} mistakes were 'idk' responses ({idk_percentage}%)."
                
                if idk_percentage >= 50:
                    analysis += f" HIGH UNFAMILIARITY: Focus on these specific unknown words: {', '.join(mistakes)}."
            
            # Wrong attempt analysis
            if wrong_attempts:
                attempts_str = ", ".join(f"{w['question']}→{w['answer']}" for w in wrong_attempts)
                analysis += f" Wrong attempts: {attempts_str}."
            
            # Specific recommendations based on mistakes
            if len(mistakes) <= 3:
                analysis += f" TARGETED REVIEW: Study exactly these {len(mistakes)} words: {', '.join(mistakes)}."
            elif len(mistakes) > 5:
                analysis += f" BROAD REVIEW NEEDED: {len(mistakes)} mistakes suggests reviewing entire set systematically."
        
        return analysis

    def send_session_summary_to_llm(self, session_type, set_name, score, duration):
        """Send session summary to the active LLM provider"""
        try:
            # Check if osascript is available (macOS only)
            subprocess.run(["which", "osascript"], check=True, capture_output=True)
        except (subprocess.SubprocessError, FileNotFoundError):
            return
        
        if not self.llm_session_active:
            return
        
        # Get the most recent session from logs
        recent_session = self.session_tracker.get_last_session_results()
        
        summary = f"Session completed: {session_type} - {set_name}. Score: {score}, Duration: {duration}s."
        
        if recent_session and recent_session["questions"]:
            correct_count = sum(1 for q in recent_session["questions"] if q.startswith("✓"))
            incorrect_count = sum(1 for q in recent_session["questions"] if q.startswith("✗"))
            summary += f" Correct: {correct_count}, Incorrect: {incorrect_count}."
            
            # Include the actual session data in the message
            summary += "\n\nSESSION DATA:\n"
            for question_result in recent_session["questions"]:
                summary += f"{question_result}\n"
            
            # Add detailed mistake analysis if there were errors
            if incorrect_count > 0:
                mistake_details = self.analyze_session_mistakes_from_data(recent_session["questions"])
                summary += f"\n{mistake_details}"
        
        summary += f"\n\nProvide exact words to review or study patterns to target. For Chinese characters, include pinyin pronunciation and English meanings for each. Never repeat incorrect answers - only teach correct character-meaning relationships. Break down each character into its component parts and explain how they combine to form meaning. Include radical information and stroke patterns where helpful for understanding structure. Provide both analytical understanding (how character is built) and memorable associations (what it looks like). Build on user's visual interpretations when they share how they see character shapes. Note: Mastery is achieved with 3 consecutive 10/10 sessions. (Provider: {self.llm_provider})"
        
        # Switch to LLM pane using Cmd+] to ensure we're in the right pane
        subprocess.run(["osascript", "-e", 'tell application "System Events" to keystroke "]" using {command down}'], 
                     check=False, capture_output=True)
        time.sleep(0.5)
        
        # Write summary to temporary file to handle Unicode characters properly
        with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', suffix='.txt', delete=False) as temp_file:
            temp_file.write(summary)
            temp_file_path = temp_file.name
        
        try:
            # Use pbcopy to put the content in clipboard, then paste it
            subprocess.run(["pbcopy"], input=summary, text=True, encoding='utf-8', check=False, capture_output=True)
            # Paste the content using Cmd+V
            subprocess.run(["osascript", "-e", 'tell application "System Events" to keystroke "v" using {command down}'], 
                         check=False, capture_output=True)
        finally:
            # Clean up temporary file
            try:
                os.unlink(temp_file_path)
            except:
                pass
        time.sleep(0.3)
        subprocess.run(["osascript", "-e", 'tell application "System Events" to keystroke return'], 
                     check=False, capture_output=True)
        
        # Switch back to the flashcard script pane using Cmd+[
        time.sleep(0.5)
        subprocess.run(["osascript", "-e", 'tell application "System Events" to keystroke "[" using {command down}'], 
                     check=False, capture_output=True)

    def close_llm_session(self):
        """Close LLM collaborative session"""
        if self.llm_session_active:
            print(f"Closing {self.llm_provider.capitalize()} collaborative session...")
            self.llm_session_active = False
            self.llm_provider = None
            print("LLM session closed. You can start a new collaborative session with Practice Set or Practice Category.")
        else:
            print("No active LLM session to close.")
