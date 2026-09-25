import React, { useMemo } from "react";
import {
  X,
  Gauge,
  Fuel,
  Wallet,
  Calendar,
  TrendingUp,
  Droplet,
  Wrench,
  CreditCard,
  Layers,
  MapPin,
  Clock,
  Plus,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Car,
} from "lucide-react";
import { Vehicle, FuelRecord, ServiceHistoryEntry, FuelEfficiencyUnit } from "../types";
import { formatEfficiency } from "../utils/unitConverter";
import { StationLogo } from "./StationLogo";
import { useAndroidBackButton } from "../hooks/useAndroidBackButton";

export type DashboardCardType = "konsumsi" | "bensin" | "lainnya";

interface Props {
  isOpen: boolean;
  cardType: DashboardCardType | null;
  onClose: () => void;
  selectedPeriod: string;
  periodLabel: string;
  vehicle: Vehicle | null;
  fuelRecords: FuelRecord[];
  maintenanceRecords: ServiceHistoryEntry[];
  fuelUnit?: FuelEfficiencyUnit;
  onOpenManualEntry?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const DashboardCardBottomSheet: React.FC<Props> = ({
  isOpen,
  cardType,
  onClose,
  selectedPeriod,
  periodLabel,
  vehicle,
  fuelRecords,
  maintenanceRecords,
  fuelUnit = "km/l",
  onOpenManualEntry,
  onNavigateTab,
}) => {
  // Support Android Back Button and browser history
  useAndroidBackButton({
    isOpen: isOpen && !!cardType,
    onClose,
    id: "dashboard_card_bottom_sheet",
  });

  // Sort records newest to oldest
  const sortedFuelRecords = useMemo(() => {
    return [...fuelRecords].sort((a, b) => {
      const dateCompare = (b.date || "").localeCompare(a.date || "");
      if (dateCompare !== 0) return dateCompare;
      return (b.odometer || 0) - (a.odometer || 0);
    });
  }, [fuelRecords]);

  const sortedMaintenanceRecords = useMemo(() => {
    return [...maintenanceRecords].sort((a, b) => {
      const dateCompare = (b.date || "").localeCompare(a.date || "");
      if (dateCompare !== 0) return dateCompare;
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    });
  }, [maintenanceRecords]);

  // Aggregate stats for "Konsumsi BBM"
  const konsumsiStats = useMemo(() => {
    const efficiencies = fuelRecords
      .map((r) => r.fuelEfficiencyKmPerL)
      .filter((e): e is number => typeof e === "number" && e > 0);

    const totalDistance = fuelRecords.reduce(
      (acc, r) => acc + (r.distanceTraveled || 0),
      0
    );
    const totalLiters = fuelRecords.reduce((acc, r) => acc + (r.liters || 0), 0);

    const avgEff =
      totalDistance > 0 && totalLiters > 0
        ? totalDistance / totalLiters
        : efficiencies.length > 0
        ? efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length
        : 0;

    return {
      avgEfficiency: formatEfficiency(avgEff, fuelUnit),
      totalDistance,
      totalLiters,
      count: fuelRecords.length,
      measuredCount: efficiencies.length,
    };
  }, [fuelRecords, fuelUnit]);

  // Aggregate stats for "Biaya Bensin"
  const bensinStats = useMemo(() => {
    const totalCost = fuelRecords.reduce((acc, r) => acc + (r.totalCost || 0), 0);
    const totalLiters = fuelRecords.reduce((acc, r) => acc + (r.liters || 0), 0);
    const count = fuelRecords.length;
    const avgPerFill = count > 0 ? totalCost / count : 0;
    const avgPricePerLiter = totalLiters > 0 ? totalCost / totalLiters : 0;

    return {
      totalCost,
      totalLiters,
      count,
      avgPerFill,
      avgPricePerLiter,
    };
  }, [fuelRecords]);

  // Aggregate stats for "Biaya Lainnya"
  const lainnyaStats = useMemo(() => {
    let serviceCost = 0;
    let etollCost = 0;
    let otherCost = 0;

    maintenanceRecords.forEach((item) => {
      const cost = Number(item.cost) || 0;
      const cat = (item.category || "").toLowerCase();
      if (
        cat === "service" ||
        cat === "oil" ||
        cat === "brake" ||
        cat === "transmission" ||
        cat === "filter" ||
        cat === "tires" ||
        cat === "general" ||
        cat.includes("servis") ||
        cat.includes("bengkel") ||
        cat.includes("perawatan")
      ) {
        serviceCost += cost;
      } else if (cat === "top up etoll" || cat === "etoll" || cat.includes("tol")) {
        etollCost += cost;
      } else {
        otherCost += cost;
      }
    });

    const totalCost = serviceCost + etollCost + otherCost;

    return {
      totalCost,
      count: maintenanceRecords.length,
      serviceCost,
      etollCost,
      otherCost,
    };
  }, [maintenanceRecords]);

  if (!isOpen || !cardType) return null;

  const formatRupiah = (val: number) =>
    `Rp ${Math.round(val).toLocaleString("id-ID")}`;

  const formatDateLabel = (dateStr: string, timeStr?: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    const formatted = !isNaN(d.getTime())
      ? d.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : dateStr;

    return timeStr ? `${formatted} • ${timeStr}` : formatted;
  };

  return (
    <div
      id="dashboard-card-sheet-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        id="dashboard-card-sheet-container"
        className="w-full max-w-2xl mx-auto bg-white dark:bg-[#131b2c] rounded-t-3xl border-t border-x border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[88vh] overflow-hidden animate-in slide-in-from-bottom duration-250 transition-all"
      >
        {/* Android drag pill */}
        <div className="pt-2.5 pb-1 flex justify-center">
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Sheet Header */}
        <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                cardType === "konsumsi"
                  ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : cardType === "bensin"
                  ? "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400"
                  : "bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400"
              }`}
            >
              {cardType === "konsumsi" && <Gauge className="w-5 h-5" />}
              {cardType === "bensin" && <Fuel className="w-5 h-5" />}
              {cardType === "lainnya" && <Wallet className="w-5 h-5" />}
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                {cardType === "konsumsi" && "Rincian Konsumsi BBM"}
                {cardType === "bensin" && "Rincian Biaya Bensin"}
                {cardType === "lainnya" && "Rincian Biaya Lainnya"}
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {periodLabel}
                </span>
                {vehicle && (
                  <>
                    <span>•</span>
                    <span className="truncate max-w-[140px] text-slate-600 dark:text-slate-400">
                      {vehicle.name}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary Card for Selected Period */}
        <div className="px-4 py-3 bg-slate-50/80 dark:bg-[#101726] border-b border-slate-100 dark:border-slate-800/80">
          {cardType === "konsumsi" && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white dark:bg-[#161f33] p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                  Rata-rata Efisiensi
                </span>
                <span className="text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                  {konsumsiStats.avgEfficiency.value}
                </span>
                <span className="text-[9px] text-slate-400">
                  {konsumsiStats.avgEfficiency.unitLabel}
                </span>
              </div>
              <div className="bg-white dark:bg-[#161f33] p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                  Jarak Ditempuh
                </span>
                <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white block mt-0.5">
                  {Math.round(konsumsiStats.totalDistance).toLocaleString("id-ID")}
                </span>
                <span className="text-[9px] text-slate-400">kilometer</span>
              </div>
              <div className="bg-white dark:bg-[#161f33] p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                  Total Bahan Bakar
                </span>
                <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white block mt-0.5">
                  {konsumsiStats.totalLiters.toFixed(1)}
                </span>
                <span className="text-[9px] text-slate-400">liter ({konsumsiStats.count}x isi)</span>
              </div>
            </div>
          )}

          {cardType === "bensin" && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white dark:bg-[#161f33] p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                  Total Biaya Bensin
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-blue-600 dark:text-blue-400 block mt-0.5 truncate">
                  {formatRupiah(bensinStats.totalCost)}
                </span>
                <span className="text-[9px] text-slate-400">
                  {bensinStats.count}x pengisian
                </span>
              </div>
              <div className="bg-white dark:bg-[#161f33] p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                  Rata-rata per Isi
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white block mt-0.5 truncate">
                  {formatRupiah(bensinStats.avgPerFill)}
                </span>
                <span className="text-[9px] text-slate-400">per transaksi</span>
              </div>
              <div className="bg-white dark:bg-[#161f33] p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                  Total Volume
                </span>
                <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white block mt-0.5">
                  {bensinStats.totalLiters.toFixed(1)}
                </span>
                <span className="text-[9px] text-slate-400">liter BBM</span>
              </div>
            </div>
          )}

          {cardType === "lainnya" && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white dark:bg-[#161f33] p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                  Total Biaya Lainnya
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-purple-600 dark:text-purple-400 block mt-0.5 truncate">
                  {formatRupiah(lainnyaStats.totalCost)}
                </span>
                <span className="text-[9px] text-slate-400">
                  {lainnyaStats.count} transaksi
                </span>
              </div>
              <div className="bg-white dark:bg-[#161f33] p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                  Biaya Servis
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white block mt-0.5 truncate">
                  {formatRupiah(lainnyaStats.serviceCost)}
                </span>
                <span className="text-[9px] text-slate-400">bengkel & oli</span>
              </div>
              <div className="bg-white dark:bg-[#161f33] p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                  Tol & Lainnya
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white block mt-0.5 truncate">
                  {formatRupiah(lainnyaStats.etollCost + lainnyaStats.otherCost)}
                </span>
                <span className="text-[9px] text-slate-400">operasional</span>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable List Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 overscroll-contain">
          {/* 1. KONSUMSI BBM LIST */}
          {cardType === "konsumsi" && (
            <>
              {sortedFuelRecords.length === 0 ? (
                <div className="text-center py-10 px-4 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                    <Droplet className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Tidak Ada Data Konsumsi
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                      Belum ada riwayat pengisian bahan bakar pada periode {periodLabel}.
                    </p>
                  </div>
                  {onOpenManualEntry && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenManualEntry();
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold shadow-sm hover:bg-blue-700 transition"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Catat Pengisian BBM</span>
                    </button>
                  )}
                </div>
              ) : (
                sortedFuelRecords.map((r, idx) => {
                  const effFormatted = r.fuelEfficiencyKmPerL
                    ? formatEfficiency(r.fuelEfficiencyKmPerL, fuelUnit)
                    : null;

                  return (
                    <div
                      key={r.id || `fuel-${idx}`}
                      className="p-3.5 rounded-2xl bg-white dark:bg-[#161f33] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2.5 transition-colors"
                    >
                      {/* Top row: Station & Date */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <StationLogo stationName={r.stationName} className="w-7 h-7 shrink-0" />
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {r.stationName || "SPBU"}
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3 shrink-0" />
                              <span>{formatDateLabel(r.date, r.time)}</span>
                            </p>
                          </div>
                        </div>

                        {/* Efficiency Badge */}
                        {effFormatted ? (
                          <div className="text-right shrink-0">
                            <span className="inline-flex items-baseline gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                              <span>{effFormatted.value}</span>
                              <span className="text-[10px] font-medium">
                                {effFormatted.unitLabel}
                              </span>
                            </span>
                            {r.distanceTraveled ? (
                              <span className="block text-[10px] text-slate-400 mt-0.5">
                                +{Math.round(r.distanceTraveled)} km
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg shrink-0">
                            Pengisian Pertama
                          </span>
                        )}
                      </div>

                      {/* Detail Pill Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                          {r.fuelType || "Bensin"}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {r.liters} Liter
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          Odo: {r.odometer.toLocaleString("id-ID")} km
                        </span>
                        {r.isFullTank && (
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 font-medium">
                            Full Tank
                          </span>
                        )}
                        <span className="ml-auto font-bold text-slate-900 dark:text-white">
                          {formatRupiah(r.totalCost)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}

          {/* 2. BIAYA BENSIN LIST */}
          {cardType === "bensin" && (
            <>
              {sortedFuelRecords.length === 0 ? (
                <div className="text-center py-10 px-4 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                    <Fuel className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Tidak Ada Data Biaya Bensin
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                      Belum ada transaksi pembelian bahan bakar pada periode {periodLabel}.
                    </p>
                  </div>
                  {onOpenManualEntry && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenManualEntry();
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold shadow-sm hover:bg-blue-700 transition"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Catat Pembelian Bensin</span>
                    </button>
                  )}
                </div>
              ) : (
                sortedFuelRecords.map((r, idx) => (
                  <div
                    key={r.id || `bensin-${idx}`}
                    className="p-3.5 rounded-2xl bg-white dark:bg-[#161f33] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2.5 transition-colors"
                  >
                    {/* Top row: SPBU & Total Cost */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <StationLogo stationName={r.stationName} className="w-7 h-7 shrink-0" />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {r.stationName || "SPBU"}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 shrink-0" />
                            <span>{formatDateLabel(r.date, r.time)}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400">
                          {formatRupiah(r.totalCost)}
                        </span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">
                          {r.liters} L @ {formatRupiah(r.pricePerLiter || (r.liters > 0 ? r.totalCost / r.liters : 0))}/L
                        </span>
                      </div>
                    </div>

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {r.fuelType || "Bensin"}
                        </span>
                        <span>•</span>
                        <span>Odo {r.odometer.toLocaleString("id-ID")} km</span>
                      </div>
                      {r.location && (
                        <span className="text-slate-400 truncate max-w-[150px] flex items-center gap-0.5">
                          <MapPin className="w-3 h-3" />
                          <span>{r.location}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {/* 3. BIAYA LAINNYA LIST */}
          {cardType === "lainnya" && (
            <>
              {sortedMaintenanceRecords.length === 0 ? (
                <div className="text-center py-10 px-4 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Tidak Ada Biaya Lainnya
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                      Belum ada catatan biaya servis, e-toll, atau pengeluaran lainnya pada periode {periodLabel}.
                    </p>
                  </div>
                  {onNavigateTab && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateTab("biaya");
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold shadow-sm hover:bg-purple-700 transition"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah di Menu Biaya</span>
                    </button>
                  )}
                </div>
              ) : (
                sortedMaintenanceRecords.map((m, idx) => {
                  const cat = (m.category || "").toLowerCase();
                  const isService =
                    cat === "service" ||
                    cat === "oil" ||
                    cat === "brake" ||
                    cat === "transmission" ||
                    cat === "filter" ||
                    cat === "tires" ||
                    cat === "general" ||
                    cat.includes("servis") ||
                    cat.includes("bengkel");

                  const isEtoll =
                    cat === "top up etoll" || cat === "etoll" || cat.includes("tol");

                  return (
                    <div
                      key={m.id || `maint-${idx}`}
                      className="p-3.5 rounded-2xl bg-white dark:bg-[#161f33] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                              isService
                                ? "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                : isEtoll
                                ? "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400"
                                : "bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400"
                            }`}
                          >
                            {isService ? (
                              <Wrench className="w-4 h-4" />
                            ) : isEtoll ? (
                              <CreditCard className="w-4 h-4" />
                            ) : (
                              <Layers className="w-4 h-4" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {m.title || "Pengeluaran"}
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3 shrink-0" />
                              <span>{formatDateLabel(m.date)}</span>
                              {m.workshop && (
                                <>
                                  <span>•</span>
                                  <span className="truncate">{m.workshop}</span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-sm font-extrabold text-purple-600 dark:text-purple-400">
                            {formatRupiah(m.cost || 0)}
                          </span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">
                            {m.category || "Biaya Lainnya"}
                          </span>
                        </div>
                      </div>

                      {/* Notes / Odometer */}
                      {(m.notes || m.odometer) && (
                        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                          {m.notes && (
                            <span className="italic truncate max-w-[200px]">
                              "{m.notes}"
                            </span>
                          )}
                          {m.odometer ? (
                            <span className="ml-auto font-medium">
                              Odometer: {m.odometer.toLocaleString("id-ID")} km
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>

        {/* Sheet Footer with Quick Actions & Safe Area */}
        <div className="p-4 bg-slate-50 dark:bg-[#0f1624] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            <span>Filter: </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {periodLabel}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {cardType === "lainnya" && onNavigateTab ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateTab("biaya");
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition active:scale-98"
              >
                <span>Kelola di Menu Biaya</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : onNavigateTab ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateTab("log");
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition active:scale-98"
              >
                <span>Buka Log Pengisian</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
