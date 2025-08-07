import os
import csv
from lib.set_manager import SetManager
from lib.review_engine import ReviewEngine
from lib.llm_manager import LLMManager
from lib.srs import SRSManager

class PracticeManager:
    def __init__(self, set_manager: SetManager, review_engine: ReviewEngine, llm_manager: LLMManager, srs_manager: SRSManager):
        self.set_manager = set_manager
        self.review_engine = review_engine
        self.llm_manager = llm_manager
        self.srs_manager = srs_manager

    def practice_set(self):
        """Practice Set menu option"""
        self.set_manager.select_card_set()
        
        filename = self.set_manager.get_csv_filename(self.set_manager.current_set)
        if not os.path.exists(filename):
            print(f"No cards found for {self.set_manager.display_set_name(self.set_manager.current_set)} set.")
            return
        
        # Check if LLM session is already active or ask user
        if self.llm_manager.llm_session_active:
            use_llm = True  # Continue with existing session
        else:
            use_llm = self.llm_manager.ask_use_llm("Practice Set", self.set_manager.display_set_name(self.set_manager.current_set))
        
        # Start collaborative mode only if user agrees and no session is active
        if use_llm and not self.llm_manager.llm_session_active:
            split_created = self.llm_manager.start_llm_session("Practice Set", self.set_manager.display_set_name(self.set_manager.current_set))
            # Refresh terminal dimensions after split
            if split_created:
                self.review_engine.visual_feedback.refresh_terminal_dimensions()
        
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
            self.llm_manager.send_session_summary_to_llm(
                result["session_data"]["session_type"],
                self.set_manager.display_set_name(self.set_manager.current_set),
                result["session_data"]["score"],
                result["session_data"]["duration"]
            )

    def practice_category(self):
        """Practice Category menu option"""
        print("\n--- Category Review ---")
        print("Select a category to review all sets:")
        print("1. HSK Level 1 (Recognition)")
        print("2. HSK Level 2 (Recognition)")
        print("3. Back to main menu")
        
        try:
            category_choice = input("Select category: ")
        except (EOFError, KeyboardInterrupt):
            return
        
        category_map = {
            "1": "hsk_level_1",
            "2": "hsk_level_2"
        }
        
        if category_choice in category_map:
            category = category_map[category_choice]
            sets_in_category = self.set_manager.get_category_sets(category)
            
            if not sets_in_category:
                print(f"No sets found in {self.set_manager.get_category_display_name(category)} category.")
                return
            
            if self.llm_manager.llm_session_active:
                use_llm = True
            else:
                use_llm = self.llm_manager.ask_use_llm("Practice Category", self.set_manager.get_category_display_name(category))
            
            if use_llm and not self.llm_manager.llm_session_active:
                self.llm_manager.start_llm_session("Practice Category", self.set_manager.get_category_display_name(category))
            
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
                    f"Category Review: {self.set_manager.get_category_display_name(category)}",
                    card_set_mapping=None,
                    practice_name=self.set_manager.get_category_display_name(category)
                )
                
                self.set_manager.save_combined_flashcards(combined_data, result["flashcards"])
                print("Category review completed! Statistics updated for all sets.")
                
                if use_llm:
                    self.llm_manager.send_session_summary_to_llm(
                        result["session_data"]["session_type"],
                        self.set_manager.get_category_display_name(category),
                        result["session_data"]["score"],
                        result["session_data"]["duration"]
                    )
        elif category_choice == "3":
            return
        else:
            print("Invalid choice.")

    def practice_difficult_cards(self):
        """Practice Difficult Cards menu option"""
        self.set_manager.select_card_set()
        
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
        
        difficult_cards_indices = []
        for i, card in enumerate(flashcards):
            if len(card) >= 5:
                incorrect_count = int(card[3])
                correct_count = int(card[2])
                total_attempts = correct_count + incorrect_count
                if total_attempts > 0:
                    accuracy = (correct_count / total_attempts) * 100
                    if accuracy < 80:
                        difficult_cards_indices.append(i)
        
        if not difficult_cards_indices:
            print("\nNo difficult cards to practice right now. Keep reviewing!")
            return
        
        if self.llm_manager.llm_session_active:
            use_llm = True
        else:
            use_llm = self.llm_manager.ask_use_llm("Practice Difficult Cards", self.set_manager.display_set_name(self.set_manager.current_set))
        
        if use_llm and not self.llm_manager.llm_session_active:
            self.llm_manager.start_llm_session("Practice Difficult Cards", self.set_manager.display_set_name(self.set_manager.current_set))
        
        result = self.review_engine.run_review_session(flashcards, difficult_cards_indices, "Practice Difficult")
        
        try:
            with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
                writer = csv.writer(csvfile)
                for row in result["flashcards"]:
                    writer.writerow(row)
        except Exception as e:
            print(f"Error saving flashcards: {e}")
        
        if use_llm:
            self.llm_manager.send_session_summary_to_llm(
                result["session_data"]["session_type"],
                self.set_manager.display_set_name(self.set_manager.current_set),
                result["session_data"]["score"],
                result["session_data"]["duration"]
            )

    def practice_difficult_category(self):
        """Practice Difficult Category menu option"""
        print("\n--- Practice Difficult Category ---")
        print("Select a category to practice difficult cards (accuracy < 80%):")
        print("1. HSK Level 1 (Recognition)")
        print("2. HSK Level 2 (Recognition)")
        print("3. Back to main menu")
        
        try:
            category_choice = input("Select category: ")
        except (EOFError, KeyboardInterrupt):
            return
        
        category_map = {
            "1": "hsk_level_1",
            "2": "hsk_level_2"
        }
        
        if category_choice in category_map:
            category = category_map[category_choice]
            sets_in_category = self.set_manager.get_category_sets(category)
            
            if not sets_in_category:
                print(f"No sets found in {self.set_manager.get_category_display_name(category)} category.")
                return
            
            combined_data = self.set_manager.load_combined_flashcards(category)
            
            if not combined_data["flashcards"]:
                print("No flashcards found in category.")
                return
            
            difficult_cards_indices = []
            for i, card in enumerate(combined_data["flashcards"]):
                if len(card) >= 5:
                    incorrect_count = int(card[3])
                    correct_count = int(card[2])
                    total_attempts = correct_count + incorrect_count
                    if total_attempts > 0:
                        accuracy = (correct_count / total_attempts) * 100
                        if accuracy < 80:
                            difficult_cards_indices.append(i)
            
            if not difficult_cards_indices:
                print(f"\nNo difficult cards found in {self.set_manager.get_category_display_name(category)} category.")
                print("All cards have 80%+ accuracy. Keep up the great work!")
                return
            
            if self.llm_manager.llm_session_active:
                use_llm = True
            else:
                use_llm = self.llm_manager.ask_use_llm("Practice Difficult Category", self.set_manager.get_category_display_name(category))
            
            if use_llm and not self.llm_manager.llm_session_active:
                self.llm_manager.start_llm_session("Practice Difficult Category", self.set_manager.get_category_display_name(category))
            
            print(f"\nFound {len(difficult_cards_indices)} difficult cards in {self.set_manager.get_category_display_name(category)}")
            print(f"Total cards in category: {len(combined_data['flashcards'])} (from {len(sets_in_category)} sets)")
            print(f"Sets included: {', '.join(self.set_manager.display_set_name(s) for s in sets_in_category)}")
            print("Press Enter to continue or 'q' to cancel...")
            
            try:
                confirm = input()
            except (EOFError, KeyboardInterrupt):
                return
            
            if confirm.lower() != 'q':
                result = self.review_engine.run_review_session(
                    combined_data["flashcards"], 
                    difficult_cards_indices, 
                    f"Difficult Category Review",
                    card_set_mapping=None,
                    practice_name=f"{self.set_manager.get_category_display_name(category)} (Difficult)"
                )
                
                self.set_manager.save_combined_flashcards(combined_data, result["flashcards"])
                print("Difficult category practice completed! Statistics updated for all sets.")
                
                if use_llm:
                    self.llm_manager.send_session_summary_to_llm(
                        result["session_data"]["session_type"],
                        self.set_manager.get_category_display_name(category),
                        result["session_data"]["score"],
                        result["session_data"]["duration"]
                    )
        elif category_choice == "3":
            return
        else:
            print("Invalid choice.")

    def _run_srs_session(self, due_cards_info, session_name):
        if not due_cards_info:
            print("No cards are due for review today. Keep up the great work!")
            return

        print(f"Found {len(due_cards_info)} cards due for review in {session_name}.")

        review_flashcards = [item['card'] for item in due_cards_info]
        review_indices = list(range(len(review_flashcards)))
        
        # Create mapping of card index to source set name for SRS updates
        card_set_mapping = {i: item['set_name'] for i, item in enumerate(due_cards_info)}

        if self.llm_manager.llm_session_active:
            use_llm = True
        else:
            use_llm = self.llm_manager.ask_use_llm(session_name, session_name)

        if use_llm and not self.llm_manager.llm_session_active:
            self.llm_manager.start_llm_session(session_name, session_name)

        result = self.review_engine.run_review_session(review_flashcards, review_indices, "SRS Review", card_set_mapping)

        set_updates = {}
        for i, updated_card_data in enumerate(result["flashcards"]):
            original_info = due_cards_info[i]
            set_name = original_info["set_name"]
            original_index = original_info["original_index"]

            if set_name not in set_updates:
                set_updates[set_name] = self.set_manager.load_flashcards_from_set(set_name) # Load full set data
            
            set_updates[set_name][original_index] = updated_card_data

        for set_name, cards_to_save in set_updates.items():
            filename = self.set_manager.get_csv_filename(set_name)
            try:
                with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
                    writer = csv.writer(csvfile)
                    writer.writerows(cards_to_save)
            except Exception as e:
                print(f"Error saving updates to {set_name}: {e}")

        print("SRS review completed! Statistics and review dates updated.")

        if use_llm:
            self.llm_manager.send_session_summary_to_llm(
                result["session_data"]["session_type"],
                session_name,
                result["session_data"]["score"],
                result["session_data"]["duration"]
            )

    def practice_due_cards_by_set(self):
        """Practice cards that are due for review based on SRS, filtered by selected sets"""
        print("\n--- Practice Due Cards by Set (SRS) ---")
        selected_sets = self.set_manager.select_multiple_sets()

        if not selected_sets:
            print("No sets selected. Returning to main menu.")
            return

        all_sets_data = {}
        for set_name in selected_sets:
            filename = self.set_manager.get_csv_filename(set_name)
            if not os.path.exists(filename):
                continue
            try:
                with open(filename, 'r', newline='', encoding='utf-8') as csvfile:
                    reader = csv.reader(csvfile)
                    flashcards = list(reader)
                    all_sets_data[set_name] = flashcards
            except Exception as e:
                print(f"Error reading flashcards from {set_name}: {e}")
                continue

        due_cards_info = self.srs_manager.get_due_cards(all_sets_data)
        self._run_srs_session(due_cards_info, "Selected Sets")

    def practice_due_cards_by_category(self):
        """Practice cards that are due for review based on SRS, filtered by selected categories"""
        print("\n--- Practice Due Cards by Category (SRS) ---")
        selected_categories = self.set_manager.select_multiple_categories()

        if not selected_categories:
            print("No categories selected. Returning to main menu.")
            return

        all_sets_data = {}
        for category in selected_categories:
            sets_in_category = self.set_manager.get_category_sets(category)
            for set_name in sets_in_category:
                filename = self.set_manager.get_csv_filename(set_name)
                if not os.path.exists(filename):
                    continue
                try:
                    with open(filename, 'r', newline='', encoding='utf-8') as csvfile:
                        reader = csv.reader(csvfile)
                        flashcards = list(reader)
                        all_sets_data[set_name] = flashcards
                except Exception as e:
                    print(f"Error reading flashcards from {set_name}: {e}")
                    continue
        
        due_cards_info = self.srs_manager.get_due_cards(all_sets_data)
        self._run_srs_session(due_cards_info, "Selected Categories")
