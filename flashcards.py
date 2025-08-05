#!/usr/bin/env python3
import csv
import os
import subprocess
import re
import time
from lib.audio_handler import AudioHandler
from lib.set_manager import SetManager
from lib.session_tracker import SessionTracker
from lib.review_engine import ReviewEngine

class FlashcardsApp:
    def __init__(self):
        self.set_manager = SetManager()
        self.session_tracker = SessionTracker(self.set_manager)
        self.review_engine = ReviewEngine(self.set_manager, self.session_tracker)
        self.audio_handler = AudioHandler()
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
            return
        
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
        
        summary += f"\n\nProvide exact words to review or study patterns to target. For Chinese characters, include pinyin pronunciation and English meanings for each. Don't mention what I answered if I got it wrong, as that creates false associations. Focus on the correct symbol/meaning relationships using creative memory aids based on the symbol, sound, meaning, or character breakdown. Note: Mastery is achieved with 3 consecutive 10/10 sessions. (Provider: {self.llm_provider})"
        
        # Switch to LLM pane using Cmd+] to ensure we're in the right pane
        subprocess.run(["osascript", "-e", 'tell application "System Events" to keystroke "]" using {command down}'], 
                     check=False, capture_output=True)
        time.sleep(0.5)
        
        # Write summary to temporary file to handle Unicode characters properly
        import tempfile
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

    def practice_set(self):
        """Practice Set menu option"""
        self.set_manager.select_card_set()
        
        filename = self.set_manager.get_csv_filename(self.set_manager.current_set)
        if not os.path.exists(filename):
            print(f"No cards found for {self.set_manager.display_set_name(self.set_manager.current_set)} set.")
            return
        
        # Check if LLM session is already active or ask user
        if self.llm_session_active:
            use_llm = True  # Continue with existing session
        else:
            use_llm = self.ask_use_llm("Practice Set", self.set_manager.display_set_name(self.set_manager.current_set))
        
        # Start collaborative mode only if user agrees and no session is active
        if use_llm and not self.llm_session_active:
            self.start_llm_session("Practice Set", self.set_manager.display_set_name(self.set_manager.current_set))
        
        try:
            with open(filename, 'r', newline='', encoding='utf-8') as csvfile:
                reader = csv.reader(csvfile)
                flashcards = list(reader)
        except Exception as e:
            print(f"Error reading flashcards: {e}")
            return
        
        if not flashcards:
            print(f"No cards in {self.set_manager.display_set_name(self.set_manager.current_set)} set.")
            return
        
        all_indices = list(range(len(flashcards)))
        result = self.review_engine.run_review_session(flashcards, all_indices, "Review All")
        
        # Save updated flashcards
        try:
            with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
                writer = csv.writer(csvfile)
                for row in result["flashcards"]:
                    writer.writerow(row)
        except Exception as e:
            print(f"Error saving flashcards: {e}")
        
        # Send session summary to LLM only if using an LLM
        if use_llm:
            self.send_session_summary_to_llm(
                result["session_data"]["session_type"],
                self.set_manager.display_set_name(self.set_manager.current_set),
                result["session_data"]["score"],
                result["session_data"]["duration"]
            )

    def practice_category(self):
        """Practice Category menu option"""
        print("\n--- Category Review ---")
        print("Select a category to review all sets:")
        print("1. Chinese→English Foundation (Recognition)")
        print("2. Chinese→English Vocabulary (Recognition)")
        print("3. English→Chinese Foundation (Production)")
        print("4. English→Chinese Vocabulary (Production)")
        print("5. Ruby Topic Sets")
        print("6. Back to main menu")
        
        try:
            category_choice = input("Select category: ")
        except (EOFError, KeyboardInterrupt):
            return
        
        category_map = {
            "1": "foundation",
            "2": "vocabulary",
            "3": "production_foundation",
            "4": "production_vocabulary",
            "5": "ruby"
        }
        
        if category_choice in category_map:
            category = category_map[category_choice]
            sets_in_category = self.set_manager.get_category_sets(category)
            
            if not sets_in_category:
                print(f"No sets found in {self.set_manager.get_category_display_name(category)} category.")
                return
            
            # Check if LLM session is already active or ask user
            if self.llm_session_active:
                use_llm = True  # Continue with existing session
            else:
                use_llm = self.ask_use_llm("Practice Category", self.set_manager.get_category_display_name(category))
            
            # Start collaborative mode only if user agrees and no session is active
            if use_llm and not self.llm_session_active:
                self.start_llm_session("Practice Category", self.set_manager.get_category_display_name(category))
            
            total_questions = sum(self.set_manager.count_questions_in_set(s) for s in sets_in_category)
            print(f"\nReviewing {self.set_manager.get_category_display_name(category)}")
            print(f"Total questions: {total_questions} (from {len(sets_in_category)} sets)")
            print(f"Sets included: {', '.join(self.set_manager.display_set_name(s) for s in sets_in_category)}")
            print("Press Enter to continue or 'q' to cancel...")
            
            try:
                confirm = input()
            except (EOFError, KeyboardInterrupt):
                return
            
            if confirm.lower() != 'q':
                combined_data = self.set_manager.load_combined_flashcards(category)
                
                if not combined_data["flashcards"]:
                    print("No flashcards found in category.")
                    return
                
                all_indices = list(range(len(combined_data["flashcards"])))
                result = self.review_engine.run_review_session(
                    combined_data["flashcards"], 
                    all_indices, 
                    f"Category Review: {self.set_manager.get_category_display_name(category)}"
                )
                
                self.set_manager.save_combined_flashcards(combined_data, result["flashcards"])
                print("Category review completed! Statistics updated for all sets.")
                
                # Send session summary to LLM only if using an LLM
                if use_llm:
                    self.send_session_summary_to_llm(
                        result["session_data"]["session_type"],
                        self.set_manager.get_category_display_name(category),
                        result["session_data"]["score"],
                        result["session_data"]["duration"]
                    )
        elif category_choice == "6":
            return
        else:
            print("Invalid choice.")

    def practice_difficult_cards(self):
        """Practice Difficult Cards menu option"""
        filename = self.set_manager.get_csv_filename(self.set_manager.current_set)
        if not os.path.exists(filename):
            print(f"No cards found for {self.set_manager.display_set_name(self.set_manager.current_set)} set.")
            return
        
        try:
            with open(filename, 'r', newline='', encoding='utf-8') as csvfile:
                reader = csv.reader(csvfile)
                flashcards = list(reader)
        except Exception as e:
            print(f"Error reading flashcards: {e}")
            return
        
        if not flashcards:
            print(f"No cards in {self.set_manager.display_set_name(self.set_manager.current_set)} set.")
            return
        
        # Find difficult cards (incorrect >= correct)
        difficult_cards_indices = []
        for i, card in enumerate(flashcards):
            if len(card) >= 5:
                incorrect_count = int(card[3])
                correct_count = int(card[2])
                if incorrect_count >= correct_count:
                    difficult_cards_indices.append(i)
        
        if not difficult_cards_indices:
            print("\nNo difficult cards to practice right now. Keep reviewing!")
            return
        
        result = self.review_engine.run_review_session(flashcards, difficult_cards_indices, "Practice Difficult")
        
        # Save the updated flashcards back to the CSV
        try:
            with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
                writer = csv.writer(csvfile)
                for row in result["flashcards"]:
                    writer.writerow(row)
        except Exception as e:
            print(f"Error saving flashcards: {e}")

    def view_scores(self):
        """View Scores menu option"""
        filename = self.set_manager.get_csv_filename(self.set_manager.current_set)
        if not os.path.exists(filename):
            print(f"No cards found for {self.set_manager.display_set_name(self.set_manager.current_set)} set.")
            return
        
        try:
            with open(filename, 'r', newline='', encoding='utf-8') as csvfile:
                reader = csv.reader(csvfile)
                flashcards = list(reader)
        except Exception as e:
            print(f"Error reading flashcards: {e}")
            return
        
        if not flashcards:
            print(f"No cards in {self.set_manager.display_set_name(self.set_manager.current_set)} set.")
            return
        
        print(f"\n--- {self.set_manager.display_set_name(self.set_manager.current_set)} Flashcard Scores ---")
        for index, row in enumerate(flashcards):
            if len(row) >= 5:
                question = row[0]
                correct = int(row[2])
                incorrect = int(row[3])
                reviewed = int(row[4])
                percentage = round((correct / (correct + incorrect)) * 100, 1) if (correct + incorrect) > 0 else 0
                print(f"{index + 1}. {question}")
                print(f"   {self.audio_handler.GREEN}Correct: {correct}{self.audio_handler.RESET}, {self.audio_handler.RED}Incorrect: {incorrect}{self.audio_handler.RESET}, Reviewed: {reviewed} ({percentage}%)")
        print("------------------------")
        
        # Show session history table
        all_sessions = self.session_tracker.get_all_session_results()
        if all_sessions:
            # Show only last 10 sessions in summary
            recent_sessions = all_sessions[-10:]
            print("\nSession History (Last 10 Sessions):")
            
            # Header
            header = "Q# |"
            for index in range(len(recent_sessions)):
                header += f" #{index + 1} |"
            print(header)

            # Separator
            separator = "---|----" * len(recent_sessions) + "---"
            print(separator)

            # Question rows
            max_questions = max(len(s["questions"]) for s in recent_sessions) if recent_sessions else 0
            for q_index in range(max_questions):
                row = f"{str(q_index + 1).rjust(2)} |"
                for session in recent_sessions:
                    if q_index < len(session["questions"]):
                        result = session["questions"][q_index]
                        if result.startswith("✓"):
                            row += "  ✓ |"
                        elif result.startswith("✗"):
                            row += "  ✗ |"
                        else:
                            row += "    |"
                    else:
                        row += "    |"
                print(row)
            
            print(separator)
            
            # Correct counts row
            correct_row = " ✓ |"
            for session in recent_sessions:
                score = session.get("score", "0/0")
                correct = score.split('/')[0]
                correct_row += f" {correct.rjust(2)} |"
            print(correct_row)
            
            # Incorrect counts row
            incorrect_row = " ✗ |"
            for session in recent_sessions:
                score = session.get("score", "0/0")
                correct, total = map(int, score.split('/'))
                incorrect = total - correct
                incorrect_row += f" {str(incorrect).rjust(2)} |"
            print(incorrect_row)
            
            # Total counts row
            total_row = " T |"
            for session in recent_sessions:
                score = session.get("score", "0/0")
                total = score.split('/')[1]
                total_row += f" {total.rjust(2)} |"
            print(total_row)
        print("")

    def run(self):
        """Main application loop"""
        try:
            while True:
                collaborative_status = f" ({self.llm_provider.capitalize()} session active)" if self.llm_session_active else ""
                print(f"""
Current set: {self.set_manager.display_set_name(self.set_manager.current_set)}{collaborative_status}
What would you like to do?""")
                print("1. Practice Set")
                print("2. Practice Category")
                print("3. Practice Difficult Cards")
                print("4. View Scores")
                print("5. Delete Set")
                if self.llm_session_active:
                    print("6. Close LLM Session")
                print("7. Exit")
                
                try:
                    choice = input("Enter your choice: ")
                except (EOFError, KeyboardInterrupt):
                    break
                
                if choice == "1":
                    self.practice_set()
                elif choice == "2":
                    self.practice_category()
                elif choice == "3":
                    self.practice_difficult_cards()
                elif choice == "4":
                    self.view_scores()
                elif choice == "5":
                    self.set_manager.delete_set()
                elif choice == "6" and self.llm_session_active:
                    self.close_llm_session()
                elif choice == "7":
                    break
                else:
                    print("Invalid choice. Please try again.")
        
        except KeyboardInterrupt:
            print("\n\nGoodbye!")

if __name__ == "__main__":
    app = FlashcardsApp()
    app.run()
