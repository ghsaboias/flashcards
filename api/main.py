from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import random

from lib.set_manager import SetManager
from lib.session_tracker import SessionTracker
from lib.review_engine import ReviewEngine
from lib.practice_manager import PracticeManager
from lib.srs import SRSManager
from lib.llm_manager import LLMManager
from lib.coin_system import CoinSystem
from lib.pinyin_converter import PinyinConverter


app = FastAPI(title="Flashcards API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class StartSessionRequest(BaseModel):
    mode: str  # one of: set_all, category_all, difficult_set, difficult_category, srs_sets, srs_categories
    set_name: Optional[str] = None
    category: Optional[str] = None
    selected_sets: Optional[List[str]] = None
    selected_categories: Optional[List[str]] = None


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


# In-memory store for active web sessions (simple; replace with redis later if needed)
SESSIONS: Dict[str, WebSession] = {}


# Instantiate core singletons that read/write same files as CLI
set_manager = SetManager()
session_tracker = SessionTracker(set_manager)
coin_system = CoinSystem()
review_engine = ReviewEngine(set_manager, session_tracker, coin_system)
srs_manager = SRSManager()
llm_manager = LLMManager(session_tracker)
practice_manager = PracticeManager(set_manager, review_engine, llm_manager, srs_manager)
pinyin_converter = PinyinConverter()


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/sets")
def list_sets() -> List[str]:
    return set_manager.list_available_sets()


@app.get("/categories")
def list_categories() -> List[str]:
    return set_manager.list_categories()


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
        data = _load_category_cards(payload.category)
        cards = data["flashcards"]
        indices = list(range(len(cards)))
        practice_name = set_manager.get_category_display_name(payload.category)
    elif mode == "difficult_set":
        if not payload.set_name:
            raise HTTPException(status_code=400, detail="set_name is required for difficult_set")
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
        all_sets_data = {}
        for cat in payload.selected_categories:
            for s in set_manager.get_category_sets(cat):
                all_sets_data[s] = set_manager.load_flashcards_from_set(s)
        due_cards = srs_manager.get_due_cards(all_sets_data)
        cards = [item['card'] for item in due_cards]
        indices = list(range(len(cards)))
        mapping = {i: item['set_name'] for i, item in enumerate(due_cards)}
        practice_name = "Selected Categories"
    else:
        raise HTTPException(status_code=400, detail="invalid mode")

    # Randomize the order of questions to match CLI behavior
    if indices:
        random.shuffle(indices)

    # If we have a mapping (SRS modes), remap it from position -> set_name
    # so it matches the shuffled presentation order
    if mapping is not None and indices:
        mapping = {position: mapping[idx] for position, idx in enumerate(indices) if idx in mapping}

    session_id = str(uuid4())
    SESSIONS[session_id] = WebSession(mode=mode, cards=cards, indices=indices, card_set_mapping=mapping, practice_name=practice_name)

    # Return first card
    if not indices:
        return {"session_id": session_id, "done": True, "progress": {"current": 0, "total": 0}}

    first_idx = indices[0]
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
        is_correct = review_engine._validate_answer(payload.answer, correct_answer)

    # Update counts in-memory
    try:
        correct_count = int(row[2]) if len(row) > 2 else 0
        incorrect_count = int(row[3]) if len(row) > 3 else 0
        reviewed_count = int(row[4]) if len(row) > 4 else 0
    except ValueError:
        correct_count = incorrect_count = reviewed_count = 0

    if is_correct:
        if len(row) < 5:
            # pad to at least 5 columns
            while len(row) < 5:
                row.append("0")
        row[2] = str(correct_count + 1)
    else:
        if len(row) < 5:
            while len(row) < 5:
                row.append("0")
        row[3] = str(incorrect_count + 1)
    row[4] = str(reviewed_count + 1)

    # SRS update: choose set name (mapping for SRS sessions)
    set_name_for_srs = sess.card_set_mapping.get(sess.position, set_manager.current_set) if sess.card_set_mapping else set_manager.current_set
    srs_manager.update_srs_data(set_name_for_srs, question, correct_answer, is_correct)

    # Persist updated card to CSV for single-set or category sessions
    # For category/srs modes, we skip immediate save; a dedicated endpoint could consolidate updates if needed
    if sess.mode in ("set_all", "difficult_set") and set_manager.current_set:
        from csv import writer
        # Load full set then replace by index if applicable
        full = set_manager.load_flashcards_from_set(set_manager.current_set)
        if idx < len(full):
            full[idx] = row
            from csv import writer as _
            import csv
            with open(set_manager.get_csv_filename(set_manager.current_set), 'w', newline='', encoding='utf-8') as f:
                csv.writer(f).writerows(full)

    sess.results.append({
        "question": question,
        "user_answer": payload.answer,
        "correct_answer": correct_answer,
        "correct": is_correct,
    })

    sess.position += 1

    if sess.position >= len(sess.indices):
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


