# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important Instructions for Claude
- **ALWAYS update this CLAUDE.md file after making any changes to the codebase**
- **ALWAYS confirm with the user before updating CLAUDE.md**
- Keep this documentation current with the actual implementation

## Running the Application

```bash
ruby flashcards.rb
```

## Code Architecture

Ruby console flashcard application with modular architecture:

### File Structure
- **flashcards.rb**: Main entry point and menu loop
- **lib/audio_handler.rb**: Chinese text-to-speech functionality  
- **lib/set_manager.rb**: Set discovery, creation, deletion, category management
- **lib/session_tracker.rb**: Session history parsing and tracking
- **lib/review_engine.rb**: Core review session logic
- **convert_logs.rb**: Utility to compress session logs (standalone script)

### Data Files
- **{path}_flashcards.csv**: Card data with format: `question,answer,correct_count,incorrect_count,reviewed_count`
- **session_log.txt**: All session results with compact format

### Directory Structure
```
├── Chinese->English/Foundation/    # Recognition practice (C→E)
├── Chinese->English/Vocabulary/    # Recognition practice (C→E)  
├── English->Chinese/Foundation/    # Production practice (E→C)
├── English->Chinese/Vocabulary/    # Production practice (E→C)
├── Ruby/                          # Ruby topic sets
└── *.csv files                    # Main directory sets
```

## Menu Options

1. **Practice Set**: Review all cards in current set (automatically starts in collaborative mode)
2. **Practice Category**: Review all sets in a category (automatically starts in collaborative mode)
3. **Practice Difficult Cards**: Cards where incorrect ≥ correct
4. **View Scores**: Individual card stats + session history table (last 10 sessions)
5. **Delete Set**: Remove card set with confirmation
6. **Exit**

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
- **Ruby**: Programming topic sets
- Cross-set statistics and combined sessions

### Session Tracking
- Real-time progress display before each session
- Question-by-question history table (✓/✗ grid)
- Compact log format with timestamps and durations

## Development Notes

### Global State
- `$current_set`: Tracks active card set (string with path if in subdirectory)

### Key Functions (lib/set_manager.rb)
- `display_set_name(set_name)`: Formats set names for UI display
- `list_available_sets()`: Scans for all `*_flashcards.csv` files across directories
- `get_category_sets(category)`: Returns sets matching category type
- `load_combined_flashcards(category)`: Merges cards from multiple sets, handling duplicates

### Key Functions (lib/review_engine.rb)  
- `run_review_session(flashcards, indices, type)`: Core review logic with randomization
- Handles audio playback, answer validation, statistics updates, logging

### Key Functions (lib/session_tracker.rb)
- `get_all_session_results()`: Parses compact log format for current set
- `get_last_session_results()`: Returns most recent session data

### Answer Validation Logic
```ruby
if answer.include?(";") || answer.include?(" or ")
  correct_parts = answer.downcase.split(/[;]| or /).map(&:strip).sort
  user_parts = user_answer.downcase.split(" or ").map(&:strip).sort
  is_correct = user_parts.any? { |part| correct_parts.include?(part) }
else
  is_correct = user_answer.downcase.strip == answer.downcase.strip
end
```

### Session Log Format
```
> 2024-01-01 10:00:00 | Set Name | Session Type
✓ Question text (2.1s)
✗ Question text A:wrong_answer (3.4s)  
< 10:05:23 67.8s 8/10
```

## Utilities

### convert_logs.rb
Standalone script to compress verbose session logs:
```bash
ruby convert_logs.rb  # Creates session_log_converted.txt + backup
```

## Logging

Session data: `session_log.txt` (compact format)

## Collaborative Learning Setup

### Automatic Setup (Default Behavior)
**Practice Set** and **Practice Category** options now automatically start in collaborative mode:
1. Run `ruby flashcards.rb`
2. Choose option **1. Practice Set** or **2. Practice Category**
3. Script automatically:
   - Splits terminal pane using Cmd+D
   - Launches Claude Code in new pane
   - Sends initial context message to Claude
   - Continues with flashcard practice session
   - Sends session summary to Claude after completion

### Key Functions (flashcards.rb)
- `start_collaborative_mode()`: Handles automatic terminal splitting and Claude Code launch
- `send_session_summary_to_claude(session_type, set_name, score, duration)`: Sends post-session analysis data
- Called automatically before Practice Set and Practice Category sessions
- Uses AppleScript to automate setup and messaging on macOS

### Session Summary Integration
After each practice session, Claude automatically receives:
- Session type and set name
- Score and duration
- Correct/incorrect counts
- Reference to check latest session_log.txt entries for patterns
- Instruction to only respond with specific tips or important pattern observations

### Benefits
- Real-time session analysis and learning insights
- Pattern recognition for difficult concepts
- Speed and accuracy tracking
- Interface and learning strategy optimization
- Non-intrusive coaching (Claude only speaks when it has valuable input)