import React from "react";
import { WifiOff, Cloud, CloudOff, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useOnlineStatus } from "../hooks/useOnlineStatus";

export type CloudStatus = "local" | "connecting" | "synced" | "syncing" | "error" | "offline";

interface Props {
  cloudStatus?: CloudStatus;
  cloudError?: string | null;
  isSyncing?: boolean;
  lastSyncedAt?: string | null;
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export const OfflineIndicator: React.FC<Props> = ({
  cloudStatus = "local",
  cloudError,
  isSyncing = false,
  lastSyncedAt = null,
}) => {
  const isOnline = useOnlineStatus();

  if (!isOnline) {
    return (
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xl backdrop-blur-md animate-in fade-in duration-200 border border-amber-500/40">
        <WifiOff className="w-3.5 h-3.5 animate-pulse" />
        <span>Mode Offline — Data tersimpan aman di perangkat</span>
      </div>
    );
  }

  // Akun lokal/tamu: tidak perlu badge cloud
  if (cloudStatus === "local") return null;

  if (cloudStatus === "error") {
    return (
      <div
        title={cloudError || "Gagal sinkron cloud"}
        className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xl backdrop-blur-md animate-in fade-in duration-200 border border-rose-500/40 max-w-[92vw]"
      >
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">Cloud bermasalah — data aman lokal</span>
      </div>
    );
  }

  if (cloudStatus === "connecting" || isSyncing || cloudStatus === "syncing") {
    return (
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xl backdrop-blur-md animate-in fade-in duration-200 border border-blue-500/40">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Menyinkron ke Cloud…</span>
      </div>
    );
  }

  if (cloudStatus === "synced" && lastSyncedAt) {
    return (
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 rounded-full bg-emerald-600/90 px-3 py-1 text-[11px] font-semibold text-white shadow-lg backdrop-blur-md border border-emerald-500/40">
        <CheckCircle2 className="w-3 h-3" />
        <span className="flex items-center gap-1">
          <Cloud className="w-3 h-3" />
          Tersinkron {formatTime(lastSyncedAt)}
        </span>
      </div>
    );
  }

  if (cloudStatus === "offline") {
    return (
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-slate-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xl border border-slate-600/40">
        <CloudOff className="w-3.5 h-3.5" />
        <span>Menunggu online untuk sinkron</span>
      </div>
    );
  }

  return null;
};
