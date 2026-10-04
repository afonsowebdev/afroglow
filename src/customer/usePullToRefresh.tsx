import { useRef, useState, type ReactNode } from "react";

/**
 * Pull-down-to-refresh for a screen at the top of the page. Returns the touch handlers to spread on
 * the screen's root element and an indicator to render at its top.
 */
export function usePullToRefresh(onRefresh: () => Promise<unknown>) {
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const THRESHOLD = 70;

  const handlers = {
    onTouchStart: (e: React.TouchEvent) => {
      startY.current = window.scrollY <= 0 ? e.touches[0].clientY : null;
    },
    onTouchMove: (e: React.TouchEvent) => {
      if (startY.current === null || refreshing) return;
      const delta = e.touches[0].clientY - startY.current;
      setPull(delta > 0 ? Math.min(delta * 0.5, 110) : 0);
    },
    onTouchEnd: async () => {
      const shouldRefresh = pull >= THRESHOLD && !refreshing;
      startY.current = null;
      if (!shouldRefresh) {
        setPull(0);
        return;
      }
      setRefreshing(true);
      setPull(THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    },
  };

  const indicator: ReactNode =
    pull > 4 || refreshing ? (
      <div
        className="flex items-center justify-center overflow-hidden"
        style={{ height: pull }}
        aria-hidden="true"
      >
        <i
          className={`bx bx-refresh text-2xl text-gold-ink ${refreshing ? "animate-spin" : ""}`}
          style={{
            transform: refreshing ? undefined : `rotate(${pull * 3}deg)`,
            opacity: Math.min(1, pull / THRESHOLD),
          }}
        />
      </div>
    ) : null;

  return { handlers, indicator };
}
