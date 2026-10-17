import { useEffect } from 'react';

/**
 * Stop an accidental pull-to-refresh on iOS Safari mid-tasting (older iOS
 * ignores overscroll-behavior). Only cancels a downward drag that starts at
 * the very top of the page, and never one that starts on a form control or
 * inside a scrollable box — otherwise slider drags and textarea scrolling
 * get cancelled whenever the finger drifts downward.
 */
export default function usePreventPullToRefresh() {
  useEffect(() => {
    let startY = 0;
    let armed = false;

    const isExempt = (el) => {
      for (let n = el; n && n !== document.body; n = n.parentElement) {
        const tag = n.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
        if (n.scrollHeight > n.clientHeight + 1) {
          const oy = window.getComputedStyle(n).overflowY;
          if (oy === 'auto' || oy === 'scroll') return true;
        }
      }
      return false;
    };

    const onStart = (e) => {
      if (e.touches.length !== 1) { armed = false; return; }
      startY = e.touches[0].clientY;
      armed = window.scrollY <= 0 && !isExempt(e.target);
    };
    const onMove = (e) => {
      if (!armed || !e.cancelable) return;
      if (e.touches[0].clientY > startY && window.scrollY <= 0) {
        e.preventDefault();
      } else {
        armed = false; // user is scrolling normally — stop interfering
      }
    };

    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: false });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
    };
  }, []);
}
