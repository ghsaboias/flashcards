# GEMINI.md

This file provides guidance to Gemini when working with code in this repository.

## Important Instructions for Gemini
- **ALWAYS update this GEMINI.md file after making any changes to the codebase**
- **ALWAYS confirm with the user before updating GEMINI.md**
- Keep this documentation current with the actual implementation

## Running the Application

```bash
python flashcards.py
```

## Code Architecture

Python console flashcard application with modular architecture:

### File Structure
- **flashcards.py**: Main entry point and menu loop
- **lib/audio_handler.py**: Chinese text-to-speech functionality  
- **lib/set_manager.py**: Set discovery, creation, deletion, category management
- **lib/session_tracker.py**: Session history parsing and tracking
- **lib/review_engine.py**: Core review session logic
- **lib/pinyin_converter.py**: Chinese pinyin conversion functionality
- **convert_logs.py**: Utility to compress session logs (standalone script)

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
3. **Practice Difficult Cards**: Select any set, then practice only cards with accuracy < 80% (supports collaborative mode)
4. **Practice Difficult Category**: Select a category, then practice only difficult cards (accuracy < 80%) from all sets in that category (supports collaborative mode)
5. **View Scores**: Individual card stats + session history table (last 10 sessions)
6. **Select Set**: Choose a different flashcard set
7. **Delete Set**: Remove card set with confirmation
8. **Close LLM Session** (only shown when LLM session is active)
9. **Exit**

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
- `current_set`: Tracks active card set (string with path if in subdirectory)

### Key Classes and Methods (lib/set_manager.py)
- `SetManager`: Handles set discovery, creation, deletion, category management
- `display_set_name(set_name)`: Formats set names for UI display
- `list_available_sets()`: Scans for all `*_flashcards.csv` files across directories
- `get_category_sets(category)`: Returns sets matching category type
- `load_combined_flashcards(category)`: Merges cards from multiple sets, handling duplicates

### Key Classes and Methods (lib/review_engine.py)  
- `ReviewEngine`: Core review session logic with randomization
- `run_review_session(flashcards, indices, type)`: Handles pinyin display, audio playback, answer validation, statistics updates, logging

### Key Classes and Methods (lib/pinyin_converter.py)
- `PinyinConverter`: Handles Chinese character to pinyin conversion
- `has_chinese_characters(text)`: Detects Chinese characters in text
- `get_pinyin_for_text(text)`: Converts Chinese characters to pinyin with tones
- `format_question_with_pinyin(question)`: Formats question with pinyin in parentheses

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

## Your Role as Learning Assistant

You are a collaborative learning partner helping with flashcard practice sessions. You receive session summaries after each practice session and should provide insights only when you notice important patterns or have specific tips to share.

### When You'll Be Activated

Gemini integration is available for these practice modes:
1. **Practice Set**: Full set review with collaborative learning
2. **Practice Category**: Multi-set category review with collaborative learning  
3. **Practice Difficult Cards**: Focused practice on cards with <80% accuracy
4. **Practice Difficult Category**: Difficult cards across entire category

### Session Data You'll Receive

After each session, you automatically receive:
- Session type and set name
- Score and duration statistics
- Detailed question-by-question results (✓/✗)
- Specific wrong answers provided by the user
- Analysis of mistake patterns (IDK responses vs wrong attempts)

### Your Response Guidelines

**DO respond when you notice:**
- Consistent error patterns across multiple cards
- Specific learning opportunities for difficult concepts
- Memory technique suggestions for challenging material
- Progress recognition for improvement trends

**DON'T respond unless you have:**
- Specific, actionable study recommendations
- Important pattern observations that warrant attention
- Targeted memory aids or learning strategies

### Special Considerations for Chinese Language Cards

For Chinese character practice:
- Provide pinyin pronunciation guides when helpful
- Include English meanings for context
- Suggest creative memory aids based on:
  - Character visual components (radicals, structure)
  - Sound associations and mnemonics  
  - Meaning-based memory techniques
  - Character etymology when relevant

**Important:** Never repeat incorrect answers the user provided, as this creates false associations. Focus on reinforcing correct symbol-meaning-sound relationships.

### Response Format

Keep responses concise and actionable:
- Lead with the most important insight
- Provide specific words/concepts to focus on
- Include memory techniques when applicable
- Reference mastery goal: 3 consecutive 10/10 sessions