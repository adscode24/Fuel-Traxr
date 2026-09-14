import React, { useState } from "react";
import {
  Cloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Download,
  Upload,
  LogOut,
  ShieldCheck,
  HardDrive,
  FileJson,
} from "lucide-react";
import { User } from "firebase/auth";
import { googleSignIn, logoutGoogle } from "../services/firebaseAuth";
import {
  syncDataToGoogleDrive,
  downloadDataFromGoogleDrive,
  SyncPayload,
} from "../services/driveService";

interface Props {
  user: User | null;
  setUser: (u: User | null) => void;
  autoSync: boolean;
  setAutoSync: (val: boolean) => void;
  lastSyncedAt: string | null;
  setLastSyncedAt: (val: string | null) => void;
  getDataPayload: () => SyncPayload;
  onRestoreData: (payload: SyncPayload) => void;
}

export const DriveSyncModal: React.FC<Props> = ({
  user,
  setUser,
  autoSync,
  setAutoSync,
  lastSyncedAt,
  setLastSyncedAt,
  getDataPayload,
  onRestoreData,
}) => {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showConfirmRestore, setShowConfirmRestore] = useState(false);
  const [downloadedPayload, setDownloadedPayload] = useState<SyncPayload | null>(null);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setMessage(null);
    try {
      const res = await googleSignIn();
      if (res?.user) {
        setUser(res.user);
        setMessage({
          type: "success",
          text: `Berhasil terhubung dengan akun Google: ${res.user.email}`,
        });
      }
    } catch (err: any) {
      console.error("Sign in failed:", err);
      setMessage({
        type: "error",
        text: err.message || "Gagal masuk dengan Google. Pastikan popup diizinkan.",
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutGoogle();
      setUser(null);
      setMessage({ type: "success", text: "Berhasil keluar dari akun Google." });
    } catch (err: any) {
      setMessage({ type: "error", text: "Gagal keluar." });
    }
  };

  const handleManualSync = async () => {
    if (!user) {
      setMessage({ type: "error", text: "Silakan masuk dengan akun Google terlebih dahulu." });
      return;
    }

    setIsSyncing(true);
    setMessage(null);
    try {
      const payload = getDataPayload();
      const res = await syncDataToGoogleDrive(payload);
      const timeStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      setLastSyncedAt(timeStr);
      setMessage({
        type: "success",
        text: `Data berhasil disinkronkan ke Google Drive pada ${timeStr} (File: bbm_kendaraan_backup.json)`,
      });
    } catch (err: any) {
      console.error("Sync error:", err);
      setMessage({
        type: "error",
        text: err.message || "Gagal menyinkronkan data ke Google Drive.",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePrepareRestore = async () => {
    if (!user) {
      setMessage({ type: "error", text: "Silakan masuk dengan akun Google terlebih dahulu." });
      return;
    }

    setIsRestoring(true);
    setMessage(null);
    try {
      const backup = await downloadDataFromGoogleDrive();
      setDownloadedPayload(backup);
      setShowConfirmRestore(true);
    } catch (err: any) {
      console.error("Download error:", err);
      setMessage({
        type: "error",
        text: err.message || "File cadangan tidak ditemukan di Google Drive Anda.",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleExecuteRestore = () => {
    if (!downloadedPayload) return;
    onRestoreData(downloadedPayload);
    setShowConfirmRestore(false);
    setDownloadedPayload(null);
    setMessage({
      type: "success",
      text: "Data dari Google Drive berhasil dipulihkan ke perangkat ini!",
    });
  };

  return (
    <div className="space-y-4 pb-20 max-w-2xl mx-auto">
      {/* Header Banner */}
      <div className="bg-[#182132] p-5 rounded-2xl border border-slate-800 flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
          <Cloud className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-white">
            Sinkronisasi Cloud Google Drive
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Simpan dan amankan riwayat pengisian BBM, kalkulasi konsumsi, dan jadwal servis berkala ke Google Drive pribadi Anda secara real-time.
          </p>
        </div>
      </div>

      {/* Status Message Notification */}
      {message && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 transition ${
            message.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
              : "bg-rose-950/40 border-rose-500/40 text-rose-300"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Account Section */}
      <div className="bg-[#182132] p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Akun Google Anda
          </span>
          {user && (
            <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              Terhubung
            </span>
          )}
        </div>

        {!user ? (
          <div className="space-y-3 pt-1">
            <p className="text-xs text-slate-300">
              Masuk dengan akun Google untuk mengaktifkan sinkronisasi otomatis ke Google Drive Anda:
            </p>

            {/* Official Google Sign-In Button */}
            <button
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs rounded-xl shadow-lg transition active:scale-95 disabled:opacity-60"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              <span>{isSigningIn ? "Menghubungkan..." : "Masuk dengan Google"}</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[#111724] rounded-xl border border-slate-700/80">
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "Google"}
                  className="w-10 h-10 rounded-full border border-slate-700"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  {user.email?.[0].toUpperCase()}
                </div>
              )}
              <div>
                <div className="text-xs font-semibold text-white">
                  {user.displayName || "Pengguna Google"}
                </div>
                <div className="text-[11px] text-slate-400">{user.email}</div>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-300 hover:bg-slate-800 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Keluar
            </button>
          </div>
        )}
      </div>

      {/* Sync Controls & Settings */}
      {user && (
        <div className="bg-[#182132] p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Pengaturan &amp; Operasi Sinkronisasi
            </span>
            {lastSyncedAt && (
              <span className="text-[11px] text-slate-400">
                Terakhir: <span className="text-slate-200 font-mono">{lastSyncedAt}</span>
              </span>
            )}
          </div>

          {/* Real-time Auto Sync Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-[#111724] rounded-xl border border-slate-700/80">
            <div>
              <div className="text-xs font-semibold text-white">
                Sinkronisasi Otomatis Real-Time
              </div>
              <p className="text-[11px] text-slate-400">
                Otomatis mencadangkan ke Google Drive setiap kali menambah atau menyunting catatan
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
            </label>
          </div>

          {/* Manual Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Sync Now */}
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition active:scale-95 disabled:opacity-60"
            >
              <Upload className={`w-4 h-4 ${isSyncing ? "animate-bounce" : ""}`} />
              <span>{isSyncing ? "Menyinkronkan..." : "Sinkronkan Sekarang"}</span>
            </button>

            {/* Restore from Drive */}
            <button
              onClick={handlePrepareRestore}
              disabled={isRestoring}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#20293d] hover:bg-[#28344e] text-slate-200 text-xs font-semibold border border-slate-700 shadow transition active:scale-95 disabled:opacity-60"
            >
              <Download className={`w-4 h-4 ${isRestoring ? "animate-spin" : ""}`} />
              <span>{isRestoring ? "Mengecek Cadangan..." : "Pulihkan dari Google Drive"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Technical File Info */}
      <div className="p-4 rounded-2xl bg-[#131926] border border-slate-800/80 text-xs text-slate-400 space-y-2">
        <div className="flex items-center gap-2 text-slate-300 font-semibold">
          <FileJson className="w-4 h-4 text-blue-400" />
          <span>Informasi Penyimpanan File</span>
        </div>
        <p className="leading-relaxed text-[11px]">
          Data tersimpan dalam file <code className="bg-slate-800 px-1 py-0.5 rounded text-blue-300">bbm_kendaraan_backup.json</code> di root Google Drive pengguna. File ini terenkripsi dan hanya dapat diakses oleh Anda secara pribadi.
        </p>
      </div>

      {/* Confirmation Modal for Restoring Data */}
      {showConfirmRestore && downloadedPayload && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-[#161c2b] border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-sm font-bold text-white">
                Konfirmasi Pemulihan Data dari Drive
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              File cadangan ditemukan tanggal{" "}
              <strong className="text-white">
                {new Date(downloadedPayload.exportedAt).toLocaleString("id-ID")}
              </strong>{" "}
              berisi:
            </p>

            <div className="p-3 bg-[#10141e] rounded-xl border border-slate-800 text-xs space-y-1 font-mono text-slate-300">
              <div>• Kendaraan: {downloadedPayload.vehicles?.length || 0} unit</div>
              <div>• Catatan BBM: {downloadedPayload.fuelRecords?.length || 0} data</div>
              <div>• Jadwal Servis: {downloadedPayload.services?.length || 0} item</div>
            </div>

            <p className="text-[11px] text-rose-300">
              Perhatian: Memulihkan data ini akan menimpa data catatan di perangkat Anda saat ini dengan data dari Google Drive.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmRestore(false);
                  setDownloadedPayload(null);
                }}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteRestore}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow transition"
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
