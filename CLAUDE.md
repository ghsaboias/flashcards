# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Application

Run the flashcards application:
```bash
ruby flashcards.rb
```

## Code Architecture

This is a Ruby console application for multi-set flashcard learning with the following structure:

- **flashcards.rb**: Main application file containing the interactive menu system, set management, and review logic
- **{set_name}_flashcards.csv**: Data storage files (e.g., ruby_flashcards.csv, javascript_flashcards.csv) with format: question,answer,correct_count,incorrect_count,reviewed_count
- **session_log.txt**: Automatically generated log file tracking review sessions across all sets (created when first session runs)

### Key Components

**Global State**: `$current_set` variable tracks the active card set (defaults to "ruby")

**Set Management Functions (lines 8-66)**:
- `get_csv_filename(set_name)`: Returns CSV filename for a set
- `list_available_sets()`: Scans for existing card set files
- `select_card_set()`: Handles set selection and creation UI
- `create_new_set()`: Creates new empty card set

**Main Loop (lines 124-228)**: Interactive menu system with 6 options:
1. Select/Switch Card Set
2. Add new flashcard
3. Review all flashcards  
4. Practice difficult cards (where incorrect > correct)
5. View scores
6. Exit

**Review Session Function (lines 68-121)**: Core learning logic that:
- Handles flexible answer matching (supports "A or B" format)
- Updates statistics (correct/incorrect/reviewed counts)
- Logs all sessions with timestamps and set information to session_log.txt
- Returns modified flashcards array for persistence

### Data Flow
1. User selects a card set (stored in `$current_set`)
2. CSV data for current set is loaded into memory as 2D array
3. Review sessions modify the in-memory data
4. Updated data is written back to the current set's CSV file
5. All user interactions are logged to session_log.txt with set information

### Multi-Set Features
- **Automatic Discovery**: Available sets are discovered by scanning for `*_flashcards.csv` files
- **Dynamic Creation**: New sets can be created through the UI
- **Set Isolation**: Each set maintains its own statistics and progress
- **Unified Logging**: All sessions across sets are logged to a single session_log.txt file

### Answer Matching Logic
The application uses flexible answer matching that splits answers on " or " and compares sorted arrays, allowing for multiple acceptable answers per question.

## Logging

- Check logs here: `/Users/guilhermesaboia/Documents/ruby_flashcards/session_log.txt`