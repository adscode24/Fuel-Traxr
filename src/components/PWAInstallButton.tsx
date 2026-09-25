import React, { useState } from "react";
import { Download, Smartphone, CheckCircle2, X } from "lucide-react";
import { usePWAInstall } from "../hooks/usePWAInstall";

interface Props {
  variant?: "primary" | "compact" | "banner";
  className?: string;
}

export const PWAInstallButton: React.FC<Props> = ({
  variant = "primary",
  className = "",
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed as native standalone app, hide the button
  if (isInstalled) {
    if (variant === "banner") {
      return (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Aplikasi sudah terpasang di perangkat Anda sebagai aplikasi mandiri.</span>
        </div>
      );
    }
    return null;
  }

  // Android / Chromium / Desktop Install Flow
  if (isInstallable) {
    if (variant === "compact") {
      return (
        <button
          onClick={install}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition active:scale-95 ${className}`}
          title="Pasang Aplikasi ke Android"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Pasang App</span>
        </button>
      );
    }

    if (variant === "banner") {
      return (
        <div className="flex items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-white shadow-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold truncate">Pasang ke Layar Utama Android</div>
              <div className="text-[11px] text-blue-100 truncate">Akses cepat offline seperti aplikasi bawaan</div>
            </div>
          </div>
          <button
            onClick={install}
            className="px-3 py-1.5 rounded-lg bg-white text-blue-700 hover:bg-blue-50 text-xs font-bold shrink-0 shadow-xs transition active:scale-95 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Pasang</span>
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={install}
        className={`flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition active:scale-95 ${className}`}
      >
        <Smartphone className="w-4 h-4" />
        <span>Pasang Aplikasi Android</span>
      </button>
    );
  }

  // iOS Safari Flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition ${className}`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Pasang di iPhone / iPad</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#161d2d] p-5 shadow-2xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold">Pasang di iPhone / Safari</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-2 list-decimal list-inside">
                <li>Buka di browser <strong>Safari</strong>.</li>
                <li>Ketuk tombol <strong>Bagikan / Share</strong> (ikon kotak dengan panah atas) di menu bawah.</li>
                <li>Pilih <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong>.</li>
                <li>Ketuk <strong>Tambah</strong> di pojok kanan atas.</li>
              </ol>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-xl bg-blue-600 hover:bg-blue-700 py-2 text-xs font-bold text-white transition"
              >
                Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
