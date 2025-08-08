import csv
import os
import hashlib
from datetime import datetime, timedelta
from glob import glob

class SRSManager:
    def __init__(self):
        # No longer uses JSON file - reads/writes directly to CSV files
        pass

    def _get_csv_path(self, set_name):
        """Convert set name to CSV file path"""
        if '/' in set_name:
            return f"{set_name}_flashcards.csv"
        else:
            return f"{set_name}_flashcards.csv"

    def _load_csv_cards(self, csv_path):
        """Load cards from CSV file with extended format"""
        cards = []
        if os.path.exists(csv_path):
            with open(csv_path, 'r', encoding='utf-8') as f:
                reader = csv.reader(f)
                for row in reader:
                    if len(row) >= 9:  # Extended format with SRS columns
                        cards.append(row)
        return cards

    def _save_csv_cards(self, csv_path, cards):
        """Save cards to CSV file with extended format"""
        with open(csv_path, 'w', encoding='utf-8', newline='') as f:
            writer = csv.writer(f)
            writer.writerows(cards)

    def _generate_card_id(self, set_name, question, answer):
        # Create a unique ID for each card based on set, question, and answer
        return hashlib.md5(f"{set_name}-{question}-{answer}".encode('utf-8')).hexdigest()

    def get_srs_data(self, set_name, question, answer):
        """Get SRS data for a specific card from CSV file"""
        csv_path = self._get_csv_path(set_name)
        cards = self._load_csv_cards(csv_path)
        
        # Find matching card
        for card in cards:
            if card[0] == question and card[1] == answer:
                if len(card) >= 9:  # Extended format
                    return {
                        'set_name': set_name,
                        'question': question,
                        'answer': answer,
                        'easiness_factor': float(card[5]),
                        'interval_hours': int(card[6]),
                        'repetitions': int(card[7]),
                        'next_review_date': card[8]
                    }
        
        # Default values if not found or not extended format
        return {
            'set_name': set_name,
            'question': question,
            'answer': answer,
            'easiness_factor': 2.5,
            'interval_hours': 0,
            'repetitions': 0,
            'next_review_date': '1970-01-01 00:00:00'
        }

    def update_srs_data(self, set_name, question, answer, is_correct):
        """Update SRS data for a specific card in CSV file"""
        csv_path = self._get_csv_path(set_name)
        cards = self._load_csv_cards(csv_path)
        
        # Find and update the matching card
        card_found = False
        for i, card in enumerate(cards):
            if card[0] == question and card[1] == answer:
                card_found = True
                # Get current SRS values or defaults
                easiness = float(card[5]) if len(card) >= 9 else 2.5
                interval_hours = int(card[6]) if len(card) >= 9 else 0
                repetitions = int(card[7]) if len(card) >= 9 else 0
                
                srs_info = {
                    'easiness_factor': easiness,
                    'interval_hours': interval_hours,
                    'repetitions': repetitions
                }
                break
        
        if not card_found:
            # Card not found - this shouldn't happen in normal operation
            return
        
        # Calculate new SRS values (same logic as before)

        easiness = srs_info['easiness_factor']
        interval_hours = srs_info['interval_hours']
        repetitions = srs_info['repetitions']

        if is_correct:
            # Aggressive schedule: 1h → 4h → 12h → 1d → 3d → 7d (stored as hours)
            if repetitions == 0:
                interval_hours = 1
            elif repetitions == 1:
                interval_hours = 4
            elif repetitions == 2:
                interval_hours = 12
            elif repetitions == 3:
                interval_hours = 24  # 1 day
            elif repetitions == 4:
                interval_hours = 72  # 3 days
            elif repetitions == 5:
                interval_hours = 168  # 7 days
            else:
                # After 7 days, continue with exponential growth
                interval_hours = round(interval_hours * easiness)
            repetitions += 1
        else:
            repetitions = 0
            interval_hours = 1  # Reset to 1 hour

        # Quality of response (simplified to 5 for correct, 0 for incorrect)
        quality = 5 if is_correct else 0
        easiness += 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
        if easiness < 1.3:
            easiness = 1.3

        # Cap interval to at most 7 days (168 hours)
        if interval_hours > 168:
            interval_hours = 168
        next_review_date = datetime.now() + timedelta(hours=interval_hours)
        next_review_date_str = next_review_date.strftime('%Y-%m-%d %H:%M:%S')
        
        # Update the card in the list with new SRS values
        for i, card in enumerate(cards):
            if card[0] == question and card[1] == answer:
                # Ensure card has all 9 columns: question, answer, correct_count, incorrect_count, reviewed_count, easiness_factor, interval_hours, repetitions, next_review_date
                if len(card) < 9:
                    card.extend(['0'] * (9 - len(card)))  # Pad with defaults
                
                card[5] = str(round(easiness, 2))  # easiness_factor
                card[6] = str(interval_hours)       # interval_hours
                card[7] = str(repetitions)          # repetitions
                card[8] = next_review_date_str      # next_review_date
                break
        
        # Save updated cards back to CSV
        self._save_csv_cards(csv_path, cards)

    def get_due_cards(self, all_sets_data):
        """Get cards due for review from all sets"""
        due_cards = []
        current_date = datetime.now().date()

        for set_name, flashcards in all_sets_data.items():
            csv_path = self._get_csv_path(set_name)
            csv_cards = self._load_csv_cards(csv_path)
            
            for i, card in enumerate(flashcards):
                question = card[0]
                answer = card[1]
                
                # Find corresponding CSV card with SRS data
                srs_info = None
                for csv_card in csv_cards:
                    if csv_card[0] == question and csv_card[1] == answer and len(csv_card) >= 9:
                        next_review_date_str = csv_card[8]
                        try:
                            # Try new datetime format first, fallback to date-only format
                            if ' ' in next_review_date_str:
                                next_review_datetime = datetime.strptime(next_review_date_str, '%Y-%m-%d %H:%M:%S')
                                if next_review_datetime <= datetime.now():
                                    srs_info = {
                                        'easiness_factor': float(csv_card[5]),
                                        'interval_hours': int(csv_card[6]),
                                        'repetitions': int(csv_card[7]),
                                        'next_review_date': next_review_date_str
                                    }
                                    break
                            else:
                                # Legacy date-only format
                                next_review_date = datetime.strptime(next_review_date_str, '%Y-%m-%d').date()
                                if next_review_date <= current_date:
                                    srs_info = {
                                        'easiness_factor': float(csv_card[5]),
                                        'interval_hours': int(csv_card[6]),
                                        'repetitions': int(csv_card[7]),
                                        'next_review_date': next_review_date_str
                                    }
                                    break
                        except (ValueError, IndexError):
                            # Invalid date format, treat as due
                            srs_info = {
                                'easiness_factor': float(csv_card[5]) if len(csv_card) > 5 else 2.5,
                                'interval_hours': int(csv_card[6]) if len(csv_card) > 6 else 0,
                                'repetitions': int(csv_card[7]) if len(csv_card) > 7 else 0,
                                'next_review_date': '1970-01-01 00:00:00'
                            }
                            break
                
                if srs_info:
                    due_cards.append({
                        'set_name': set_name,
                        'original_index': i,
                        'card': card,
                        'srs_info': srs_info
                    })
        
        return due_cards
