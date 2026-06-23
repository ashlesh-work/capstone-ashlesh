/**
 * PII-light structured logging + audit trail.
 * We deliberately avoid logging full transcripts. Queries are redacted before
 * logging so emails, phone numbers, and long digit strings never land in logs.
 */

const EMAIL = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g;
const PHONE = /\b(?:\+?\d[\s-]?){7,}\b/g;
const LONGNUM = /\b\d{6,}\b/g;

/** Redact common PII patterns from a string before it is logged. */
export function redact(text: string): string {
  return text
    .replace(EMAIL, '[email]')
    .replace(PHONE, '[phone]')
    .replace(LONGNUM, '[number]');
}

type LogFields = Record<string, unknown>;

function emit(level: 'info' | 'warn' | 'error', msg: string, fields: LogFields = {}): void {
  // Timestamp is added by the platform/container log driver; keep payload lean.
  const line = JSON.stringify({ level, msg, ...fields });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const log = {
  info: (msg: string, fields?: LogFields) => emit('info', msg, fields),
  warn: (msg: string, fields?: LogFields) => emit('warn', msg, fields),
  error: (msg: string, fields?: LogFields) => emit('error', msg, fields)
};

/** Audit a chat answer without storing the raw question or answer text. */
export function auditAnswer(fields: {
  mode: string;
  topScore: number;
  citationDocIds: string[];
  queryPreview: string;
  latencyMs: number;
}): void {
  emit('info', 'chat.answer', {
    mode: fields.mode,
    topScore: Number(fields.topScore.toFixed(3)),
    citations: fields.citationDocIds,
    // A short, redacted preview only — never the full query.
    queryPreview: redact(fields.queryPreview).slice(0, 80),
    latencyMs: fields.latencyMs
  });
}
