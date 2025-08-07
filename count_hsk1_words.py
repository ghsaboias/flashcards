import glob
import os
from datetime import datetime

# Load official HSK1 words
with open('/Users/guilhermesaboia/Documents/flashcards/official_hsk1_words.txt', 'r') as f:
    official_hsk1_words = set(f.read().splitlines())

# Get all current HSK1 files
current_hsk1_files = glob.glob('Recognition_Practice/HSK_Level_1/HSK1_Set_*_flashcards.csv')

# Get all backup files
backup_files = glob.glob('backup_pre_hsk_migration/Chinese->English/Foundation/*_flashcards.csv') + \
               glob.glob('backup_pre_hsk_migration/Chinese->English/Vocabulary/*_flashcards.csv') + \
               glob.glob('backup_pre_hsk_migration/English->Chinese/Foundation/*_flashcards.csv') + \
               glob.glob('backup_pre_hsk_migration/English->Chinese/Vocabulary/*_flashcards.csv')

all_flashcard_chars = set()

# Function to parse a flashcard line
def parse_card_line(line):
    parts = line.strip().split(',')
    return parts[0].strip()

# Read all flashcards and collect unique characters
for f in current_hsk1_files + backup_files:
    try:
        with open(f, 'r') as reader:
            for line in reader:
                all_flashcard_chars.add(parse_card_line(line))
    except FileNotFoundError:
        print("Warning: File not found " + f)
        continue

# Count how many official HSK1 words are in your collection
found_official_words = official_hsk1_words.intersection(all_flashcard_chars)

print("Total official HSK1 words: " + str(len(official_hsk1_words)))
print("Official HSK1 words found in your collection: " + str(len(found_official_words)))

# Clean up temporary file
try:
    os.remove('/Users/guilhermesaboia/Documents/flashcards/official_hsk1_words.txt')
except OSError as e:
    print("Error deleting temporary file: " + str(e))
