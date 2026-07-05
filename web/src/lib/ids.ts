/**
 * Anonymous identity for user-wise tracing (never a name or email).
 * - userId persists per browser (localStorage) → groups a user's sessions.
 * - sessionId lives for one browser session (sessionStorage) → memory and
 *   tracing are scoped to one session; closing the tab starts fresh.
 */
const USER_KEY = 'a508.userId';
const SESSION_KEY = 'a508.sessionId';

/**
 * Random id that works in ALL contexts. crypto.randomUUID() exists only in
 * secure contexts (HTTPS / localhost) — when the app is served over plain
 * http://<lan-ip> (e.g. Docker on a home server), it is undefined and would
 * crash the page. Fall back to getRandomValues, then Math.random.
 */
function uid(prefix: string): string {
  let rand: string;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    rand = crypto.randomUUID().slice(0, 8);
  } else if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const b = crypto.getRandomValues(new Uint8Array(4));
    rand = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  } else {
    rand = (Math.random().toString(16) + Date.now().toString(16)).slice(2, 10);
  }
  return `${prefix}-${rand}`;
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
