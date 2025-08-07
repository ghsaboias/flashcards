# GEMINI.md

This file provides guidance to Gemini when working with code in this repository.

## Important Instructions for Gemini

- **ALWAYS update this GEMINI.md, CLAUDE.md, and AGENTS.md files after making any changes to the codebase**
- **ALWAYS confirm with the user before updating GEMINI.md**
- Keep this documentation current with the actual implementation

## Running the Application

```bash
python3 flashcards.py
```

## Code Architecture

Python console flashcard application with modular architecture:

### File Structure

- **flashcards.py**: Main entry point and menu loop (orchestrator)
- **lib/audio_handler.py**: Chinese text-to-speech functionality
- **lib/set_manager.py**: Set discovery, creation, deletion, category management
- **lib/session_tracker.py**: Session history parsing and tracking
- **lib/review_engine.py**: Core review session logic
- **lib/pinyin_converter.py**: Chinese pinyin conversion functionality
- **lib/llm_manager.py**: Manages LLM (collaborative learning) sessions
- **lib/practice_manager.py**: Handles different practice modes and their logic
- **lib/ui_manager.py**: Manages user interface display and input
- **convert_logs.py**: Utility to compress session logs (standalone script)

### Data Files

- **{path}\_flashcards.csv**: Card data with format: `question,answer,correct_count,incorrect_count,reviewed_count,easiness_factor,interval,reviews,next_review_date`
- **session_log.txt**: All session results with compact format

### Directory Structure

```
Recognition_Practice/
├── HSK_Level_1/ (6 sets, 25 cards each, totaling 150 official HSK1 words)
│   ├── HSK1_Set_01_flashcards.csv
│   ├── HSK1_Set_02_flashcards.csv
│   ├── HSK1_Set_03_flashcards.csv
│   ├── HSK1_Set_04_flashcards.csv
│   ├── HSK1_Set_05_flashcards.csv
│   └── HSK1_Set_06_flashcards.csv
```

## Menu Options (CLI)

1. **Practice Set**: Review all cards in current set (automatically starts in collaborative mode)
2. **Practice Category**: Review all sets in a category (automatically starts in collaborative mode)
3. **Practice Difficult Cards**: Select any set, then practice only cards with accuracy < 80% (supports collaborative mode)
4. **Practice Difficult Category**: Select a category, then practice only difficult cards (accuracy < 80%) from all sets in that category (supports collaborative mode)
5. **Practice Due Cards by Set**: Practice cards due for review based on Spaced Repetition System (SRS), filtered by selected sets
6. **Practice Due Cards by Category**: Practice cards due for review based on Spaced Repetition System (SRS), filtered by selected categories
7. **See Difficult Cards**: View cards with accuracy below 80%
8. **View Scores**: Individual card stats + session history table (last 10 sessions), and SRS data (easiness factor, interval, next review date) for each card
9. **View SRS Data by Category**: View SRS data for all cards in the currently selected category
10. **Select Set**: Choose a different flashcard set
11. **Select Category**: Choose a different flashcard category
12. **Delete Set**: Remove card set with confirmation
13. **Close LLM Session** (only shown when LLM session is active)
14. \*\*Exit"

## Key Features

### Audio Support (Chinese Sets)

- Automatic audio playback for Chinese text using macOS `say` command
- Press 'p' during questions to replay audio
- Detects Chinese characters automatically

### Answer Matching

- Supports multiple correct answers: `answer1; answer2` or `answer1 or answer2`
- Case-insensitive matching
- Flexible input handling

### Category System

- **Foundation**: Basic recognition/production practice
- **Vocabulary**: Advanced vocabulary sets
- Cross-set statistics and combined sessions

### Session Tracking

- Real-time progress display before each session
- Question-by-question history table (✓/✗ grid)
- Compact log format with timestamps and durations

### Difficult Card Tracking

- Identifies and displays cards with accuracy below 80% for the current set or a selected category.

### Paginated Set Selection

- When selecting a flashcard set, the list is now paginated, allowing users to navigate through large numbers of sets using 'N' (Next), 'P' (Previous), 'C' (Create new set), or by entering the set number.

## Development Notes

### Global State

- `current_set`: Tracks active card set (string with path if in subdirectory)
- `current_category`: Tracks active category (string)

### UI Formatting

- The main menu display in `lib/ui_manager.py` now dynamically calculates the effective terminal width, especially when an LLM session is active (assuming a 50/50 split). This ensures the "Current set" line is properly formatted and truncated if necessary to prevent text wrapping.

### Key Classes and Methods (lib/set_manager.py)

- `SetManager`: Handles set discovery, creation, deletion, category management
- `display_set_name(set_name)`: Formats set names for UI display
- `list_available_sets()`: Scans for all `*_flashcards.csv` files across directories
- `list_categories()`: Lists all available categories
- `get_category_sets(category)`: Returns sets matching category type
- `load_combined_flashcards(category)`: Merges cards from multiple sets, handling duplicates
- `load_flashcards_from_set(set_name)`: Loads flashcards from a single set.
- `select_multiple_sets()`: Interactive menu to select one or more sets.
- `select_multiple_categories()`: Interactive menu to select one or more categories.

