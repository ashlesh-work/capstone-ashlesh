/**
 * Anonymous identity for user-wise tracing (never a name or email).
 * - userId persists per browser (localStorage) → groups a user's sessions.
 * - sessionId lives for one browser session (sessionStorage) → memory and
 *   tracing are scoped to one session; closing the tab starts fresh.
 */
const USER_KEY = 'a508.userId';
const SESSION_KEY = 'a508.sessionId';

function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function getUserId(): string {
  let v = localStorage.getItem(USER_KEY);
  if (!v) {
    v = uid('user');
    localStorage.setItem(USER_KEY, v);
  }
  return v;
}

export function getSessionId(): string {
  let v = sessionStorage.getItem(SESSION_KEY);
  if (!v) {
    v = uid('sess');
    sessionStorage.setItem(SESSION_KEY, v);
  }
  return v;
}

export function identityHeaders(): Record<string, string> {
  return { 'x-user-id': getUserId(), 'x-session-id': getSessionId() };
}
