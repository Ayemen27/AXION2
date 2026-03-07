import { useEffect, useRef, useState } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  disabled?: boolean;
}

/**
 * usePullToRefresh — attaches to the TRUE scrollable container (.layout-main)
 * NOT to the page content div (which has scrollTop === 0 always).
 *
 * Root cause of previous bug:
 *   containerRef was placed on <div className="space-y-5"> which never scrolls.
 *   The real scroller is .layout-main in AppLayout. We now query it directly.
 */
export function usePullToRefresh({ onRefresh, threshold = 80, disabled = false }: PullToRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  // Kept for API compatibility — pages still spread ref on their wrapper div
  // We don't actually use this ref for scroll detection anymore.
  const containerRef = useRef<HTMLDivElement>(null);

  const isPullingRef    = useRef(false);
  const isRefreshingRef = useRef(false);
  const pullDistRef     = useRef(0);
  const touchStartYRef  = useRef(0);
  const onRefreshRef    = useRef(onRefresh);

  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);

  useEffect(() => {
    if (disabled) return;

    // ── Find the real scrollable container ──────────────────────────────────
    // .layout-main is the element in AppLayout that has overflow-y: auto.
    // We attach touch listeners there so scrollTop reflects actual scroll.
    const getScrollEl = (): HTMLElement =>
      (document.querySelector('.layout-main') as HTMLElement) ?? document.documentElement;

    const scrollEl = getScrollEl();

    // Helper: is any modal/drawer open?
    const isModalOpen = () =>
      document.body.hasAttribute('data-drawer-open') ||
      !!document.querySelector('[role="dialog"][data-state="open"]');

    const onTouchStart = (e: TouchEvent) => {
      touchStartYRef.current = e.touches[0].clientY;
      isPullingRef.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (isRefreshingRef.current || isModalOpen()) return;

      const deltaY = e.touches[0].clientY - touchStartYRef.current;
      const atTop  = scrollEl.scrollTop <= 0;

      if (deltaY > 0 && atTop) {
        // Finger moving DOWN and we're at the top → pull gesture
        isPullingRef.current = true;
        e.preventDefault();
        const damped = Math.min(deltaY * 0.45, threshold * 1.5);
        pullDistRef.current = damped;
        setPullDistance(damped);
      } else {
        // Not a pull gesture — reset if we were pulling
        if (isPullingRef.current) {
          isPullingRef.current = false;
          pullDistRef.current  = 0;
          setPullDistance(0);
        }
      }
    };

    const onTouchEnd = async () => {
      if (!isPullingRef.current) return;

      const dist = pullDistRef.current;
      isPullingRef.current = false;

      if (dist >= threshold && !isRefreshingRef.current) {
        isRefreshingRef.current = true;
        setIsRefreshing(true);
        pullDistRef.current = threshold;
        setPullDistance(threshold);

        try {
          await onRefreshRef.current();
        } finally {
          setTimeout(() => {
            isRefreshingRef.current = false;
            setIsRefreshing(false);
            pullDistRef.current = 0;
            setPullDistance(0);
          }, 500);
        }
      } else {
        pullDistRef.current = 0;
        setPullDistance(0);
      }
    };

    scrollEl.addEventListener('touchstart', onTouchStart, { passive: true });
    scrollEl.addEventListener('touchmove',  onTouchMove,  { passive: false });
    scrollEl.addEventListener('touchend',   onTouchEnd,   { passive: true });

    return () => {
      scrollEl.removeEventListener('touchstart', onTouchStart);
      scrollEl.removeEventListener('touchmove',  onTouchMove);
      scrollEl.removeEventListener('touchend',   onTouchEnd);
    };
  }, [disabled, threshold]);

  return {
    containerRef,   // still returned so pages compile without changes
    isPulling: isPullingRef.current,
    isRefreshing,
    pullDistance,
    progress: Math.min((pullDistance / threshold) * 100, 100),
  };
}
