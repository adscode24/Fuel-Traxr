import React, { useState } from "react";
import {
  Settings,
  Gauge,
  Moon,
  Sun,
  Trash2,
  Check,
  AlertTriangle,
  Info,
  Car,
  Database,
  RefreshCw,
  Cloud,
  CloudOff,
  UploadCloud,
  DownloadCloud,
  CheckCircle2,
  ShieldCheck,
  FileSpreadsheet,
  ExternalLink,
  Table,
  LogIn,
  UserPlus,
} from "lucide-react";
import { User } from "firebase/auth";
import { FuelEfficiencyUnit, Vehicle, FuelRecord, ServiceHistoryEntry } from "../types";
import { useTheme } from "../context/ThemeContext";
import { SpreadsheetInfo } from "../services/sheetsService";

interface Props {
  fuelUnit: FuelEfficiencyUnit;
  onChangeFuelUnit: (unit: FuelEfficiencyUnit) => void;
  vehicles: Vehicle[];
  records: FuelRecord[];
  serviceHistory: ServiceHistoryEntry[];
  onResetAllData: () => void;
  // Google Drive & Google Spreadsheet Connection & Sync
  user: User | null;
  autoSync: boolean;
  onToggleAutoSync: (enabled: boolean) => void;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  onConnectGoogle: () => void;
  onDisconnectGoogle: () => void;
  onManualSync: () => void;
  onRestoreFromDrive: () => void;
  // Google Spreadsheet Specifics
  spreadsheetInfo: SpreadsheetInfo | null;
  isSyncingSpreadsheet: boolean;
  onSyncSpreadsheet: () => void;
  onOpenAuth?: (mode?: "login" | "register") => void;
  onOpenProfile?: () => void;
}

