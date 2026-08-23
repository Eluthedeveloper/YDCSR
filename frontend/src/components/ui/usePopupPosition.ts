import { useLayoutEffect, useState, RefObject } from 'react';

const VIEWPORT_MARGIN = 8;

/**
 * Positions a portal-rendered dropdown relative to its trigger element using
 * fixed coordinates. Flips above the trigger when there is not enough room
 * below (e.g. near the bottom of the viewport or inside a modal), and keeps
 * the popup clamped horizontally so it is never cut off screen.
 */
export function usePopupPosition(
  active: boolean,
  triggerRef: RefObject<HTMLElement | null>,
  width: number,
  estimatedHeight: number,
  align: 'left' | 'right' = 'left',
  gap = 6,
) {
  const [pos, setPos] = useState({ top: -9999, left: -9999 });

  useLayoutEffect(() => {
    if (!active) return;
    const update = () => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      let top = rect.bottom + gap;
      const roomBelow = window.innerHeight - VIEWPORT_MARGIN - rect.bottom;
      const roomAbove = rect.top - VIEWPORT_MARGIN;
      if (roomBelow < estimatedHeight && roomAbove > roomBelow) {
        top = Math.max(VIEWPORT_MARGIN, rect.top - estimatedHeight - gap);
      }
      top = Math.max(VIEWPORT_MARGIN, Math.min(top, window.innerHeight - VIEWPORT_MARGIN));
      let left = align === 'right' ? rect.right - width : rect.left;
      left = Math.max(VIEWPORT_MARGIN, Math.min(left, window.innerWidth - width - VIEWPORT_MARGIN));
      setPos({ top, left });
    };
    update();
    window.addEventListener('resize', update);
    // capture phase catches scrolls inside modal bodies and nested containers
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [active, triggerRef, width, estimatedHeight, align, gap]);

  return pos;
}
