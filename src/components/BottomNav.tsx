import React, { useState, useRef } from "react";
import { Home, Droplet, Wallet, FileText, Settings } from "lucide-react";

export type NavTab = "home" | "bensin" | "log" | "biaya" | "report" | "setting";

interface Props {
  activeTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
}

export const BottomNav: React.FC<Props> = ({ activeTab, onChangeTab }) => {
  const tabs: { id: NavTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: "home", label: "Home", icon: Home },
    { id: "bensin", label: "Bensin", icon: Droplet },
    { id: "biaya", label: "Biaya", icon: Wallet },
    { id: "report", label: "Laporan", icon: FileText },
    { id: "setting", label: "Pengaturan", icon: Settings },
  ];

  const isTabActive = (tabId: NavTab) => {
    if (activeTab === tabId) return true;
    if (
      (tabId === "bensin" || tabId === "log") &&
      (activeTab === "bensin" || activeTab === "log")
    ) {
      return true;
    }
    return false;
  };

  // Sorotan kaca (glass sheen) yang mengikuti pointer:
  // - Desktop: mouse hover / mendekati dock
  // - Mobile: sentuh / tahan / geser (swipe) di atas dock
  const [glow, setGlow] = useState(false);
  const [hoverTab, setHoverTab] = useState<NavTab | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  const moveSheen = (clientX: number, clientY: number) => {
    const el = dockRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--gx", `${clientX - r.left}px`);
    el.style.setProperty("--gy", `${clientY - r.top}px`);
  };

  const pickTabUnderFinger = (clientX: number, clientY: number) => {
    if (typeof document === "undefined" || !document.elementFromPoint) return;
    const el = document.elementFromPoint(clientX, clientY)?.closest?.("[data-nav-tab]");
    const id = el?.getAttribute("data-nav-tab") as NavTab | null;
    setHoverTab((prev) => (prev === id ? prev : id));
  };

  return (
    <nav
      id="floating-bottom-nav"
      className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] sm:bottom-6 inset-x-0 z-40 px-3 sm:px-4 flex justify-center pointer-events-none transition-all"
    >
      <div
        ref={dockRef}
        onMouseMove={(e) => {
          setGlow(true);
          moveSheen(e.clientX, e.clientY);
        }}
        onMouseLeave={() => {
          setGlow(false);
          setHoverTab(null);
        }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (!t) return;
          setGlow(true);
          moveSheen(t.clientX, t.clientY);
          pickTabUnderFinger(t.clientX, t.clientY);
        }}
        onTouchMove={(e) => {
          const t = e.touches[0];
          if (!t) return;
          moveSheen(t.clientX, t.clientY);
          pickTabUnderFinger(t.clientX, t.clientY);
        }}
        onTouchEnd={() => {
          setGlow(false);
          setHoverTab(null);
        }}
        onTouchCancel={() => {
          setGlow(false);
          setHoverTab(null);
        }}
        className="relative w-full max-w-md rounded-2xl p-1.5 pointer-events-auto transition-all overflow-hidden touch-none select-none
          bg-white/55 dark:bg-[#151c2c]/55 backdrop-blur-2xl backdrop-saturate-150
          border border-white/50 dark:border-white/15
          shadow-[0_12px_36px_-4px_rgba(0,0,0,0.25),0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.35)] dark:shadow-[0_12px_36px_-4px_rgba(0,0,0,0.5),0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.12)]"
      >
        {/* Kilau atas khas kaca */}
        <div className="absolute inset-x-3 top-0 h-6 rounded-b-full bg-gradient-to-b from-white/30 dark:from-white/15 to-transparent pointer-events-none" />

        {/* Sorotan mengikuti pointer/jari */}
        <div
          className={`absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-300 bg-[radial-gradient(130px_circle_at_var(--gx,50%)_var(--gy,50%),rgba(255,255,255,0.35),rgba(125,180,255,0.12)_45%,transparent_70%)] dark:bg-[radial-gradient(130px_circle_at_var(--gx,50%)_var(--gy,50%),rgba(160,200,255,0.30),rgba(120,170,255,0.10)_45%,transparent_70%)] ${
            glow ? "opacity-100" : "opacity-0"
          }`}
        />

        <div className="relative grid grid-cols-5 gap-1 items-center">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = isTabActive(tab.id);
            const isHovered = hoverTab === tab.id && !isActive;
            return (
              <button
                key={tab.id}
                id={`floating-nav-${tab.id}`}
                data-nav-tab={tab.id}
                onClick={() => onChangeTab(tab.id)}
                onMouseEnter={() => setHoverTab(tab.id)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all active:scale-90 relative ${
                  isActive
                    ? "text-blue-600 dark:text-blue-300 font-bold bg-white/70 dark:bg-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_2px_10px_rgba(59,130,246,0.25)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_2px_10px_rgba(59,130,246,0.35)] backdrop-blur-md border border-white/60 dark:border-white/20"
                    : isHovered
                    ? "text-slate-800 dark:text-slate-100 bg-white/45 dark:bg-white/10 backdrop-blur-md border border-white/40 dark:border-white/10"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/30 dark:hover:bg-white/5 border border-transparent"
                }`}
              >
                <Icon className={`w-5 h-5 mb-0.5 transition-transform ${isActive ? "stroke-[2.5] scale-105" : "stroke-2"}`} />
                <span className="text-[10px] tracking-tight truncate max-w-full font-medium">
                  {tab.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-300" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
