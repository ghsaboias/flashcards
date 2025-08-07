import sys
import time
import os

class VisualFeedback:
    """Enhanced visual feedback system for flashcard sessions with full terminal control"""
    
    # Color codes
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    BOLD = '\033[1m'
    DIM = '\033[2m'
    RESET = '\033[0m'
    
    # Terminal control sequences
    CLEAR_SCREEN = '\033[2J'
    HIDE_CURSOR = '\033[?25l'
    SHOW_CURSOR = '\033[?25h'
    SAVE_CURSOR = '\033[s'
    RESTORE_CURSOR = '\033[u'
    ALT_SCREEN_ON = '\033[?1049h'  # Switch to alternative screen buffer
    ALT_SCREEN_OFF = '\033[?1049l' # Switch back to main screen buffer
    
    # Large symbols for visual impact
    CORRECT_SYMBOL = "✅"
    INCORRECT_SYMBOL = "❌"
    
    # Progress bar characters
    FILLED_BLOCK = "█"
    EMPTY_BLOCK = "░"
    PARTIAL_BLOCKS = ["▏", "▎", "▍", "▌", "▋", "▊", "▉", "█"]
    
    def __init__(self):
        self.terminal_width = self._get_terminal_width()
        self.terminal_height = self._get_terminal_height()
        self.in_alt_screen = False
        self.progress_line_saved = False
    
    def refresh_terminal_dimensions(self):
        """Refresh terminal dimensions - call after window changes like splits"""
        self.terminal_width = self._get_terminal_width()
        self.terminal_height = self._get_terminal_height()
    
    def _get_terminal_width(self):
        """Get terminal width, default to 80 if unable to determine"""
        try:
            return os.get_terminal_size().columns
        except:
            return 80
    
    def _get_terminal_height(self):
        """Get terminal height, default to 24 if unable to determine"""
        try:
            return os.get_terminal_size().lines
        except:
            return 24
    
    def goto_position(self, row, col):
        """Move cursor to specific position (1-based)"""
        print(f'\033[{row};{col}H', end='', flush=True)
    
    def clear_line(self):
        """Clear the current line"""
        print('\033[K', end='', flush=True)  # Clear from cursor to end of line
    
    def enter_immersive_mode(self):
        """Enter immersive full-screen mode"""
        print(self.ALT_SCREEN_ON + self.CLEAR_SCREEN + self.HIDE_CURSOR, end='', flush=True)
        self.in_alt_screen = True
    
    def exit_immersive_mode(self):
        """Exit immersive mode and return to normal terminal"""
        print(self.SHOW_CURSOR + self.ALT_SCREEN_OFF, end='', flush=True)
        self.in_alt_screen = False
    
    def show_progress_bar(self, current, total, prefix="Session Progress", row=None):
        """Display a single updating progress bar at fixed position"""
        if total == 0:
            percentage = 0
        else:
            percentage = current / total
        
        # Calculate filled blocks
        width = min(40, self.terminal_width - 30)  # Leave room for text
        filled_length = int(width * percentage)
        
        # Create progress bar
        bar = self.FILLED_BLOCK * filled_length + self.EMPTY_BLOCK * (width - filled_length)
        
        # Create the complete line
        progress_text = f"{self.CYAN}{prefix}: {self.WHITE}[{bar}] {current}/{total} ({percentage*100:.1f}%){self.RESET}"
        
        if row and self.in_alt_screen:
            # Position at specific row in immersive mode and center the text
            # Calculate centering, accounting for color codes in the text length
            visible_length = len(f"{prefix}: [{bar}] {current}/{total} ({percentage*100:.1f}%)")
            center_col = max(1, (self.terminal_width - visible_length) // 2)
            self.goto_position(row, center_col)
            self.clear_line()
            print(progress_text, end='', flush=True)
        else:
            # Regular mode - center and update in place
            visible_length = len(f"{prefix}: [{bar}] {current}/{total} ({percentage*100:.1f}%)")
            spaces_before = max(0, (self.terminal_width - visible_length) // 2)
            centered_text = ' ' * spaces_before + progress_text
            print(f'\r{centered_text}', end='', flush=True)
    
    def display_large_chinese(self, text, row=None):
        """Display Chinese characters in a larger, more prominent way"""
        # Extract just the Chinese characters with extra spacing for prominence
        chinese_parts = []
        non_chinese_parts = []
        
        i = 0
        current_word = ""
        while i < len(text):
            char = text[i]
            if ord(char) >= 0x4e00 and ord(char) <= 0x9fff:  # Chinese character range
                # Add spacing around Chinese characters to make them appear larger
                chinese_parts.append(f"  {char}  ")
                current_word = ""
            else:
                current_word += char
                # Check if we're at end or next char is Chinese
                if i == len(text) - 1 or (i + 1 < len(text) and ord(text[i + 1]) >= 0x4e00):
                    if current_word.strip():
                        non_chinese_parts.append(current_word)
                        current_word = ""
            i += 1
        
        # Create the display with Chinese characters more prominent
        if chinese_parts:
            # Show Chinese characters with extra spacing, centered
            chinese_display = "".join(chinese_parts)
            chinese_line = f"{self.WHITE}{self.BOLD}{chinese_display}{self.RESET}"
            
            # Show non-Chinese parts (like pinyin) below, smaller
            non_chinese_line = ""
            if non_chinese_parts:
                non_chinese_text = " ".join(non_chinese_parts)
                non_chinese_line = f"{self.DIM}{non_chinese_text.center(self.terminal_width)}{self.RESET}"
        else:
            # No Chinese characters, display normally
            chinese_line = f"{self.WHITE}{self.BOLD}{text}{self.RESET}"
            non_chinese_line = ""
        
        if row and self.in_alt_screen:
            self.goto_position(row, 1)
            centered_chinese = chinese_line.center(self.terminal_width + len(self.WHITE) + len(self.BOLD) + len(self.RESET))
            print(centered_chinese, flush=True)
            if non_chinese_line:
                self.goto_position(row + 1, 1)
                print(non_chinese_line, flush=True)
        else:
            centered_chinese = chinese_line.center(self.terminal_width + len(self.WHITE) + len(self.BOLD) + len(self.RESET))
            print(centered_chinese, flush=True)
            if non_chinese_line:
                print(non_chinese_line, flush=True)
    
    def show_large_feedback(self, is_correct, message="", duration=1.5, row=None):
        """Show large visual feedback for correct/incorrect answers"""
        
        if is_correct:
            symbol = self.CORRECT_SYMBOL
            color = self.GREEN
            text = "CORRECT!"
        else:
            symbol = self.INCORRECT_SYMBOL
            color = self.RED
            text = "INCORRECT!"
        
        # Create centered main feedback line
        main_text = f"{symbol} {text}"
        main_line = f"{color}{self.BOLD}{main_text}{self.RESET}"
        
        if row and self.in_alt_screen:
            # Center the main feedback line
            main_visible_length = len(main_text)
            main_center_col = max(1, (self.terminal_width - main_visible_length) // 2)
            
            self.goto_position(row, main_center_col)
            self.clear_line()
            print(main_line, end='', flush=True)
            
            # Center the message if provided
            if message:
                # Split message into lines and center each
                message_lines = message.split('\n')
                current_row = row + 1
                for msg_line in message_lines:
                    if msg_line.strip():  # Skip empty lines
                        # Remove leading spaces and calculate center
                        clean_msg = msg_line.strip()
                        msg_visible_length = len(clean_msg)
                        msg_center_col = max(1, (self.terminal_width - msg_visible_length) // 2)
                        
                        self.goto_position(current_row, msg_center_col)
                        self.clear_line()
                        print(f"{color}{clean_msg}{self.RESET}", end='', flush=True)
                    current_row += 1
            
            # Brief pause for visual impact
            time.sleep(duration)
            
            # Clear the feedback area after the duration
            lines_to_clear = 1 + (len(message.split('\n')) if message else 0)
            for i in range(lines_to_clear + 1):  # +1 for safety
                self.goto_position(row + i, 1)
                self.clear_line()
        else:
            # Regular mode - center everything
            main_visible_length = len(main_text)
            main_spaces = max(0, (self.terminal_width - main_visible_length) // 2)
            centered_main = ' ' * main_spaces + main_line
            
            print(f"\n{centered_main}", flush=True)
            
            if message:
                message_lines = message.split('\n')
                for msg_line in message_lines:
                    if msg_line.strip():
                        clean_msg = msg_line.strip()
                        msg_visible_length = len(clean_msg)
                        msg_spaces = max(0, (self.terminal_width - msg_visible_length) // 2)
                        centered_msg = ' ' * msg_spaces + f"{color}{clean_msg}{self.RESET}"
                        print(centered_msg, flush=True)
            
            # Brief pause for visual impact
            time.sleep(duration)
    
    def show_coin_popup(self, coins_earned, streak_bonus=0, streak_count=0, streak_emoji="🔥", is_penalty=False, penalty_amount=0):
        """Show coin reward/penalty popup with optional streak information"""
        if is_penalty:
            return f"-{penalty_amount} 💰"
        else:
            coin_msg = f"+{coins_earned} 💰"
            if streak_bonus > 0 and streak_count > 0:
                coin_msg += f" {streak_emoji} {streak_count}-streak bonus! +{streak_bonus} 💰"
            return coin_msg
    
    def show_streak_celebration(self, streak_count, emoji="🔥"):
        """Show celebration for streaks"""
        if streak_count >= 3:
            celebration = f"\n{self.YELLOW}{self.BOLD}    {emoji} STREAK: {streak_count} {emoji}    {self.RESET}"
            print(celebration)
            time.sleep(0.8)
    
    def show_session_header(self, session_type, set_name):
        """Display an attractive session header"""
        header_width = min(60, self.terminal_width - 4)
        border = "═" * header_width
        
        print(f"\n{self.BLUE}╔{border}╗{self.RESET}")
        title = f"🎯 {session_type}".center(header_width)
        print(f"{self.BLUE}║{self.WHITE}{self.BOLD}{title}{self.RESET}{self.BLUE}║{self.RESET}")
        
        set_line = f"📚 {set_name}".center(header_width)
        print(f"{self.BLUE}║{self.CYAN}{set_line}{self.RESET}{self.BLUE}║{self.RESET}")
        
        print(f"{self.BLUE}╚{border}╝{self.RESET}\n")
    
    def show_final_score(self, correct, total, percentage, coins_info=""):
        """Display final session score with visual flair"""
        # Determine performance level
        if percentage >= 90:
            grade = "🏆 EXCELLENT!"
            color = self.GREEN
        elif percentage >= 80:
            grade = "🎉 GREAT!"
            color = self.GREEN
        elif percentage >= 70:
            grade = "👍 GOOD!"
            color = self.YELLOW
        elif percentage >= 60:
            grade = "📈 IMPROVING!"
            color = self.YELLOW
        else:
            grade = "💪 KEEP PRACTICING!"
            color = self.RED
        
        print(f"\n{color}{self.BOLD}═══ SESSION COMPLETE ═══{self.RESET}")
        print(f"{color}{self.BOLD}    {grade}{self.RESET}")
        print(f"{self.WHITE}    Score: {self.BOLD}{correct}/{total} ({percentage:.1f}%){self.RESET}")
        
        if coins_info:
            print(f"    {coins_info}")
    
    def move_cursor_up(self, lines=1):
        """Move cursor up by specified lines"""
        print(f'\033[{lines}A', end='')
    
    def move_cursor_down(self, lines=1):
        """Move cursor down by specified lines"""
        print(f'\033[{lines}B', end='')
    
    def create_immersive_session_screen(self, session_type, set_name, current_question, total_questions, streak=0):
        """Create a full-screen immersive game layout"""
        if not self.in_alt_screen:
            self.enter_immersive_mode()
        
        self.goto_position(1, 1)
        
        # Calculate center positions
        center_col = self.terminal_width // 2
        
        # Title section (rows 3-6)
        title_box_width = min(60, self.terminal_width - 4)
        title_start_col = max(1, (self.terminal_width - title_box_width) // 2)
        
        self.goto_position(3, title_start_col)
        border = "═" * title_box_width
        print(f"{self.BLUE}╔{border}╗{self.RESET}", flush=True)
        
        self.goto_position(4, title_start_col)
        title_text = f"🎯 {session_type}".center(title_box_width)
        print(f"{self.BLUE}║{self.WHITE}{self.BOLD}{title_text}{self.RESET}{self.BLUE}║{self.RESET}", flush=True)
        
        self.goto_position(5, title_start_col)
        set_text = f"📚 {set_name}".center(title_box_width)
        print(f"{self.BLUE}║{self.CYAN}{set_text}{self.RESET}{self.BLUE}║{self.RESET}", flush=True)
        
        self.goto_position(6, title_start_col)
        print(f"{self.BLUE}╚{border}╝{self.RESET}", flush=True)
        
        # Progress bar (row 8)
        self.show_progress_bar(current_question, total_questions, "Session Progress", row=8)
        
        # Streak display (row 10) 
        if streak > 0:
            self.goto_position(10, center_col - 10)
            streak_text = f"🔥 Streak: {streak}"
            print(f"{self.YELLOW}{self.BOLD}{streak_text}{self.RESET}", flush=True)
        
        # Question area starts at row 13
        return 13  # Return the row where question content should start
    
    def update_session_progress(self, current_question, total_questions, streak=0):
        """Update only the dynamic parts of the session screen (progress bar and streak)"""
        # Progress bar (row 8)
        self.show_progress_bar(current_question, total_questions, "Session Progress", row=8)
        
        # Streak display (row 10) - clear first, then update
        self.goto_position(10, 1)
        self.clear_line()
        if streak > 0:
            center_col = self.terminal_width // 2
            self.goto_position(10, center_col - 10)
            streak_text = f"🔥 Streak: {streak}"
            print(f"{self.YELLOW}{self.BOLD}{streak_text}{self.RESET}", flush=True)
    
    def display_question_history(self, history, start_row):
        """Display previous questions and answers in a scrollable history section"""
        if not history:
            return
        
        # Display history section header (only once)
        self.goto_position(start_row, 1)
        header = "═══ Previous Questions ═══".center(self.terminal_width)
        print(f"{self.DIM}{header}{self.RESET}", flush=True)
        
        # Show last 5 questions in history, single line each
        display_history = history[-5:] if len(history) > 5 else history
        current_row = start_row + 2
        
        for i, item in enumerate(display_history):
            if current_row >= self.terminal_height - 2:  # Leave room for input
                break
                
            question_num = len(history) - len(display_history) + i + 1
            status_symbol = "✅" if item['correct'] else "❌"
            color = self.GREEN if item['correct'] else self.RED
            
            # Single line format: "1. 七 (qī) ✅ seven" or "1. 七 (qī) ❌ wrong → eight"
            if item['correct']:
                line_text = f"{question_num}. {item['question']} {status_symbol} {item['user_answer']}"
            else:
                line_text = f"{question_num}. {item['question']} {status_symbol} {item['user_answer']} → {item['correct_answer']}"
            
            # Truncate if too long
            if len(line_text) > self.terminal_width - 4:
                line_text = line_text[:self.terminal_width - 7] + "..."
            
            self.goto_position(current_row, 2)
            print(f"{color}{self.DIM}{line_text}{self.RESET}", flush=True)
            
            current_row += 1
    
    def update_question_history_smoothly(self, history, start_row):
        """Update history section without full screen redraw - just clear and redraw history area"""
        if not history:
            return
            
        # Clear only the history section (header + 5 lines max)
        for i in range(7):  # Header + up to 5 questions + 1 extra line
            self.goto_position(start_row + i, 1)
            self.clear_line()
        
        # Redraw the history section
        self.display_question_history(history, start_row)
    
    def show_navigation_help(self, row):
        """Display navigation help at the bottom of screen"""
        self.goto_position(row, 1)
        help_text = "Type 'back' to go to previous question, 'p' for audio replay (Chinese sets)".center(self.terminal_width)
        print(f"{self.DIM}{help_text}{self.RESET}", flush=True)