import os
import os
import csv
import subprocess
from lib.set_manager import SetManager
from lib.session_tracker import SessionTracker
from lib.srs import SRSManager
from lib.coin_system import CoinSystem

class UIManager:
    def __init__(self, set_manager: SetManager, session_tracker: SessionTracker, srs_manager: SRSManager, coin_system: CoinSystem = None):
        self.set_manager = set_manager
        self.session_tracker = session_tracker
        self.srs_manager = srs_manager
        self.coin_system = coin_system or CoinSystem()

    def bring_terminal_to_front(self):
        """Bring terminal to front using AppleScript"""
        try:
            subprocess.run(["osascript", "-e", 'tell application "Terminal" to activate'], 
                         check=False, capture_output=True)
        except (subprocess.SubprocessError, FileNotFoundError):
            pass

    def _get_effective_terminal_width(self, llm_session_active):
        try:
            full_width = os.get_terminal_size().columns
            if llm_session_active:
                # Assuming a 50/50 split when LLM session is active
                return full_width // 2
            return full_width
        except OSError:
            return 80 # Default width if terminal size cannot be determined

    def display_main_menu(self, current_set_name, llm_session_active, llm_provider, menu_commands):
        effective_width = self._get_effective_terminal_width(llm_session_active)

        collaborative_status_str = f" ({llm_provider.capitalize()} session active)" if llm_session_active else ""
        total_coins_str = f"[💰 {self.coin_system.get_total_coins()}]"

        # Current Set display
        fixed_prefix_set = "Current set: "
        fixed_suffix_set = f" {total_coins_str}{collaborative_status_str}"
        available_for_set_name = effective_width - len(fixed_prefix_set) - len(fixed_suffix_set)
        display_set_name = current_set_name
        if available_for_set_name < 5:
            display_set_name = ""
        elif len(current_set_name) > available_for_set_name:
            display_set_name = current_set_name[:available_for_set_name - 3] + "..."
        print(f"\n{fixed_prefix_set}{display_set_name}{fixed_suffix_set}")

        # Current Category display (if selected)
        if self.set_manager.current_category:
            current_category_display_name = self.set_manager.get_category_display_name(self.set_manager.current_category)
            fixed_prefix_category = "Current category: "
            available_for_category_name = effective_width - len(fixed_prefix_category)
            display_category_name = current_category_display_name
            if available_for_category_name < 5:
                display_category_name = ""
            elif len(current_category_display_name) > available_for_category_name:
                display_category_name = current_category_display_name[:available_for_category_name - 3] + "..."
            print(f"{fixed_prefix_category}{display_category_name}")

        print("What would you like to do?")
        # Create a list of menu items to display, handling the conditional "Close LLM Session"
        display_items = []
        for key, (description, _) in menu_commands.items():
            if description == "Close LLM Session":
                if llm_session_active:
                    display_items.append((key, description))
            else:
                display_items.append((key, description))

        # Adjust numbering for "Exit" if "Close LLM Session" is not displayed
        # Find the "Exit" option and its original key
        exit_key = None
        for key, (description, _) in menu_commands.items():
            if description == "Exit":
                exit_key = key
                break

        # If "Close LLM Session" is not active, and "Exit" is present, adjust its key for display
        if not llm_session_active and exit_key:
            # Find the index of the "Exit" option in the display_items list
            exit_index = -1
            for i, (key, description) in enumerate(display_items):
                if description == "Exit":
                    exit_index = i
                    break
            if exit_index != -1:
                # Replace the original key with the adjusted key (original key - 1)
                display_items[exit_index] = (str(int(exit_key) - 1), "Exit")

        for key, description in display_items:
            print(f"  {key}. {description}")

    def view_scores(self):
        """View Scores menu option"""
        print("------------------------")
        
        # Show session history table
        all_sessions = self.session_tracker.get_all_session_results()
        if all_sessions:
            # Show last 10 sessions in summary table
            recent_sessions = all_sessions[-10:]
            print("\nSession History (Last 10 Sessions):")
            
            # Header
            header = "Q# |"
            for index in range(len(recent_sessions)):
                header += f" #{index + 1} |"
            print(header)

            # Separator - fix the excessive dashes
            separator = "---" + "|"
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

        # Show last 3 sessions as they appear in the log
        print("\nLast 3 Sessions (from log):")
        try:
            with open("session_log.txt", 'r', encoding='utf-8') as file:
                lines = file.readlines()
                
            # Find sessions for current set and get last 3
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
            
            # Show last 3 sessions
            last_3_sessions = session_blocks[-3:] if len(session_blocks) >= 3 else session_blocks
            
            if last_3_sessions:
                for session in last_3_sessions:
                    for line in session:
                        print(line)
                    print()  # Empty line between sessions
            else:
                print("No session history found for this set.")
                
        except Exception as e:
            print(f"Could not read session log: {e}")
        print("")

        # Show SRS data (easiness factor, interval, next review date) for each card in current set
        print("\nSRS Data for Current Set Cards:")
        filename = self.set_manager.get_csv_filename(self.set_manager.current_set)
        cards = []
        try:
            with open(filename, 'r', newline='', encoding='utf-8') as csvfile:
                reader = csv.reader(csvfile)
                cards = list(reader)
        except Exception as e:
            print(f"Could not read cards for SRS data: {e}")

        if cards:
            # Header row
            print(f"{'Question':<40} {'EF':>4} {'Interval':>8} {'Next Review':>12}")
            for card in cards:
                if len(card) < 2:
                    continue
                question, answer = card[0], card[1]
                srs_info = self.srs_manager.get_srs_data(self.set_manager.current_set, question, answer)
                ef = srs_info.get('easiness_factor', '')
                interval = srs_info.get('interval', '')
                next_date = srs_info.get('next_review_date', '')
                print(f"{question:<40} {ef:>4} {interval:>8} {next_date:>12}")
        else:
            print("No cards found in current set for SRS data.")

    def view_srs_data_by_category(self):
        """View SRS Data for all cards in the currently selected category"""
        print("------------------------")
        if not self.set_manager.current_category:
            print("No category selected. Please select a category first (Option 11).")
            print("------------------------")
            return

        category_display_name = self.set_manager.get_category_display_name(self.set_manager.current_category)
        print(f"SRS Data for Category: {category_display_name}")
        print("------------------------")

        combined_data = self.set_manager.load_combined_flashcards(self.set_manager.current_category)
        cards = combined_data["flashcards"]

        if cards:
            # Header row
            print(f"{'Question':<40} {'EF':>4} {'Interval':>8} {'Next Review':>12}")
            for index, card in enumerate(cards):
                if len(card) < 2:
                    continue
                question, answer = card[0], card[1]
                
                # Get the original set name for the current card from the source_map
                original_set_name = None
                if index < len(combined_data['source_map']):
                    original_set_name = combined_data['source_map'][index]['set']
                
                if original_set_name:
                    srs_info = self.srs_manager.get_srs_data(original_set_name, question, answer)
                    ef = srs_info.get('easiness_factor', '')
                    interval = srs_info.get('interval', '')
                    next_date = srs_info.get('next_review_date', '')
                    print(f"{question:<40} {ef:>4} {interval:>8} {next_date:>12}")
                else:
                    print(f"Could not retrieve source set for card: {question}")
        else:
            print("No cards found in the selected category for SRS data.")
        print("------------------------")

    def see_difficult_cards(self):
        """See Difficult Cards menu option"""
        print("------------------------")
        print("See Difficult Cards:")
        print("1. Current Set")
        print("2. Select Category")
        print("------------------------")

        choice = input("Enter your choice: ")
        cards = []
        source_name = ""

        if choice == "1":
            filename = self.set_manager.get_csv_filename(self.set_manager.current_set)
            source_name = self.set_manager.display_set_name(self.set_manager.current_set)
            try:
                with open(filename, 'r', newline='', encoding='utf-8') as csvfile:
                    reader = csv.reader(csvfile)
                    cards = list(reader)
            except Exception as e:
                print(f"Could not read cards for difficult cards from current set: {e}")
                return
        elif choice == "2":
            categories = self.set_manager.list_categories()
            if not categories:
                print("No categories found.")
                print("------------------------")
                return

            print("\nAvailable Categories:")
            for i, category in enumerate(categories):
                print(f"{i+1}. {self.set_manager.get_category_display_name(category)}")
            print("------------------------")

            try:
                category_choice = int(input("Select a category: ")) - 1
                if 0 <= category_choice < len(categories):
                    selected_category = categories[category_choice]
                    source_name = f"Category: {selected_category}"
                    combined_data = self.set_manager.load_combined_flashcards(selected_category)
                    cards = combined_data["flashcards"]
                else:
                    print("Invalid category choice.")
                    print("------------------------")
                    return
            except ValueError:
                print("Invalid input. Please enter a number.")
                print("------------------------")
                return
        else:
            print("Invalid choice.")
            print("------------------------")
            return

        print(f"\nDifficult Cards for {source_name} (Accuracy < 80%):")
        print("------------------------")

        difficult_cards_found = False
        for card in cards:
            if len(card) >= 5:
                try:
                    question = card[0]
                    answer = card[1]
                    correct_count = int(card[2])
                    incorrect_count = int(card[3])

                    total_attempts = correct_count + incorrect_count
                    if total_attempts > 0:
                        accuracy = correct_count / total_attempts
                        if accuracy < 0.8:
                            reviewed_count = int(card[4]) if len(card) >= 5 else total_attempts
                            print(f"Q: {question}")
                            print(f"A: {answer}")
                            print(f"Accuracy: {accuracy:.2%} [✓{correct_count} ✗{incorrect_count} T{reviewed_count} {accuracy*100:.1f}%]\n")
                            difficult_cards_found = True
                except ValueError:
                    # Skip cards with malformed counts
                    continue
            
        if not difficult_cards_found:
            print(f"No difficult cards found in {source_name}.")
        print("------------------------")