### Key Classes and Methods (lib/review_engine.py)

- `ReviewEngine`: Core review session logic with randomization
- `run_review_session(flashcards, indices, type)`: Handles pinyin display, audio playback, answer validation, statistics updates, logging. Now includes explicit saving of SRS data at the end of each session to ensure persistence, even on abrupt exits.

### Key Classes and Methods (lib/pinyin_converter.py)

- `PinyinConverter`: Handles Chinese character to pinyin conversion
- `has_chinese_characters(text)`: Detects Chinese characters in text
- `get_pinyin_for_text(text)`: Converts Chinese characters to pinyin with tones
- `format_question_with_pinyin(question)`: Formats question with pinyin in parentheses

### Key Classes and Methods (lib/srs.py)

- `SRSManager`: Manages Spaced Repetition System (SRS) data for flashcards.
- `save_data()`: Explicitly saves the current SRS data to disk, ensuring persistence.

### Key Classes and Methods (lib/session_tracker.py)

- `SessionTracker`: Session history parsing and tracking
- `get_all_session_results()`: Parses compact log format for current set
- `get_last_session_results()`: Returns most recent session data

### Answer Validation Logic

```python
if ';' in answer or ' or ' in answer:
    correct_parts = sorted([part.strip().lower() for part in re.split(r'[;]| or ', answer)])
    user_parts = sorted([part.strip().lower() for part in user_answer.split(' or ')])
    is_correct = any(part in correct_parts for part in user_parts)
else:
    is_correct = user_answer.lower().strip() == answer.lower().strip()
```

### Session Log Format

```
> 2024-01-01 10:00:00 | Set Name | Session Type
✓ Question text (2.1s)
✗ Question text A:wrong_answer (3.4s)
< 10:05:23 67.8s 8/10
```

## Utilities

### convert_logs.py

Standalone script to compress verbose session logs:

```bash
python convert_logs.py  # Creates session_log_converted.txt + backup
```

## Logging

Session data: `session_log.txt` (compact format)

## Collaborative Learning Setup

### Persistent Session Management (Default Behavior)

**Practice Set**, **Practice Category**, **Practice Difficult Cards**, and **Practice Difficult Category** options support persistent Gemini sessions:

1. Run `python flashcards.py`
2. Choose option **1. Practice Set**, **2. Practice Category**, **3. Practice Difficult Cards**, or **4. Practice Difficult Category**
3. **First session**: Script prompts for LLM choice (Gemini/Claude/None)
4. **Subsequent sessions**: Script automatically reuses existing LLM session without prompting
5. Script automatically:
   - Detects existing Gemini Code window or launches new one
   - Reuses existing Gemini session for multi-turn conversations
   - Maintains session continuity across multiple practice sessions
   - Sends session summaries for ongoing pattern analysis
   - Preserves conversation history for better insights

### Key Methods (flashcards.py)

- `ask_use_llm()`: Prompts user for LLM choice (only when no active session)
- `start_llm_session()`: Launches new LLM session via terminal splitting
- `send_session_summary_to_llm()`: Sends post-session analysis data to active session
- `close_llm_session()`: Manually closes active LLM session (menu option 6)
- `llm_session_active`: Boolean flag tracking active session state
- Uses AppleScript for macOS terminal and window management

### Session Summary Integration

After each practice session (for all LLM-enabled options), Gemini automatically receives:

- Session type and set name
- Score and duration
- Correct/incorrect counts
- Reference to check latest session_log.txt entries for patterns
- Instruction to only respond with specific tips or important pattern observations

### Benefits

- Multi-turn conversation continuity for deeper learning insights
- Cumulative pattern recognition across sessions
- Persistent coaching context and personalized feedback
- Long-term progress tracking and trend analysis
- Efficient session reuse without repeated setup overhead
- Non-intrusive coaching (Gemini only speaks when it has valuable input)
- Focused assistance for challenging cards through difficult card practice modes

## Web App

- The web UI (in `web/`) exposes five primary actions for the selected Set or Category:

  - Start Practice
  - Practice Difficult
  - Practice SRS (starts an SRS review session using currently due cards)
  - View SRS (displays a table of SRS schedule)
  - View Stats (per-card performance table plus summary)

- View SRS table columns:

  - Question, Answer, EF (easiness factor), Interval (hours), Reps, Next Review Date

- View Stats content:

  - Per-card: Question, Answer, ✓, ✗, Attempts, Accuracy
  - Summary: Accuracy, Correct, Incorrect, Attempts, Cards, Attempted Cards, Difficult (<80%)

- API endpoints that support the Web UI:
  - `GET /srs/set?set_name=...` → returns SRS rows for a set
  - `GET /srs/category?category=...` → returns SRS rows for a category
  - `GET /stats/set?set_name=...` → returns stats summary and per-card rows for a set
  - `GET /stats/category?category=...` → returns stats summary and per-card rows for a category
