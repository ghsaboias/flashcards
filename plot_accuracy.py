#!/usr/bin/env python3
"""
Accuracy Plotting Script for Flashcard System

This script analyzes session logs and CSV data to plot accuracy trends over time.
Supports both set-level and individual card-level accuracy visualization.
"""

import re
import csv
import argparse
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from datetime import datetime
from collections import defaultdict, namedtuple
from pathlib import Path
import pandas as pd

# Data structures
SessionResult = namedtuple('SessionResult', ['timestamp', 'set_name', 'session_type', 'correct', 'total', 'accuracy'])
CardResult = namedtuple('CardResult', ['timestamp', 'set_name', 'question', 'correct', 'response_time'])

class AccuracyPlotter:
    def __init__(self, session_log_path='session_log.txt'):
        self.session_log_path = Path(session_log_path)
        self.session_results = []
        self.card_results = []
        
    def parse_session_log(self):
        """Parse the session log file to extract session and card results."""
        if not self.session_log_path.exists():
            print(f"Session log not found: {self.session_log_path}")
            return
            
        with open(self.session_log_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
        current_session = None
        session_cards = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Session header: > 2025-08-04 12:13:10 | Set Name | Session Type
            session_match = re.match(r'^> (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \| (.+?) \| (.+)$', line)
            if session_match:
                if current_session and session_cards:
                    self._process_session(current_session, session_cards)
                
                timestamp_str, set_name, session_type = session_match.groups()
                timestamp = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S')
                current_session = (timestamp, set_name, session_type)
                session_cards = []
                continue
            
            # Card result: ✓ 水 (3.4s) or ✗ 口 A:mouth' (3.0s)
            card_match = re.match(r'^([✓✗]) (.+?) \((\d+\.\d+)s\)$', line)
            if card_match and current_session:
                result_symbol, question_part, response_time = card_match.groups()
                correct = result_symbol == '✓'
                
                # Extract question (remove answer part if incorrect)
                if not correct and ' A:' in question_part:
                    question = question_part.split(' A:')[0]
                else:
                    question = question_part
                    
                card_result = CardResult(
                    timestamp=current_session[0],
                    set_name=current_session[1],
                    question=question,
                    correct=correct,
                    response_time=float(response_time)
                )
                session_cards.append(card_result)
                self.card_results.append(card_result)
                continue
            
            # Session summary: < 12:13:36 26.2s 9/10
            summary_match = re.match(r'^< \d{2}:\d{2}:\d{2} \d+\.\d+s (\d+)/(\d+)$', line)
            if summary_match and current_session:
                correct, total = map(int, summary_match.groups())
                accuracy = (correct / total) * 100 if total > 0 else 0
                
                session_result = SessionResult(
                    timestamp=current_session[0],
                    set_name=current_session[1],
                    session_type=current_session[2],
                    correct=correct,
                    total=total,
                    accuracy=accuracy
                )
                self.session_results.append(session_result)
        
        # Process last session if exists
        if current_session and session_cards:
            self._process_session(current_session, session_cards)
            
    def _process_session(self, session_info, cards):
        """Process a complete session's card results."""
        if not cards:
            return
            
        timestamp, set_name, session_type = session_info
        correct_count = sum(1 for card in cards if card.correct)
        total_count = len(cards)
        accuracy = (correct_count / total_count) * 100 if total_count > 0 else 0
        
        session_result = SessionResult(
            timestamp=timestamp,
            set_name=set_name,
            session_type=session_type,
            correct=correct_count,
            total=total_count,
            accuracy=accuracy
        )
        self.session_results.append(session_result)
    
    def plot_category_accuracy_over_time(self, save_path=None, chinese_only=True):
        """Plot accuracy over time grouped by category."""
        if not self.session_results:
            print("No session data found. Make sure to parse the session log first.")
            return
            
        # Group results by category
        category_data = defaultdict(list)
        for result in self.session_results:
            category = self._get_category(result.set_name)
            
            # Combine old format sets with their proper categories
            if category == 'Other' and 'chinese' in result.set_name.lower():
                if 'foundation' in result.set_name.lower():
                    category = 'Chinese→English Foundation'
                elif 'vocabulary' in result.set_name.lower():
                    category = 'Chinese→English Vocabulary'
            
            # Filter to Chinese→English only if requested
            if chinese_only:
                if category not in ['Chinese→English Foundation', 'Chinese→English Vocabulary']:
                    continue
            
            category_data[category].append(result)
        
        # Calculate average accuracy per day for each category
        category_daily_avg = {}
        for category, results in category_data.items():
            daily_results = defaultdict(list)
            for result in results:
                date_key = result.timestamp.date()
                daily_results[date_key].append(result.accuracy)
            
            # Calculate daily averages
            category_daily_avg[category] = []
            for date in sorted(daily_results.keys()):
                avg_accuracy = sum(daily_results[date]) / len(daily_results[date])
                category_daily_avg[category].append((date, avg_accuracy))
        
        # Create plot
        fig, ax = plt.subplots(figsize=(12, 8))
        
        # Use distinct colors - Foundation in blue, Vocabulary in orange
        color_map = {
            'Chinese→English Foundation': '#1f77b4',  # Blue
            'Chinese→English Vocabulary': '#ff7f0e'   # Orange
        }
        
        for category, data in category_daily_avg.items():
            if not data:
                continue
                
            dates = [item[0] for item in data]
            accuracies = [item[1] for item in data]
            
            color = color_map.get(category, '#2ca02c')  # Default green for any others
            ax.plot(dates, accuracies, 'o-', label=category.replace('Chinese→English ', ''), 
                   color=color, linewidth=4, markersize=12, alpha=0.8)
        
        # Format plot
        ax.set_xlabel('Date', fontsize=14)
        ax.set_ylabel('Average Accuracy (%)', fontsize=14)
        ax.set_title('Chinese→English: Foundation vs Vocabulary Accuracy', fontsize=16, fontweight='bold')
        ax.grid(True, alpha=0.3)
        ax.set_ylim(0, 105)
        
        # Format dates on x-axis
        ax.xaxis.set_major_formatter(mdates.DateFormatter('%m-%d'))
        ax.xaxis.set_major_locator(mdates.DayLocator(interval=1))
        plt.setp(ax.xaxis.get_majorticklabels(), rotation=45, ha='right')
        
        # Add legend
        if category_daily_avg:
            ax.legend(loc='lower right', fontsize=14, frameon=True, fancybox=True, shadow=True)
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"Plot saved to: {save_path}")
        
        plt.show()
    
    def _get_category(self, set_name):
        """Extract category from set name."""
        # Handle both ASCII arrow (->) and Unicode arrow (→)
        if 'Chinese→English' in set_name or 'Chinese->English' in set_name:
            if 'Foundation' in set_name:
                return 'Chinese→English Foundation'
            elif 'Vocabulary' in set_name:
                return 'Chinese→English Vocabulary'
            else:
                return 'Chinese→English'
        elif 'English→Chinese' in set_name or 'English->Chinese' in set_name:
            if 'Foundation' in set_name:
                return 'English→Chinese Foundation'
            elif 'Vocabulary' in set_name:
                return 'English→Chinese Vocabulary'
            else:
                return 'English→Chinese'
        elif 'Recognition' in set_name:
            if 'Chinese' in set_name:
                return 'Chinese Recognition'
            else:
                return 'Recognition'
        elif 'Production' in set_name:
            return 'Production'
        else:
            return 'Other'
    
    def plot_set_accuracy_over_time(self, filter_pattern=None, save_path=None, interactive=False, max_sets=10):
        """Plot accuracy over time for each set."""
        if not self.session_results:
            print("No session data found. Make sure to parse the session log first.")
            return
            
        # Group results by set
        set_data = defaultdict(list)
        for result in self.session_results:
            if filter_pattern and filter_pattern.lower() not in result.set_name.lower():
                continue
            set_data[result.set_name].append(result)
        
        # Sort each set's data by timestamp
        for set_name in set_data:
            set_data[set_name].sort(key=lambda x: x.timestamp)
        
        # If too many sets, offer selection
        if len(set_data) > max_sets or interactive:
            set_data = self._select_sets_for_plotting(set_data, max_sets)
            if not set_data:
                print("No sets selected.")
                return
        
        # Create plot
        fig, ax = plt.subplots(figsize=(14, 8))
        
        # Use better color palette
        colors = plt.cm.Set3(range(len(set_data)))
        
        for (set_name, results), color in zip(set_data.items(), colors):
            timestamps = [r.timestamp for r in results]
            accuracies = [r.accuracy for r in results]
            
            # Clean up set name for legend
            display_name = self._clean_set_name(set_name)
            
            ax.plot(timestamps, accuracies, 'o-', label=display_name, color=color, 
                   linewidth=2, markersize=8, alpha=0.8)
        
        # Format plot
        ax.set_xlabel('Date', fontsize=12)
        ax.set_ylabel('Accuracy (%)', fontsize=12)
        ax.set_title('Flashcard Set Accuracy Over Time', fontsize=14, fontweight='bold')
        ax.grid(True, alpha=0.3)
        ax.set_ylim(0, 105)  # Slightly above 100 for better visibility
        
        # Format dates on x-axis
        ax.xaxis.set_major_formatter(mdates.DateFormatter('%m-%d'))
        ax.xaxis.set_major_locator(mdates.DayLocator(interval=1))
        plt.setp(ax.xaxis.get_majorticklabels(), rotation=45, ha='right')
        
        # Add legend with better positioning
        if len(set_data) > 0:
            if len(set_data) <= 6:
                ax.legend(loc='lower right', fontsize=10, frameon=True, fancybox=True, shadow=True)
            else:
                ax.legend(bbox_to_anchor=(1.02, 1), loc='upper left', fontsize=9)
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"Plot saved to: {save_path}")
        
        plt.show()
    
    def _clean_set_name(self, set_name):
        """Clean up set names for better legend display."""
        # Remove common prefixes and make more readable
        name = set_name.replace('Chinese->English Foundation: ', 'CE-Found: ')
        name = name.replace('Chinese->English Vocabulary: ', 'CE-Vocab: ')
        name = name.replace('English->Chinese Foundation: ', 'EC-Found: ')
        name = name.replace('English->Chinese Vocabulary: ', 'EC-Vocab: ')
        name = name.replace('Chinese ', 'CN ')
        name = name.replace(' Recognition', ' Rec')
        name = name.replace(' Production', ' Prod')
        return name
    
    def _select_sets_for_plotting(self, set_data, max_sets):
        """Interactive set selection for plotting."""
        sets = list(set_data.keys())
        
        print(f"\nFound {len(sets)} sets. Select which ones to plot:")
        print("(You can select up to {} sets for clear visualization)\n".format(max_sets))
        
        # Group sets by category for better organization
        categories = {}
        for set_name in sets:
            if 'Foundation' in set_name:
                category = 'Foundation'
            elif 'Vocabulary' in set_name:
                category = 'Vocabulary'
            elif 'Recognition' in set_name:
                category = 'Recognition'
            else:
                category = 'Other'
            
            if category not in categories:
                categories[category] = []
            categories[category].append(set_name)
        
        # Display sets by category
        set_index = 1
        set_mapping = {}
        
        for category, category_sets in categories.items():
            print(f"--- {category} ---")
            for set_name in category_sets:
                print(f"{set_index:2d}. {self._clean_set_name(set_name)}")
                set_mapping[set_index] = set_name
                set_index += 1
            print()
        
        print("Enter set numbers separated by spaces (e.g., '1 3 5'), or:")
        print("  'all' - plot all sets")
        print(f"  'top{max_sets}' - plot {max_sets} most recently used sets")
        print("  'q' - quit")
        
        try:
            selection = input("\nYour selection: ").strip().lower()
            
            if selection == 'q':
                return {}
            elif selection == 'all':
                return set_data
            elif selection.startswith('top'):
                # Get most recently used sets
                recent_sets = sorted(set_data.items(), 
                                   key=lambda x: max(r.timestamp for r in x[1]), 
                                   reverse=True)[:max_sets]
                return dict(recent_sets)
            else:
                # Parse selected numbers
                selected_numbers = [int(x) for x in selection.split()]
                selected_sets = {}
                for num in selected_numbers:
                    if num in set_mapping:
                        set_name = set_mapping[num]
                        selected_sets[set_name] = set_data[set_name]
                
                return selected_sets
                
        except (ValueError, KeyboardInterrupt):
            print("Invalid selection.")
            return {}
    
    def plot_card_accuracy_over_time(self, set_name=None, card_pattern=None, save_path=None):
        """Plot accuracy over time for individual cards."""
        if not self.card_results:
            print("No card data found. Make sure to parse the session log first.")
            return
        
        # Filter card results
        filtered_cards = []
        for result in self.card_results:
            if set_name and set_name.lower() not in result.set_name.lower():
                continue
            if card_pattern and card_pattern.lower() not in result.question.lower():
                continue
            filtered_cards.append(result)
        
        if not filtered_cards:
            print("No matching cards found.")
            return
        
        # Group by question
        card_data = defaultdict(list)
        for result in filtered_cards:
            card_data[result.question].append(result)
        
        # Sort each card's data by timestamp
        for question in card_data:
            card_data[question].sort(key=lambda x: x.timestamp)
        
        # Calculate running accuracy for each card
        fig, ax = plt.subplots(figsize=(12, 8))
        
        colors = plt.cm.tab20(range(len(card_data)))
        
        for (question, results), color in zip(card_data.items(), colors):
            timestamps = []
            running_accuracies = []
            correct_count = 0
            total_count = 0
            
            for result in results:
                timestamps.append(result.timestamp)
                if result.correct:
                    correct_count += 1
                total_count += 1
                running_accuracy = (correct_count / total_count) * 100
                running_accuracies.append(running_accuracy)
            
            # Only plot cards with multiple attempts
            if len(results) > 1:
                ax.plot(timestamps, running_accuracies, 'o-', label=question[:30] + ('...' if len(question) > 30 else ''), 
                       color=color, linewidth=2, markersize=6)
        
        # Format plot
        ax.set_xlabel('Date', fontsize=12)
        ax.set_ylabel('Running Accuracy (%)', fontsize=12)
        title = 'Individual Card Accuracy Over Time'
        if set_name:
            title += f' - {set_name}'
        ax.set_title(title, fontsize=14, fontweight='bold')
        ax.grid(True, alpha=0.3)
        ax.set_ylim(0, 100)
        
        # Format dates on x-axis
        ax.xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m-%d'))
        ax.xaxis.set_major_locator(mdates.DayLocator(interval=1))
        plt.setp(ax.xaxis.get_majorticklabels(), rotation=45, ha='right')
        
        # Add legend
        if len(card_data) > 0:
            ax.legend(bbox_to_anchor=(1.05, 1), loc='upper left', fontsize=8)
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"Plot saved to: {save_path}")
        
        plt.show()
    
    def get_summary_stats(self):
        """Print summary statistics about the data."""
        print("=== Session Summary ===")
        print(f"Total sessions: {len(self.session_results)}")
        
        if self.session_results:
            sets = set(r.set_name for r in self.session_results)
            print(f"Unique sets: {len(sets)}")
            
            avg_accuracy = sum(r.accuracy for r in self.session_results) / len(self.session_results)
            print(f"Average accuracy: {avg_accuracy:.1f}%")
            
            date_range = (min(r.timestamp for r in self.session_results), 
                         max(r.timestamp for r in self.session_results))
            print(f"Date range: {date_range[0].date()} to {date_range[1].date()}")
        
        print(f"\nTotal card attempts: {len(self.card_results)}")
        if self.card_results:
            unique_cards = len(set(r.question for r in self.card_results))
            print(f"Unique cards practiced: {unique_cards}")

