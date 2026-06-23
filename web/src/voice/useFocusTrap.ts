import { useEffect, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * APG modal-dialog focus management:
 *  - moves focus into the dialog on open,
 *  - traps Tab / Shift+Tab within it,
 *  - closes on Escape,
 *  - returns focus to the element that opened it.
 * Implements WCAG 2.1.2 (no keyboard trap is escapable via Esc) and 2.4.3.
 */
export function useFocusTrap(
  ref: RefObject<HTMLElement>,
  active: boolean,
  onClose: () => void
): void {
  useEffect(() => {
    if (!active || !ref.current) return;
    const node = ref.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Move focus to the preferred element ([data-autofocus]) or the first focusable.
    const focusables = () => Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));
    const preferred = node.querySelector<HTMLElement>('[data-autofocus]');
    (preferred ?? focusables()[0])?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }

    node.addEventListener('keydown', onKeyDown);
    return () => {
      node.removeEventListener('keydown', onKeyDown);
      // Return focus to the launcher when the dialog closes.
      previouslyFocused?.focus();
    };
  }, [active, ref, onClose]);
}
