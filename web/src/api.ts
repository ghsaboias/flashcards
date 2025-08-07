import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export async function getHealth() {
    const { data } = await axios.get(`${API_BASE}/health`);
    return data;
}

export async function listSets(): Promise<string[]> {
    const { data } = await axios.get(`${API_BASE}/sets`);
    return data;
}

export async function listCategories(): Promise<string[]> {
    const { data } = await axios.get(`${API_BASE}/categories`);
    return data;
}

export type SrsRow = {
    set_name: string;
    question: string;
    answer: string;
    easiness_factor: number;
    interval_hours: number;
    repetitions: number;
    next_review_date: string;
}

export type StatRow = {
    question: string;
    answer: string;
    correct: number;
    incorrect: number;
    total: number;
    accuracy: number;
}

export type StatsPayload = {
    summary: {
        correct: number;
        incorrect: number;
        total: number;
        accuracy: number;
        total_cards: number;
        attempted_cards: number;
        difficult_count: number;
    };
    rows: StatRow[];
}

export async function getSrsForSet(setName: string): Promise<SrsRow[]> {
    const { data } = await axios.get(`${API_BASE}/srs/set`, { params: { set_name: setName } });
    return data;
}

export async function getSrsForCategory(category: string): Promise<SrsRow[]> {
    const { data } = await axios.get(`${API_BASE}/srs/category`, { params: { category } });
    return data;
}

export async function startSession(payload: any) {
    const { data } = await axios.post(`${API_BASE}/sessions/start`, payload);
    return data as {
        session_id: string;
        done: boolean;
        card?: { index: number; question: string; pinyin?: string };
        progress: { current: number; total: number };
    };
}

export async function answer(sessionId: string, answerText: string) {
    const { data } = await axios.post(`${API_BASE}/sessions/${sessionId}/answer`, {
        session_id: sessionId,
        answer: answerText,
    });
    return data as {
        done: boolean;
        card?: { index: number; question: string; pinyin?: string };
        progress: { current: number; total: number };
        evaluation?: { question: string; correct: boolean; correct_answer: string };
        result?: { correct: number; total: number };
        results?: Array<{ question: string; user_answer: string; correct_answer: string; correct: boolean }>
    };
}

export async function getStatsForSet(setName: string): Promise<StatsPayload> {
    const { data } = await axios.get(`${API_BASE}/stats/set`, { params: { set_name: setName } });
    return data;
}

export async function getStatsForCategory(category: string): Promise<StatsPayload> {
    const { data } = await axios.get(`${API_BASE}/stats/category`, { params: { category } });
    return data;
}


