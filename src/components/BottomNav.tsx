import React from "react";
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

  return (
    <nav
      id="floating-bottom-nav"
      className="fixed bottom-4 sm:bottom-6 inset-x-0 z-40 px-3 sm:px-4 flex justify-center pointer-events-none transition-all"
    >
      <div className="w-full max-w-md bg-white/95 dark:bg-[#151c2c]/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-700/80 shadow-[0_12px_36px_-4px_rgba(0,0,0,0.18),0_2px_8px_rgba(0,0,0,0.06)] rounded-2xl p-1.5 pointer-events-auto transition-all">
        <div className="grid grid-cols-5 gap-1 items-center">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = isTabActive(tab.id);
            return (
              <button
                key={tab.id}
                id={`floating-nav-${tab.id}`}
                onClick={() => onChangeTab(tab.id)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all active:scale-95 relative ${
                  isActive
                    ? "text-blue-600 dark:text-blue-400 font-bold bg-blue-50/90 dark:bg-blue-500/15 shadow-2xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/40"
                }`}
              >
                <Icon className={`w-5 h-5 mb-0.5 transition-transform ${isActive ? "stroke-[2.5] scale-105" : "stroke-2"}`} />
                <span className="text-[10px] tracking-tight truncate max-w-full font-medium">
                  {tab.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
