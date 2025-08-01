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

**Set Management Functions (lines 8-159)**:
- `display_set_name(set_name)`: Formats set names for display with proper capitalization
- `get_csv_filename(set_name)`: Returns CSV filename for a set (supports subdirectories)
- `list_available_sets()`: Scans for existing card set files in main directory and Ruby/ subdirectory
- `select_card_set()`: Handles set selection and creation UI with subdirectory support
- `create_new_set()`: Creates new empty card set
- `delete_set()`: Safely deletes card sets with confirmation

**Main Loop (lines 348-519)**: Interactive menu system with 7 options:
1. Select/Switch Card Set
2. Add new flashcard
3. Review all flashcards  
4. Practice difficult cards (where incorrect > correct)
5. View scores
6. Delete a card set
7. Exit

**Session Management Functions (lines 161-345)**:
- `get_all_session_results()`: Parses session log to retrieve all session data for current set
- `get_last_session_results()`: Gets the most recent session results for display
- `run_review_session(flashcards, indices_to_review, session_type)`: Core learning logic that:
  - Randomizes question order while maintaining CSV index mapping
  - Shows last session results before starting new session
  - Handles flexible answer matching (supports "A or B" format)
  - Updates statistics (correct/incorrect/reviewed counts)
  - Logs all sessions with timestamps and set information to session_log.txt
  - Displays comprehensive session history table (last 10 sessions)
  - Returns modified flashcards array for persistence

### Data Flow
1. User selects a card set (stored in `$current_set`)
2. CSV data for current set is loaded into memory as 2D array
3. Review sessions modify the in-memory data
4. Updated data is written back to the current set's CSV file
5. All user interactions are logged to session_log.txt with set information

### Multi-Set Features
- **Automatic Discovery**: Available sets are discovered by scanning for `*_flashcards.csv` files in main directory and Ruby/ subdirectory
- **Subdirectory Support**: Special handling for Ruby topic sets organized in Ruby/ subdirectory
- **Dynamic Creation**: New sets can be created through the UI
- **Safe Deletion**: Card sets can be deleted with confirmation prompts and automatic switching to remaining sets
- **Set Isolation**: Each set maintains its own statistics and progress
- **Unified Logging**: All sessions across sets are logged to a single session_log.txt file
- **Enhanced Display**: Proper capitalization and formatting for set names (e.g., "JavaScript", "Ruby")

### Answer Matching Logic
The application uses flexible answer matching that splits answers on " or " and compares sorted arrays, allowing for multiple acceptable answers per question.

### Session History & Progress Tracking
- **Last Session Display**: Shows results from the most recent session before starting a new one
- **Comprehensive Logging**: All questions, answers, and results are logged with timestamps
- **Visual Progress Table**: Multi-column table showing question-by-question results across last 10 sessions
- **Question Randomization**: Questions are presented in random order during sessions while maintaining proper result tracking
- **Session Types**: Tracks different session types ("Review All", "Practice Difficult") in logs

## Logging

- Check logs here: `session_log.txt` (created in the application directory)