/**
 * Session-scoped memory + adaptive behaviour (Phases 6 & 7).
 *
 * Retention rules (documented behaviour):
 * - Memory is SHORT-TERM and lives for exactly one session per user
 *   (key = userId + sessionId). A new browser session gets a new sessionId
 *   and therefore a clean slate.
 * - Sessions idle longer than SESSION_TTL_MIN are evicted (reset).
 * - POST /api/session/reset clears a session on demand.
 * - Nothing here is written to disk: conversation content stays in memory
 *   only (PII-safe); durable traces store redacted previews instead.
 */
import { config } from '../config.js';

export interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AdaptationFlags {
  /** Set by "too long" feedback → answers capped to 3 sentences. */
  concise: boolean;
  /** Set by "not cited" feedback → fallback mode disabled; grounded-or-refuse. */
  groundedOnly: boolean;
}

export interface SessionState {
  userId: string;
  sessionId: string;
  createdAt: number;
  lastActive: number;
  history: Turn[];
  flags: AdaptationFlags;
  feedback: { rating: 'up' | 'down'; tag?: string; ts: number }[];
}

const sessions = new Map<string, SessionState>();
const key = (u: string, s: string) => `${u}::${s}`;

export function getSession(userId: string, sessionId: string): SessionState {
  const k = key(userId, sessionId);
  let s = sessions.get(k);
  const ttlMs = config.sessionTtlMin * 60_000;
  if (s && Date.now() - s.lastActive > ttlMs) {
    sessions.delete(k); // TTL retention rule: idle session is reset
    s = undefined;
  }
  if (!s) {
    s = {
      userId,
      sessionId,
      createdAt: Date.now(),
      lastActive: Date.now(),
      history: [],
      flags: { concise: false, groundedOnly: false },
      feedback: []
    };
    sessions.set(k, s);
  }
  s.lastActive = Date.now();
  return s;
}

/** Record a completed turn, keeping only the last MEMORY_TURNS exchanges. */
export function remember(s: SessionState, userText: string, assistantText: string): void {
  s.history.push({ role: 'user', content: userText }, { role: 'assistant', content: assistantText });
  const max = config.memoryTurns * 2;
  if (s.history.length > max) s.history = s.history.slice(-max);
}

/** Apply feedback → adaptation flags (Phase 7: behaviour change from feedback). */
export function applyFeedback(userId: string, sessionId: string, rating: 'up' | 'down', tag?: string): AdaptationFlags {
  const s = getSession(userId, sessionId);
  s.feedback.push({ rating, tag, ts: Date.now() });
  if (rating === 'down' && tag === 'too_long') s.flags.concise = true;
  if (rating === 'down' && tag === 'not_cited') s.flags.groundedOnly = true;
  return s.flags;
}

export function resetSession(userId: string, sessionId: string): void {
  sessions.delete(key(userId, sessionId));
}

export function sessionInfo(userId: string, sessionId: string): SessionState | undefined {
  return sessions.get(key(userId, sessionId));
}
