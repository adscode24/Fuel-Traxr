import React from "react";
import {
  Car,
  Bike,
  ChevronDown,
  Sun,
  Moon,
  User as UserIcon,
  LogIn,
} from "lucide-react";
import { User } from "firebase/auth";
import { Vehicle } from "../types";
import { useTheme } from "../context/ThemeContext";

interface Props {
  activeVehicle: Vehicle | null;
  onOpenVehicleSelector: () => void;
  user: User | null;
  onOpenAuth: (mode?: "login" | "register") => void;
  onOpenProfile: () => void;
}

export const AndroidHeader: React.FC<Props> = ({
  activeVehicle,
  onOpenVehicleSelector,
  user,
  onOpenAuth,
  onOpenProfile,
}) => {
  const { theme, toggleTheme } = useTheme();

  const displayName = user?.displayName || user?.email?.split("@")[0] || "Akun";

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#111724]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 transition-colors">
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
        {/* Left: App title / Vehicle Switcher or Register Vehicle Button */}
        {activeVehicle ? (
          <button
            onClick={onOpenVehicleSelector}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-[#182133] dark:hover:bg-[#1f2b42] border border-slate-200 dark:border-slate-700/80 transition active:scale-98 group text-left min-w-0"
            title="Ganti atau Kelola Kendaraan"
          >
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
              {activeVehicle.type === "car" ? (
                <Car className="w-4 h-4" />
              ) : (
                <Bike className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                  {activeVehicle.name || "Kendaraan"}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-white transition-colors shrink-0" />
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                {(activeVehicle.currentOdometer || 0).toLocaleString("id-ID")} km
                {activeVehicle.licensePlate && ` • ${activeVehicle.licensePlate}`}
              </div>
            </div>
          </button>
        ) : (
          <button
            onClick={onOpenVehicleSelector}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100/80 dark:bg-blue-500/15 dark:hover:bg-blue-500/25 border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 transition active:scale-98 text-left"
            title="Daftarkan Kendaraan Anda"
          >
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Car className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                <span>Daftarkan Kendaraan Anda</span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </div>
              <div className="text-[10px] text-blue-600/80 dark:text-blue-400/80">
                + Tambah Mobil / Motor
              </div>
            </div>
          </button>
        )}

        {/* Right: User Auth & Theme Toggle */}
        <div className="flex items-center gap-1.5 shrink-0">
          {user ? (
            /* Logged in User Pill / Avatar */
            <button
              type="button"
              id="header-user-profile-btn"
              onClick={onOpenProfile}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100/80 dark:bg-blue-500/15 dark:hover:bg-blue-500/25 border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 transition active:scale-98"
              title={`Akun: ${displayName} (${user.email || ""})`}
            >
              <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold overflow-hidden shrink-0 shadow-2xs">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={displayName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  displayName.slice(0, 1).toUpperCase()
                )}
              </div>
              <span className="text-xs font-bold truncate max-w-[90px] sm:max-w-[130px] hidden xs:inline">
                {displayName}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            </button>
          ) : (
            /* Guest / Not logged in: Show Masuk / Daftar button */
            <button
              type="button"
              id="header-login-btn"
              onClick={() => onOpenAuth("login")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-2xs active:scale-98"
              title="Masuk atau Buat Akun Baru"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Masuk / Daftar</span>
            </button>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title={
              theme === "dark"
                ? "Ganti ke Tema Terang"
                : "Ganti ke Tema Gelap"
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

