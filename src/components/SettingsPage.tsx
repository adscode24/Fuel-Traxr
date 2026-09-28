import React, { useState, useRef } from "react";
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
  HardDrive,
  Download,
  Upload,
  CheckCircle2,
  ShieldCheck,
  FileJson,
  LogIn,
  User as UserIcon,
  LogOut,
  Copy,
} from "lucide-react";
import { User } from "firebase/auth";
import { FuelEfficiencyUnit, Vehicle, FuelRecord, ServiceHistoryEntry } from "../types";
import { useTheme } from "../context/ThemeContext";
import { DeviceBackupPayload, parseDeviceBackupFile } from "../services/storage";
import { usePWAInstall } from "../hooks/usePWAInstall";

interface Props {
  fuelUnit: FuelEfficiencyUnit;
  onChangeFuelUnit: (unit: FuelEfficiencyUnit) => void;
  vehicles: Vehicle[];
  records: FuelRecord[];
  serviceHistory: ServiceHistoryEntry[];
  onResetAllData: () => void;
  onExportDeviceBackup: () => void;
  onImportDeviceBackup: (backup: Partial<DeviceBackupPayload>) => void;
  user: User | null;
  onOpenAuth?: (mode?: "login" | "register") => void;
  onOpenProfile?: () => void;
  onSignOut?: () => void;
  vaultCode?: string;
  cloudStatus?: "local" | "connecting" | "synced" | "syncing" | "error" | "offline";
  cloudError?: string | null;
  lastSyncedAt?: string | null;
  isSyncing?: boolean;
  onSyncNow?: () => void;
}

