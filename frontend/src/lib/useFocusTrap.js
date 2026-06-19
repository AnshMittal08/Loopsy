import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Trap keyboard focus inside an overlay (drawer / modal) while it is open, and
// restore focus to the previously-focused element when it closes. Pair with
// role="dialog" + aria-modal on the same node. Components keep their own Esc
// handling; this only manages Tab cycling and initial/restore focus.
export function useFocusTrap(active = true) {
  const ref = useRef(null);

  useEffect(() => {
    if (!active) return undefined;
    const node = ref.current;
    if (!node) return undefined;

    const previouslyFocused = document.activeElement;
    const visibleFocusables = () =>
      Array.from(node.querySelectorAll(FOCUSABLE)).filter((el) => el.offsetParent !== null);

    // Move focus into the overlay (first control, else the container itself).
    (visibleFocusables()[0] || node).focus?.();

    function onKeyDown(e) {
      if (e.key !== 'Tab') return;
      const items = visibleFocusables();
      if (items.length === 0) { e.preventDefault(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    node.addEventListener('keydown', onKeyDown);
    return () => {
      node.removeEventListener('keydown', onKeyDown);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [active]);

  return ref;
}
