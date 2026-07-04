/**
 * Per-turn tracing (Phase 8 + capstone requirement).
 *
 * One Trace per user turn, scoped to userId + sessionId (a user interacts in
 * one session at a time; a new browser session = new sessionId = fresh trace
 * group and fresh memory). Each trace carries child spans (plan, retrieval,
 * tool, llm, judge) with latency, so the whole pipeline is explainable.
 *
 * PII-safe: questions are redacted (emails/phones/long numbers) before storage
 * and truncated; raw answers are stored only in eval runs, never in audit logs.
 * Persistence: append-only JSONL under DATA_DIR (git-ignored), reloaded at boot.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { redact, log } from './logger.js';
import { config } from '../config.js';

export interface Span {
  name: string;
  /** Offset from trace start, ms. */
  startMs: number;
  durMs: number;
  data?: Record<string, unknown>;
  error?: string;
}

export interface Feedback {
  rating: 'up' | 'down';
  tag?: string;
  ts: string;
}

export interface Trace {
  id: string;
  userId: string;
  sessionId: string;
  ts: string;
  route: string;
  question: string; // redacted + truncated
  lang: string;
  mode?: string;
  answerPreview?: string; // redacted + truncated
  latencyMs?: number;
  error?: string;
  feedback?: Feedback;
  spans: Span[];
}

const dir = resolve(config.dataDir);
const file = join(dir, 'traces.jsonl');
let traces: Trace[] = [];
let loaded = false;

function ensureLoaded(): void {
  if (loaded) return;
  loaded = true;
  try {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    if (existsSync(file)) {
      for (const line of readFileSync(file, 'utf8').split('\n')) {
        if (!line.trim()) continue;
        const rec = JSON.parse(line);
        if (rec._type === 'feedback') {
          const t = traces.find((x) => x.id === rec.traceId);
          if (t) t.feedback = rec.feedback;
        } else {
          traces.push(rec as Trace);
        }
      }
    }
  } catch (e) {
    log.warn('trace.load_failed', { message: (e as Error).message });
  }
}

function persist(rec: unknown): void {
  try {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    appendFileSync(file, JSON.stringify(rec) + '\n');
  } catch (e) {
    log.warn('trace.persist_failed', { message: (e as Error).message });
  }
}

/** A live trace being built for the current request. */
export class ActiveTrace {
  readonly trace: Trace;
  private readonly t0 = Date.now();

  constructor(init: { userId: string; sessionId: string; route: string; question: string; lang?: string }) {
    ensureLoaded();
    this.trace = {
      id: randomUUID(),
      userId: init.userId,
      sessionId: init.sessionId,
      ts: new Date().toISOString(),
      route: init.route,
      question: redact(init.question).slice(0, 200),
      lang: init.lang ?? 'en',
      spans: []
    };
  }

  /** Start a span; call the returned function to close it. */
  begin(name: string): (data?: Record<string, unknown>, error?: string) => void {
    const s0 = Date.now();
    return (data?: Record<string, unknown>, error?: string) => {
      this.trace.spans.push({ name, startMs: s0 - this.t0, durMs: Date.now() - s0, data, error });
    };
  }

  /** Finalize, persist, and index the trace. */
  end(fields: { mode?: string; answerPreview?: string; error?: string }): void {
    this.trace.mode = fields.mode;
    if (fields.answerPreview) this.trace.answerPreview = redact(fields.answerPreview).slice(0, 160);
    this.trace.error = fields.error;
    this.trace.latencyMs = Date.now() - this.t0;
    traces.push(this.trace);
    persist(this.trace);
    log.info('trace.end', {
      traceId: this.trace.id,
      userId: this.trace.userId,
      sessionId: this.trace.sessionId,
      mode: this.trace.mode,
      latencyMs: this.trace.latencyMs,
      spans: this.trace.spans.map((s) => s.name)
    });
  }
}

/** Users → sessions overview for the trainer UI. */
export function traceOverview(): {
  users: { userId: string; sessions: { sessionId: string; traces: number; firstTs: string; lastTs: string }[] }[];
} {
  ensureLoaded();
  const byUser = new Map<string, Map<string, Trace[]>>();
  for (const t of traces) {
    const u = byUser.get(t.userId) ?? new Map<string, Trace[]>();
    const arr = u.get(t.sessionId) ?? [];
    arr.push(t);
    u.set(t.sessionId, arr);
    byUser.set(t.userId, u);
  }
  return {
    users: [...byUser.entries()].map(([userId, sessions]) => ({
      userId,
      sessions: [...sessions.entries()].map(([sessionId, arr]) => ({
        sessionId,
        traces: arr.length,
        firstTs: arr[0].ts,
        lastTs: arr[arr.length - 1].ts
      }))
    }))
  };
}

export function listTraces(userId?: string, sessionId?: string): Trace[] {
  ensureLoaded();
  return traces.filter((t) => (!userId || t.userId === userId) && (!sessionId || t.sessionId === sessionId));
}

export function getTrace(id: string): Trace | undefined {
  ensureLoaded();
  return traces.find((t) => t.id === id);
}

/** Attach trainer/user feedback to a trace (Phase 7 evidence). */
export function attachFeedback(traceId: string, feedback: Feedback): Trace | undefined {
  ensureLoaded();
  const t = traces.find((x) => x.id === traceId);
  if (!t) return undefined;
  t.feedback = feedback;
  persist({ _type: 'feedback', traceId, feedback });
  return t;
}
