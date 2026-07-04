/**
 * Evaluation-mode switch: shows/hides the trainer console (/eval) in the UI.
 * Persisted per browser (localStorage); default OFF so end users never see
 * evaluator tooling. Server-side protection is separate (EVAL_TOKEN).
 */
import { useSyncExternalStore } from 'react';

const KEY = 'a508.evalEnabled';
const EVENT = 'a508-eval-mode';

export function isEvalEnabled(): boolean {
  return localStorage.getItem(KEY) === '1';
}

export function setEvalEnabled(on: boolean): void {
  localStorage.setItem(KEY, on ? '1' : '0');
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb); // sync across tabs
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

/** React hook — re-renders when the toggle changes (this tab or another). */
export function useEvalEnabled(): boolean {
  return useSyncExternalStore(subscribe, isEvalEnabled, () => false);
}
