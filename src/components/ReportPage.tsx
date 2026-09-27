import React, { useState, useMemo } from "react";
import {
  FileSpreadsheet,
  FileDown,
  Printer,
  Calendar,
  DollarSign,
  TrendingUp,
  Droplet,
  Wrench,
  Car,
  ChevronRight,
  Sparkles,
  Info,
  Filter,
  RotateCcw,
  Plus,
} from "lucide-react";
import {
  Vehicle,
  FuelRecord,
  ServiceItem,
  ServiceHistoryEntry,
  MonthlySummary,
  FuelEfficiencyUnit,
} from "../types";
import { formatEfficiency, getUnitLabel } from "../utils/unitConverter";
import { exportToExcel, exportToPDF } from "../services/exportService";
import { downloadExportFile } from "../services/fileDownload";
import { calculateMonthlySummaries } from "../services/storage";

interface Props {
  vehicle: Vehicle | null;
  vehicles: Vehicle[];
  records: FuelRecord[];
  services: ServiceItem[];
  serviceHistory: ServiceHistoryEntry[];
  fuelUnit?: FuelEfficiencyUnit;
  onOpenRegisterVehicle?: () => void;
}

export const ReportPage: React.FC<Props> = ({
  vehicle,
  vehicles,
  records,
  services,
  serviceHistory,
  fuelUnit = "km/l",
  onOpenRegisterVehicle,
}) => {
  // Filters: Vehicle & Date Range
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    vehicle?.id || "all"
  );
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [exportMsg, setExportMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [exportBusy, setExportBusy] = useState<"excel" | "pdf" | null>(null);

  // Format currency
  const formatRupiah = (val: number, withDecimals = false) => {
    const parts = val.toFixed(withDecimals ? 2 : 0).split(".");
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return withDecimals ? `Rp${integerPart},${parts[1] || "00"}` : `Rp${integerPart}`;
  };

  // Selected vehicle object or "Semua Kendaraan"
  const selectedVehicle = useMemo(() => {
    if (selectedVehicleId === "all") {
      return {
        id: "all",
        name: "Semua Kendaraan",
        type: "car" as const,
        licensePlate: "Semua Armada",
        currentOdometer: vehicles.reduce((sum, v) => sum + (v.currentOdometer || 0), 0),
        fuelTankCapacity: 0,
        defaultFuelType: "Campuran",
      };
    }
    return vehicles.find((v) => v.id === selectedVehicleId) || vehicle;
  }, [vehicles, selectedVehicleId, vehicle]);

  // Apply Quick Date Range Presets
  const applyPreset = (preset: "all" | "this-month" | "last-month" | "this-year" | "last-30") => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");

    if (preset === "all") {
      setStartDate("");
      setEndDate("");
    } else if (preset === "this-month") {
      const y = now.getFullYear();
      const m = now.getMonth();
      const firstDay = `${y}-${pad(m + 1)}-01`;
      const lastDayDate = new Date(y, m + 1, 0).getDate();
      const lastDay = `${y}-${pad(m + 1)}-${pad(lastDayDate)}`;
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (preset === "last-month") {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const y = prev.getFullYear();
      const m = prev.getMonth();
      const firstDay = `${y}-${pad(m + 1)}-01`;
      const lastDayDate = new Date(y, m + 1, 0).getDate();
      const lastDay = `${y}-${pad(m + 1)}-${pad(lastDayDate)}`;
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (preset === "this-year") {
      const y = now.getFullYear();
      setStartDate(`${y}-01-01`);
      setEndDate(`${y}-12-31`);
    } else if (preset === "last-30") {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(thirtyDaysAgo.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    }
  };

  // 1. Filter records by vehicle and date range
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Vehicle filter
      if (selectedVehicleId !== "all" && r.vehicleId !== selectedVehicleId) {
        return false;
      }
      // Date range filter
      if (startDate && r.date < startDate) {
        return false;
      }
      if (endDate && r.date > endDate) {
        return false;
      }
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [records, selectedVehicleId, startDate, endDate]);

  // 2. Filter service history by vehicle and date range
  const filteredHistory = useMemo(() => {
    return serviceHistory.filter((h) => {
      // Vehicle filter
      if (selectedVehicleId !== "all" && h.vehicleId !== selectedVehicleId) {
        return false;
      }
      // Date range filter
      if (startDate && h.date < startDate) {
        return false;
      }
      if (endDate && h.date > endDate) {
        return false;
      }
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [serviceHistory, selectedVehicleId, startDate, endDate]);

  // 3. Dynamic monthly summaries for filtered records
  const dynamicMonthlySummaries = useMemo(() => {
    return calculateMonthlySummaries(filteredRecords);
  }, [filteredRecords]);

  // Aggregated KPIs
  const totalFuelCost = useMemo(() => {
    return filteredRecords.reduce((sum, r) => sum + r.totalCost, 0);
  }, [filteredRecords]);

  const totalServiceCost = useMemo(() => {
    return filteredHistory.reduce((sum, h) => sum + (h.cost || 0), 0);
  }, [filteredHistory]);

  const totalVehicleSpend = totalFuelCost + totalServiceCost;

  const totalLiters = useMemo(() => {
    return filteredRecords.reduce((sum, r) => sum + r.liters, 0);
  }, [filteredRecords]);

  const totalDistance = useMemo(() => {
    return filteredRecords.reduce((sum, r) => sum + (r.distanceTraveled || 0), 0);
  }, [filteredRecords]);

  const rawEfficiency =
    totalLiters > 0 && totalDistance > 0
      ? totalDistance / totalLiters
      : null;

  const efficiencyFormatted = formatEfficiency(rawEfficiency, fuelUnit);

  const avgCostPerKm =
    totalDistance > 0 ? Math.round(totalFuelCost / totalDistance) : null;

  // Export handlers with current filtered data
  const handleExportExcel = async () => {
    if (exportBusy) return;
    setExportBusy("excel");
    setExportMsg(null);
    try {
      const file = exportToExcel(
        selectedVehicle,
        filteredRecords,
        services,
        dynamicMonthlySummaries,
        filteredHistory
      );
      const how = await downloadExportFile(file);
      setExportMsg({
        type: "ok",
        text:
          how === "shared"
            ? "Excel siap — pilih tujuan di dialog Share untuk menyimpan."
            : `Excel terunduh: ${file.fileName}`,
      });
    } catch (err: unknown) {
      setExportMsg({
        type: "err",
        text: "Gagal mengekspor Excel: " + ((err as Error)?.message || "kesalahan tidak dikenal"),
      });
    } finally {
      setExportBusy(null);
    }
  };

  const handleExportPdf = async () => {
    if (exportBusy) return;
    setExportBusy("pdf");
    setExportMsg(null);
    try {
      const file = exportToPDF(
        selectedVehicle,
        filteredRecords,
        services,
        dynamicMonthlySummaries,
        filteredHistory
      );
      const how = await downloadExportFile(file);
      setExportMsg({
        type: "ok",
        text:
          how === "shared"
            ? "PDF siap — pilih tujuan di dialog Share untuk menyimpan."
            : `PDF terunduh: ${file.fileName}`,
      });
    } catch (err: unknown) {
      setExportMsg({
        type: "err",
        text: "Gagal mengekspor PDF: " + ((err as Error)?.message || "kesalahan tidak dikenal"),
      });
    } finally {
      setExportBusy(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // If no vehicle registered yet
  if (!vehicle && vehicles.length === 0) {
    return (
      <div className="space-y-4 pb-28">
        <div className="bg-white dark:bg-[#151c2c] p-7 rounded-2xl border-2 border-dashed border-blue-300 dark:border-blue-700/60 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
            <Car className="w-7 h-7" />
          </div>
          <div className="max-w-sm mx-auto">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Daftarkan Kendaraan Anda
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Anda belum mendaftarkan kendaraan. Daftarkan mobil atau motor Anda untuk melihat laporan pengeluaran, konsumsi bensin, dan ekspor ke Excel / PDF.
            </p>
          </div>
          <button
            onClick={onOpenRegisterVehicle}
            className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>Daftarkan Kendaraan Anda</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 text-slate-800 dark:text-slate-100 transition-colors">
      {/* Title & Filter Control Card */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#161d2d] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase tracking-wider">
                Laporan &amp; Analisis
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {selectedVehicle.licensePlate}
              </span>
            </div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white mt-1">
              Laporan: {selectedVehicle.name}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Filter data pengeluaran BBM dan riwayat biaya operasional sesuai kebutuhan.
            </p>
          </div>

          {/* Filter Indicators */}
          <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#101622] p-2 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-blue-500" />
            <span>
              Terpilih: <b>{filteredRecords.length}</b> BBM • <b>{filteredHistory.length}</b> Biaya
            </span>
          </div>
        </div>

        {/* Filter Controls: Vehicle Selector & Date Range */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* 1. Filter Kendaraan */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Pilih Kendaraan
            </label>
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Semua Kendaraan ({vehicles.length})</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} {v.licensePlate ? `(${v.licensePlate})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Dari Tanggal */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          {/* 3. Sampai Tanggal */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>
        </div>

        {/* Quick Date Presets */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mr-1">
            Preset:
          </span>
          <button
            type="button"
            onClick={() => applyPreset("all")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
              !startDate && !endDate
                ? "bg-blue-600 text-white font-semibold shadow-sm"
                : "bg-slate-100 dark:bg-[#111724] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => applyPreset("this-month")}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-[#111724] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
          >
            Bulan Ini
          </button>
          <button
            type="button"
            onClick={() => applyPreset("last-month")}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-[#111724] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
          >
            Bulan Lalu
          </button>
          <button
            type="button"
            onClick={() => applyPreset("last-30")}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-[#111724] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
          >
            30 Hari Terakhir
          </button>
          <button
            type="button"
            onClick={() => applyPreset("this-year")}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-[#111724] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
          >
            Tahun Ini
          </button>

          {(startDate || endDate) && (
            <button
              type="button"
              onClick={() => applyPreset("all")}
              className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
              title="Reset rentang tanggal"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Primary Export Hub Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-purple-500/10 dark:from-blue-950/40 dark:via-[#161d2d] dark:to-purple-950/20 border border-blue-200 dark:border-blue-900/50 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
              <Sparkles className="w-4 h-4" />
              <span>Pusat Ekspor &amp; Dokumentasi Data</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-md">
              Unduh rekapitulasi sesuai filter kendaraan dan rentang tanggal yang Anda tentukan ke format Excel atau PDF.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Export Excel Button */}
            <button
              onClick={handleExportExcel}
              disabled={exportBusy !== null}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition active:scale-95 disabled:opacity-60"
              title="Unduh file Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{exportBusy === "excel" ? "Membuat Excel…" : "Ekspor Excel (.xlsx)"}</span>
            </button>

            {/* Export PDF Button */}
            <button
              onClick={handleExportPdf}
              disabled={exportBusy !== null}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow transition active:scale-95 disabled:opacity-60"
              title="Unduh dokumen PDF"
            >
              <FileDown className="w-4 h-4" />
              <span>{exportBusy === "pdf" ? "Membuat PDF…" : "Ekspor PDF"}</span>
            </button>

            {/* Direct Print Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-[#1f293d] hover:bg-slate-100 dark:hover:bg-[#28344e] text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold transition"
              title="Cetak Halaman Laporan Ini"
            >
              <Printer className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>Cetak</span>
            </button>
          </div>
        </div>
        {exportMsg && (
          <div
            className={`mt-3 p-2.5 rounded-xl text-xs flex items-start gap-2 ${
              exportMsg.type === "ok"
                ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                : "bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
            }`}
          >
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{exportMsg.text}</span>
          </div>
        )}
      </div>

      {/* KPI Metrics 4-Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Biaya Keseluruhan */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#161d2d] border border-slate-200 dark:border-slate-800 shadow-sm min-w-0 overflow-hidden">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
            Total Pengeluaran
          </div>
          <div className="text-sm sm:text-base md:text-lg font-bold text-slate-900 dark:text-white tracking-tight mt-1 truncate" title={formatRupiah(totalVehicleSpend)}>
            {formatRupiah(totalVehicleSpend)}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 truncate">
            BBM + Biaya Operasional
          </div>
        </div>

        {/* Biaya BBM Saja */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#161d2d] border border-slate-200 dark:border-slate-800 shadow-sm min-w-0 overflow-hidden">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center justify-between gap-1">
            <span className="truncate">Pengeluaran BBM</span>
            <Droplet className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          </div>
          <div className="text-sm sm:text-base md:text-lg font-bold text-blue-600 dark:text-blue-400 tracking-tight mt-1 truncate" title={formatRupiah(totalFuelCost)}>
            {formatRupiah(totalFuelCost)}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-mono truncate">
            {totalLiters.toFixed(1)} Liter • {filteredRecords.length} kali isi
          </div>
        </div>

        {/* Biaya Servis / Operasional */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#161d2d] border border-slate-200 dark:border-slate-800 shadow-sm min-w-0 overflow-hidden">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center justify-between gap-1">
            <span className="truncate">Biaya Operasional</span>
            <Wrench className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          </div>
          <div className="text-sm sm:text-base md:text-lg font-bold text-amber-600 dark:text-amber-400 tracking-tight mt-1 truncate" title={formatRupiah(totalServiceCost)}>
            {formatRupiah(totalServiceCost)}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 truncate">
            {filteredHistory.length} transaksi biaya
          </div>
        </div>

        {/* Efisiensi & Biaya / KM */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#161d2d] border border-slate-200 dark:border-slate-800 shadow-sm min-w-0 overflow-hidden">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center justify-between gap-1">
            <span className="truncate">Rata-rata Konsumsi</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          </div>
          <div className="text-sm sm:text-base md:text-lg font-bold text-emerald-600 dark:text-emerald-400 tracking-tight mt-1 truncate">
            {efficiencyFormatted.value}{" "}
            <span className="text-xs font-normal">{efficiencyFormatted.unitLabel}</span>
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-mono truncate">
            Biaya: {avgCostPerKm ? `Rp${avgCostPerKm.toLocaleString("id-ID")}/km` : "-"}
          </div>
        </div>
      </div>

      {/* Monthly Summary Breakdown Table */}
      <div className="bg-white dark:bg-[#161d2d] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Rekapitulasi Bulanan Pengisian BBM
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {dynamicMonthlySummaries.length} Bulan Terdata
          </span>
        </div>

        {dynamicMonthlySummaries.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            Tidak ada catatan BBM yang cocok dengan filter kendaraan dan rentang tanggal yang dipilih.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#111724] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Bulan</th>
                  <th className="py-2.5 px-3">Biaya BBM</th>
                  <th className="py-2.5 px-3">Volume</th>
                  <th className="py-2.5 px-3">Jarak</th>
                  <th className="py-2.5 px-3">Efisiensi ({getUnitLabel(fuelUnit)})</th>
                  <th className="py-2.5 px-3">Biaya / KM</th>
                  <th className="py-2.5 px-3">Frekuensi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {dynamicMonthlySummaries.map((m) => {
                  const mEfficiency = formatEfficiency(
                    m.avgConsumptionKmPerL > 0 ? m.avgConsumptionKmPerL : null,
                    fuelUnit
                  );

                  return (
                    <tr
                      key={m.monthKey}
                      className="hover:bg-slate-50 dark:hover:bg-[#1c2436] transition"
                    >
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-900 dark:text-white">
                        {m.monthName}
                      </td>
                      <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-semibold">
                        {formatRupiah(m.totalCost)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                        {m.totalLiters.toFixed(1)} L
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                        {m.totalDistance.toLocaleString("id-ID")} km
                      </td>
                      <td className="py-2.5 px-3 text-blue-600 dark:text-blue-400 font-semibold">
                        {mEfficiency.full}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                        {m.avgCostPerKm > 0 ? `Rp${m.avgCostPerKm}` : "-"}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-sans">
                        {m.fillCount}x isi
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Service History Summary Section */}
      <div className="bg-white dark:bg-[#161d2d] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Rekap Riwayat Biaya Operasional
          </h2>
          <span className="text-xs font-mono text-amber-600 dark:text-amber-400 font-bold">
            Total: {formatRupiah(totalServiceCost)}
          </span>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            Tidak ada riwayat biaya operasional yang cocok dengan filter yang dipilih.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredHistory.map((h) => (
              <div
                key={h.id}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-[#1c2436] transition"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {h.category.toUpperCase()}
                    </span>
                    <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
                      {h.title}
                    </h3>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{h.date}</span>
                    {h.odometer && (
                      <>
                        {" "}•{" "}
                        <span className="font-mono">
                          {h.odometer.toLocaleString("id-ID")} KM
                        </span>
                      </>
                    )}
                    {h.workshop && (
                      <>
                        {" "}• <span>{h.workshop}</span>
                      </>
                    )}
                    {h.notes && <span> — "{h.notes}"</span>}
                  </div>
                </div>

                <div className="text-right font-mono font-semibold text-xs text-amber-600 dark:text-amber-400">
                  {h.cost ? formatRupiah(h.cost) : "Biaya tidak dicatat"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
