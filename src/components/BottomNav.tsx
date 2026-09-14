import React from "react";
import { Home, Droplet, Wallet, FileText, Settings } from "lucide-react";

export type NavTab = "home" | "log" | "biaya" | "report" | "setting";

interface Props {
  activeTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
}

export const BottomNav: React.FC<Props> = ({ activeTab, onChangeTab }) => {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-[#101522]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800/90 py-1.5 px-2 transition-colors">
      <div className="max-w-md mx-auto grid grid-cols-5 gap-1">
        {/* Tab 1: Home (Halaman Utama / Grafik & Statistik) */}
        <button
          onClick={() => onChangeTab("home")}
          className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition ${
            activeTab === "home"
              ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 font-semibold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
          title="Halaman Utama / Ringkasan Grafik"
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Home</span>
        </button>

        {/* Tab 2: Data Bensin (Log Pengisian BBM) */}
        <button
          onClick={() => onChangeTab("log")}
          className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition ${
            activeTab === "log"
              ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 font-semibold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
          title="Data Bensin & Pengisian BBM"
        >
          <Droplet className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight whitespace-nowrap">Data Bensin</span>
        </button>

        {/* Tab 3: Biaya (Riwayat Biaya Manual: Service, Top Up Etoll, Lainnya) */}
        <button
          onClick={() => onChangeTab("biaya")}
          className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition ${
            activeTab === "biaya"
              ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 font-semibold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
          title="Riwayat Biaya (Service, Etoll, Lainnya)"
        >
          <Wallet className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Biaya</span>
        </button>

        {/* Tab 4: Laporan Page */}
        <button
          onClick={() => onChangeTab("report")}
          className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition ${
            activeTab === "report"
              ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 font-semibold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
          title="Laporan & Ekspor Data"
        >
          <FileText className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Laporan</span>
        </button>

        {/* Tab 5: Setting (Pengaturan & Satuan Unit) */}
        <button
          onClick={() => onChangeTab("setting")}
          className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition ${
            activeTab === "setting"
              ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 font-semibold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
          title="Pengaturan & Satuan Unit"
        >
          <Settings className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Setting</span>
        </button>
      </div>
    </nav>
  );
};
