import React, { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
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
  PieChart as PieIcon,
  ReceiptText,
  Wrench,
  CreditCard,
  Layers,
} from "lucide-react";
import { Vehicle, FuelRecord, FuelEfficiencyUnit, ServiceHistoryEntry } from "../types";
import { formatEfficiency, getUnitLabel } from "../utils/unitConverter";
import { FuelPriceTodayCard } from "./FuelPriceTodayCard";
import { StationLogo, detectStationBrand } from "./StationLogo";

interface Props {
  vehicle: Vehicle | null;
  records: FuelRecord[];
  serviceHistory?: ServiceHistoryEntry[];
  fuelUnit?: FuelEfficiencyUnit;
  onOpenManualAdd?: () => void;
  onOpenManualEntry?: () => void;
  onOpenRegisterVehicle?: () => void;
  onNavigateTab?: (tab: any) => void;
  onSelectPriceForEntry?: (fuelData: Partial<FuelRecord>) => void;
}

export const StatsDashboard: React.FC<Props> = ({
  vehicle,
  records,
  serviceHistory = [],
  fuelUnit = "km/l",
  onOpenManualAdd,
  onOpenManualEntry,
  onOpenRegisterVehicle,
  onNavigateTab,
  onSelectPriceForEntry,
}) => {
  const handleOpenAddAction = onOpenManualAdd || onOpenManualEntry;
  const [selectedMetric, setSelectedMetric] = useState<
    "expense" | "efficiency" | "volume"
  >("expense");

  // Selected period for dashboard KPI cards: "all" or specific month "YYYY-MM"
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");

  // Selected mode for Pie Chart: "spbu" or "fuelType"
  const [pieChartMode, setPieChartMode] = useState<"spbu" | "fuelType">("spbu");

  // Format IDR helper
  const formatRupiah = (val: number) => {
    return `Rp${Math.round(val).toLocaleString("id-ID")}`;
  };

  // Helper to dynamically adjust typography size for nominal figures so they never overflow card boundaries
  const getNominalSizeClass = (formattedStr: string) => {
    const len = formattedStr.length;
    if (len >= 13) return "text-[10px] sm:text-xs md:text-sm";
    if (len >= 10) return "text-[11px] sm:text-xs md:text-base";
    if (len >= 7) return "text-xs sm:text-sm md:text-base";
    return "text-sm sm:text-base md:text-lg";
  };

  // Collect all available months from fuel records and other expenses
  const availableMonths = useMemo(() => {
    const monthMap = new Map<string, string>();
    records.forEach((r) => {
      if (r.date) {
        const key = r.date.slice(0, 7);
        if (!monthMap.has(key)) {
          const d = new Date(r.date);
          const label = !isNaN(d.getTime())
            ? d.toLocaleDateString("id-ID", { month: "long", year: "numeric" })
            : key;
          monthMap.set(key, label);
        }
      }
    });
    serviceHistory.forEach((h) => {
      if (h.date) {
        const key = h.date.slice(0, 7);
        if (!monthMap.has(key)) {
          const d = new Date(h.date);
          const label = !isNaN(d.getTime())
            ? d.toLocaleDateString("id-ID", { month: "long", year: "numeric" })
            : key;
          monthMap.set(key, label);
        }
      }
    });

    return Array.from(monthMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, label]) => ({ key, label }));
  }, [records, serviceHistory]);

  // Data filtered by selectedPeriod for the 3 dashboard cards
  const periodFuelRecords = useMemo(() => {
    if (selectedPeriod === "all") return records;
    return records.filter((r) => r.date && r.date.startsWith(selectedPeriod));
  }, [records, selectedPeriod]);

  const periodOtherExpenses = useMemo(() => {
    if (selectedPeriod === "all") return serviceHistory;
    return serviceHistory.filter((h) => h.date && h.date.startsWith(selectedPeriod));
  }, [serviceHistory, selectedPeriod]);

  // Card 1: Konsumsi BBM (km/L atau unit yang dipilih)
  const periodEfficiencies = periodFuelRecords
    .map((r) => r.fuelEfficiencyKmPerL)
    .filter((e): e is number => typeof e === "number" && e > 0);

  const periodTotalDistance = periodFuelRecords.reduce(
    (acc, r) => acc + (r.distanceTraveled || 0),
    0
  );
  const periodTotalLiters = periodFuelRecords.reduce(
    (acc, r) => acc + (r.liters || 0),
    0
  );

  const rawPeriodAvgEfficiency =
    periodTotalDistance > 0 && periodTotalLiters > 0
      ? periodTotalDistance / periodTotalLiters
      : periodEfficiencies.length > 0
      ? periodEfficiencies.reduce((a, b) => a + b, 0) / periodEfficiencies.length
      : 0;

  const displayPeriodEfficiency = formatEfficiency(rawPeriodAvgEfficiency, fuelUnit);

  // Card 2: Biaya Bensin
  const periodFuelCost = periodFuelRecords.reduce(
    (acc, r) => acc + (r.totalCost || 0),
    0
  );
  const periodFuelCount = periodFuelRecords.length;

  // Card 3: Biaya Lainnya
  const periodOtherCost = periodOtherExpenses.reduce(
    (acc, h) => acc + (h.cost || 0),
    0
  );
  const periodOtherCount = periodOtherExpenses.length;

  // Breakdown summary for all vehicle expenses in the selected period (moved from Biaya page)
  const expenseBreakdown = useMemo(() => {
    let serviceCost = 0;
    let serviceCount = 0;
    let etollCost = 0;
    let etollCount = 0;
    let lainnyaCost = 0;
    let lainnyaCount = 0;

    periodOtherExpenses.forEach((item) => {
      const amount = Number(item.cost) || 0;
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
        serviceCost += amount;
        serviceCount += 1;
      } else if (cat === "top up etoll" || cat === "etoll" || cat.includes("tol")) {
        etollCost += amount;
        etollCount += 1;
      } else {
        lainnyaCost += amount;
        lainnyaCount += 1;
      }
    });

    const totalExpenseOverall = periodFuelCost + periodOtherCost;

    return {
      serviceCost,
      serviceCount,
      etollCost,
      etollCount,
      lainnyaCost,
      lainnyaCount,
      totalExpenseOverall,
    };
  }, [periodOtherExpenses, periodFuelCost, periodOtherCost]);

  // Group by months for the Area Trend Chart
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

  // Recent 3 records for quick home feed
  const recentRecords = [...records]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);

  // Pie Chart Data: Total Persentase Jenis SPBU
  const spbuPieData = useMemo(() => {
    if (records.length === 0) return [];
    const brandMap: Record<
      string,
      { name: string; liters: number; count: number; cost: number }
    > = {};

    records.forEach((r) => {
      const brandKey = detectStationBrand(r.stationName, vehicle?.fuelCategory);
      const brandDisplay: Record<string, string> = {
        pertamina: "Pertamina",
        shell: "Shell",
        bp: "BP-AKR",
        vivo: "Vivo",
        total: "Total",
        mobil: "ExxonMobil",
        petronas: "Petronas",
        spklu: "SPKLU PLN",
        generic: r.stationName ? r.stationName.trim() : "SPBU Lain",
      };
      const name = brandDisplay[brandKey] || "SPBU Lain";
      if (!brandMap[name]) {
        brandMap[name] = { name, liters: 0, count: 0, cost: 0 };
      }
      brandMap[name].liters += r.liters || 0;
      brandMap[name].count += 1;
      brandMap[name].cost += r.totalCost || 0;
    });

    const totalLiters = Object.values(brandMap).reduce(
      (acc, item) => acc + item.liters,
      0
    );

    return Object.values(brandMap)
      .map((item) => ({
        name: item.name,
        value: Number(item.liters.toFixed(1)),
        count: item.count,
        cost: item.cost,
        percentage:
          totalLiters > 0
            ? Number(((item.liters / totalLiters) * 100).toFixed(1))
            : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [records, vehicle?.fuelCategory]);

  // Pie Chart Data: Total Persentase Jenis Bensin
  const fuelTypePieData = useMemo(() => {
    if (records.length === 0) return [];
    const typeMap: Record<
      string,
      { name: string; liters: number; count: number; cost: number }
    > = {};

    records.forEach((r) => {
      const name = (r.fuelType || "Bensin").trim();
      if (!typeMap[name]) {
        typeMap[name] = { name, liters: 0, count: 0, cost: 0 };
      }
      typeMap[name].liters += r.liters || 0;
      typeMap[name].count += 1;
      typeMap[name].cost += r.totalCost || 0;
    });

    const totalLiters = Object.values(typeMap).reduce(
      (acc, item) => acc + item.liters,
      0
    );

    return Object.values(typeMap)
      .map((item) => ({
        name: item.name,
        value: Number(item.liters.toFixed(1)),
        count: item.count,
        cost: item.cost,
        percentage:
          totalLiters > 0
            ? Number(((item.liters / totalLiters) * 100).toFixed(1))
            : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [records]);

  const activePieData = pieChartMode === "spbu" ? spbuPieData : fuelTypePieData;

  const PIE_COLORS = [
    "#2563eb", // blue
    "#10b981", // emerald
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // violet
    "#06b6d4", // cyan
    "#ec4899", // pink
    "#64748b", // slate
  ];

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
              onClick={handleOpenAddAction}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-xs transition active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>+ Catat Pengisian BBM</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Key Metrics Header & Period Filter */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            <span>Ringkasan Data</span>
          </div>

          {/* Period Selector: Specific Month or Total of All Months */}
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="dashboard-period-select"
              className="text-[11px] text-slate-500 dark:text-slate-400 hidden xs:inline"
            >
              Periode:
            </label>
            <select
              id="dashboard-period-select"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-white dark:bg-[#151c2c] border border-slate-200 dark:border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 shadow-2xs cursor-pointer"
            >
              <option value="all">Semua Bulan (Total)</option>
              {availableMonths.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3 KPI Cards: Konsumsi BBM, Biaya Bensin, Biaya Lainnya */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
          {/* Card 1: Konsumsi BBM */}
          <div className="bg-white dark:bg-[#151c2c] px-2.5 py-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between min-w-0 overflow-hidden">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
              Konsumsi BBM
            </span>
            <div className="mt-1.5 sm:mt-2 min-w-0">
              <div className="flex items-baseline gap-0.5 sm:gap-1 text-slate-900 dark:text-white font-bold tracking-tight min-w-0">
                <span className="text-xs sm:text-base md:text-lg font-bold truncate">
                  {displayPeriodEfficiency.value}
                </span>
                <span className="text-[9px] sm:text-[10px] md:text-xs font-normal text-slate-500 dark:text-slate-400 shrink-0">
                  {displayPeriodEfficiency.unitLabel}
                </span>
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block truncate mt-0.5">
                {selectedPeriod === "all" ? "Rata-rata total" : "Bulan terpilih"}
              </span>
            </div>
          </div>

          {/* Card 2: Biaya Bensin */}
          <div className="bg-white dark:bg-[#151c2c] px-2.5 py-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between min-w-0 overflow-hidden">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
              Biaya Bensin
            </span>
            <div className="mt-1.5 sm:mt-2 min-w-0">
              <div
                className={`font-bold tracking-tight text-slate-900 dark:text-white flex items-baseline gap-0.5 min-w-0 ${getNominalSizeClass(
                  Math.round(periodFuelCost).toLocaleString("id-ID")
                )}`}
                title={formatRupiah(periodFuelCost)}
              >
                <span className="text-[10px] sm:text-xs font-medium text-slate-400 dark:text-slate-500 shrink-0">
                  Rp
                </span>
                <span className="truncate">
                  {Math.round(periodFuelCost).toLocaleString("id-ID")}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block truncate mt-0.5">
                {periodFuelCount}x pengisian
              </span>
            </div>
          </div>

          {/* Card 3: Biaya Lainnya (Servis, Etoll, Parkir, dll.) */}
          <div className="bg-white dark:bg-[#151c2c] px-2.5 py-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between min-w-0 overflow-hidden">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
              Biaya Lainnya
            </span>
            <div className="mt-1.5 sm:mt-2 min-w-0">
              <div
                className={`font-bold tracking-tight text-slate-900 dark:text-white flex items-baseline gap-0.5 min-w-0 ${getNominalSizeClass(
                  Math.round(periodOtherCost).toLocaleString("id-ID")
                )}`}
                title={formatRupiah(periodOtherCost)}
              >
                <span className="text-[10px] sm:text-xs font-medium text-slate-400 dark:text-slate-500 shrink-0">
                  Rp
                </span>
                <span className="truncate">
                  {Math.round(periodOtherCost).toLocaleString("id-ID")}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block truncate mt-0.5">
                {periodOtherCount} transaksi biaya
              </span>
            </div>
          </div>
        </div>

        {/* Ringkasan Rincian Biaya Kendaraan (Dipindahkan dari Halaman Biaya, Terfilter Periode) */}
        <div className="bg-white dark:bg-[#151c2c] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Ringkasan Biaya Kendaraan
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {selectedPeriod === "all"
                    ? "Total akumulasi seluruh periode"
                    : `Data bulan: ${
                        availableMonths.find((m) => m.key === selectedPeriod)?.label ||
                        selectedPeriod
                      }`}
                </p>
              </div>
            </div>

            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab("biaya")}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer shrink-0"
              >
                <span>Lihat Riwayat Biaya</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Banner Total Keseluruhan Pengeluaran */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 dark:from-[#0d1320] dark:via-[#131b2c] dark:to-[#172136] text-white p-3.5 sm:p-4 rounded-xl border border-slate-800 shadow-sm flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] text-slate-300 font-medium block">
                Total Biaya Keseluruhan (BBM + Operasional)
              </span>
              <div className="text-lg sm:text-xl md:text-2xl font-bold font-mono tracking-tight text-white mt-0.5">
                {formatRupiah(expenseBreakdown.totalExpenseOverall)}
              </div>
            </div>
            <div className="text-right text-[11px] text-slate-300 shrink-0">
              <span className="font-semibold text-white">
                {periodFuelCount + periodOtherCount}
              </span>{" "}
              total transaksi
              <span className="block text-[10px] text-slate-400 mt-0.5">
                {selectedPeriod === "all" ? "Semua Bulan" : "Periode Terpilih"}
              </span>
            </div>
          </div>

          {/* 4 Kartu Kategori Biaya: Bahan Bakar, Servis, E-Toll, Lainnya */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
            {/* 1. Bahan Bakar */}
            <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 dark:text-blue-300 truncate">
                  <Fuel className="w-3.5 h-3.5 shrink-0" />
                  <span>Bahan Bakar</span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-mono mt-1.5 truncate">
                  {formatRupiah(periodFuelCost)}
                </div>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">
                {periodFuelCount}x pengisian
              </span>
            </div>

            {/* 2. Servis & Bengkel */}
            <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 truncate">
                  <Wrench className="w-3.5 h-3.5 shrink-0" />
                  <span>Servis Bengkel</span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-mono mt-1.5 truncate">
                  {formatRupiah(expenseBreakdown.serviceCost)}
                </div>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">
                {expenseBreakdown.serviceCount}x servis
              </span>
            </div>

            {/* 3. Top Up E-Toll */}
            <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300 truncate">
                  <CreditCard className="w-3.5 h-3.5 shrink-0" />
                  <span>Top Up E-Toll</span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-mono mt-1.5 truncate">
                  {formatRupiah(expenseBreakdown.etollCost)}
                </div>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">
                {expenseBreakdown.etollCount}x transaksi
              </span>
            </div>

            {/* 4. Biaya Lainnya */}
            <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-700 dark:text-purple-300 truncate">
                  <Layers className="w-3.5 h-3.5 shrink-0" />
                  <span>Biaya Lainnya</span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-mono mt-1.5 truncate">
                  {formatRupiah(expenseBreakdown.lainnyaCost)}
                </div>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">
                {expenseBreakdown.lainnyaCount}x transaksi
              </span>
            </div>
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
            <div className="flex items-center p-1 bg-slate-100 dark:bg-[#0e1420] rounded-xl border border-slate-200 dark:border-slate-800 text-xs self-start sm:self-auto">
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
              onClick={() => onNavigateTab("bensin")}
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
              onClick={handleOpenAddAction}
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

      {/* 6. Pie Chart: Total Data Persentase Jenis SPBU & Jenis Bensin */}
      <div className="bg-white dark:bg-[#151c2c] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <PieIcon className="w-4 h-4 text-blue-500" />
              <span>Persentase Distribusi BBM</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Total data persentase {pieChartMode === "spbu" ? "jenis SPBU" : "jenis bensin"}
            </p>
          </div>

          {/* Toggle Button: Jenis SPBU vs Jenis Bensin */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-[#0e1420] rounded-xl border border-slate-200 dark:border-slate-800 text-xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setPieChartMode("spbu")}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                pieChartMode === "spbu"
                  ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white font-semibold shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Jenis SPBU
            </button>
            <button
              type="button"
              onClick={() => setPieChartMode("fuelType")}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                pieChartMode === "fuelType"
                  ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white font-semibold shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Jenis Bensin
            </button>
          </div>
        </div>

        {activePieData.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <div className="w-10 h-10 mx-auto rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
              <Droplet className="w-5 h-5" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Belum ada data pengisian untuk menampilkan grafik persentase {pieChartMode === "spbu" ? "SPBU" : "jenis bensin"}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center pt-1">
            {/* Donut Chart */}
            <div className="sm:col-span-5 h-52 w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={74}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {activePieData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                        stroke="transparent"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white text-xs p-2.5 rounded-xl border border-slate-700 shadow-lg space-y-1 z-50">
                            <div className="font-bold text-slate-100">{d.name}</div>
                            <div className="text-blue-400 font-mono">
                              Persentase: {d.percentage}%
                            </div>
                            <div className="text-emerald-400 font-mono">
                              Volume: {d.value} L ({d.count}x isi)
                            </div>
                            <div className="text-amber-400 font-mono">
                              Biaya: {formatRupiah(d.cost)}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center Stats */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">
                  {pieChartMode === "spbu" ? "SPBU" : "BBM"}
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                  {activePieData.length} Jenis
                </span>
              </div>
            </div>

            {/* Legend & Breakdown List */}
            <div className="sm:col-span-7 space-y-2 max-h-56 overflow-y-auto pr-1">
              {activePieData.map((item, index) => {
                const color = PIE_COLORS[index % PIE_COLORS.length];
                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 dark:bg-[#101522] border border-slate-100 dark:border-slate-800/80 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400">
                        {item.value} L
                      </span>
                      <span
                        className="px-1.5 py-0.5 rounded-md font-bold text-white text-[10px]"
                        style={{ backgroundColor: color }}
                      >
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