def main():
    parser = argparse.ArgumentParser(description='Plot flashcard accuracy over time')
    parser.add_argument('--mode', choices=['sets', 'cards', 'categories'], default='sets',
                       help='Plot mode: sets (individual sets), cards (individual cards), or categories (grouped by category)')
    parser.add_argument('--filter', help='Filter pattern for set names (sets mode) or card questions (cards mode)')
    parser.add_argument('--set', help='Filter by specific set name (cards mode only)')
    parser.add_argument('--save', help='Save plot to file (PNG format)')
    parser.add_argument('--log', default='session_log.txt', help='Path to session log file')
    parser.add_argument('--stats', action='store_true', help='Show summary statistics')
    parser.add_argument('--interactive', '-i', action='store_true', help='Interactive set selection (sets mode only)')
    parser.add_argument('--top', type=int, help='Show top N most recently used sets (sets mode only)', metavar='N')
    parser.add_argument('--max-sets', type=int, default=10, help='Maximum sets to plot without selection (default: 10)')
    
    args = parser.parse_args()
    
    plotter = AccuracyPlotter(args.log)
    print("Parsing session log...")
    plotter.parse_session_log()
    
    if args.stats:
        plotter.get_summary_stats()
        return
    
    if args.mode == 'categories':
        print("Plotting category-level accuracy over time...")
        plotter.plot_category_accuracy_over_time(save_path=args.save)
    elif args.mode == 'sets':
        print("Plotting set-level accuracy over time...")
        
        # Handle top-N option
        if args.top:
            # Get most recently used sets
            set_data = defaultdict(list)
            for result in plotter.session_results:
                if args.filter and args.filter.lower() not in result.set_name.lower():
                    continue
                set_data[result.set_name].append(result)
            
            recent_sets = sorted(set_data.items(), 
                               key=lambda x: max(r.timestamp for r in x[1]), 
                               reverse=True)[:args.top]
            
            print(f"Showing {len(recent_sets)} most recently used sets:")
            for i, (set_name, _) in enumerate(recent_sets, 1):
                print(f"  {i}. {plotter._clean_set_name(set_name)}")
            print()
            
            # Create filtered plotter
            filtered_results = []
            recent_set_names = {name for name, _ in recent_sets}
            for result in plotter.session_results:
                if result.set_name in recent_set_names:
                    filtered_results.append(result)
            plotter.session_results = filtered_results
            
            plotter.plot_set_accuracy_over_time(filter_pattern=args.filter, save_path=args.save, 
                                              interactive=False, max_sets=args.top)
        else:
            plotter.plot_set_accuracy_over_time(filter_pattern=args.filter, save_path=args.save, 
                                              interactive=args.interactive, max_sets=args.max_sets)
    elif args.mode == 'cards':
        print("Plotting card-level accuracy over time...")
        plotter.plot_card_accuracy_over_time(set_name=args.set, card_pattern=args.filter, save_path=args.save)

if __name__ == '__main__':
    main()