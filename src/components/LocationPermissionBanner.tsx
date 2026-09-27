import React, { useState, useEffect } from "react";
import { MapPin, Check, X, Navigation, Loader2 } from "lucide-react";
import {
  getStoredUserLocation,
  hasAskedLocationPermission,
  requestAndDetectUserLocation,
  setAskedLocationPermission,
  UserLocationInfo,
} from "../services/locationService";

interface Props {
  onLocationUpdated?: (info: UserLocationInfo) => void;
  onRequestManualPrompt?: boolean;
}

export const LocationPermissionBanner: React.FC<Props> = ({
  onLocationUpdated,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [detectedLocation, setDetectedLocation] = useState<UserLocationInfo | null>(
    () => getStoredUserLocation()
  );

  useEffect(() => {
    // Check if permission prompt has been asked
    const alreadyAsked = hasAskedLocationPermission();
    const stored = getStoredUserLocation();

    if (!alreadyAsked && !stored) {
      // Show prompt on first entry after a short delay
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleGrantPermission = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const loc = await requestAndDetectUserLocation();
      setDetectedLocation(loc);
      setIsVisible(false);
      if (onLocationUpdated) {
        onLocationUpdated(loc);
      }
    } catch (err: unknown) {
      console.warn("Location error:", err);
      // Tetap tampil + tampilkan pesan agar pengguna bisa mencoba lagi.
      setErrorMsg((err as Error)?.message || "Gagal mendeteksi lokasi.");
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setAskedLocationPermission();
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white dark:bg-[#192235] p-4 rounded-2xl border border-blue-200 dark:border-blue-900/60 shadow-xl shadow-blue-500/10 flex items-start gap-3 text-slate-800 dark:text-slate-100">
        <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
          <MapPin className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              Izinkan Akses Lokasi?
            </h4>
            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            Aktifkan lokasi agar aplikasi otomatis mengisi kota dan menampilkan daftar SPBU di sekitar Anda saat mencatat bensin.
          </p>
          {errorMsg && (
            <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1.5 leading-relaxed bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-lg p-2">
              {errorMsg}
            </p>
          )}
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={handleGrantPermission}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition shadow-xs disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Mendeteksi...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-3.5 h-3.5" />
                  <span>{errorMsg ? "Coba Lagi" : "Izinkan Lokasi"}</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-xl transition"
            >
              Nanti Saja
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
