import csv
import time
import random
import re
from datetime import datetime
from .audio_handler import AudioHandler
from .session_tracker import SessionTracker
from .pinyin_converter import PinyinConverter

class ReviewEngine:
    def __init__(self, set_manager, session_tracker):
        self.set_manager = set_manager
        self.session_tracker = session_tracker
        self.audio_handler = AudioHandler()
        self.pinyin_converter = PinyinConverter()

    def run_review_session(self, flashcards, indices_to_review, session_type):
        """Run a review session with the given flashcards and indices"""
        if not indices_to_review:
            print("\nNo cards to review in this category.")
            return {
                "flashcards": flashcards,
                "session_data": {
                    "score": "0/0",
                    "duration": 0,
                    "session_type": session_type
                }
            }

        session_start_time = datetime.now()
        session_start_time_str = session_start_time.strftime("%Y-%m-%d %H:%M:%S")
        session_correct_count = 0
        session_results = []

        # Randomize the order of questions
        randomized_indices = indices_to_review.copy()
        random.shuffle(randomized_indices)
        
        # Create mapping from position to CSV index
        position_to_csv_index = {}
        for position, csv_index in enumerate(randomized_indices):
            position_to_csv_index[position] = csv_index

        # Show last session results
        last_session = self.session_tracker.get_last_session_results()
        if last_session:
            print(f"\nLast Session: {last_session['score']} correct")
            print("Q#  | Result")
            print("----|-------")
            for index, result in enumerate(last_session["questions"]):
                # Simplified result: only show ✓ or ✗
                if result.startswith("✓"):
                    print(f"{str(index + 1).rjust(2)}  |   ✓")
                elif result.startswith("✗"):
                    print(f"{str(index + 1).rjust(2)}  |   ✗")
                else:
                    print(f"{str(index + 1).rjust(2)}  |")

        print(f"\n--- Starting Session: {session_type} ---")

        session_duration = 0  # Initialize before file operations
        
        # Open session log file for writing
        try:
            with open("session_log.txt", "a", encoding='utf-8') as log_file:
                log_file.write(f"> {session_start_time_str} | {self.set_manager.display_set_name(self.set_manager.current_set)} | {session_type}\n")

                for question_number, index in enumerate(randomized_indices):
                    question_start_time = time.time()
                    row = flashcards[index]
                    question = row[0]
                    answer = row[1]
                    correct_count = int(row[2])
                    incorrect_count = int(row[3])
                    reviewed_count = int(row[4])

                    # Check if this is a Chinese set for audio support
                    is_chinese_set = self.audio_handler.is_chinese_set(self.set_manager.current_set)
                    
                    # Format question with pinyin if it contains Chinese characters
                    formatted_question = self.pinyin_converter.format_question_with_pinyin(question)
                    
                    if is_chinese_set:
                        print(f"Question {question_number + 1}: {formatted_question}")
                        
                        chinese_text = self.audio_handler.get_chinese_text(question, answer)
                        self.audio_handler.play_audio(chinese_text)
                    else:
                        print(f"Question {question_number + 1}: {formatted_question}")
                    
                    user_answer = input("Your answer: ")
                    
                    # Handle audio replay for Chinese sets
                    if is_chinese_set:
                        while user_answer.lower() == 'p':
                            chinese_text = self.audio_handler.get_chinese_text(question, answer)
                            self.audio_handler.play_audio(chinese_text)
                            user_answer = input("Your answer: ")

                    # Check if answer is correct
                    is_correct = self._validate_answer(user_answer, answer)

                    question_end_time = time.time()
                    question_duration = round(question_end_time - question_start_time, 1)
                    
                    if is_correct:
                        self.audio_handler.play_success_sound()
                        print(f"{self.audio_handler.GREEN}Correct! The answer is: {answer}{self.audio_handler.RESET}")
                        flashcards[index][2] = str(correct_count + 1)
                        session_correct_count += 1
                        session_results.append({"number": question_number + 1, "result": "✓"})
                        log_file.write(f"✓ {question} ({question_duration}s)\n")
                    else:
                        print(f"{self.audio_handler.RED}Sorry, the correct answer is: {answer}{self.audio_handler.RESET}")
                        flashcards[index][3] = str(incorrect_count + 1)
                        session_results.append({"number": question_number + 1, "result": "✗"})
                        log_file.write(f"✗ {question} A:{user_answer} C:{answer} ({question_duration}s)\n")
                    
                    flashcards[index][4] = str(reviewed_count + 1)

                session_end_time = datetime.now()
                session_end_time_str = session_end_time.strftime("%Y-%m-%d %H:%M:%S")
                session_duration = round((session_end_time - session_start_time).total_seconds(), 1)
                
                session_summary = f"< {session_end_time.strftime('%H:%M:%S')} {session_duration}s {session_correct_count}/{len(indices_to_review)}"
                log_file.write(session_summary + "\n")
                log_file.write("\n")
        
        except Exception as e:
            print(f"Warning: Could not write to session log: {e}")
        
        # Calculate and display session results
        session_percentage = round((session_correct_count / len(indices_to_review)) * 100, 1) if indices_to_review else 0
        print("\n--- Session Complete ---")
        print(f"Score: {session_correct_count}/{len(indices_to_review)} ({session_percentage}%)")
        
        # Create current session results in CSV order
        current_session_by_csv_order = [" "] * len(indices_to_review)
        for result in session_results:
            csv_index = position_to_csv_index[result["number"] - 1]
            csv_position = indices_to_review.index(csv_index)
            if csv_position is not None:
                current_session_by_csv_order[csv_position] = result["result"]
        
        # Get all sessions (current session already included from log file)
        all_sessions = self.session_tracker.get_all_session_results()
        
        # Show recent sessions summary (last 10)
        recent_sessions = all_sessions[-10:]
        
        print("Score Summary (Last 10 Sessions):")
        
        # Header
        header = "Q# |"
        for index in range(len(recent_sessions)):
            header += f" #{index + 1} |"
        print(header)
        
        # Separator
        separator = "---|"
        for _ in recent_sessions:
            separator += "----|"
        print(separator)
        
        # Question rows
        max_questions = max(len(s["questions"]) for s in recent_sessions) if recent_sessions else 0
        for q_index in range(max_questions):
            row = f"{str(q_index + 1).rjust(2)} |"
            for session in recent_sessions:
                if q_index < len(session["questions"]):
                    result = session["questions"][q_index]
                    if result.startswith("✓"):
                        symbol = "✓"
                    elif result.startswith("✗"):
                        symbol = "✗"
                    else:
                        symbol = " "
                    colored_result = self._color_result(symbol)
                    row += f" {colored_result}  |"
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

        # Return both flashcards and session data
        return {
            "flashcards": flashcards,
            "session_data": {
                "score": f"{session_correct_count}/{len(indices_to_review)}",
                "duration": session_duration,
                "session_type": session_type
            }
        }

    def _validate_answer(self, user_answer, correct_answer):
        """Validate user answer against correct answer(s)"""
        # Handle multiple correct answers separated by ';' or ' or '
        if ";" in correct_answer or " or " in correct_answer:
            # Split on both separators and clean up
            correct_parts = []
            for part in re.split(r'[;]| or ', correct_answer):
                correct_parts.append(part.strip().lower())
            correct_parts.sort()
            
            # Split user answer on ' or ' and clean up
            user_parts = []
            for part in user_answer.split(" or "):
                user_parts.append(part.strip().lower())
            user_parts.sort()
            
            # Check if any user part matches any correct part
            return any(part in correct_parts for part in user_parts)
        else:
            # Single answer comparison
            return user_answer.strip().lower() == correct_answer.strip().lower()

    def _color_result(self, result):
        """Apply color to session result symbols"""
        if result == "✓":
            return f"{self.audio_handler.GREEN}{result}{self.audio_handler.RESET}"
        elif result == "✗":
            return f"{self.audio_handler.RED}{result}{self.audio_handler.RESET}"
        else:
            return result