import React, { useState, useEffect, useRef } from "react";
import {
  X,
  User as UserIcon,
  Mail,
  LogOut,
  Car,
  Fuel,
  ShieldCheck,
  RefreshCw,
  Cloud,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  QrCode,
  Eye,
  EyeOff,
  Upload,
  Trash2,
  Maximize2,
} from "lucide-react";
import { User } from "firebase/auth";
import { logoutUser } from "../services/firebaseAuth";
import { BottomSheet } from "./BottomSheet";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  vehiclesCount: number;
  recordsCount: number;
  onOpenSwitchAccount: () => void;
  onLoggedOut: () => void;
  vaultCode?: string;
  cloudStatus?: "local" | "connecting" | "synced" | "syncing" | "error" | "offline";
  lastSyncedAt?: string | null;
}

export const UserProfileModal: React.FC<Props> = ({
  isOpen,
  onClose,
  user,
  vehiclesCount,
  recordsCount,
  onOpenSwitchAccount,
  onLoggedOut,
  vaultCode = "",
  cloudStatus = "local",
  lastSyncedAt = null,
}) => {

  const [loggingOut, setLoggingOut] = useState(false);

  // Barcode My Pertamina: tersimpan lokal per akun, default disembunyikan
  const barcodeKey = `digifuel_mypertamina_barcode_${user.uid}`;
  const [barcode, setBarcode] = useState<string | null>(null);
  const [showBarcode, setShowBarcode] = useState(false);
  const [barcodeFullscreen, setBarcodeFullscreen] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setShowBarcode(false);
    setBarcodeFullscreen(false);
    try {
      setBarcode(localStorage.getItem(barcodeKey));
    } catch {
      setBarcode(null);
    }
  }, [isOpen, barcodeKey]);

  if (!isOpen) return null;

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logoutUser();
      onLoggedOut();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoggingOut(false);
    }
  };

  const displayName = user.displayName || user.email?.split("@")[0] || "Pengguna";
  const email = user.email || "Email tidak tertera";
  const isGoogle = user.providerData?.some((p) => p.providerId === "google.com");

  const handleBarcodeFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          // QR harus tajam: simpan PNG max 900px
          const MAX_DIM = 900;
          let { width, height } = img;
          const scale = Math.min(1, MAX_DIM / Math.max(width, height));
          width = Math.round(width * scale);
          height = Math.round(height * scale);
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/png");
          try {
            localStorage.setItem(barcodeKey, dataUrl);
          } catch {
            // penyimpanan penuh — abaikan
          }
          setBarcode(dataUrl);
          setShowBarcode(false);
        } catch {
          // abaikan
        }
      };
      img.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBarcode = () => {
    try {
      localStorage.removeItem(barcodeKey);
    } catch {
      // abaikan
    }
    setBarcode(null);
    setShowBarcode(false);
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} id="user_profile" maxWidth="max-w-sm">
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Header with avatar */}
        <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white text-center">

          <div className="mx-auto w-16 h-16 rounded-2xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-xl font-black shadow-lg overflow-hidden mb-3">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={displayName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span>{displayName.slice(0, 2).toUpperCase()}</span>
            )}
          </div>

          <h3 className="text-base font-bold truncate">{displayName}</h3>
          <p className="text-xs text-blue-100/90 truncate mt-0.5">{email}</p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/15 border border-white/20 text-blue-50">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
            <span>Akun Aktif • {isGoogle ? "Login Google" : "Email & Sandi"}</span>
          </div>
        </div>

        {/* Profile Content */}
        <div className="p-5 space-y-4">
          {/* User Data Stats */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#101622] border border-slate-200 dark:border-slate-800 text-center">
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-1.5">
                <Car className="w-4 h-4" />
              </div>
              <div className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                {vehiclesCount}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Kendaraan Tersimpan
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#101622] border border-slate-200 dark:border-slate-800 text-center">
              <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-1.5">
                <Fuel className="w-4 h-4" />
              </div>
              <div className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                {recordsCount}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Total Isi Bensin
              </div>
            </div>
          </div>

          {/* Sync status info */}
          <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[11px] leading-relaxed">
              Data Anda aman dan terisolasi khusus untuk akun <strong>{displayName}</strong>.
              {vaultCode ? (
                <span className="block mt-1">
                  Kode Vault Cloud: <strong className="font-mono tracking-widest">{vaultCode}</strong>
                  <span className="block text-emerald-700/80 dark:text-emerald-300/80">
                    {cloudStatus === "synced"
                      ? `Tersinkron${lastSyncedAt ? " • " + new Date(lastSyncedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : ""}`
                      : cloudStatus === "offline"
                      ? "Offline — akan sinkron otomatis saat online"
                      : cloudStatus === "error"
                      ? "Gagal sinkron — data aman lokal"
                      : "Menghubungkan cloud…"}
                  </span>
                </span>
              ) : (
                <span className="block mt-1 text-amber-700 dark:text-amber-300">
                  Vault cloud belum aktif (akun lokal/offline).
                </span>
              )}
            </span>
          </div>

          {/* Barcode My Pertamina */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#101622] border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Barcode My Pertamina
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Ditampilkan tersembunyi demi keamanan
                  </div>
                </div>
              </div>
              {barcode && (
                <button
                  type="button"
                  onClick={() => setShowBarcode((v) => !v)}
                  className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition"
                  title={showBarcode ? "Sembunyikan barcode" : "Tampilkan barcode"}
                  aria-label={showBarcode ? "Sembunyikan barcode" : "Tampilkan barcode"}
                >
                  {showBarcode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
            </div>

            <div className="mt-2.5">
              {barcode ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white">
                  <img
                    src={barcode}
                    alt="Barcode My Pertamina"
                    className={`w-full max-h-56 object-contain bg-white transition-all ${
                      showBarcode ? "" : "blur-lg select-none pointer-events-none"
                    }`}
                    draggable={false}
                  />
                  {!showBarcode && (
                    <button
                      type="button"
                      onClick={() => setShowBarcode(true)}
                      className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-slate-900/40 text-white transition"
                    >
                      <Eye className="w-6 h-6" />
                      <span className="text-[11px] font-semibold">Ketuk untuk menampilkan</span>
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => barcodeInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-red-500 bg-white dark:bg-[#10141e] text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 text-xs font-medium transition cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Barcode dari Galeri / Kamera</span>
                </button>
              )}
              <input
                ref={barcodeInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (barcodeInputRef.current) barcodeInputRef.current.value = "";
                  if (file) handleBarcodeFile(file);
                }}
              />
              {barcode && showBarcode && (
                <button
                  type="button"
                  onClick={() => setBarcodeFullscreen(true)}
                  className="mt-2 w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-700 dark:text-red-300 text-xs font-bold transition"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span>Klik untuk Memperbesar</span>
                </button>
              )}
              {barcode && (
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => barcodeInputRef.current?.click()}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#182133] dark:hover:bg-[#1f2b42] text-slate-600 dark:text-slate-300 text-[11px] font-semibold transition"
                  >
                    Ganti Barcode
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveBarcode}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
                    title="Hapus barcode"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              id="btn-switch-account"
              onClick={() => {
                onClose();
                onOpenSwitchAccount();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#182133] dark:hover:bg-[#1f2b42] text-slate-700 dark:text-slate-200 text-xs font-semibold transition flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Ganti Akun / Masuk Akun Lain</span>
            </button>

            <button
              type="button"
              id="btn-logout-account"
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full py-2.5 px-4 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-500/15 dark:hover:bg-red-500/25 text-red-600 dark:text-red-400 text-xs font-semibold border border-red-200 dark:border-red-500/20 transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loggingOut ? (
                <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar dari Akun</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen Barcode My Pertamina */}
      {barcode && showBarcode && barcodeFullscreen && (
        <div
          className="fixed inset-0 z-[70] bg-black/95 flex flex-col animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setBarcodeFullscreen(false);
          }}
        >
          <div className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2 text-white shrink-0">
            <span className="text-xs font-bold">Barcode My Pertamina</span>
            <button
              type="button"
              onClick={() => setBarcodeFullscreen(false)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
              title="Tutup"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center p-4">
            <img
              src={barcode}
              alt="Barcode My Pertamina fullscreen"
              className="max-w-full max-h-full object-contain rounded-xl bg-white shadow-2xl"
              draggable={false}
            />
          </div>
          <p className="text-center text-[11px] text-white/70 pb-[max(1.5rem,env(safe-area-inset-bottom))] px-6 shrink-0">
            Tunjukkan ke kasir • ketuk area gelap atau tombol × untuk kembali
          </p>
        </div>
      )}
    </BottomSheet>
  );
};
