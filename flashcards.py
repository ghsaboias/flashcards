#!/usr/bin/env -S uv run python
import csv
import os
import subprocess
import re
import time
from lib.audio_handler import AudioHandler
from lib.set_manager import SetManager
from lib.session_tracker import SessionTracker
from lib.review_engine import ReviewEngine
from lib.srs import SRSManager
from lib.llm_manager import LLMManager
from lib.practice_manager import PracticeManager
from lib.ui_manager import UIManager
from lib.coin_system import CoinSystem

class FlashcardsApp:
    def __init__(self):
        self.set_manager = SetManager()
        self.session_tracker = SessionTracker(self.set_manager)
        self.coin_system = CoinSystem()
        self.review_engine = ReviewEngine(self.set_manager, self.session_tracker, self.coin_system)
        self.audio_handler = AudioHandler()
        self.srs_manager = SRSManager()
        self.llm_manager = LLMManager(self.session_tracker)
        self.practice_manager = PracticeManager(self.set_manager, self.review_engine, self.llm_manager, self.srs_manager)
        self.ui_manager = UIManager(self.set_manager, self.session_tracker, self.srs_manager, self.coin_system)
        
        self.menu_commands = {
            "1": ("Practice Set", self.practice_manager.practice_set),
            "2": ("Practice Category", self.practice_manager.practice_category),
            "3": ("Practice Difficult Cards", self.practice_manager.practice_difficult_cards),
            "4": ("Practice Difficult Category", self.practice_manager.practice_difficult_category),
            "5": ("Practice Due Cards by Set", self.practice_manager.practice_due_cards_by_set),
            "6": ("Practice Due Cards by Category", self.practice_manager.practice_due_cards_by_category),
            "7": ("See Difficult Cards", self.ui_manager.see_difficult_cards),
            "8": ("View Scores", self.ui_manager.view_scores),
            "9": ("View SRS Data by Category", self.ui_manager.view_srs_data_by_category),
            "10": ("Select Set", self.select_set),
            "11": ("Select Category", self.select_category),
            "12": ("Delete Set", self.set_manager.delete_set),
            "13": ("Exit", lambda: False)
        }

    

    def handle_menu_choice(self, choice):
        """Handle menu choice using command pattern"""
        if choice in self.menu_commands:
            _, command = self.menu_commands[choice]
            result = command()
            # exit loop if command signals to stop (e.g., Exit)
            if result is False:
                return False
            return True
        elif choice == "10" and self.llm_manager.llm_session_active:
            self.llm_manager.close_llm_session()
            return True
        else:
            print("Invalid choice. Please try again.")
            return True

    def select_set(self):
        """Select Set menu option"""
        self.set_manager.select_card_set()

    def select_category(self):
        """Select Category menu option"""
        self.set_manager.select_category()

    def run(self):
        """Main application loop"""
        try:
            while True:
                self.ui_manager.display_main_menu(
                    self.set_manager.display_set_name(self.set_manager.current_set),
                    self.llm_manager.llm_session_active,
                    self.llm_manager.llm_provider,
                    self.menu_commands
                )
                
                try:
                    choice = input("Enter your choice: ")
                except (EOFError, KeyboardInterrupt):
                    break
                
                if not self.handle_menu_choice(choice):
                    break
        
        except KeyboardInterrupt:
            print("\n\nGoodbye!")

if __name__ == "__main__":
    app = FlashcardsApp()
    app.run()
