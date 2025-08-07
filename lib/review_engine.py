import csv
import time
import random
import re
from datetime import datetime
from .audio_handler import AudioHandler
from .session_tracker import SessionTracker
from .pinyin_converter import PinyinConverter
from .srs import SRSManager
from .coin_system import CoinSystem
from .visual_feedback import VisualFeedback

class ReviewEngine:
    def __init__(self, set_manager, session_tracker, coin_system=None):
        self.set_manager = set_manager
        self.session_tracker = session_tracker
        self.audio_handler = AudioHandler()
        self.pinyin_converter = PinyinConverter()
        self.srs_manager = SRSManager()
        self.coin_system = coin_system or CoinSystem()
        self.visual_feedback = VisualFeedback()

    def run_review_session(self, flashcards, indices_to_review, session_type, card_set_mapping=None, practice_name=None):
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
        current_streak = 0
        best_streak = 0
        coins_earned = 0
        coins_lost = 0
        question_history = []  # Track all answered questions for display and navigation

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

        # Enter immersive mode for the session
        self.visual_feedback.enter_immersive_mode()
        question_start_row = 13  # Will be updated by create_immersive_session_screen

        session_duration = 0  # Initialize before file operations
        
        # Open session log file for writing
        try:
            with open("session_log.txt", "a", encoding='utf-8') as log_file:
                # Use practice_name if provided (for category reviews), otherwise use current set
                log_name = practice_name or self.set_manager.display_set_name(self.set_manager.current_set)
                
                # Clean up session type for simpler logging
                clean_session_type = session_type
                if "Category Review:" in session_type:
                    clean_session_type = "Category Review"
                
                log_file.write(f"> {session_start_time_str} | {log_name} | {clean_session_type}\n")

                question_number = 0
                while question_number < len(randomized_indices):
                    index = randomized_indices[question_number]
                    question_start_time = time.time()
                    row = flashcards[index]
                    question = row[0]
                    answer = row[1]
                    correct_count = int(row[2])
                    incorrect_count = int(row[3])
                    reviewed_count = int(row[4])

                    # Create immersive session screen (full layout on first question, updates only on subsequent)
                    if question_number == 0:
                        question_start_row = self.visual_feedback.create_immersive_session_screen(
                            session_type,
                            self.set_manager.display_set_name(self.set_manager.current_set),
                            question_number,
                            len(indices_to_review),
                            current_streak
                        )
                    else:
                        # Just update the dynamic parts (progress bar and streak)
                        self.visual_feedback.update_session_progress(
                            question_number,
                            len(indices_to_review),
                            current_streak
                        )
                        question_start_row = 13  # Same as returned by create_immersive_session_screen

                    # Check if this is a Chinese set for audio support
                    is_chinese_set = self.audio_handler.is_chinese_set(self.set_manager.current_set)
                    
                    # Format question with pinyin if it contains Chinese characters
                    formatted_question = self.pinyin_converter.format_question_with_pinyin(question)
                    
                    # Clear the entire question and interaction area (rows 13-30) to remove previous content
                    for clear_row in range(question_start_row, question_start_row + 18):
                        self.visual_feedback.goto_position(clear_row, 1)
                        self.visual_feedback.clear_line()
                    
                    # Display question in large format
                    self.visual_feedback.goto_position(question_start_row, 1)
                    question_text = f"Question {question_number + 1}:"
                    print(f"{self.visual_feedback.WHITE}{self.visual_feedback.BOLD}{question_text.center(self.visual_feedback.terminal_width)}{self.visual_feedback.RESET}")
                    
                    # Display Chinese characters large if present
                    if any(ord(char) >= 0x4e00 and ord(char) <= 0x9fff for char in question):
                        self.visual_feedback.display_large_chinese(formatted_question, question_start_row + 2)
                    else:
                        self.visual_feedback.goto_position(question_start_row + 2, 1)
                        print(f"{self.visual_feedback.WHITE}{self.visual_feedback.BOLD}{formatted_question.center(self.visual_feedback.terminal_width)}{self.visual_feedback.RESET}")
                    
                    if is_chinese_set:
                        chinese_text = self.audio_handler.get_chinese_text(question, answer)
                        self.audio_handler.play_audio(chinese_text)
                    
                    # Position for user input (right after question)
                    input_row = question_start_row + 6
                    
                    # Display question history first if we have any (so it's visible while typing)
                    # Position it below where input will be
                    history_start_row = input_row + 3
                    if question_history:
                        self.visual_feedback.display_question_history(question_history, history_start_row)
                    
                    # Now display the input prompt
                    self.visual_feedback.goto_position(input_row, 1)
                    # Clear input line to prevent previous answers from showing
                    self.visual_feedback.clear_line()
                    user_answer = input(f"{self.visual_feedback.CYAN}Your answer: {self.visual_feedback.RESET}")
                    
                    # Show navigation help at bottom (only once per question)
                    help_row = self.visual_feedback.terminal_height - 2
                    self.visual_feedback.show_navigation_help(help_row)
                    
                    # Handle special commands
                    while True:
                        if user_answer.lower() == 'back' and question_number > 0:
                            # Go back to previous question
                            question_number -= 1
                            # Remove the last entry from history since we're going back
                            if question_history:
                                question_history.pop()
                            break  # Break to restart the loop at previous question
                        elif is_chinese_set and user_answer.lower() == 'p':
                            # Audio replay for Chinese sets
                            chinese_text = self.audio_handler.get_chinese_text(question, answer)
                            self.audio_handler.play_audio(chinese_text)
                            self.visual_feedback.goto_position(input_row, 1)
                            self.visual_feedback.clear_line()
                            user_answer = input(f"{self.visual_feedback.CYAN}Your answer: {self.visual_feedback.RESET}")
                        else:
                            # Regular answer - continue with processing
                            break
                    
                    # If user went back, continue to next iteration (previous question)
                    if user_answer.lower() == 'back' and question_number >= 0:
                        continue

                    # Check if answer is correct
                    is_correct = self._validate_answer(user_answer, answer)

                    question_end_time = time.time()
                    question_duration = round(question_end_time - question_start_time, 1)
                    
                    if is_correct:
                        self.audio_handler.play_success_sound()
                        current_streak += 1
                        best_streak = max(best_streak, current_streak)
                        
                        # Calculate coins and bonuses
                        base_coins = 5
                        self.coin_system.add_coins(base_coins)
                        coins_earned += base_coins
                        
                        # Check for streak bonus
                        streak_bonus = self.coin_system.get_streak_bonus(current_streak)
                        streak_emoji = self.coin_system.get_streak_emoji(current_streak)
                        
                        # Add streak bonus if applicable
                        if streak_bonus > 0:
                            self.coin_system.add_coins(streak_bonus)
                            coins_earned += streak_bonus
                        
                        # Create coin message using centralized popup
                        coin_msg = self.visual_feedback.show_coin_popup(
                            coins_earned=base_coins,
                            streak_bonus=streak_bonus,
                            streak_count=current_streak if streak_bonus > 0 else 0,
                            streak_emoji=streak_emoji
                        )
                        
                        # Show large visual feedback below the Chinese character and pinyin
                        has_chinese = any(ord(char) >= 0x4e00 and ord(char) <= 0x9fff for char in question)
                        has_pinyin = has_chinese and formatted_question != question  # Pinyin was added if formatted differs
                        if has_chinese and has_pinyin:
                            feedback_row = question_start_row + 5  # Question title + Chinese chars + pinyin + space
                        elif has_chinese:
                            feedback_row = question_start_row + 4  # Question title + Chinese chars + space  
                        else:
                            feedback_row = question_start_row + 4  # Question title + text + space
                        self.visual_feedback.show_large_feedback(True, coin_msg, duration=1.0, row=feedback_row)
                        
                        # Show streak celebration if applicable
                        if current_streak >= 3 and streak_bonus > 0:
                            self.visual_feedback.show_streak_celebration(current_streak, streak_emoji)
                        
                        flashcards[index][2] = str(correct_count + 1)
                        session_correct_count += 1
                        session_results.append({"number": question_number + 1, "result": "✓"})
                        log_file.write(f"✓ {question} ({question_duration}s)\n")
                        
                        # Use correct set name for SRS updates (from card_set_mapping if available)
                        srs_set_name = card_set_mapping.get(position_to_csv_index[question_number], self.set_manager.current_set) if card_set_mapping else self.set_manager.current_set
                        self.srs_manager.update_srs_data(srs_set_name, question, answer, True)
                    else:
                        current_streak = 0
                        penalty_coins = 20
                        self.coin_system.subtract_coins(penalty_coins)
                        coins_lost += penalty_coins
                        
                        # Create feedback message using centralized popup
                        penalty_msg = self.visual_feedback.show_coin_popup(
                            coins_earned=0,
                            is_penalty=True,
                            penalty_amount=penalty_coins
                        )
                        incorrect_msg = f"Correct answer: {answer}\n    {penalty_msg}"
                        
                        # Show large visual feedback below the Chinese character and pinyin
                        has_chinese = any(ord(char) >= 0x4e00 and ord(char) <= 0x9fff for char in question)
                        has_pinyin = has_chinese and formatted_question != question  # Pinyin was added if formatted differs
                        if has_chinese and has_pinyin:
                            feedback_row = question_start_row + 5  # Question title + Chinese chars + pinyin + space
                        elif has_chinese:
                            feedback_row = question_start_row + 4  # Question title + Chinese chars + space  
                        else:
                            feedback_row = question_start_row + 4  # Question title + text + space
                        self.visual_feedback.show_large_feedback(False, incorrect_msg, duration=1.5, row=feedback_row)
                        flashcards[index][3] = str(incorrect_count + 1)
                        session_results.append({"number": question_number + 1, "result": "✗"})
                        log_file.write(f"✗ {question} A:{user_answer} C:{answer} ({question_duration}s)\n")
                        
                        # Use correct set name for SRS updates (from card_set_mapping if available)
                        srs_set_name = card_set_mapping.get(position_to_csv_index[question_number], self.set_manager.current_set) if card_set_mapping else self.set_manager.current_set
                        self.srs_manager.update_srs_data(srs_set_name, question, answer, False)
                    
                    flashcards[index][4] = str(reviewed_count + 1)
                    
                    # Add this question to history
                    question_history.append({
                        'question': formatted_question,
                        'user_answer': user_answer,
                        'correct_answer': answer,
                        'correct': is_correct,
                        'duration': question_duration
                    })
                    
                    # Move to next question
                    question_number += 1
                
                # Exit immersive mode before showing final results
                self.visual_feedback.exit_immersive_mode()

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
        net_coins = coins_earned - coins_lost
        total_coins = self.coin_system.get_total_coins()
        
        # Create coins info string
        coins_info = f"💰 Net: {net_coins:+d} (Earned: {coins_earned}, Lost: {coins_lost}) | Best Streak: {best_streak} | Total: {total_coins} 💰"
        
        # Show enhanced final score
        self.visual_feedback.show_final_score(
            session_correct_count, 
            len(indices_to_review), 
            session_percentage, 
            coins_info
        )
        
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

        # Show last session in clean log format
        print("\nLast Session (Log Format):")
        try:
            with open("session_log.txt", 'r', encoding='utf-8') as file:
                lines = file.readlines()
                
            # Find sessions for current set and get the last one
            current_set_display = self.set_manager.display_set_name(self.set_manager.current_set)
            session_blocks = []
            current_block = []
            
            for line in lines:
                line = line.strip()
                if line.startswith(">") and current_set_display in line:
                    if current_block:
                        session_blocks.append(current_block)
                    current_block = [line]
                elif current_block and (line.startswith("✓") or line.startswith("✗") or line.startswith("<")):
                    current_block.append(line)
                elif current_block and line.startswith("<"):
                    session_blocks.append(current_block)
                    current_block = []
            
            if current_block:
                session_blocks.append(current_block)
            
            # Show just the last session
            if session_blocks:
                last_session = session_blocks[-1]
                for line in last_session:
                    print(line)
            else:
                print("No session history found for this set.")
                
        except Exception as e:
            print(f"Could not read session log: {e}")

        finally:
            # SRS data is automatically saved to CSV files during update_srs_data() calls
            pass

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
    