export const SettingsPage: React.FC<Props> = ({
  fuelUnit,
  onChangeFuelUnit,
  vehicles,
  records,
  serviceHistory,
  onResetAllData,
  user,
  autoSync,
  onToggleAutoSync,
  isSyncing,
  lastSyncedAt,
  onConnectGoogle,
  onDisconnectGoogle,
  onManualSync,
  onRestoreFromDrive,
  spreadsheetInfo,
  isSyncingSpreadsheet,
  onSyncSpreadsheet,
  onOpenAuth,
  onOpenProfile,
}) => {
  const { theme, setTheme } = useTheme();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  return (
    <div className="space-y-4 pb-24 text-slate-800 dark:text-slate-100 transition-colors">
      {/* Header Banner */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#161d2d] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white">
            Pengaturan Aplikasi
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sesuaikan koneksi Google Drive &amp; Spreadsheet, satuan konsumsi BBM, dan tema tampilan.
          </p>
        </div>
      </div>

      {/* 1. Google Drive & Google Spreadsheet Connection Card */}
      <div className="bg-white dark:bg-[#161d2d] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Cloud className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Koneksi Google Drive &amp; Spreadsheet
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sinkronisasi otomatis ke Google Drive &amp; Google Spreadsheet sesuai email Anda.
              </p>
            </div>
          </div>

          {user ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Akun Terhubung
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              <CloudOff className="w-3.5 h-3.5" />
              Belum Terhubung
            </span>
          )}
        </div>

        {user ? (
          /* Connected State */
          <div className="space-y-3 pt-1">
            {/* User Profile Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#111724] border border-slate-200 dark:border-slate-800/90 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "Google User"}
                    className="w-10 h-10 rounded-full border border-slate-300 dark:border-slate-600 object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center">
                    {(user.displayName || user.email || "G").charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {user.displayName || "Pengguna Google"}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {user.email}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onOpenProfile && (
                  <button
                    type="button"
                    onClick={onOpenProfile}
                    className="px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg border border-blue-200 dark:border-blue-500/20 transition active:scale-95"
                  >
                    Profil Akun
                  </button>
                )}
                <button
                  type="button"
                  onClick={onDisconnectGoogle}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg border border-rose-200 dark:border-rose-500/20 transition active:scale-95"
                >
                  Putuskan / Keluar
                </button>
              </div>
            </div>

            {/* A. Google Spreadsheet Integration Sub-Card */}
            <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      Google Spreadsheet Sinkronisasi
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                        Aktif
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      File: <b className="font-mono text-emerald-700 dark:text-emerald-400">BBM &amp; Servis Kendaraan - {user.email}</b>
                    </p>
                  </div>
                </div>

                {spreadsheetInfo?.spreadsheetUrl && (
                  <a
                    href={spreadsheetInfo.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-xs transition active:scale-95"
                  >
                    <span>Buka Spreadsheet</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {/* 4 Synced Tabs List */}
              <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5">
                <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Table className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Struktur Sheet yang Otomatis Dikelola:</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
                  <div className="p-2 rounded-lg bg-white dark:bg-[#131a29] border border-emerald-200/80 dark:border-emerald-800/40 text-[11px]">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">1. Catatan BBM</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">{records.length} data tersinkron</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-[#131a29] border border-emerald-200/80 dark:border-emerald-800/40 text-[11px]">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">2. Biaya &amp; Servis</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">{serviceHistory.length} data tersinkron</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-[#131a29] border border-emerald-200/80 dark:border-emerald-800/40 text-[11px]">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">3. Data Kendaraan</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">{vehicles.length} kendaraan</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-[#131a29] border border-emerald-200/80 dark:border-emerald-800/40 text-[11px]">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">4. Jadwal Servis</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Target servis rutin</span>
                  </div>
                </div>
              </div>

              {/* Sync Guarantee Notice */}
              <div className="p-2.5 rounded-lg bg-emerald-100/60 dark:bg-emerald-900/30 text-[11px] text-emerald-800 dark:text-emerald-200 leading-relaxed">
                ✓ <b>Sinkronisasi &amp; Penghapusan Terintegrasi:</b> Setiap data baru atau perubahan yang Anda buat di aplikasi akan otomatis tersinkron ke Google Spreadsheet. Jika data dihapus di aplikasi, baris data pada spreadsheet juga otomatis terhapus.
              </div>

              {/* Action Button for Spreadsheet */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-emerald-200/60 dark:border-emerald-800/40">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Sinkronisasi Spreadsheet Terakhir:{" "}
                  <b className="text-slate-700 dark:text-slate-300">
                    {spreadsheetInfo?.lastSyncedAt || lastSyncedAt || "Siap disinkronkan"}
                  </b>
                </span>

                <button
                  type="button"
                  disabled={isSyncingSpreadsheet}
                  onClick={onSyncSpreadsheet}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSpreadsheet ? "animate-spin" : ""}`} />
                  <span>{isSyncingSpreadsheet ? "Menyinkronkan..." : "Sinkronkan Spreadsheet Sekarang"}</span>
                </button>
              </div>
            </div>

            {/* B. Google Drive Backup Sub-Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#111724] border border-slate-200 dark:border-slate-800/90 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Google Drive Cloud Backup (JSON)
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      File cadangan: <code className="font-mono text-slate-700 dark:text-slate-300">bbm_kendaraan_backup.json</code>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Terakhir: <b className="text-slate-700 dark:text-slate-300">{lastSyncedAt ? `${lastSyncedAt} WIB` : "Belum dicadangkan"}</b>
                </div>
              </div>

              {/* Manual Drive Actions */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={onManualSync}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition active:scale-95"
                >
                  <UploadCloud className={`w-4 h-4 ${isSyncing ? "animate-bounce" : ""}`} />
                  <span>{isSyncing ? "Menyinkronkan..." : "Cadangkan ke Drive Sekarang"}</span>
                </button>

                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={() => setShowRestoreConfirm(true)}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-[#1f283d] dark:hover:bg-[#27334d] disabled:opacity-50 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 transition active:scale-95"
                >
                  <DownloadCloud className="w-4 h-4 text-blue-500" />
                  <span>Pulihkan dari Drive</span>
                </button>
              </div>
            </div>

            {/* C. Auto-Sync Toggle */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#111724] border border-slate-200 dark:border-slate-800/90 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Sinkronisasi Otomatis Real-Time (Auto-Sync)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Otomatis menyinkronkan ke Google Drive &amp; Google Spreadsheet setiap ada data baru, edit, atau hapus
                </div>
              </div>

              <button
                type="button"
                onClick={() => onToggleAutoSync(!autoSync)}
                className={`w-11 h-6 rounded-full transition p-0.5 flex items-center shrink-0 ${
                  autoSync ? "bg-blue-600 justify-end" : "bg-slate-300 dark:bg-slate-700 justify-start"
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white shadow-sm" />
              </button>
            </div>
          </div>
        ) : (
          /* Disconnected State */
          <div className="space-y-3 pt-1">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#111724] border border-slate-200 dark:border-slate-800/90 text-xs space-y-2 text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Integrasi Cloud &amp; Google Spreadsheet Aman
              </div>
              <p className="leading-relaxed text-[11px]">
                Dengan menghubungkan akun Google Anda:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[11px]">
                <li>Data BBM, biaya, armada, dan struk otomatis tersinkron ke Google Spreadsheet pribadi Anda.</li>
                <li>Setiap data yang ditambahkan atau dihapus di aplikasi akan otomatis terupdate dan terhapus di spreadsheet.</li>
                <li>Mencadangkan file privat ke Google Drive (<code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-slate-800 dark:text-slate-300">bbm_kendaraan_backup.json</code>).</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {onOpenAuth && (
                <button
                  type="button"
                  id="settings-login-btn"
                  onClick={() => onOpenAuth("login")}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Masuk / Pendaftaran Akun</span>
                </button>
              )}

              <button
                type="button"
                id="settings-connect-google-btn"
                onClick={onConnectGoogle}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-white dark:bg-[#1a2336] hover:bg-slate-50 dark:hover:bg-[#202b42] text-slate-800 dark:text-white rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 shadow-sm transition active:scale-95"
              >
                {/* Google G Logo */}
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Masuk dengan Google</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Unit of Measurement Setting */}
      <div className="bg-white dark:bg-[#161d2d] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Satuan Unit Ukur Efisiensi Bahan Bakar
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pilih format perhitungan rata-rata konsumsi bahan bakar pada seluruh grafik dan laporan.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Option 1: km/L */}
          <button
            type="button"
            onClick={() => onChangeFuelUnit("km/l")}
            className={`p-3.5 rounded-xl border text-left transition flex items-start justify-between relative ${
              fuelUnit === "km/l"
                ? "bg-blue-50/70 dark:bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/30"
                : "bg-slate-50 dark:bg-[#111724] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  km/L
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                  Standar Indonesia
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                Kilometer per Liter
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Mengukur jarak tempuh (km) yang dapat dicapai setiap 1 liter bensin. 
                <span className="block text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                  Semakin tinggi nilai = semakin hemat.
                </span>
              </p>
            </div>

            <div
              className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                fuelUnit === "km/l"
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "border-slate-400 dark:border-slate-600"
              }`}
            >
              {fuelUnit === "km/l" && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
          </button>

          {/* Option 2: L/100km */}
          <button
            type="button"
            onClick={() => onChangeFuelUnit("l/100km")}
            className={`p-3.5 rounded-xl border text-left transition flex items-start justify-between relative ${
              fuelUnit === "l/100km"
                ? "bg-blue-50/70 dark:bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/30"
                : "bg-slate-50 dark:bg-[#111724] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  L/100km
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                  Standar Internasional
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                Liter per 100 Kilometer
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Mengukur liter bahan bakar yang diperlukan untuk menempuh jarak 100 km.
                <span className="block text-purple-600 dark:text-purple-400 font-semibold mt-0.5">
                  Semakin rendah nilai = semakin hemat.
                </span>
              </p>
            </div>

            <div
              className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                fuelUnit === "l/100km"
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "border-slate-400 dark:border-slate-600"
              }`}
            >
              {fuelUnit === "l/100km" && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
          </button>
        </div>

        {/* Conversion preview helper */}
        <div className="p-3 bg-slate-50 dark:bg-[#101622] rounded-xl border border-slate-200 dark:border-slate-800/80 flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400">
          <Info className="w-4 h-4 text-blue-500 shrink-0" />
          <span>
            <b>Contoh konversi:</b> Konsumsi <b>14.00 km/L</b> setara dengan{" "}
            <b>7.14 L/100km</b>. Aplikasi mengonversi nilai otomatis tanpa mengubah data asli.
          </span>
        </div>
      </div>

      {/* 3. Theme Preferences */}
      <div className="bg-white dark:bg-[#161d2d] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            {theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Tema Tampilan
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pilih mode tampilan terang (Light Mode) atau mode gelap (Dark Mode).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-2 ${
              theme === "light"
                ? "bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/30 font-bold"
                : "bg-slate-50 dark:bg-[#111724] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
            }`}
          >
            <Sun className="w-5 h-5 text-amber-500" />
            <span className="text-xs">Mode Terang (Light)</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-2 ${
              theme === "dark"
                ? "bg-blue-600/20 border-blue-500 text-white ring-2 ring-blue-500/30 font-bold"
                : "bg-slate-50 dark:bg-[#111724] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
            }`}
          >
            <Moon className="w-5 h-5 text-blue-400" />
            <span className="text-xs">Mode Gelap (Dark)</span>
          </button>
        </div>
      </div>

      {/* 4. Reset & Pembersihan Data */}
      <div className="bg-white dark:bg-[#161d2d] rounded-2xl border border-rose-200 dark:border-rose-900/30 shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Trash2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-rose-600 dark:text-rose-400">
              Pembersihan &amp; Reset Data
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hapus seluruh catatan BBM, riwayat biaya, dan kembalikan aplikasi ke kondisi awal bersih.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowResetConfirm(true)}
          className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold border border-rose-200 dark:border-rose-500/20 transition active:scale-95"
        >
          Bersihkan &amp; Reset Seluruh Data
        </button>
      </div>

      {/* Confirmation Modal for Reset Data */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#151c2b] border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-sm p-5 space-y-3 shadow-2xl text-slate-900 dark:text-slate-100 transition-colors">
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Konfirmasi Reset Seluruh Data
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Apakah Anda yakin ingin menghapus semua catatan BBM, riwayat servis, dan data kendaraan? Tindakan ini akan mengosongkan data lokal di browser Anda.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetAllData();
                  setShowResetConfirm(false);
                }}
                className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow-sm transition active:scale-95"
              >
                Ya, Bersihkan Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Restore from Google Drive */}
      {showRestoreConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#151c2b] border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-sm p-5 space-y-3 shadow-2xl text-slate-900 dark:text-slate-100 transition-colors">
            <div className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400">
              <DownloadCloud className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Pulihkan Data dari Google Drive?
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Tindakan ini akan mengunduh file cadangan terakhir dari Google Drive Anda dan menggantikan data saat ini di perangkat ini.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRestoreConfirm(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onRestoreFromDrive();
                  setShowRestoreConfirm(false);
                }}
                className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-sm transition active:scale-95"
              >
                Pulihkan Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
