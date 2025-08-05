import csv
import os
from pathlib import Path
from .audio_handler import AudioHandler

class SetManager:
    def __init__(self):
        self.audio_handler = AudioHandler()
        self.current_set = "ruby"

    def display_set_name(self, set_name):
        """Format set name for display"""
        if "Ruby/" in set_name:
            name = set_name.replace("Ruby/", "").replace("_", " ")
            return "Ruby: " + " ".join(word.capitalize() for word in name.split())
        elif "Chinese->English/Foundation/" in set_name:
            name = set_name.replace("Chinese->English/Foundation/", "").replace("_", " ")
            return "Chinese→English Foundation: " + " ".join(word.capitalize() for word in name.split())
        elif "Chinese->English/Vocabulary/" in set_name:
            name = set_name.replace("Chinese->English/Vocabulary/", "").replace("_", " ")
            return "Chinese→English Vocabulary: " + " ".join(word.capitalize() for word in name.split())
        elif "English->Chinese/Foundation/" in set_name:
            name = set_name.replace("English->Chinese/Foundation/", "").replace("_", " ")
            return "English→Chinese Foundation: " + " ".join(word.capitalize() for word in name.split())
        elif "English->Chinese/Vocabulary/" in set_name:
            name = set_name.replace("English->Chinese/Vocabulary/", "").replace("_", " ")
            return "English→Chinese Vocabulary: " + " ".join(word.capitalize() for word in name.split())
        else:
            if set_name.lower() == "javascript":
                return "JavaScript"
            elif set_name.lower() == "ruby":
                return "Ruby"
            else:
                return " ".join(word.capitalize() for word in set_name.replace("_", " ").split())

    def get_csv_filename(self, set_name):
        """Get CSV filename for a set"""
        if "/" in set_name:
            return f"{set_name}_flashcards.csv"
        else:
            return f"{set_name}_flashcards.csv"

    def count_questions_in_set(self, set_name):
        """Count number of questions in a set"""
        filename = self.get_csv_filename(set_name)
        if not os.path.exists(filename):
            return 0
        
        try:
            with open(filename, 'r', newline='', encoding='utf-8') as csvfile:
                reader = csv.reader(csvfile)
                return sum(1 for row in reader)
        except:
            return 0

    def get_set_progress_stats(self, set_name):
        """Get progress statistics for a set"""
        filename = self.get_csv_filename(set_name)
        if not os.path.exists(filename):
            return {"correct": 0, "incorrect": 0, "total": 0, "percentage": 0}
        
        try:
            with open(filename, 'r', newline='', encoding='utf-8') as csvfile:
                reader = csv.reader(csvfile)
                flashcards = list(reader)
                
                total_correct = sum(int(row[2]) for row in flashcards if len(row) >= 5)
                total_incorrect = sum(int(row[3]) for row in flashcards if len(row) >= 5)
                total_reviewed = sum(int(row[4]) for row in flashcards if len(row) >= 5)
                
                percentage = 0
                if (total_correct + total_incorrect) > 0:
                    percentage = round((total_correct / (total_correct + total_incorrect)) * 100, 1)
                
                return {
                    "correct": total_correct,
                    "incorrect": total_incorrect, 
                    "total": total_reviewed,
                    "percentage": percentage
                }
        except:
            return {"correct": 0, "incorrect": 0, "total": 0, "percentage": 0}

    def list_available_sets(self):
        """List all available flashcard sets"""
        all_sets = []
        
        # Main directory CSV files
        main_csv_files = list(Path(".").glob("*_flashcards.csv"))
        main_sets = [str(file).replace("_flashcards.csv", "") for file in main_csv_files]
        all_sets.extend(main_sets)
        
        # Ruby sets
        ruby_path = Path("Ruby")
        if ruby_path.exists():
            ruby_csv_files = list(ruby_path.glob("*_flashcards.csv"))
            ruby_sets = [f"Ruby/{file.stem.replace('_flashcards', '')}" for file in ruby_csv_files]
            all_sets.extend(ruby_sets)
        
        # Chinese->English Foundation sets
        ce_foundation_path = Path("Chinese->English/Foundation")
        if ce_foundation_path.exists():
            ce_foundation_files = list(ce_foundation_path.glob("*_flashcards.csv"))
            ce_foundation_sets = [f"Chinese->English/Foundation/{file.stem.replace('_flashcards', '')}" 
                                 for file in ce_foundation_files]
            all_sets.extend(ce_foundation_sets)
        
        # Chinese->English Vocabulary sets
        ce_vocabulary_path = Path("Chinese->English/Vocabulary")
        if ce_vocabulary_path.exists():
            ce_vocabulary_files = list(ce_vocabulary_path.glob("*_flashcards.csv"))
            ce_vocabulary_sets = [f"Chinese->English/Vocabulary/{file.stem.replace('_flashcards', '')}"
                                 for file in ce_vocabulary_files]
            all_sets.extend(ce_vocabulary_sets)
        
        # English->Chinese Foundation sets
        ec_foundation_path = Path("English->Chinese/Foundation")
        if ec_foundation_path.exists():
            ec_foundation_files = list(ec_foundation_path.glob("*_flashcards.csv"))
            ec_foundation_sets = [f"English->Chinese/Foundation/{file.stem.replace('_flashcards', '')}"
                                 for file in ec_foundation_files]
            all_sets.extend(ec_foundation_sets)
        
        # English->Chinese Vocabulary sets
        ec_vocabulary_path = Path("English->Chinese/Vocabulary")
        if ec_vocabulary_path.exists():
            ec_vocabulary_files = list(ec_vocabulary_path.glob("*_flashcards.csv"))
            ec_vocabulary_sets = [f"English->Chinese/Vocabulary/{file.stem.replace('_flashcards', '')}"
                                 for file in ec_vocabulary_files]
            all_sets.extend(ec_vocabulary_sets)
        
        return sorted(all_sets) if all_sets else ["ruby"]

    def select_card_set(self):
        """Interactive set selection menu"""
        available_sets = self.list_available_sets()
        
        print("\n--- Available Card Sets ---")
        
        # Main sets
        main_sets = [s for s in available_sets if "/" not in s]
        current_index = 0
        
        if main_sets:
            print("Main Sets:")
            for i, set_name in enumerate(main_sets):
                current_indicator = " (current)" if set_name == self.current_set else ""
                question_count = self.count_questions_in_set(set_name)
                progress = self.get_set_progress_stats(set_name)
                progress_display = ""
                if progress["total"] > 0:
                    progress_display = f" [{self.audio_handler.GREEN}✓{progress['correct']}{self.audio_handler.RESET} {self.audio_handler.RED}✗{progress['incorrect']}{self.audio_handler.RESET} T{progress['total']} {progress['percentage']}%]"
                print(f"  {current_index + 1}. {self.display_set_name(set_name)} ({question_count} questions){progress_display}{current_indicator}")
                current_index += 1
        
        # Chinese->English Foundation sets
        ce_foundation_sets = [s for s in available_sets if "Chinese->English/Foundation/" in s]
        if ce_foundation_sets:
            print("\nChinese→English Foundation (Recognition):")
            for set_name in ce_foundation_sets:
                current_indicator = " (current)" if set_name == self.current_set else ""
                display_name = set_name.replace("Chinese->English/Foundation/", "").replace("_", " ")
                display_name = " ".join(word.capitalize() for word in display_name.split())
                question_count = self.count_questions_in_set(set_name)
                progress = self.get_set_progress_stats(set_name)
                progress_display = ""
                if progress["total"] > 0:
                    progress_display = f" [{self.audio_handler.GREEN}✓{progress['correct']}{self.audio_handler.RESET} {self.audio_handler.RED}✗{progress['incorrect']}{self.audio_handler.RESET} T{progress['total']} {progress['percentage']}%]"
                print(f"  {current_index + 1}. {display_name} ({question_count} questions){progress_display}{current_indicator}")
                current_index += 1
        
        # Chinese->English Vocabulary sets
        ce_vocabulary_sets = [s for s in available_sets if "Chinese->English/Vocabulary/" in s]
        if ce_vocabulary_sets:
            print("\nChinese→English Vocabulary (Recognition):")
            for set_name in ce_vocabulary_sets:
                current_indicator = " (current)" if set_name == self.current_set else ""
                display_name = set_name.replace("Chinese->English/Vocabulary/", "").replace("_", " ")
                display_name = " ".join(word.capitalize() for word in display_name.split())
                question_count = self.count_questions_in_set(set_name)
                progress = self.get_set_progress_stats(set_name)
                progress_display = ""
                if progress["total"] > 0:
                    progress_display = f" [{self.audio_handler.GREEN}✓{progress['correct']}{self.audio_handler.RESET} {self.audio_handler.RED}✗{progress['incorrect']}{self.audio_handler.RESET} T{progress['total']} {progress['percentage']}%]"
                print(f"  {current_index + 1}. {display_name} ({question_count} questions){progress_display}{current_indicator}")
                current_index += 1
        
        # English->Chinese Foundation sets
        ec_foundation_sets = [s for s in available_sets if "English->Chinese/Foundation/" in s]
        if ec_foundation_sets:
            print("\nEnglish→Chinese Foundation (Production):")
            for set_name in ec_foundation_sets:
                current_indicator = " (current)" if set_name == self.current_set else ""
                display_name = set_name.replace("English->Chinese/Foundation/", "").replace("_", " ")
                display_name = " ".join(word.capitalize() for word in display_name.split())
                question_count = self.count_questions_in_set(set_name)
                progress = self.get_set_progress_stats(set_name)
                progress_display = ""
                if progress["total"] > 0:
                    progress_display = f" [{self.audio_handler.GREEN}✓{progress['correct']}{self.audio_handler.RESET} {self.audio_handler.RED}✗{progress['incorrect']}{self.audio_handler.RESET} T{progress['total']} {progress['percentage']}%]"
                print(f"  {current_index + 1}. {display_name} ({question_count} questions){progress_display}{current_indicator}")
                current_index += 1
        
        # English->Chinese Vocabulary sets
        ec_vocabulary_sets = [s for s in available_sets if "English->Chinese/Vocabulary/" in s]
        if ec_vocabulary_sets:
            print("\nEnglish→Chinese Vocabulary (Production):")
            for set_name in ec_vocabulary_sets:
                current_indicator = " (current)" if set_name == self.current_set else ""
                display_name = set_name.replace("English->Chinese/Vocabulary/", "").replace("_", " ")
                display_name = " ".join(word.capitalize() for word in display_name.split())
                question_count = self.count_questions_in_set(set_name)
                progress = self.get_set_progress_stats(set_name)
                progress_display = ""
                if progress["total"] > 0:
                    progress_display = f" [{self.audio_handler.GREEN}✓{progress['correct']}{self.audio_handler.RESET} {self.audio_handler.RED}✗{progress['incorrect']}{self.audio_handler.RESET} T{progress['total']} {progress['percentage']}%]"
                print(f"  {current_index + 1}. {display_name} ({question_count} questions){progress_display}{current_indicator}")
                current_index += 1
        
        # Ruby sets
        ruby_sets = [s for s in available_sets if "Ruby/" in s]
        if ruby_sets:
            print("\nRuby Topic Sets:")
            for set_name in ruby_sets:
                current_indicator = " (current)" if set_name == self.current_set else ""
                display_name = set_name.replace("Ruby/", "").replace("_", " ")
                display_name = " ".join(word.capitalize() for word in display_name.split())
                question_count = self.count_questions_in_set(set_name)
                progress = self.get_set_progress_stats(set_name)
                progress_display = ""
                if progress["total"] > 0:
                    progress_display = f" [{self.audio_handler.GREEN}✓{progress['correct']}{self.audio_handler.RESET} {self.audio_handler.RED}✗{progress['incorrect']}{self.audio_handler.RESET} T{progress['total']} {progress['percentage']}%]"
                print(f"  {current_index + 1}. {display_name} ({question_count} questions){progress_display}{current_indicator}")
                current_index += 1
        
        print(f"\n{len(available_sets) + 1}. Create new set")
        print("0. Back to main menu")
        
        try:
            choice = int(input("Select a set: "))
            
            if choice == 0:
                return
            elif 1 <= choice <= len(available_sets):
                self.current_set = available_sets[choice - 1]
                print(f"Switched to {self.display_set_name(self.current_set)} cards.")
            elif choice == len(available_sets) + 1:
                self.create_new_set()
            else:
                print("Invalid choice.")
                return
        except ValueError:
            print("Invalid choice.")
            return

    def create_new_set(self):
        """Create a new flashcard set"""
        set_name = input("Enter name for new card set: ").lower().strip()
        set_name = "_".join(set_name.split())
        
        if not set_name:
            print("Invalid set name.")
            return
        
        filename = self.get_csv_filename(set_name)
        if os.path.exists(filename):
            print(f"Set '{set_name}' already exists.")
            return
        
        # Create empty CSV file
        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            pass
        
        self.current_set = set_name
        print(f"Created new set '{set_name}' and switched to it.")

    def get_category_sets(self, category):
        """Get sets belonging to a specific category"""
        available_sets = self.list_available_sets()
        
        if category == "foundation":
            return [s for s in available_sets if "Chinese->English/Foundation/" in s]
        elif category == "vocabulary":
            return [s for s in available_sets if "Chinese->English/Vocabulary/" in s]
        elif category == "production_foundation":
            return [s for s in available_sets if "English->Chinese/Foundation/" in s]
        elif category == "production_vocabulary":
            return [s for s in available_sets if "English->Chinese/Vocabulary/" in s]
        elif category == "ruby":
            return [s for s in available_sets if "Ruby/" in s]
        else:
            return []

    def get_category_display_name(self, category):
        """Get display name for a category"""
        category_names = {
            "foundation": "Chinese→English Foundation (Recognition)",
            "vocabulary": "Chinese→English Vocabulary (Recognition)",
            "production_foundation": "English→Chinese Foundation (Production)",
            "production_vocabulary": "English→Chinese Vocabulary (Production)",
            "ruby": "Ruby Topic Sets"
        }
        return category_names.get(category, "Unknown Category")

    def load_combined_flashcards(self, category):
        """Load and combine flashcards from multiple sets in a category"""
        sets = self.get_category_sets(category)
        if not sets:
            return {"flashcards": [], "source_map": [], "question_map": {}}
        
        combined_flashcards = []
        set_source_map = []
        seen_questions = {}
        
        for set_name in sets:
            filename = self.get_csv_filename(set_name)
            if not os.path.exists(filename):
                continue
            
            try:
                with open(filename, 'r', newline='', encoding='utf-8') as csvfile:
                    reader = csv.reader(csvfile)
                    flashcards = list(reader)
                    
                    for index, card in enumerate(flashcards):
                        if len(card) < 5:
                            continue
                        
                        question = card[0]
                        
                        if question in seen_questions:
                            # Merge statistics: add counts from duplicate to first occurrence
                            first_occurrence_index = seen_questions[question]["combined_index"]
                            combined_flashcards[first_occurrence_index][2] = str(
                                int(combined_flashcards[first_occurrence_index][2]) + int(card[2])
                            )
                            combined_flashcards[first_occurrence_index][3] = str(
                                int(combined_flashcards[first_occurrence_index][3]) + int(card[3])
                            )
                            combined_flashcards[first_occurrence_index][4] = str(
                                int(combined_flashcards[first_occurrence_index][4]) + int(card[4])
                            )
                            # Store reference to merge back later
                            seen_questions[question]["duplicates"].append({
                                "set": set_name,
                                "original_index": index
                            })
                        else:
                            # First occurrence of this question
                            combined_flashcards.append(card)
                            combined_index = len(combined_flashcards) - 1
                            set_source_map.append({"set": set_name, "original_index": index})
                            seen_questions[question] = {
                                "combined_index": combined_index,
                                "duplicates": []
                            }
            except Exception as e:
                print(f"Warning: Could not load {set_name}: {e}")
        
        return {
            "flashcards": combined_flashcards,
            "source_map": set_source_map,
            "question_map": seen_questions
        }

    def save_combined_flashcards(self, combined_data, updated_flashcards):
        """Save updated flashcards back to their original sets"""
        if not combined_data.get("source_map") or not combined_data.get("question_map"):
            return
        
        set_updates = {}
        
        for index, card in enumerate(updated_flashcards):
            if index >= len(combined_data["source_map"]):
                continue
                
            source_info = combined_data["source_map"][index]
            set_name = source_info["set"]
            original_index = source_info["original_index"]
            question = card[0]
            
            if set_name not in set_updates:
                set_updates[set_name] = []
            
            # Ensure the list is long enough
            while len(set_updates[set_name]) <= original_index:
                set_updates[set_name].append(None)
            
            set_updates[set_name][original_index] = card
            
            # Also update all duplicate occurrences with the same statistics
            if question in combined_data["question_map"]:
                for duplicate in combined_data["question_map"][question]["duplicates"]:
                    duplicate_set = duplicate["set"]
                    duplicate_index = duplicate["original_index"]
                    
                    if duplicate_set not in set_updates:
                        set_updates[duplicate_set] = []
                    
                    # Ensure the list is long enough
                    while len(set_updates[duplicate_set]) <= duplicate_index:
                        set_updates[duplicate_set].append(None)
                    
                    # Create a copy of the card for the duplicate location
                    duplicate_card = card.copy()
                    set_updates[duplicate_set][duplicate_index] = duplicate_card
        
        # Save updates to each set
        for set_name, cards in set_updates.items():
            filename = self.get_csv_filename(set_name)
            
            try:
                # Read existing cards
                existing_cards = []
                if os.path.exists(filename):
                    with open(filename, 'r', newline='', encoding='utf-8') as csvfile:
                        reader = csv.reader(csvfile)
                        existing_cards = list(reader)
                
                # Update with new data
                for index, updated_card in enumerate(cards):
                    if updated_card is not None:
                        # Ensure existing_cards is long enough
                        while len(existing_cards) <= index:
                            existing_cards.append([])
                        existing_cards[index] = updated_card
                
                # Write back to file
                with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
                    writer = csv.writer(csvfile)
                    for row in existing_cards:
                        if row:  # Only write non-empty rows
                            writer.writerow(row)
            except Exception as e:
                print(f"Warning: Could not save updates to {set_name}: {e}")

    def delete_set(self):
        """Delete a flashcard set"""
        available_sets = self.list_available_sets()
        
        if len(available_sets) <= 1:
            print("Cannot delete the only remaining set.")
            return
        
        print("\n--- Delete Card Set ---")
        print("Available sets to delete:")
        for i, set_name in enumerate(available_sets):
            print(f"  {i + 1}. {self.display_set_name(set_name)}")
        print(f"{len(available_sets) + 1}. Cancel")
        
        try:
            choice = int(input("Select set to delete: "))
            
            if 1 <= choice <= len(available_sets):
                set_to_delete = available_sets[choice - 1]
                
                print(f"\nAre you sure you want to delete '{self.display_set_name(set_to_delete)}'?")
                print("This will permanently remove all cards and progress data.")
                confirmation = input("Type 'yes' to confirm: ").lower()
                
                if confirmation == "yes":
                    filename = self.get_csv_filename(set_to_delete)
                    if os.path.exists(filename):
                        os.remove(filename)
                        print(f"Deleted set '{self.display_set_name(set_to_delete)}'.")
                        
                        if set_to_delete == self.current_set:
                            remaining_sets = self.list_available_sets()
                            if remaining_sets:
                                self.current_set = remaining_sets[0]
                                print(f"Switched to '{self.display_set_name(self.current_set)}' set.")
                    else:
                        print("Set file not found.")
                else:
                    print("Delete cancelled.")
            elif choice == len(available_sets) + 1:
                print("Delete cancelled.")
            else:
                print("Invalid choice.")
        except ValueError:
            print("Invalid choice.")