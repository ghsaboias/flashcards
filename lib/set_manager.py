import csv
import os
from pathlib import Path
from .audio_handler import AudioHandler

class SetManager:
    def __init__(self):
        self.audio_handler = AudioHandler()
        self.current_set = self.load_current_set()
        self.current_category = self.load_current_category()

    def load_current_set(self):
        """Load the last used set from config file"""
        try:
            if os.path.exists("current_set.txt"):
                with open("current_set.txt", 'r', encoding='utf-8') as f:
                    saved_set = f.read().strip()
                    if saved_set and self.set_exists(saved_set):
                        return saved_set
        except Exception as e:
            print(f"Warning: Could not load saved set: {e}")
        
        # Default to first available set if no saved set or saved set doesn't exist
        available_sets = self.list_available_sets()
        return available_sets[0] if available_sets else None

    def save_current_set(self):
        """Save the current set to config file"""
        try:
            with open("current_set.txt", 'w', encoding='utf-8') as f:
                f.write(self.current_set)
        except Exception as e:
            print(f"Warning: Could not save current set: {e}")

    def load_current_category(self):
        """Load the last used category from config file"""
        try:
            if os.path.exists("current_category.txt"):
                with open("current_category.txt", 'r', encoding='utf-8') as f:
                    saved_category = f.read().strip()
                    if saved_category and saved_category in self.list_categories():
                        return saved_category
        except Exception as e:
            print(f"Warning: Could not load saved category: {e}")
        return None # Default to None if no saved category or invalid

    def save_current_category(self):
        """Save the current category to config file"""
        try:
            with open("current_category.txt", 'w', encoding='utf-8') as f:
                f.write(self.current_category if self.current_category else "")
        except Exception as e:
            print(f"Warning: Could not save current category: {e}")

    def set_exists(self, set_name):
        """Check if a set file exists"""
        filename = self.get_csv_filename(set_name)
        return os.path.exists(filename)

    def display_set_name(self, set_name):
        """Format set name for display"""
        if "Recognition_Practice/HSK_Level_1/" in set_name:
            name = set_name.replace("Recognition_Practice/HSK_Level_1/", "").replace("_flashcards", "").replace("_", " ")
            return "HSK 1: " + " ".join(word.capitalize() for word in name.split())
        elif "Recognition_Practice/HSK_Level_2/" in set_name:
            name = set_name.replace("Recognition_Practice/HSK_Level_2/", "").replace("_flashcards", "").replace("_", " ")
            return "HSK 2: " + " ".join(word.capitalize() for word in name.split())
        else:
            # Handle legacy or simple set names
            clean_name = set_name.replace("_flashcards", "").replace("_", " ")
            return " ".join(word.capitalize() for word in clean_name.split())

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
        
        # Main directory CSV files (legacy)
        main_csv_files = list(Path(".").glob("*_flashcards.csv"))
        main_sets = [str(file).replace("_flashcards.csv", "") for file in main_csv_files]
        all_sets.extend(main_sets)
        
        # HSK Level 1 sets
        hsk1_path = Path("Recognition_Practice/HSK_Level_1")
        if hsk1_path.exists():
            hsk1_files = list(hsk1_path.glob("*_flashcards.csv"))
            hsk1_sets = [f"Recognition_Practice/HSK_Level_1/{file.stem.replace('_flashcards', '')}" 
                        for file in hsk1_files]
            all_sets.extend(hsk1_sets)
        
        # HSK Level 2 sets
        hsk2_path = Path("Recognition_Practice/HSK_Level_2")
        if hsk2_path.exists():
            hsk2_files = list(hsk2_path.glob("*_flashcards.csv"))
            hsk2_sets = [f"Recognition_Practice/HSK_Level_2/{file.stem.replace('_flashcards', '')}"
                        for file in hsk2_files]
            all_sets.extend(hsk2_sets)
        
        return sorted(all_sets) if all_sets else []

    PAGE_SIZE = 10  # Number of sets to display per page

    def select_card_set(self):
        """Interactive set selection menu with pagination"""
        available_sets = self.list_available_sets()
        total_sets = len(available_sets)
        total_pages = (total_sets + self.PAGE_SIZE - 1) // self.PAGE_SIZE
        current_page = 0

        while True:
            print("""
--- Available Card Sets ---""")
            print(f"Page {current_page + 1}/{total_pages}")
            
            start_index = current_page * self.PAGE_SIZE
            end_index = min(start_index + self.PAGE_SIZE, total_sets)
            
            displayed_sets = available_sets[start_index:end_index]
            
            if not displayed_sets:
                print("No sets available.")
                if total_sets == 0:
                    print(f"""
1. Create new set""")
                    print("0. Back to main menu")
                else:
                    print("""
0. Back to main menu""")
                
                try:
                    choice = input("Enter your choice: ")
                    if choice == "0":
                        return
                    elif total_sets == 0 and choice == "1":
                        self.create_new_set()
                        return
                    else:
                        print("Invalid choice.")
                        continue
                except ValueError:
                    print("Invalid choice.")
                    continue

            
            for i, set_name in enumerate(displayed_sets):
                display_index = start_index + i + 1
                current_indicator = " (current)" if set_name == self.current_set else ""
                question_count = self.count_questions_in_set(set_name)
                progress = self.get_set_progress_stats(set_name)
                progress_display = ""
                if progress["total"] > 0:
                    progress_display = f" [{self.audio_handler.GREEN}✓{progress['correct']}{self.audio_handler.RESET} {self.audio_handler.RED}✗{progress['incorrect']}{self.audio_handler.RESET} T{progress['total']} {progress['percentage']}%]"
                print(f"  {display_index}. {self.display_set_name(set_name)} ({question_count} questions){progress_display}{current_indicator}")
            
            print("""
--- Navigation ---""")
            if current_page < total_pages - 1:
                print("N. Next Page")
            if current_page > 0:
                print("P. Previous Page")
            print(f"C. Create new set")
            print("0. Back to main menu")
            
            try:
                choice = input("Select a set number, or navigate (N/P/C/0): ").upper()
                
                if choice == "0":
                    return
                elif choice == "N":
                    if current_page < total_pages - 1:
                        current_page += 1
                    else:
                        print("Already on the last page.")
                elif choice == "P":
                    if current_page > 0:
                        current_page -= 1
                    else:
                        print("Already on the first page.")
                elif choice == "C":
                    self.create_new_set()
                    return
                else:
                    selected_index = int(choice) - 1
                    if 0 <= selected_index < total_sets:
                        self.current_set = available_sets[selected_index]
                        self.save_current_set()
                        print(f"Switched to {self.display_set_name(self.current_set)} cards.")
                        return
                    else:
                        print("Invalid choice.")
            except ValueError:
                print("Invalid input. Please enter a number or N/P/C/0.")

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
        self.save_current_set()
        print(f"Created new set '{set_name}' and switched to it.")

    def get_category_sets(self, category):
        """Get sets belonging to a specific category"""
        available_sets = self.list_available_sets()
        
        if category == "hsk_level_1":
            return [s for s in available_sets if "Recognition_Practice/HSK_Level_1/" in s]
        elif category == "hsk_level_2":
            return [s for s in available_sets if "Recognition_Practice/HSK_Level_2/" in s]
        else:
            return []

    def get_category_display_name(self, category):
        """Get display name for a category"""
        category_names = {
            "hsk_level_1": "HSK Level 1 (Recognition)",
            "hsk_level_2": "HSK Level 2 (Recognition)",
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

    def list_categories(self):
        """List all available categories"""
        categories = set()
        for s in self.list_available_sets():
            if "Recognition_Practice/HSK_Level_1/" in s:
                categories.add("hsk_level_1")
            elif "Recognition_Practice/HSK_Level_2/" in s:
                categories.add("hsk_level_2")
        return sorted(list(categories))

    def load_flashcards_from_set(self, set_name):
        """Load flashcards from a single set"""
        filename = self.get_csv_filename(set_name)
        if not os.path.exists(filename):
            return []
        try:
            with open(filename, 'r', newline='', encoding='utf-8') as csvfile:
                reader = csv.reader(csvfile)
                return list(reader)
        except Exception as e:
            print(f"Error reading flashcards from {set_name}: {e}")
            return []

    def select_multiple_sets(self):
        """Interactive menu to select one or more sets"""
        available_sets = self.list_available_sets()
        if not available_sets:
            print("No sets available.")
            return []

        selected_sets = []
        while True:
            print("\n--- Select Sets ---")
            for i, set_name in enumerate(available_sets):
                print(f"  {i + 1}. {self.display_set_name(set_name)}")
            print("\nEnter numbers separated by commas (e.g., 1,3,5), 'all' for all sets, or '0' to cancel.")
            
            try:
                choice = input("Your choice: ").lower().strip()
                if choice == "0":
                    return []
                elif choice == "all":
                    return available_sets
                else:
                    indices = [int(x.strip()) - 1 for x in choice.split(',')]
                    for idx in indices:
                        if 0 <= idx < len(available_sets):
                            selected_sets.append(available_sets[idx])
                        else:
                            print(f"Invalid set number: {idx + 1}. Please try again.")
                            selected_sets = [] # Clear selection on invalid input
                            break
                    if selected_sets:
                        return list(set(selected_sets)) # Return unique selected sets
            except ValueError:
                print("Invalid input. Please enter numbers or 'all'.")

    def select_multiple_categories(self):
        """Interactive menu to select one or more categories"""
        available_categories = self.list_categories()
        if not available_categories:
            print("No categories available.")
            return []

        selected_categories = []
        while True:
            print("\n--- Select Categories ---")
            for i, category_key in enumerate(available_categories):
                print(f"  {i + 1}. {self.get_category_display_name(category_key)}")
            print("\nEnter numbers separated by commas (e.g., 1,3), 'all' for all categories, or '0' to cancel.")
            
            try:
                choice = input("Your choice: ").lower().strip()
                if choice == "0":
                    return []
                elif choice == "all":
                    return available_categories
                else:
                    indices = [int(x.strip()) - 1 for x in choice.split(',')]
                    for idx in indices:
                        if 0 <= idx < len(available_categories):
                            selected_categories.append(available_categories[idx])
                        else:
                            print(f"Invalid category number: {idx + 1}. Please try again.")
                            selected_categories = [] # Clear selection on invalid input
                            break
                    if selected_categories:
                        return list(set(selected_categories)) # Return unique selected categories
            except ValueError:
                print("Invalid input. Please enter numbers or 'all'.")

    def select_category(self):
        """Interactive menu to select a single category and set it as current"""
        available_categories = self.list_categories()
        if not available_categories:
            print("No categories available.")
            return

        while True:
            print("\n--- Select a Category ---")
            for i, category_key in enumerate(available_categories):
                current_indicator = " (current)" if category_key == self.current_category else ""
                print(f"  {i + 1}. {self.get_category_display_name(category_key)}{current_indicator}")
            print("\nEnter category number, or '0' to cancel.")
            
            try:
                choice = input("Your choice: ").lower().strip()
                if choice == "0":
                    return
                else:
                    selected_index = int(choice) - 1
                    if 0 <= selected_index < len(available_categories):
                        self.current_category = available_categories[selected_index]
                        self.save_current_category()
                        print(f"Switched to {self.get_category_display_name(self.current_category)} category.")
                        return
                    else:
                        print("Invalid category number. Please try again.")
            except ValueError:
                print("Invalid input. Please enter a number.")

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
                                self.save_current_set()
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