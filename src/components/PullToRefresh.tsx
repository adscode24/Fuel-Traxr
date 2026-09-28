import React, { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, ArrowDown } from "lucide-react";

interface Props {
  /** Dipanggil saat tarikan melewati ambang. Boleh async. */
  onRefresh: () => void | Promise<void>;
  children: React.ReactNode;
}

const THRESHOLD = 64;
const MAX_PULL = 96;

/**
 * Pull-to-refresh untuk mobile/Android: tarik konten ke bawah dari posisi
 * paling atas untuk memuat ulang data. Memakai native listener
 * (passive:false) agar browser tidak ikut me-reload halaman.
 */
export const PullToRefresh: React.FC<Props> = ({ onRefresh, children }) => {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const doRefresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    try {
      await onRefreshRef.current();
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
      pullRef.current = 0;
      setPull(0);
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const atTop = () => window.scrollY <= 0;

    const onTouchStart = (e: TouchEvent) => {
      if (refreshingRef.current) return;
      const t = e.touches[0];
      startYRef.current = t ? t.clientY : null;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (refreshingRef.current || startYRef.current === null) return;
      const t = e.touches[0];
      if (!t) return;
      const dy = t.clientY - startYRef.current;
      if (!atTop() || dy <= 0) {
        // Bukan tarikan dari atas: biarkan scroll normal
        if (dy < 0) {
          startYRef.current = null;
          setPull(0);
        }
        return;
      }
      // Tarikan valid dari atas: tahan scroll browser
      if (dy > 8 && e.cancelable) e.preventDefault();
      const v = Math.min(dy * 0.55, MAX_PULL);
      pullRef.current = v;
      setPull(v);
    };

    const onTouchEnd = () => {
      const hadGesture = startYRef.current !== null;
      startYRef.current = null;
      if (refreshingRef.current || !hadGesture) return;
      if (pullRef.current >= THRESHOLD) {
        void doRefresh();
      } else {
        pullRef.current = 0;
        setPull(0);
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [doRefresh]);

  const visible = refreshing || pull > 4;
  const ready = refreshing || pull >= THRESHOLD;

  return (
    <div ref={containerRef} className="relative overscroll-y-contain">
      {/* Indikator tarikan */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 z-30 flex justify-center"
        style={{
          opacity: visible ? 1 : 0,
          transform: `translate(-50%, ${refreshing ? 10 : pull - 18}px) scale(${ready ? 1 : 0.85})`,
          transition: refreshing || pull === 0 ? "transform 0.2s, opacity 0.2s" : "none",
        }}
        aria-hidden="true"
      >
        <div className="w-9 h-9 rounded-full bg-white dark:bg-[#151c2c] border border-slate-200 dark:border-slate-700 shadow-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
          {refreshing ? (
            <Loader2 className="w-4.5 h-4.5 animate-spin" />
          ) : (
            <ArrowDown
              className="w-4.5 h-4.5 transition-transform"
              style={{ transform: ready ? "rotate(180deg)" : "none" }}
            />
          )}
        </div>
      </div>
      {children}
    </div>
  );
};
