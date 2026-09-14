import React, { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  TrendingUp,
  Coins,
  Gauge,
  Droplets,
  Calendar,
  Layers,
  ArrowUpRight,
  Home,
  Plus,
  Camera,
  Wallet,
  Fuel,
} from "lucide-react";
import { Vehicle, FuelRecord, MonthlySummary, FuelEfficiencyUnit } from "../types";
import { formatEfficiency, getUnitLabel } from "../utils/unitConverter";

interface Props {
  vehicle: Vehicle;
  records: FuelRecord[];
  fuelUnit?: FuelEfficiencyUnit;
  onOpenManualAdd?: () => void;
  onOpenScanner?: () => void;
  onNavigateTab?: (tab: any) => void;
}

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];

export const StatsDashboard: React.FC<Props> = ({
  vehicle,
  records,
  fuelUnit = "km/l",
  onOpenManualAdd,
  onOpenScanner,
  onNavigateTab,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<"expense" | "efficiency" | "volume">("expense");
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>("");
  const [tableCardMode, setTableCardMode] = useState<"card" | "table">("card");

  // Format IDR
  const formatRupiah = (val: number) => {
    return `Rp${Math.round(val).toLocaleString("id-ID")}`;
  };

  // Compute monthly grouped data
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

  // Sort chronological for charts
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

    // Display metric value based on fuelUnit preference
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
            m.costPerKmList.reduce((a, b) => a + b, 0) / m.costPerKmList.length
          )
        : 0;

    return {
      monthKey: m.monthKey,
      name: m.monthName,
      biaya: m.totalCost,
      liter: Number(m.totalLiters.toFixed(1)),
      jarak: m.totalDistance,
      rawEfficiency,
      efficiencyVal: unitEfficiencyVal,
      biayaPerKm: avgCostPerKm,
    };
  });

  // Overall calculations
  const totalSpend = records.reduce((acc, r) => acc + r.totalCost, 0);
  const totalLiters = records.reduce((acc, r) => acc + r.liters, 0);
  const totalDistance = records.reduce(
    (acc, r) => acc + (r.distanceTraveled || 0),
    0
  );
  const overallAvgRawKmL =
    totalLiters > 0 && totalDistance > 0
      ? totalDistance / totalLiters
      : null;

  const efficiencyFormatted = formatEfficiency(overallAvgRawKmL, fuelUnit);

  const overallCostPerKm =
    totalDistance > 0 ? Math.round(totalSpend / totalDistance) : null;

  // Fuel Type distribution
  const fuelTypeMap: Record<string, number> = {};
  records.forEach((r) => {
    fuelTypeMap[r.fuelType] = (fuelTypeMap[r.fuelType] || 0) + r.totalCost;
  });
  const pieData = Object.entries(fuelTypeMap).map(([name, value]) => ({
    name,
    value,
  }));

  const unitLabel = getUnitLabel(fuelUnit);

  // Determine active month for monthly KPI cards
  const currentCalendarMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const latestAvailableMonthKey = monthlyChartData.length > 0 ? monthlyChartData[monthlyChartData.length - 1].monthKey : "";
  const defaultActiveMonthKey = monthlyMap[currentCalendarMonthKey] ? currentCalendarMonthKey : latestAvailableMonthKey;
  const activeMonthKey = selectedMonthKey && monthlyMap[selectedMonthKey] ? selectedMonthKey : defaultActiveMonthKey;

  const activeMonth = monthlyMap[activeMonthKey];
  const activeMonthChart = monthlyChartData.find((m) => m.monthKey === activeMonthKey);

  const activeMonthName = activeMonth?.monthName || (monthlyChartData.length > 0 ? "Bulan Terkini" : "Bulan Ini");
  const monthSpend = activeMonth?.totalCost ?? 0;
  const monthLiters = activeMonth?.totalLiters ?? 0;
  const monthDistance = activeMonth?.totalDistance ?? 0;
  const monthFills = activeMonth?.fillCount ?? 0;
  const monthRawEfficiency = activeMonthChart?.rawEfficiency ?? 0;
  const monthEfficiencyFormatted = formatEfficiency(
    monthRawEfficiency > 0 ? monthRawEfficiency : null,
    fuelUnit
  );
  const monthCostPerKm = activeMonthChart?.biayaPerKm ?? null;

  return (
    <div className="space-y-4 pb-20 text-slate-800 dark:text-slate-100 transition-colors">
      {/* Home Hero Header */}
      <div className="bg-white dark:bg-[#182132] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Home className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{vehicle?.name || "Kendaraan Saya"}</span>
                {vehicle?.licensePlate && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-normal">
                    {vehicle.licensePlate}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                Odometer: {(vehicle?.currentOdometer || 0).toLocaleString("id-ID")} km • Tangki: {vehicle?.fuelTankCapacity ?? 45} L
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions on Home */}
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenManualAdd && (
            <button
              onClick={onOpenManualAdd}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              Catat BBM
            </button>
          )}

          {onOpenScanner && (
            <button
              onClick={onOpenScanner}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-[#1f293d] hover:bg-slate-200 dark:hover:bg-[#27344d] text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition active:scale-95"
            >
              <Camera className="w-3.5 h-3.5 text-blue-500" />
              Scan Struk
            </button>
          )}

          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab("biaya")}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 dark:bg-purple-500/15 hover:bg-purple-100 dark:hover:bg-purple-500/25 text-purple-700 dark:text-purple-300 text-xs font-semibold rounded-xl border border-purple-200 dark:border-purple-500/30 transition active:scale-95"
            >
              <Wallet className="w-3.5 h-3.5" />
              Catat Biaya
            </button>
          )}
        </div>
      </div>

      {/* Month Selection Bar for Monthly Dashboard View */}
      {monthlyChartData.length > 0 && (
        <div className="bg-white dark:bg-[#182132] px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 text-[11px] block">
                Data Ringkasan Bulanan:
              </span>
              <span className="font-bold text-slate-900 dark:text-white">
                {activeMonthName}
              </span>
            </div>
          </div>

          {monthlyChartData.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-[11px] text-slate-400 shrink-0">Pilih Bulan:</span>
              {monthlyChartData.map((m) => (
                <button
                  key={m.monthKey}
                  type="button"
                  onClick={() => setSelectedMonthKey(m.monthKey)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition active:scale-95 ${
                    activeMonthKey === m.monthKey
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 dark:bg-[#111724] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Overview Top Stats - Showing Monthly Data */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* KPI 1: Rata-rata Konsumsi (Bulan Ini / Terpilih) */}
        <div className="bg-white dark:bg-[#182132] p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-medium leading-tight">
              Rata-rata Konsumsi
            </span>
            <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Gauge className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
              {monthEfficiencyFormatted.value}{" "}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                {monthEfficiencyFormatted.unitLabel}
              </span>
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5 font-medium">
              <span className="px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-500/15">
                {activeMonthName}
              </span>
              <span>• {fuelUnit === "l/100km" ? "L/100km" : "km/L"}</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Total Pengeluaran (Bulan Ini / Terpilih) */}
        <div className="bg-white dark:bg-[#182132] p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-medium leading-tight">
              Total Pengeluaran
            </span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Coins className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {formatRupiah(monthSpend)}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 font-medium">
              <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {activeMonthName}
              </span>
              <span>• {monthFills}x isi</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Biaya per KM (Bulan Ini / Terpilih) */}
        <div className="bg-white dark:bg-[#182132] p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-medium leading-tight">
              Biaya per KM
            </span>
            <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
              {monthCostPerKm !== null && monthCostPerKm > 0
                ? `Rp${monthCostPerKm.toLocaleString("id-ID")}`
                : "-"}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              {monthDistance > 0 ? `Jarak: ${monthDistance.toLocaleString("id-ID")} km` : "Belum ada jarak"}
            </div>
          </div>
        </div>

        {/* KPI 4: Total Liter & Jarak (Bulan Ini / Terpilih) */}
        <div className="bg-white dark:bg-[#182132] p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-medium leading-tight">
              Volume &amp; Jarak
            </span>
            <div className="w-6 h-6 rounded-lg bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Droplets className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
              {monthLiters.toFixed(1)}{" "}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Liter</span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
              +{monthDistance.toLocaleString("id-ID")} km ({activeMonthName})
            </div>
          </div>
        </div>
      </div>

      {records.length === 0 ? (
        /* Clean Empty State when user starts fresh */
        <div className="bg-white dark:bg-[#182132] p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Fuel className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Belum Ada Catatan Pengisian BBM
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Mulai catat pengisian bahan bakar pertama Anda untuk memantau konsumsi bensin, biaya per kilometer, dan grafik performa kendaraan.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            {onOpenManualAdd && (
              <button
                onClick={onOpenManualAdd}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow transition"
              >
                <Plus className="w-4 h-4" />
                Catat BBM Sekarang
              </button>
            )}
            {onOpenScanner && (
              <button
                onClick={onOpenScanner}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-[#1f293d] hover:bg-slate-200 dark:hover:bg-[#27344d] text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition"
              >
                <Camera className="w-4 h-4 text-blue-500" />
                Scan Struk SPBU
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Main Chart Card */}
          <div className="bg-white dark:bg-[#182132] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Grafik Analisis Pengeluaran &amp; Konsumsi BBM
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Evaluasi biaya bulanan dan rata-rata efisiensi bahan bakar ({unitLabel})
                </p>
              </div>

              {/* Metric Selector Tabs */}
              <div className="flex items-center p-1 bg-slate-100 dark:bg-[#101622] rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                <button
                  onClick={() => setSelectedMetric("expense")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition ${
                    selectedMetric === "expense"
                      ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white font-semibold shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Pengeluaran
                </button>
                <button
                  onClick={() => setSelectedMetric("efficiency")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition ${
                    selectedMetric === "efficiency"
                      ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white font-semibold shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Efisiensi ({unitLabel})
                </button>
                <button
                  onClick={() => setSelectedMetric("volume")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition ${
                    selectedMetric === "volume"
                      ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white font-semibold shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Volume &amp; Jarak
                </button>
              </div>
            </div>

            {/* Chart View */}
            <div className="h-64 sm:h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                {selectedMetric === "expense" ? (
                  <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#64748b"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `Rp${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        borderColor: "#334155",
                        borderRadius: "0.75rem",
                        color: "#fff",
                        fontSize: "12px",
                      }}
                      formatter={(val: any) => [formatRupiah(val), "Total Biaya"]}
                    />
                    <Bar dataKey="biaya" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={48} />
                  </BarChart>
                ) : selectedMetric === "efficiency" ? (
                  <LineChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#64748b"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      domain={["dataMin - 1", "dataMax + 1"]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        borderColor: "#334155",
                        borderRadius: "0.75rem",
                        color: "#fff",
                        fontSize: "12px",
                      }}
                      formatter={(val: any) => [`${val} ${unitLabel}`, `Rata-rata Konsumsi (${unitLabel})`]}
                    />
                    <Line
                      type="monotone"
                      dataKey="efficiencyVal"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 5, fill: "#10b981", strokeWidth: 2, stroke: "#ffffff" }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                ) : (
                  <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        borderColor: "#334155",
                        borderRadius: "0.75rem",
                        color: "#fff",
                        fontSize: "12px",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="liter" fill="#06b6d4" name="Volume (Liter)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Breakdown Section: Monthly Detail Table & Fuel Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Table / Cards of Monthly Averages */}
            <div className="lg:col-span-2 bg-white dark:bg-[#182132] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Rincian Rata-Rata Konsumsi Bulanan
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Statistik jarak, volume, biaya per km, dan efisiensi per bulan
                  </p>
                </div>

                {/* Mobile View Toggle (Card vs Table) */}
                <div className="flex sm:hidden items-center p-0.5 rounded-lg bg-slate-100 dark:bg-[#111724] border border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setTableCardMode("card")}
                    className={`px-2 py-1 rounded-md text-[10px] font-semibold transition ${
                      tableCardMode === "card"
                        ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xs"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    Kartu
                  </button>
                  <button
                    type="button"
                    onClick={() => setTableCardMode("table")}
                    className={`px-2 py-1 rounded-md text-[10px] font-semibold transition ${
                      tableCardMode === "table"
                        ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xs"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    Tabel
                  </button>
                </div>
              </div>

              {/* 1. Mobile Cards View (sm:hidden, default on mobile to prevent overlapping) */}
              <div className={`space-y-2.5 ${tableCardMode === "table" ? "hidden sm:hidden" : "sm:hidden"}`}>
                {monthlyChartData.map((m) => {
                  const eff = formatEfficiency(
                    m.rawEfficiency > 0 ? m.rawEfficiency : null,
                    fuelUnit
                  );
                  const isCurrent = m.monthKey === activeMonthKey;

                  return (
                    <div
                      key={m.monthKey}
                      className={`p-3.5 rounded-xl border transition ${
                        isCurrent
                          ? "bg-blue-50/50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/40"
                          : "bg-slate-50 dark:bg-[#121724] border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-700/80 mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {m.name}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-600 text-white">
                              Aktif
                            </span>
                          )}
                        </div>
                        <span className="font-bold font-mono text-sm text-emerald-600 dark:text-emerald-400">
                          {formatRupiah(m.biaya)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded-lg bg-white dark:bg-[#182132] border border-slate-200/80 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block mb-0.5">
                            Efisiensi ({unitLabel})
                          </span>
                          <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                            {eff.full}
                          </span>
                        </div>

                        <div className="p-2 rounded-lg bg-white dark:bg-[#182132] border border-slate-200/80 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block mb-0.5">
                            Biaya per KM
                          </span>
                          <span className="font-bold font-mono text-blue-600 dark:text-blue-400">
                            {m.biayaPerKm > 0 ? `${formatRupiah(m.biayaPerKm)}/km` : "-"}
                          </span>
                        </div>

                        <div className="p-2 rounded-lg bg-white dark:bg-[#182132] border border-slate-200/80 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block mb-0.5">
                            Jarak Tempuh
                          </span>
                          <span className="font-bold font-mono text-slate-700 dark:text-slate-300">
                            +{m.jarak.toLocaleString("id-ID")} km
                          </span>
                        </div>

                        <div className="p-2 rounded-lg bg-white dark:bg-[#182132] border border-slate-200/80 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block mb-0.5">
                            Volume BBM
                          </span>
                          <span className="font-bold font-mono text-slate-700 dark:text-slate-300">
                            {m.liter} Liter
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 2. Structured Table (Always on tablet/desktop, togglable on mobile, min-width avoids overlap) */}
              <div className={`overflow-x-auto ${tableCardMode === "card" ? "hidden sm:block" : "block"}`}>
                <table className="w-full text-left text-xs min-w-[620px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700/80 text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-[#131926]">
                      <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Bulan</th>
                      <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">Pengeluaran</th>
                      <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">Volume</th>
                      <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">Jarak</th>
                      <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap text-emerald-600 dark:text-emerald-400">
                        Efisiensi ({unitLabel})
                      </th>
                      <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap text-blue-600 dark:text-blue-400">
                        Biaya / KM
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono">
                    {monthlyChartData.map((m) => {
                      const eff = formatEfficiency(
                        m.rawEfficiency > 0 ? m.rawEfficiency : null,
                        fuelUnit
                      );
                      const isCurrent = m.monthKey === activeMonthKey;

                      return (
                        <tr
                          key={m.monthKey}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${
                            isCurrent ? "bg-blue-50/30 dark:bg-blue-500/5" : ""
                          }`}
                        >
                          <td className="py-3 px-3 font-sans font-medium text-slate-900 dark:text-white whitespace-nowrap flex items-center gap-1.5">
                            <span>{m.name}</span>
                            {isCurrent && (
                              <span className="text-[9px] font-sans px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold">
                                Aktif
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-800 dark:text-slate-200 whitespace-nowrap font-semibold">
                            {formatRupiah(m.biaya)}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {m.liter} L
                          </td>
                          <td className="py-3 px-3 text-right text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            +{m.jarak.toLocaleString("id-ID")} km
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono font-bold border border-emerald-200/80 dark:border-emerald-500/30">
                              {eff.full}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right text-blue-600 dark:text-blue-400 whitespace-nowrap font-bold">
                            {m.biayaPerKm > 0 ? `${formatRupiah(m.biayaPerKm)}/km` : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Fuel Type Distribution Donut Chart */}
            <div className="bg-white dark:bg-[#182132] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Proporsi Jenis BBM
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Distribusi pengeluaran berdasarkan jenis bahan bakar
                </p>
              </div>

              <div className="h-44 my-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((_entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        borderColor: "#334155",
                        borderRadius: "0.75rem",
                        fontSize: "11px",
                        color: "#fff",
                      }}
                      formatter={(val: any) => [formatRupiah(val), "Total Biaya"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-1.5">
                {pieData.map((p, idx) => (
                  <div key={p.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                      />
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{p.name}</span>
                    </div>
                    <span className="font-mono text-slate-600 dark:text-slate-400">
                      {formatRupiah(p.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