export const SettingsPage: React.FC<Props> = ({
  fuelUnit,
  onChangeFuelUnit,
  vehicles,
  records,
  serviceHistory,
  onResetAllData,
  onExportDeviceBackup,
  onImportDeviceBackup,
  user,
  onOpenAuth,
  onOpenProfile,
  onSignOut,
  vaultCode = "",
  cloudStatus = "local",
  cloudError = null,
  lastSyncedAt = null,
  isSyncing = false,
  onSyncNow,
}) => {
  const { theme, setTheme } = useTheme();
  const { isInstalled } = usePWAInstall();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [pendingBackupData, setPendingBackupData] = useState<Partial<DeviceBackupPayload> | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  const handleCopyText = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedCommand(id);
      setTimeout(() => setCopiedCommand(null), 2500);
    } catch {
      // fallback
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportSuccessMsg(null);

    try {
      const parsed = await parseDeviceBackupFile(file);
      setPendingBackupData(parsed);
      setShowImportConfirm(true);
    } catch (err: any) {
      setImportError(err.message || "Gagal memproses file cadangan.");
    } finally {
      // Reset input value so same file can be re-selected if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleConfirmImport = () => {
    if (pendingBackupData) {
      onImportDeviceBackup(pendingBackupData);
      setShowImportConfirm(false);
      setPendingBackupData(null);
      setImportSuccessMsg("Data berhasil dipulihkan ke perangkat ini!");
      setTimeout(() => setImportSuccessMsg(null), 4000);
    }
  };

  return (
    <div className="space-y-4 pb-24 text-slate-800 dark:text-slate-100 transition-colors">
      {/* Header Banner */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#161d2d] border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white">
            Pengaturan &amp; Penyimpanan
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isInstalled
              ? "Kelola penyimpanan lokal di perangkat, cadangan offline, dan tema."
              : "Kelola penyimpanan lokal di perangkat, instalasi APK Android, cadangan offline, dan tema."}
          </p>
        </div>
      </div>

      {/* Cloud Vault: akun online tersinkron multi-perangkat */}
      <div className="bg-white dark:bg-[#161d2d] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Database className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Cloud Vault — Sinkron Multi-Perangkat
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {user && vaultCode
                  ? "Akun ini tersinkron online. Login email yang sama di HP lain = data sama."
                  : "Masuk dengan email untuk mengaktifkan vault cloud pribadi."}
              </p>
            </div>
          </div>
          {user && vaultCode ? (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                cloudStatus === "synced"
                  ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30"
                  : cloudStatus === "error"
                  ? "bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30"
                  : "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30"
              }`}
            >
              {cloudStatus === "synced" ? "Tersinkron" : cloudStatus === "error" ? "Gagal sinkron" : cloudStatus === "offline" ? "Offline" : "Menyinkron…"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              Mode Lokal
            </span>
          )}
        </div>

        {user && vaultCode ? (
          <div className="space-y-2.5">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#111724] border border-slate-200/90 dark:border-slate-800/90">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Kode Vault Cloud Anda</div>
              <div className="flex items-center justify-between gap-2 mt-1">
                <span className="font-mono text-lg font-extrabold tracking-widest text-slate-900 dark:text-white">
                  {vaultCode}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyText(vaultCode, "vault-code")}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg border border-blue-200 dark:border-blue-500/20 transition cursor-pointer"
                >
                  {copiedCommand === "vault-code" ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span className="text-emerald-500">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Salin</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Setiap email punya vault terisolasi sendiri. Teman yang login dengan email & sandi yang sama akan melihat data yang sama dan setiap edit tersinkron otomatis.
                {lastSyncedAt && (
                  <span className="block mt-0.5">
                    Terakhir sinkron: {new Date(lastSyncedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                )}
              </p>
            </div>
            {cloudError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{cloudError}</span>
              </div>
            )}
            {onSyncNow && (
              <button
                type="button"
                onClick={onSyncNow}
                disabled={isSyncing}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-98 cursor-pointer"
              >
                {isSyncing ? "Menyinkron…" : "Sinkronkan Sekarang"}
              </button>
            )}
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#111724] border border-slate-200/90 dark:border-slate-800/90 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Daftar/masuk dengan <b>Email & Kata Sandi</b> untuk mendapatkan <b>Kode Vault Cloud</b> pribadi. Data kendaraan, BBM, dan servis lalu tersimpan online per akun dan otomatis sama di semua HP/laptop yang login dengan akun tersebut. Tanpa login, data hanya tersimpan di perangkat ini.
            {onOpenAuth && (
              <button
                type="button"
                onClick={() => onOpenAuth("register")}
                className="mt-2 w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Aktifkan Cloud Vault Saya
              </button>
            )}
          </div>
        )}
      </div>

      {/* 1. Penyimpanan Lokal di Perangkat (Device-Only Storage & Backup) */}
      <div className="bg-white dark:bg-[#161d2d] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-4 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <HardDrive className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Penyimpanan Data di Perangkat
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Data tersimpan secara mandiri di memori perangkat ini (Offline-First).
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Penyimpanan Lokal Aktif
          </span>
        </div>

        {/* Device Storage Status Overview */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#111724] border border-slate-200/90 dark:border-slate-800/90 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Keamanan &amp; Privasi Data Lokal</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
            Cache lokal offline-first untuk kecepatan + <b>Cloud Vault</b> untuk sinkron multi-perangkat saat login email. Tanpa login, data 100% privat hanya di perangkat ini. Saat login, setiap edit otomatis tersinkron ke semua perangkat dengan akun yang sama.
          </p>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
            <div className="p-2 rounded-lg bg-white dark:bg-[#182133] border border-slate-200 dark:border-slate-700/80">
              <span className="block text-base font-extrabold text-slate-900 dark:text-white">
                {vehicles.length}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans">
                Kendaraan
              </span>
            </div>
            <div className="p-2 rounded-lg bg-white dark:bg-[#182133] border border-slate-200 dark:border-slate-700/80">
              <span className="block text-base font-extrabold text-blue-600 dark:text-blue-400">
                {records.length}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans">
                Catatan BBM
              </span>
            </div>
            <div className="p-2 rounded-lg bg-white dark:bg-[#182133] border border-slate-200 dark:border-slate-700/80">
              <span className="block text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                {serviceHistory.length}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans">
                Riwayat Servis
              </span>
            </div>
          </div>
        </div>

        {/* Feedback Messages */}
        {importSuccessMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{importSuccessMsg}</span>
          </div>
        )}

        {importError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{importError}</span>
          </div>
        )}

        {/* Backup & Restore Action Buttons */}
        <div className="space-y-2 pt-1">
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Cadangkan &amp; Pulihkan Berkas Perangkat
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Download Backup to Device */}
            <button
              type="button"
              id="export-backup-btn"
              onClick={onExportDeviceBackup}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-98 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Cadangkan ke File (.json)</span>
            </button>

            {/* Restore from File on Device */}
            <button
              type="button"
              id="import-backup-btn"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 hover:bg-slate-200/90 dark:bg-[#1f283d] dark:hover:bg-[#27334d] text-slate-800 dark:text-white rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-xs transition active:scale-98 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-blue-500" />
              <span>Pulihkan dari File (.json)</span>
            </button>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Tip: Simpan file cadangan secara berkala agar Anda dapat memindahkannya antar perangkat atau memulihkan data sewaktu-waktu.
          </p>
        </div>

        {/* Optional Account Profile Info if User Is Logged In */}
        {user ? (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                  {user.displayName || "Pengguna"}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  {user.email}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onOpenProfile && (
                <button
                  type="button"
                  onClick={onOpenProfile}
                  className="px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg border border-blue-200 dark:border-blue-500/20 transition cursor-pointer"
                >
                  Profil
                </button>
              )}
              {onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="px-3 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg border border-rose-200 dark:border-rose-500/20 transition cursor-pointer"
                >
                  Keluar
                </button>
              )}
            </div>
          </div>
        ) : onOpenAuth ? (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Ingin menggunakan akun pribadi?
            </span>
            <button
              type="button"
              onClick={() => onOpenAuth("login")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg transition cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-blue-500" />
              <span>Masuk / Daftar Akun</span>
            </button>
          </div>
        ) : null}
      </div>

      {/* 2. Satuan Unit Ukur Efisiensi Bahan Bakar */}
      <div className="bg-white dark:bg-[#161d2d] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-4 space-y-3">
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
            className={`p-3.5 rounded-xl border text-left transition flex items-start justify-between relative cursor-pointer ${
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
            className={`p-3.5 rounded-xl border text-left transition flex items-start justify-between relative cursor-pointer ${
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

      {/* 4. Theme Preferences */}
      <div className="bg-white dark:bg-[#161d2d] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-4 space-y-3">
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
            className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-2 cursor-pointer ${
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
            className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-2 cursor-pointer ${
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
      <div className="bg-white dark:bg-[#161d2d] rounded-2xl border border-rose-200 dark:border-rose-900/30 shadow-xs p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Trash2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-rose-600 dark:text-rose-400">
              Pembersihan &amp; Reset Data
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hapus seluruh catatan BBM, riwayat biaya, dan kembalikan aplikasi ke kondisi awal bersih di perangkat ini.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowResetConfirm(true)}
          className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold border border-rose-200 dark:border-rose-500/20 transition active:scale-98 cursor-pointer"
        >
          Bersihkan &amp; Reset Seluruh Data Lokal
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
              Apakah Anda yakin ingin menghapus semua catatan BBM, riwayat servis, dan data kendaraan? Tindakan ini akan mengosongkan data lokal di memori perangkat ini.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetAllData();
                  setShowResetConfirm(false);
                }}
                className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow-sm transition active:scale-95 cursor-pointer"
              >
                Ya, Bersihkan Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Restoring from Device JSON File */}
      {showImportConfirm && pendingBackupData && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#151c2b] border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-sm p-5 space-y-3 shadow-2xl text-slate-900 dark:text-slate-100 transition-colors">
            <div className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400">
              <FileJson className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Pulihkan Data dari Berkas Cadangan?
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              File cadangan memuat:
            </p>
            <ul className="text-xs text-slate-700 dark:text-slate-300 list-disc pl-5 space-y-1 font-mono">
              <li>{pendingBackupData.vehicles?.length || 0} Kendaraan</li>
              <li>{pendingBackupData.fuelRecords?.length || 0} Catatan BBM</li>
              <li>{pendingBackupData.serviceHistory?.length || 0} Riwayat Servis &amp; Biaya</li>
            </ul>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Data yang ada di perangkat saat ini akan digantikan oleh isi file cadangan tersebut. Lanjutkan?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowImportConfirm(false);
                  setPendingBackupData(null);
                }}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-sm transition active:scale-95 cursor-pointer"
              >
                Ya, Pulihkan Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
