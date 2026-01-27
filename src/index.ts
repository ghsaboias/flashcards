import { sm2, getDueDate, DEFAULT_STATE, Grade } from "./lib/sm2";
import { version as VERSION } from "../package.json";

interface Env {
  DB: D1Database;
}

type Card = {
  id: number;
  deck_id: number;
  front: string;
  back: string;
};

type ReviewState = {
  card_id: number;
  interval: number;
  repetition: number;
  efactor: number;
  due_date: string;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Simple router
    try {
      // GET / - homepage UI
      if (method === "GET" && path === "/") {
        const { results: decks } = await env.DB.prepare(`
          SELECT d.*, COUNT(c.id) as card_count,
            (SELECT COUNT(*) FROM cards c2
             LEFT JOIN review_state rs ON rs.card_id = c2.id AND rs.user_id = 'default'
             WHERE c2.deck_id = d.id AND (rs.due_date IS NULL OR rs.due_date <= date('now'))
            ) as due_count
          FROM decks d
          LEFT JOIN cards c ON c.deck_id = d.id
          GROUP BY d.id
        `).all();

        return html(renderHome(decks as any[]));
      }

      // GET /study/:id - study deck UI
      const studyMatch = path.match(/^\/study\/(\d+)$/);
      if (method === "GET" && studyMatch) {
        const deckId = studyMatch[1];
        const deck = await env.DB.prepare("SELECT * FROM decks WHERE id = ?").bind(deckId).first();
        if (!deck) return html("<h1>Deck not found</h1>", 404);
        return html(renderStudy(deck as any));
      }

      // GET /decks - list all decks
      if (method === "GET" && path === "/decks") {
        const { results } = await env.DB.prepare(
          "SELECT * FROM decks"
        ).all();
        return json(results);
      }

      // GET /decks/:id/review - get due cards for review
      const reviewMatch = path.match(/^\/decks\/(\d+)\/review$/);
      if (method === "GET" && reviewMatch) {
        const deckId = reviewMatch[1];
        const today = new Date().toISOString().split("T")[0];

        const { results } = await env.DB.prepare(`
          SELECT c.*, rs.interval, rs.repetition, rs.efactor, rs.due_date
          FROM cards c
          LEFT JOIN review_state rs ON rs.card_id = c.id AND rs.user_id = 'default'
          WHERE c.deck_id = ?
            AND (rs.due_date IS NULL OR rs.due_date <= ?)
          ORDER BY rs.due_date ASC NULLS FIRST
          LIMIT 20
        `).bind(deckId, today).all();

        return json(results);
      }

      // POST /cards/:id/answer - submit answer grade
      const answerMatch = path.match(/^\/cards\/(\d+)\/answer$/);
      if (method === "POST" && answerMatch) {
        const cardId = parseInt(answerMatch[1]);
        const body = await request.json() as { grade: number };
        const grade = body.grade as Grade;

        if (grade < 0 || grade > 5) {
          return json({ error: "Grade must be 0-5" }, 400);
        }

        // Get current state or use defaults
        const existing = await env.DB.prepare(`
          SELECT interval, repetition, efactor
          FROM review_state
          WHERE card_id = ? AND user_id = 'default'
        `).bind(cardId).first<ReviewState>();

        const current = existing || DEFAULT_STATE;
        const next = sm2(current, grade);
        const dueDate = getDueDate(next.interval);

        // Upsert review state
        await env.DB.prepare(`
          INSERT INTO review_state (card_id, user_id, interval, repetition, efactor, due_date)
          VALUES (?, 'default', ?, ?, ?, ?)
          ON CONFLICT(card_id, user_id) DO UPDATE SET
            interval = excluded.interval,
            repetition = excluded.repetition,
            efactor = excluded.efactor,
            due_date = excluded.due_date
        `).bind(cardId, next.interval, next.repetition, next.efactor, dueDate).run();

        return json({ ...next, due_date: dueDate });
      }

      return json({ error: "Not found" }, 404);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return json({ error: message }, 500);
    }
  },
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function html(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function renderHome(decks: { id: number; name: string; type: string; card_count: number; due_count: number }[]): string {
  const deckList = decks.map(d => `
    <a href="/study/${d.id}" class="deck">
      <h2>${d.name}</h2>
      <p>${d.due_count} due / ${d.card_count} total</p>
    </a>
  `).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flashcards</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #fafafa; min-height: 100vh; padding: 2rem; position: relative; }
    .version { position: absolute; top: 1rem; right: 1rem; color: #444; font-size: 0.75rem; }
    h1 { margin-bottom: 2rem; }
    .decks { display: grid; gap: 1rem; max-width: 600px; }
    .deck { display: block; padding: 1.5rem; background: #1a1a1a; border-radius: 8px; text-decoration: none; color: inherit; transition: background 0.2s; }
    .deck:hover { background: #252525; }
    .deck h2 { font-size: 1.25rem; margin-bottom: 0.5rem; }
    .deck p { color: #888; }
  </style>
</head>
<body>
  <span class="version">v${VERSION}</span>
  <h1>Flashcards</h1>
  <div class="decks">${deckList}</div>
</body>
</html>`;
}

function renderStudy(deck: { id: number; name: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${deck.name} - Flashcards</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #fafafa; min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 2rem; }
    header { width: 100%; max-width: 600px; margin-bottom: 2rem; display: flex; align-items: center; gap: 1rem; }
    header a { color: #888; text-decoration: none; }
    header a:hover { color: #fff; }
    h1 { font-size: 1.5rem; }
    .card-container { width: 100%; max-width: 600px; height: 300px; perspective: 1000px; cursor: pointer; }
    .card { width: 100%; height: 100%; position: relative; transform-style: preserve-3d; transition: transform 0.5s; }
    .card.flipped { transform: rotateY(180deg); }
    .card-face { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; background: #1a1a1a; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem; }
    .card-back { transform: rotateY(180deg); background: #1a2a1a; }
    .card-content { font-size: 2rem; text-align: center; }
    .card-content img { max-width: 200px; max-height: 150px; }
    .card-hint { color: #666; margin-top: 1rem; font-size: 0.875rem; }
    .answer-input { width: 100%; max-width: 600px; margin-top: 1rem; }
    .answer-input input { width: 100%; padding: 1rem; font-size: 1.25rem; border: 2px solid #333; border-radius: 8px; background: #1a1a1a; color: #fafafa; text-align: center; }
    .answer-input input:focus { outline: none; border-color: #60a5fa; }
    .result { margin-top: 1.5rem; width: 100%; max-width: 600px; }
    .result-row { display: flex; gap: 1rem; margin-bottom: 0.5rem; align-items: center; }
    .result-label { width: 80px; color: #888; font-size: 0.875rem; }
    .result-value { font-size: 1.25rem; }
    .result-value.correct { color: #4ade80; }
    .result-value.incorrect { color: #f87171; }
    .result-value.actual { color: #60a5fa; }
    .grades { display: flex; gap: 1.5rem; margin-top: 1.5rem; width: 100%; max-width: 600px; }
    .grade-group { flex: 1; display: flex; flex-direction: column; gap: 0.5rem; }
    .grade-group-label { font-size: 0.75rem; color: #666; text-align: center; text-transform: uppercase; letter-spacing: 0.05em; }
    .grade-buttons { display: flex; gap: 0.5rem; }
    .grade-buttons button { flex: 1; padding: 1rem; border: none; border-radius: 8px; font-size: 0.875rem; cursor: pointer; transition: opacity 0.2s; }
    .grade-buttons button:hover { opacity: 0.8; }
    .grade-0 { background: #dc2626; color: white; }
    .grade-2 { background: #f97316; color: white; }
    .grade-3 { background: #ca8a04; color: white; }
    .grade-4 { background: #65a30d; color: white; }
    .grade-5 { background: #16a34a; color: white; }
    .done { text-align: center; }
    .done h2 { margin-bottom: 1rem; }
    .done a { color: #60a5fa; }
  </style>
</head>
<body>
  <header>
    <a href="/">← Back</a>
    <h1>${deck.name}</h1>
  </header>
  <div class="card-container" onclick="reveal()">
    <div class="card" id="card">
      <div class="card-face card-front">
        <div class="card-content" id="frontContent">Loading...</div>
        <div class="card-hint">Click to reveal</div>
      </div>
      <div class="card-face card-back">
        <div class="card-content" id="backContent"></div>
      </div>
    </div>
  </div>
  <div class="answer-input" id="answerInput" style="display: none;">
    <input type="text" id="userAnswer" placeholder="Type your answer..." autocomplete="off">
  </div>
  <div class="result" id="result" style="display: none;">
    <div class="result-row">
      <span class="result-label">Yours:</span>
      <span class="result-value" id="yourAnswer"></span>
    </div>
    <div class="result-row">
      <span class="result-label">Correct:</span>
      <span class="result-value actual" id="correctAnswer"></span>
    </div>
  </div>
  <div class="grades" id="grades" style="display: none;">
    <div class="grade-group">
      <div class="grade-group-label">Incorrect</div>
      <div class="grade-buttons">
        <button class="grade-0" onclick="answer(0)">Blackout</button>
        <button class="grade-2" onclick="answer(2)">Recognized</button>
      </div>
    </div>
    <div class="grade-group">
      <div class="grade-group-label">Correct</div>
      <div class="grade-buttons">
        <button class="grade-3" onclick="answer(3)">Hard</button>
        <button class="grade-4" onclick="answer(4)">Medium</button>
        <button class="grade-5" onclick="answer(5)">Easy</button>
      </div>
    </div>
  </div>
  <script>
    let cards = [];
    let current = 0;
    let revealed = false;

    const input = document.getElementById('userAnswer');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !revealed) reveal();
    });

    async function load() {
      const res = await fetch('/decks/${deck.id}/review');
      cards = await res.json();
      if (cards.length === 0) {
        document.querySelector('.card-container').innerHTML = '<div class="done" style="padding:2rem;text-align:center;"><h2>All done!</h2><p>No cards due for review.</p><p><a href="/">← Back to decks</a></p></div>';
        return;
      }
      show();
    }

    function show() {
      if (current >= cards.length) {
        document.querySelector('.card-container').innerHTML = '<div class="done" style="padding:2rem;text-align:center;"><h2>Session complete!</h2><p><a href="/">← Back to decks</a></p></div>';
        document.getElementById('grades').style.display = 'none';
        document.getElementById('answerInput').style.display = 'none';
        document.getElementById('result').style.display = 'none';
        return;
      }
      const card = cards[current];
      const isImage = card.front.startsWith('http');
      const cardEl = document.getElementById('card');
      cardEl.style.transition = 'none';
      cardEl.classList.remove('flipped');
      cardEl.offsetHeight; // force reflow
      cardEl.style.transition = '';
      document.getElementById('frontContent').innerHTML = isImage ? '<img src="' + card.front + '">' : card.front;
      document.getElementById('backContent').textContent = card.back;
      document.getElementById('answerInput').style.display = 'block';
      document.getElementById('result').style.display = 'none';
      document.getElementById('grades').style.display = 'none';
      input.value = '';
      input.focus();
      revealed = false;
    }

    function normalize(s) {
      return s.toLowerCase().trim().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
    }

    function reveal() {
      if (revealed || current >= cards.length) return;
      revealed = true;
      const card = cards[current];
      const userVal = input.value;
      const correctVal = card.back;
      const isMatch = normalize(userVal) === normalize(correctVal);

      document.getElementById('card').classList.add('flipped');
      document.getElementById('yourAnswer').textContent = userVal || '(empty)';
      document.getElementById('yourAnswer').className = 'result-value ' + (isMatch ? 'correct' : 'incorrect');
      document.getElementById('correctAnswer').textContent = correctVal;
      document.getElementById('answerInput').style.display = 'none';
      document.getElementById('result').style.display = 'block';
      document.getElementById('grades').style.display = 'flex';
    }

    async function answer(grade) {
      const card = cards[current];
      await fetch('/cards/' + card.id + '/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grade })
      });
      current++;
      show();
    }

    load();
  </script>
</body>
</html>`;
}
