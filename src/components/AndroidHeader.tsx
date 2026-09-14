import React from "react";
import {
  Car,
  Bike,
  ChevronDown,
  Sun,
  Moon,
} from "lucide-react";
import { Vehicle } from "../types";
import { useTheme } from "../context/ThemeContext";

interface Props {
  activeVehicle: Vehicle;
  onOpenVehicleSelector: () => void;
}

export const AndroidHeader: React.FC<Props> = ({
  activeVehicle,
  onOpenVehicleSelector,
}) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#131926]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/90 px-4 py-3 transition-colors">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        {/* Vehicle Badge Dropdown (Nama Kendaraan ▾) */}
        <button
          onClick={onOpenVehicleSelector}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-[#1c2538] dark:hover:bg-[#232f46] border border-slate-300 dark:border-slate-700/80 transition active:scale-95 group"
          title="Ganti atau Tambah Kendaraan"
        >
          <div className="w-6 h-6 rounded-full bg-blue-500/15 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            {activeVehicle.type === "car" ? (
              <Car className="w-3.5 h-3.5" />
            ) : (
              <Bike className="w-3.5 h-3.5" />
            )}
          </div>
          <div className="text-left flex items-baseline gap-1.5">
            <span className="text-xs font-bold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition">
              {activeVehicle.name || "Kendaraan"}
            </span>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              {(activeVehicle.currentOdometer || 0).toLocaleString("id-ID")} km
            </span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition" />
        </button>

        {/* Right Status Actions */}
        <div className="flex items-center gap-1.5">
          {/* Light / Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition"
            title={
              theme === "dark"
                ? "Ganti ke Tema Terang (Light Mode)"
                : "Ganti ke Tema Gelap (Dark Mode)"
            }
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
