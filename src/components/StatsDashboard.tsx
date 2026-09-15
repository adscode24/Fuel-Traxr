import React, { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Gauge,
  Wallet,
  TrendingUp,
  Plus,
  ChevronRight,
  Car,
  Bike,
  Sparkles,
  ArrowUpRight,
  Droplet,
  Fuel,
  Calendar,
} from "lucide-react";
import { Vehicle, FuelRecord, FuelEfficiencyUnit } from "../types";
import { formatEfficiency, getUnitLabel } from "../utils/unitConverter";
import { FuelPriceTodayCard } from "./FuelPriceTodayCard";
import { StationLogo } from "./StationLogo";

interface Props {
  vehicle: Vehicle | null;
  records: FuelRecord[];
  fuelUnit?: FuelEfficiencyUnit;
  onOpenManualAdd?: () => void;
  onOpenRegisterVehicle?: () => void;
  onNavigateTab?: (tab: any) => void;
  onSelectPriceForEntry?: (fuelData: Partial<FuelRecord>) => void;
}

export const StatsDashboard: React.FC<Props> = ({
  vehicle,
  records,
  fuelUnit = "km/l",
  onOpenManualAdd,
  onOpenRegisterVehicle,
  onNavigateTab,
  onSelectPriceForEntry,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<
    "expense" | "efficiency" | "volume"
  >("expense");

  // Format IDR helper
  const formatRupiah = (val: number) => {
    return `Rp${Math.round(val).toLocaleString("id-ID")}`;
  };

  // Group by months
  const monthlyMap: Record<
    string,
    {
      monthKey: string;
      monthName: string;
      totalCost: number;
      totalLiters: number;
      totalDistance: number;
      fillCount: number;
      efficiencyList: number[];
      costPerKmList: number[];
    }
  > = {};

  const sortedChrono = [...records].sort((a, b) => a.date.localeCompare(b.date));

  sortedChrono.forEach((r) => {
    const d = new Date(r.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const name = !isNaN(d.getTime())
      ? d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" })
      : r.date.slice(0, 7);

    if (!monthlyMap[key]) {
      monthlyMap[key] = {
        monthKey: key,
        monthName: name,
        totalCost: 0,
        totalLiters: 0,
        totalDistance: 0,
        fillCount: 0,
        efficiencyList: [],
        costPerKmList: [],
      };
    }

    monthlyMap[key].totalCost += r.totalCost;
    monthlyMap[key].totalLiters += r.liters;
    if (r.distanceTraveled) {
      monthlyMap[key].totalDistance += r.distanceTraveled;
    }
    monthlyMap[key].fillCount += 1;

    if (r.fuelEfficiencyKmPerL) {
      monthlyMap[key].efficiencyList.push(r.fuelEfficiencyKmPerL);
    }
    if (r.costPerKm) {
      monthlyMap[key].costPerKmList.push(r.costPerKm);
    }
  });

  const monthlyChartData = Object.values(monthlyMap).map((m) => {
    const rawEfficiency =
      m.totalLiters > 0 && m.totalDistance > 0
        ? Number((m.totalDistance / m.totalLiters).toFixed(2))
        : m.efficiencyList.length > 0
        ? Number(
            (
              m.efficiencyList.reduce((a, b) => a + b, 0) /
              m.efficiencyList.length
            ).toFixed(2)
          )
        : 0;

    const unitEfficiencyVal =
      fuelUnit === "l/100km"
        ? rawEfficiency > 0
          ? Number((100 / rawEfficiency).toFixed(2))
          : 0
        : rawEfficiency;

    const avgCostPerKm =
      m.totalDistance > 0
        ? Math.round(m.totalCost / m.totalDistance)
        : m.costPerKmList.length > 0
        ? Math.round(
            m.costPerKmList.reduce((a, b) => a + b, 0) /
              m.costPerKmList.length
          )
        : 0;

    return {
      monthKey: m.monthKey,
      monthName: m.monthName,
      expense: Math.round(m.totalCost),
      efficiency: unitEfficiencyVal,
      volume: Number(m.totalLiters.toFixed(1)),
      distance: Math.round(m.totalDistance),
      costPerKm: avgCostPerKm,
      fillCount: m.fillCount,
    };
  });

  // Current active month summary (defaults to newest month)
  const currentMonthKey =
    monthlyChartData.length > 0
      ? monthlyChartData[monthlyChartData.length - 1].monthKey
      : "";

  const activeMonthData =
    monthlyChartData.find((m) => m.monthKey === currentMonthKey) || {
      monthName: "Bulan Ini",
      expense: 0,
      efficiency: 0,
      volume: 0,
      distance: 0,
      costPerKm: 0,
      fillCount: 0,
    };

  // Overall average efficiency
  const allEfficiencies = records
    .map((r) => r.fuelEfficiencyKmPerL)
    .filter((e): e is number => typeof e === "number" && e > 0);

  const overallAvgEfficiency =
    allEfficiencies.length > 0
      ? allEfficiencies.reduce((a, b) => a + b, 0) / allEfficiencies.length
      : 0;

  const displayOverallEfficiency = formatEfficiency(
    overallAvgEfficiency,
    fuelUnit
  );

  // Recent 3 records for quick home feed
  const recentRecords = [...records]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);

  return (
    <div className="space-y-4 pb-20">
      {/* 1. Vehicle Hero Card or Daftarkan Kendaraan Anda Prompt */}
      {!vehicle ? (
        <div className="bg-white dark:bg-[#151c2c] p-6 rounded-2xl border-2 border-dashed border-blue-300 dark:border-blue-700/60 shadow-xs text-center space-y-3.5 transition-colors">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
            <Car className="w-7 h-7" />
          </div>
          <div className="max-w-sm mx-auto">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Daftarkan Kendaraan Anda
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Anda belum mendaftarkan kendaraan. Daftarkan mobil atau motor Anda sekarang untuk mulai memantau konsumsi BBM, servis berkala, dan rincian pengeluaran.
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
      ) : (
        <div className="bg-white dark:bg-[#151c2c] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                {vehicle.type === "car" ? (
                  <Car className="w-6 h-6" />
                ) : (
                  <Bike className="w-6 h-6" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {vehicle.name}
                  </h2>
                  {vehicle.licensePlate && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {vehicle.licensePlate}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Odometer:{" "}
                  <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                    {(vehicle.currentOdometer || 0).toLocaleString("id-ID")} km
                  </span>{" "}
                  • {vehicle.fuelCategory || "Bensin"}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Button */}
          <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80">
            <button
              onClick={onOpenManualAdd}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-xs transition active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>+ Catat Pengisian BBM</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Key Metrics Strip */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Metric 1: Rata-rata Konsumsi */}
        <div className="bg-white dark:bg-[#151c2c] p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Konsumsi BBM
          </span>
          <div className="mt-2">
            <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-mono">
              {displayOverallEfficiency.value}{" "}
              <span className="text-[10px] font-normal text-slate-500">
                {displayOverallEfficiency.unitLabel}
              </span>
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              Rata-rata total
            </span>
          </div>
        </div>

        {/* Metric 2: Pengeluaran Bulan Ini */}
        <div className="bg-white dark:bg-[#151c2c] p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Biaya Bulan Ini
          </span>
          <div className="mt-2">
            <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-mono">
              {formatRupiah(activeMonthData.expense)}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              {activeMonthData.fillCount}x pengisian
            </span>
          </div>
        </div>

        {/* Metric 3: Biaya per Kilometer */}
        <div className="bg-white dark:bg-[#151c2c] p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Biaya / KM
          </span>
          <div className="mt-2">
            <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-mono">
              {activeMonthData.costPerKm > 0
                ? `Rp${activeMonthData.costPerKm.toLocaleString("id-ID")}`
                : "-"}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              {activeMonthData.distance > 0
                ? `${activeMonthData.distance.toLocaleString("id-ID")} km`
                : "Per kilometer"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Performance Trend Chart */}
      {monthlyChartData.length > 0 && (
        <div className="bg-white dark:bg-[#151c2c] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Tren Konsumsi &amp; Biaya
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Statistik riwayat per bulan
              </p>
            </div>

            {/* Metric Segmented Control */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-[#0e1420] rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setSelectedMetric("expense")}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  selectedMetric === "expense"
                    ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white font-semibold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Biaya (Rp)
              </button>
              <button
                type="button"
                onClick={() => setSelectedMetric("efficiency")}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  selectedMetric === "efficiency"
                    ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white font-semibold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Efisiensi ({getUnitLabel(fuelUnit)})
              </button>
              <button
                type="button"
                onClick={() => setSelectedMetric("volume")}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  selectedMetric === "volume"
                    ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white font-semibold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Volume (L)
              </button>
            </div>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={monthlyChartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#334155"
                  opacity={0.15}
                />
                <XAxis
                  dataKey="monthName"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) =>
                    selectedMetric === "expense"
                      ? `${val >= 1000000 ? `${(val / 1000000).toFixed(1)}jt` : `${Math.round(val / 1000)}k`}`
                      : `${val}`
                  }
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white text-xs p-2.5 rounded-xl border border-slate-700 shadow-lg space-y-1">
                          <div className="font-bold text-slate-200">
                            {d.monthName}
                          </div>
                          <div className="text-blue-400 font-mono">
                            Biaya: {formatRupiah(d.expense)}
                          </div>
                          <div className="text-emerald-400 font-mono">
                            Efisiensi: {d.efficiency} {getUnitLabel(fuelUnit)}
                          </div>
                          <div className="text-slate-300 font-mono">
                            Volume: {d.volume} L ({d.fillCount}x isi)
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={selectedMetric}
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#chartGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 4. Harga BBM Hari Ini (Accordion Tertutup) */}
      <FuelPriceTodayCard vehicleCategory={vehicle?.fuelCategory || "Bensin"} />

      {/* 5. Riwayat Pengisian Terakhir (Recent 3 Entries) */}
      <div className="bg-white dark:bg-[#151c2c] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Pengisian Terakhir
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Aktivitas BBM terbaru {vehicle?.name || "Kendaraan"}
            </p>
          </div>
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab("log")}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
            >
              <span>Lihat Semua</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {recentRecords.length === 0 ? (
          <div className="text-center py-6 space-y-2">
            <div className="w-10 h-10 mx-auto rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
              <Droplet className="w-5 h-5" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Belum ada riwayat pengisian.
            </p>
            <button
              onClick={onOpenManualAdd}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400"
            >
              + Catat Pengisian Pertama
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {recentRecords.map((r) => (
              <div
                key={r.id}
                className="py-3 flex items-center justify-between gap-3 first:pt-1 last:pb-1"
              >
                <div className="flex items-center gap-3">
                  <StationLogo
                    stationName={r.stationName}
                    fuelCategory={vehicle?.fuelCategory || "Bensin"}
                    className="w-9 h-9"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {r.stationName || "SPBU"}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span>{r.date}</span>
                      <span>•</span>
                      <span>{r.fuelType}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                    {formatRupiah(r.totalCost)}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    {r.liters.toFixed(2)} L
                    {r.fuelEfficiencyKmPerL && (
                      <span className="text-emerald-600 dark:text-emerald-400 ml-1.5 font-semibold">
                        • {r.fuelEfficiencyKmPerL.toFixed(1)} km/L
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
