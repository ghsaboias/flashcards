from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import random
import csv
import time
from datetime import datetime

from lib.set_manager import SetManager
from lib.session_tracker import SessionTracker
from lib.srs import SRSManager
from lib.pinyin_converter import PinyinConverter
from lib.answer_utils import validate_answer


app = FastAPI(title="Flashcards API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class StartSessionRequest(BaseModel):
    mode: str  # one of: set_all, category_all, difficult_set, difficult_category, difficulty_set, difficulty_category, srs_sets, srs_categories
    set_name: Optional[str] = None
    category: Optional[str] = None
    selected_sets: Optional[List[str]] = None
    selected_categories: Optional[List[str]] = None
    difficulty_levels: Optional[List[str]] = None  # e.g., ["easy", "medium", "hard"]
    review_items: Optional[List[Dict[str, Any]]] = None  # for review_incorrect: [{question, answer, set_name?}]


class SubmitAnswerRequest(BaseModel):
    session_id: str
    answer: str


class WebSession:
    def __init__(self, mode: str, cards: List[List[str]], indices: List[int], card_set_mapping: Optional[Dict[int, str]] = None, practice_name: Optional[str] = None):
        self.mode = mode
        self.cards = cards
        self.indices = indices
        self.position_to_csv_index = {pos: idx for pos, idx in enumerate(indices)}
        self.position = 0
        self.results: List[Dict[str, Any]] = []
        self.card_set_mapping = card_set_mapping or {}
        self.practice_name = practice_name
        self.correct_count = 0
        # Logging/session timing
        self.session_start_time: Optional[datetime] = None
        self.question_start_time: Optional[float] = None
        self.log_name: Optional[str] = None
        self.session_type: Optional[str] = None


# In-memory store for active web sessions (simple; replace with redis later if needed)
SESSIONS: Dict[str, WebSession] = {}


# Instantiate core singletons used by the web API
set_manager = SetManager()
session_tracker = SessionTracker(set_manager)
srs_manager = SRSManager()
pinyin_converter = PinyinConverter()


# (debug logger removed)


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/sets")
def list_sets() -> List[str]:
    return set_manager.list_available_sets()


@app.get("/categories")
def list_categories() -> List[str]:
    return set_manager.list_categories()


@app.get("/pinyin")
def get_pinyin(text: str) -> Dict[str, str]:
    """Return pinyin with tones for a given text (Chinese supported)."""
    try:
        return {"pinyin": pinyin_converter.get_pinyin_for_text(text) or ""}
    except Exception:
        # Fail gracefully to empty string
        return {"pinyin": ""}


@app.get("/srs/set")
def get_srs_for_set(set_name: str) -> List[Dict[str, Any]]:
    if not set_manager.set_exists(set_name):
        raise HTTPException(status_code=404, detail="Set not found")
    cards = set_manager.load_flashcards_from_set(set_name)
    rows: List[Dict[str, Any]] = []
    for row in cards:
        if len(row) < 2:
            continue
        q, a = row[0], row[1]
        info = srs_manager.get_srs_data(set_name, q, a)
        rows.append({
            "set_name": set_name,
            "question": info.get("question", q),
            "answer": info.get("answer", a),
            "easiness_factor": info.get("easiness_factor", 2.5),
            "interval_hours": info.get("interval_hours", 0),
            "repetitions": info.get("repetitions", 0),
            "next_review_date": info.get("next_review_date", "")
        })
    return rows


@app.get("/srs/category")
def get_srs_for_category(category: str) -> List[Dict[str, Any]]:
    data = _load_category_cards(category)
    cards = data.get("flashcards", [])
    source_map = data.get("source_map", [])
    rows: List[Dict[str, Any]] = []
    for idx, row in enumerate(cards):
        if len(row) < 2:
            continue
        q, a = row[0], row[1]
        set_name = source_map[idx]["set"] if idx < len(source_map) else None
        if not set_name:
            continue
        info = srs_manager.get_srs_data(set_name, q, a)
        rows.append({
            "set_name": set_name,
            "question": info.get("question", q),
            "answer": info.get("answer", a),
            "easiness_factor": info.get("easiness_factor", 2.5),
            "interval_hours": info.get("interval_hours", 0),
            "repetitions": info.get("repetitions", 0),
            "next_review_date": info.get("next_review_date", "")
        })
    return rows


@app.get("/sets/{set_name}/cards")
def get_cards(set_name: str) -> List[List[str]]:
    if not set_manager.set_exists(set_name):
        raise HTTPException(status_code=404, detail="Set not found")
    return set_manager.load_flashcards_from_set(set_name)


def _load_category_cards(category_key: str) -> Dict[str, Any]:
    data = set_manager.load_combined_flashcards(category_key)
    return data


def _compute_stats_rows(cards: List[List[str]]) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for row in cards:
        if len(row) < 2:
            continue
        q = row[0]
        a = row[1]
        try:
            correct = int(row[2]) if len(row) > 2 else 0
            incorrect = int(row[3]) if len(row) > 3 else 0
            reviewed = int(row[4]) if len(row) > 4 else 0
        except ValueError:
            correct = 0
            incorrect = 0
            reviewed = 0
        attempts = correct + incorrect
        accuracy = round((correct / attempts) * 100, 1) if attempts > 0 else 0.0
        rows.append({
            "question": q,
            "answer": a,
            "correct": correct,
            "incorrect": incorrect,
            "total": reviewed if reviewed else attempts,
            "accuracy": accuracy,
        })
    return rows

def _classify_status_from_counts(correct: int, incorrect: int, reviewed: int) -> str:
    """Classify a card's difficulty status based on attempts and accuracy.

    Rules (aligned with web UI):
    - hard: attempts <= 10 OR accuracy <= 80
    - medium: attempts > 10 AND accuracy > 80
    - easy: attempts > 10 AND accuracy > 90
    """
    attempts = reviewed if reviewed else (correct + incorrect)
    if attempts <= 10:
        return "hard"
    accuracy = (correct / attempts) * 100 if attempts > 0 else 0.0
    if accuracy > 90:
        return "easy"
    if accuracy > 80:
        return "medium"
    return "hard"

def _summarize_stats(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    total_correct = sum(r.get("correct", 0) for r in rows)
    total_incorrect = sum(r.get("incorrect", 0) for r in rows)
    total_attempts = total_correct + total_incorrect
    accuracy = round((total_correct / total_attempts) * 100, 1) if total_attempts > 0 else 0.0
    attempted_cards = sum(1 for r in rows if (r.get("correct", 0) + r.get("incorrect", 0)) > 0)
    difficult_count = sum(1 for r in rows if (r.get("correct", 0) + r.get("incorrect", 0)) > 0 and r.get("accuracy", 0) < 80)
    return {
        "correct": total_correct,
        "incorrect": total_incorrect,
        "total": total_attempts,
        "accuracy": accuracy,
        "total_cards": len(rows),
        "attempted_cards": attempted_cards,
        "difficult_count": difficult_count,
    }


@app.get("/stats/set")
def get_stats_for_set(set_name: str) -> Dict[str, Any]:
    if not set_manager.set_exists(set_name):
        raise HTTPException(status_code=404, detail="Set not found")
    cards = set_manager.load_flashcards_from_set(set_name)
    rows = _compute_stats_rows(cards)
    summary = _summarize_stats(rows)
    return {"set_name": set_name, "summary": summary, "rows": rows}


@app.get("/stats/category")
def get_stats_for_category(category: str) -> Dict[str, Any]:
    data = _load_category_cards(category)
    cards = data.get("flashcards", [])
    rows = _compute_stats_rows(cards)
    summary = _summarize_stats(rows)
    return {"category": category, "summary": summary, "rows": rows}

def _card_payload(cards: List[List[str]], idx: int) -> Dict[str, Any]:
    q = cards[idx][0] if 0 <= idx < len(cards) and len(cards[idx]) > 0 else ""
    pinyin = pinyin_converter.get_pinyin_for_text(q) if q else ""
    return {"index": idx, "question": q, "pinyin": pinyin}

from uuid import uuid4


@app.post("/sessions/start")
def start_session(payload: StartSessionRequest) -> Dict[str, Any]:
    mode = payload.mode
    cards: List[List[str]] = []
    indices: List[int] = []
    mapping: Optional[Dict[int, str]] = None
    practice_name: Optional[str] = None

    if mode == "set_all":
        if not payload.set_name:
            raise HTTPException(status_code=400, detail="set_name is required for set_all")
        set_manager.current_set = payload.set_name
        set_manager.save_current_set()
        cards = set_manager.load_flashcards_from_set(payload.set_name)
        indices = list(range(len(cards)))
    elif mode == "category_all":
        if not payload.category:
            raise HTTPException(status_code=400, detail="category is required for category_all")
        # Track current category for consistency with CLI behavior and logging context
        set_manager.current_category = payload.category
        set_manager.save_current_category()
        data = _load_category_cards(payload.category)
        cards = data["flashcards"]
        indices = list(range(len(cards)))
        # Map combined-card positions back to their source set for persistence
        try:
            source_map = data.get("source_map", [])
            mapping = {i: (source_map[i]["set"] if i < len(source_map) else None) for i in range(len(cards))}
            # Also track original indices for precise persistence
            source_index_map = {i: (source_map[i]["set"], source_map[i]["original_index"]) for i in range(len(cards)) if i < len(source_map)}
        except Exception:
            mapping = None
            source_index_map = None
        practice_name = set_manager.get_category_display_name(payload.category)
    elif mode == "difficult_set":
        if not payload.set_name:
            raise HTTPException(status_code=400, detail="set_name is required for difficult_set")
        # Ensure current set is tracked for persistence
        set_manager.current_set = payload.set_name
        set_manager.save_current_set()
        all_cards = set_manager.load_flashcards_from_set(payload.set_name)
        difficult = []
        for i, row in enumerate(all_cards):
            if len(row) >= 5:
                try:
                    correct = int(row[2]); incorrect = int(row[3])
                    attempts = correct + incorrect
                    if attempts > 0 and (correct / attempts) * 100 < 80:
                        difficult.append(i)
                except ValueError:
                    continue
        cards = all_cards
        indices = difficult
    elif mode == "difficult_category":
        if not payload.category:
            raise HTTPException(status_code=400, detail="category is required for difficult_category")
        # Track current category selection
        set_manager.current_category = payload.category
        set_manager.save_current_category()
        data = _load_category_cards(payload.category)
        cards = data["flashcards"]
        difficult = []
        for i, row in enumerate(cards):
            if len(row) >= 5:
                try:
                    correct = int(row[2]); incorrect = int(row[3])
                    attempts = correct + incorrect
                    if attempts > 0 and (correct / attempts) * 100 < 80:
                        difficult.append(i)
                except ValueError:
                    continue
        indices = difficult
        # Map combined-card positions back to their source set for persistence
        try:
            source_map = data.get("source_map", [])
            mapping = {i: (source_map[i]["set"] if i < len(source_map) else None) for i in range(len(cards))}
            source_index_map = {i: (source_map[i]["set"], source_map[i]["original_index"]) for i in range(len(cards)) if i < len(source_map)}
        except Exception:
            mapping = None
            source_index_map = None
        practice_name = f"{set_manager.get_category_display_name(payload.category)} (Difficult)"
        
    elif mode == "srs_sets":
        if not payload.selected_sets:
            raise HTTPException(status_code=400, detail="selected_sets is required for srs_sets")
        all_sets_data = {}
        for s in payload.selected_sets:
            all_sets_data[s] = set_manager.load_flashcards_from_set(s)
        due_cards = srs_manager.get_due_cards(all_sets_data)
        cards = [item['card'] for item in due_cards]
        indices = list(range(len(cards)))
        mapping = {i: item['set_name'] for i, item in enumerate(due_cards)}
        practice_name = "Selected Sets"
    elif mode == "srs_categories":
        if not payload.selected_categories:
            raise HTTPException(status_code=400, detail="selected_categories is required for srs_categories")
        # Persist the last used category if a single one is provided
        try:
            if payload.selected_categories and len(payload.selected_categories) == 1:
                set_manager.current_category = payload.selected_categories[0]
                set_manager.save_current_category()
        except Exception:
            pass
        all_sets_data = {}
        for cat in payload.selected_categories:
            for s in set_manager.get_category_sets(cat):
                all_sets_data[s] = set_manager.load_flashcards_from_set(s)
        due_cards = srs_manager.get_due_cards(all_sets_data)
        cards = [item['card'] for item in due_cards]
        indices = list(range(len(cards)))
        mapping = {i: item['set_name'] for i, item in enumerate(due_cards)}
        practice_name = "Selected Categories"
    elif mode == "difficulty_set":
        if not payload.set_name:
            raise HTTPException(status_code=400, detail="set_name is required for difficulty_set")
        if not payload.difficulty_levels:
            raise HTTPException(status_code=400, detail="difficulty_levels is required for difficulty_set")
        requested = {d.lower() for d in payload.difficulty_levels}
        set_manager.current_set = payload.set_name
        set_manager.save_current_set()
        all_cards = set_manager.load_flashcards_from_set(payload.set_name)
        filtered: List[int] = []
        for i, row in enumerate(all_cards):
            try:
                c = int(row[2]) if len(row) > 2 else 0
                ic = int(row[3]) if len(row) > 3 else 0
                rv = int(row[4]) if len(row) > 4 else 0
            except (ValueError, IndexError):
                c = ic = rv = 0
            status = _classify_status_from_counts(c, ic, rv)
            if status in requested:
                filtered.append(i)
        cards = all_cards
        indices = filtered
        practice_name = set_manager.display_set_name(payload.set_name)
    elif mode == "difficulty_category":
        if not payload.category:
            raise HTTPException(status_code=400, detail="category is required for difficulty_category")
        if not payload.difficulty_levels:
            raise HTTPException(status_code=400, detail="difficulty_levels is required for difficulty_category")
        # Track current category selection
        set_manager.current_category = payload.category
        set_manager.save_current_category()
        requested = {d.lower() for d in payload.difficulty_levels}
        data = _load_category_cards(payload.category)
        cards = data["flashcards"]
        filtered: List[int] = []
        for i, row in enumerate(cards):
            try:
                c = int(row[2]) if len(row) > 2 else 0
                ic = int(row[3]) if len(row) > 3 else 0
                rv = int(row[4]) if len(row) > 4 else 0
            except (ValueError, IndexError):
                c = ic = rv = 0
            status = _classify_status_from_counts(c, ic, rv)
            if status in requested:
                filtered.append(i)
        indices = filtered
        # Map combined-card positions back to their source set for persistence
        try:
            source_map = data.get("source_map", [])
            mapping = {i: (source_map[i]["set"] if i < len(source_map) else None) for i in range(len(cards))}
            source_index_map = {i: (source_map[i]["set"], source_map[i]["original_index"]) for i in range(len(cards)) if i < len(source_map)}
        except Exception:
            mapping = None
            source_index_map = None
        practice_name = f"{set_manager.get_category_display_name(payload.category)} (Filtered)"
    elif mode == "review_incorrect":
        # Build a session from client-provided incorrect items
        if not payload.review_items:
            raise HTTPException(status_code=400, detail="review_items is required for review_incorrect")
        items = [it for it in payload.review_items if isinstance(it, dict) and it.get("question") and it.get("answer")]
        if not items:
            return {"session_id": str(uuid4()), "done": True, "progress": {"current": 0, "total": 0}}
        cards = [[it["question"], it["answer"]] for it in items]
        indices = list(range(len(cards)))
        # Optional mapping for SRS persistence if set_name provided per item
        mapping = {i: it["set_name"] for i, it in enumerate(items) if it.get("set_name")}
        practice_name = "Review Incorrect"
    else:
        raise HTTPException(status_code=400, detail="invalid mode")

    # Randomize the order of questions to match CLI behavior
    if indices:
        random.shuffle(indices)

    # If we have a mapping (SRS modes), remap it from position -> set_name
    # so it matches the shuffled presentation order
    if mapping is not None and indices:
        mapping = {position: mapping[idx] for position, idx in enumerate(indices) if idx in mapping}
    # Remap original index mapping to shuffled positions as well
    try:
        if indices and (source_index_map is not None):
            source_index_map = {position: source_index_map[idx] for position, idx in enumerate(indices) if idx in source_index_map}
            
    except Exception:
        source_index_map = None

    session_id = str(uuid4())
    SESSIONS[session_id] = WebSession(mode=mode, cards=cards, indices=indices, card_set_mapping=mapping, practice_name=practice_name)

    # Attach category key for category-based sessions so we can propagate updates across sets
    try:
        if mode in ("category_all", "difficult_category", "difficulty_category"):
            if getattr(payload, "category", None):
                setattr(SESSIONS[session_id], "category_key", payload.category)
            if 'source_index_map' in locals() and source_index_map is not None:
                setattr(SESSIONS[session_id], "source_index_map", source_index_map)
    except Exception:
        pass

    # Return first card
    if not indices:
        return {"session_id": session_id, "done": True, "progress": {"current": 0, "total": 0}}

    # Prepare logging details to mirror CLI session_log.txt format
    sess = SESSIONS[session_id]
    # Map mode -> session type label
    session_type_map = {
        "set_all": "Review All",
        "category_all": "Category Review",
        "difficult_set": "Practice Difficult",
        "difficult_category": "Difficult Category Review",
        "srs_sets": "SRS Review",
        "srs_categories": "SRS Review",
        "difficulty_set": "Practice by Difficulty",
        "difficulty_category": "Practice by Difficulty",
        "review_incorrect": "Review Incorrect",
    }
    session_type = session_type_map.get(mode, mode)
    # Determine log name (set display name or category/practice label)
    log_name = practice_name or set_manager.display_set_name(set_manager.current_set)
    # Clean up any difficult suffix for category logs to keep name clean
    if ("Category" in session_type) and isinstance(log_name, str) and log_name.endswith(" (Difficult)"):
        log_name = log_name.rsplit(" (Difficult)", 1)[0]

    # Set timing and write session header
    sess.session_start_time = datetime.now()
    sess.session_type = session_type
    sess.log_name = log_name
    
    try:
        with open("session_log.txt", "a", encoding="utf-8") as f:
            f.write(f"> {sess.session_start_time.strftime('%Y-%m-%d %H:%M:%S')} | {log_name} | {session_type}\n")
    except Exception:
        # Do not interrupt session if logging fails
        pass

    first_idx = indices[0]
    # Start timer for first question
    sess.question_start_time = time.time()
    return {
        "session_id": session_id,
        "done": False,
        "card": _card_payload(cards, first_idx),
        "progress": {"current": 0, "total": len(indices)}
    }


@app.get("/sessions/{session_id}")
def get_session(session_id: str) -> Dict[str, Any]:
    sess = SESSIONS.get(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="session not found")
    done = sess.position >= len(sess.indices)
    current_q = None
    if not done:
        idx = sess.indices[sess.position]
        current_q = sess.cards[idx][0]
    return {
        "done": done,
        "progress": {"current": min(sess.position, len(sess.indices)), "total": len(sess.indices)},
        "current_question": current_q,
        "results": sess.results,
    }


@app.post("/sessions/{session_id}/answer")
def submit_answer(session_id: str, payload: SubmitAnswerRequest) -> Dict[str, Any]:
    sess = SESSIONS.get(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="session not found")

    if sess.position >= len(sess.indices):
        return {"done": True, "progress": {"current": len(sess.indices), "total": len(sess.indices)}, "results": sess.results}

    idx = sess.indices[sess.position]
    row = sess.cards[idx]
    if len(row) < 2:
        is_correct = False
        correct_answer = ""
        question = row[0] if row else ""
    else:
        question = row[0]
        correct_answer = row[1]
        is_correct = validate_answer(payload.answer, correct_answer)

    # Update counts in-memory
    try:
        correct_count = int(row[2]) if len(row) > 2 else 0
        incorrect_count = int(row[3]) if len(row) > 3 else 0
        reviewed_count = int(row[4]) if len(row) > 4 else 0
    except ValueError:
        correct_count = incorrect_count = reviewed_count = 0

    # Compute duration since question was shown
    now_ts = time.time()
    question_duration = round(now_ts - sess.question_start_time, 1) if sess.question_start_time else 0.0

    if is_correct:
        if len(row) < 5:
            # pad to at least 5 columns
            while len(row) < 5:
                row.append("0")
        row[2] = str(correct_count + 1)
        sess.correct_count += 1
    else:
        if len(row) < 5:
            while len(row) < 5:
                row.append("0")
        row[3] = str(incorrect_count + 1)
    row[4] = str(reviewed_count + 1)
    
    # Determine precise source set/index for this presented position
    target_set_name: Optional[str] = None
    source_idx: Optional[int] = None
    # Prefer exact mapping captured at session start for category sessions
    try:
        if hasattr(sess, 'source_index_map') and sess.source_index_map is not None:
            pair = sess.source_index_map.get(sess.position)
            if pair and isinstance(pair, tuple) and len(pair) == 2:
                target_set_name, source_idx = pair[0], pair[1]
                
    except Exception:
        target_set_name = None
        source_idx = None

    # Fallback to set mapping (e.g., SRS sessions)
    if target_set_name is None:
        if sess.card_set_mapping:
            target_set_name = sess.card_set_mapping.get(sess.position)
            
        if not target_set_name:
            target_set_name = set_manager.current_set
            

    # SRS update only during SRS practice modes
    if target_set_name and sess.mode in ("srs_sets", "srs_categories"):
        srs_manager.update_srs_data(target_set_name, question, correct_answer, is_correct)
        

    # Persist updated card to CSV for single-set or category sessions
    # For category/srs modes, we skip immediate save; a dedicated endpoint could consolidate updates if needed
    if sess.mode in ("set_all", "difficult_set", "difficulty_set") and set_manager.current_set:
        # Load full set then replace by index if applicable
        full = set_manager.load_flashcards_from_set(set_manager.current_set)
        if idx < len(full):
            full[idx] = row
            with open(set_manager.get_csv_filename(set_manager.current_set), 'w', newline='', encoding='utf-8') as f:
                csv.writer(f).writerows(full)
            

    # Write per-question log line mirroring CLI
    try:
        with open("session_log.txt", "a", encoding="utf-8") as f:
            if is_correct:
                f.write(f"✓ {question} ({question_duration}s)\n")
            else:
                f.write(f"✗ {question} A:{payload.answer} C:{correct_answer} ({question_duration}s)\n")
    except Exception:
        pass

    sess.results.append({
        "question": question,
        "pinyin": pinyin_converter.get_pinyin_for_text(question),
        "user_answer": payload.answer,
        "correct_answer": correct_answer,
        "correct": is_correct,
    })

    # Persist updated counts for SRS/review/category modes
    # Prefer precise source index mapping (category variants), fallback to Q/A match otherwise
    if sess.mode in ("srs_sets", "srs_categories", "review_incorrect", "category_all", "difficult_category", "difficulty_category"):
        try:
            # If we know exact set/index, update that set directly
            if target_set_name:
                csv_path = set_manager.get_csv_filename(target_set_name)
                
            existing_cards: List[List[str]] = []
            with open(csv_path, 'r', newline='', encoding='utf-8') as f:
                reader = csv.reader(f)
                existing_cards = list(reader)

            def ensure_counts(row: List[str]) -> List[str]:
                while len(row) < 5:
                    row.append("0")
                return row

            def apply_update(row: List[str]) -> List[str]:
                row = ensure_counts(row)
                try:
                    ex_correct = int(row[2])
                    ex_incorrect = int(row[3])
                    ex_reviewed = int(row[4])
                except ValueError:
                    ex_correct = ex_incorrect = ex_reviewed = 0
                if is_correct:
                    row[2] = str(ex_correct + 1)
                else:
                    row[3] = str(ex_incorrect + 1)
                row[4] = str(ex_reviewed + 1)
                return row

            updated = False
            if source_idx is not None and 0 <= source_idx < len(existing_cards):
                existing_cards[source_idx] = apply_update(existing_cards[source_idx])
                updated = True
                
            else:
                # Fallback: find by exact question/answer match in the resolved set
                for j, existing in enumerate(existing_cards):
                    if len(existing) >= 2 and existing[0] == question and existing[1] == correct_answer:
                        existing_cards[j] = apply_update(existing)
                        updated = True
                        
                        break

            if updated:
                with open(csv_path, 'w', newline='', encoding='utf-8') as f:
                    writer = csv.writer(f)
                    writer.writerows(existing_cards)
                
            else:
                # As a last resort in category modes, search all sets in this category for a match and update
                if hasattr(sess, 'category_key') and sess.category_key:
                    
                    for set_name in set_manager.get_category_sets(sess.category_key):
                        csv_path2 = set_manager.get_csv_filename(set_name)
                        try:
                            with open(csv_path2, 'r', newline='', encoding='utf-8') as f2:
                                reader2 = csv.reader(f2)
                                rows2 = list(reader2)
                            found2 = False
                            for j, existing in enumerate(rows2):
                                if len(existing) >= 2 and existing[0] == question and existing[1] == correct_answer:
                                    rows2[j] = apply_update(existing)
                                    found2 = True
                                    
                                    break
                            if found2:
                                with open(csv_path2, 'w', newline='', encoding='utf-8') as f2:
                                    writer2 = csv.writer(f2)
                                    writer2.writerows(rows2)
                                
                                break
                        except Exception as e:
                            continue

        except Exception as e:
            # Non-fatal if persistence fails
            pass

    sess.position += 1

    if sess.position >= len(sess.indices):
        # Write session summary footer
        end_time = datetime.now()
        total_duration = round((end_time - sess.session_start_time).total_seconds(), 1) if sess.session_start_time else 0.0
        try:
            with open("session_log.txt", "a", encoding="utf-8") as f:
                f.write(f"< {end_time.strftime('%H:%M:%S')} {total_duration}s {sess.correct_count}/{len(sess.indices)}\n")
                f.write("\n")
        except Exception:
            pass

        return {
            "done": True,
            "progress": {"current": len(sess.indices), "total": len(sess.indices)},
            "result": {
                "correct": sum(1 for r in sess.results if r["correct"]),
                "total": len(sess.results)
            },
            "results": sess.results
        }

    next_idx = sess.indices[sess.position]
    # Start timer for next question
    sess.question_start_time = time.time()
    return {
        "done": False,
        "card": _card_payload(sess.cards, next_idx),
        "progress": {"current": sess.position, "total": len(sess.indices)},
        "evaluation": {
            "question": question,
            "correct": is_correct,
            "correct_answer": correct_answer
        },
        "results": sess.results
    }


