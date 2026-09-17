import React, { useState } from "react";
import {
  Droplet,
  TrendingUp,
  MapPin,
  MoreVertical,
  Trash2,
  Edit2,
  Eye,
  Plus,
  Calendar,
  Layers,
  Search,
  X,
  Tag,
  AlertTriangle,
  Car,
} from "lucide-react";
import { Vehicle, FuelRecord, FuelEfficiencyUnit } from "../types";
import { StationLogo } from "./StationLogo";

interface Props {
  vehicle: Vehicle | null;
  records: FuelRecord[];
  fuelUnit?: FuelEfficiencyUnit;
  onOpenManualAdd: () => void;
  onOpenRegisterVehicle?: () => void;
  onDeleteRecord: (id: string) => void;
  onEditRecord: (record: FuelRecord) => void;
}

export const MileageLog: React.FC<Props> = ({
  vehicle,
  records,
  fuelUnit = "km/l",
  onOpenManualAdd,
  onOpenRegisterVehicle,
  onDeleteRecord,
  onEditRecord,
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [previewReceipt, setPreviewReceipt] = useState<string | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<FuelRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter records by station name, notes, or date
  const filteredRecords = records.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();

    const matchesStation = r.stationName.toLowerCase().includes(q);
    const matchesNotes = Boolean(r.notes && r.notes.toLowerCase().includes(q));
    const matchesDate = r.date.toLowerCase().includes(q);
    const matchesLocation = r.location.toLowerCase().includes(q);

    return matchesStation || matchesNotes || matchesDate || matchesLocation;
  });

  // Group by Month (e.g. "September 2026", "Agustus 2026")
  const groupedByMonth: Record<string, FuelRecord[]> = {};
  filteredRecords.forEach((record) => {
    const d = new Date(record.date);
    const monthYear = d.toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });
    if (!groupedByMonth[monthYear]) groupedByMonth[monthYear] = [];
    groupedByMonth[monthYear].push(record);
  });

  // Helper formatting for Indonesian Rupiah
  const formatRupiah = (val: number, withDecimals = true) => {
    const parts = val.toFixed(withDecimals ? 2 : 0).split(".");
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return withDecimals ? `Rp${integerPart},${parts[1] || "00"}` : `Rp${integerPart}`;
  };

  const formatDecimals = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return "-";
    return val.toFixed(2).replace(".", ",");
  };

  // If user has not registered vehicle yet, show registration prompt
  if (!vehicle) {
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
              Anda belum mendaftarkan kendaraan. Daftarkan mobil atau motor Anda sekarang untuk mulai mencatat riwayat pengisian BBM.
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
    <div className="space-y-4 pb-28 transition-colors">
      {/* Page Header Banner */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#161d2d] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Droplet className="w-5 h-5 fill-blue-500/20" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white">
              Data Bensin
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Riwayat pengisian bahan bakar, konsumsi per liter, dan rincian pengeluaran.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenManualAdd}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm transition active:scale-95"
            title="Tambah Pengisian BBM"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Catat BBM</span>
          </button>
        </div>
      </div>

      {/* Search Bar (Filtering by station name, notes, or date) */}
      <div className="bg-white dark:bg-[#161c2a] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari SPBU, catatan, atau tanggal (contoh: Pertamina, luar kota, 2026-08)..."
            className="w-full bg-slate-50 dark:bg-[#10141e] border border-slate-200 dark:border-slate-700/80 rounded-xl pl-9 pr-9 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
              title="Hapus pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Feedback / Quick Tags */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            {searchQuery ? (
              <>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {filteredRecords.length}
                </span>{" "}
                dari {records.length} pengisian cocok
              </>
            ) : (
              <span>Filter riwayat: nama SPBU, catatan isi, atau tanggal</span>
            )}
          </div>

          {/* Quick Filter Tags */}
          <div className="flex items-center gap-1.5">
            {["Pertamina", "Shell", "Full tank"].map((tag) => (
              <button
                key={tag}
                onClick={() => setSearchQuery(searchQuery === tag ? "" : tag)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition ${
                  searchQuery.toLowerCase() === tag.toLowerCase()
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {tag}
              </button>
            ))}
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-[10px] text-rose-500 hover:underline font-medium"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* No Records Found (Empty Search or No Records) */}
      {filteredRecords.length === 0 && (
        <div className="text-center py-12 px-4 bg-white dark:bg-[#141a26] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-14 h-14 mx-auto rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3">
            {searchQuery ? <Search className="w-7 h-7" /> : <Droplet className="w-7 h-7" />}
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            {searchQuery
              ? "Pencarian Tidak Ditemukan"
              : "Belum Ada Data Bensin"}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
            {searchQuery
              ? `Tidak ada data pengisian BBM yang cocok dengan kata kunci "${searchQuery}". Coba periksa ejaan SPBU, tanggal, atau catatan.`
              : "Catat pengisian bensin pertama Anda untuk mulai memantau pengeluaran dan konsumsi bahan bakar."}
          </p>
          <div className="flex items-center justify-center gap-2">
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery("")}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-semibold rounded-xl transition"
              >
                Hapus Kata Kunci
              </button>
            ) : (
              <button
                onClick={onOpenManualAdd}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow transition"
              >
                <Plus className="w-4 h-4" />
                + Catat BBM Sekarang
              </button>
            )}
          </div>
        </div>
      )}

      {/* Grouped Month Lists */}
      {Object.entries(groupedByMonth).map(([monthYear, monthRecords]) => {
        // Calculate Month Summary
        const monthCost = monthRecords.reduce((acc, r) => acc + r.totalCost, 0);
        const monthLiters = monthRecords.reduce((acc, r) => acc + r.liters, 0);
        const monthDist = monthRecords.reduce(
          (acc, r) => acc + (r.distanceTraveled || 0),
          0
        );
        const monthAvgKmL =
          monthLiters > 0 && monthDist > 0 ? (monthDist / monthLiters).toFixed(2) : "-";

        return (
          <div key={monthYear} className="space-y-3">
            {/* Month Header Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-1 pt-2">
              <h2 className="text-sm font-bold tracking-wide text-slate-800 dark:text-slate-200 capitalize">
                {monthYear}
              </h2>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="bg-slate-100 dark:bg-[#1c2334] px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700/60 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  {formatRupiah(monthCost, false)}
                </span>
                <span>•</span>
                <span>{monthLiters.toFixed(1)} L</span>
                <span>•</span>
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  Rata-rata {monthAvgKmL} km/l
                </span>
              </div>
            </div>

            {/* List of Cards for this month */}
            <div className="space-y-3">
              {monthRecords.map((record) => {
                const isMenuOpen = activeMenuId === record.id;
                const formattedDate = record.date.split("-").reverse().join("-");

                return (
                  <div
                    key={record.id}
                    className="relative bg-white dark:bg-[#192131] hover:bg-slate-50 dark:hover:bg-[#1d2638] rounded-2xl border border-slate-200 dark:border-slate-800/90 shadow-sm transition overflow-hidden p-4 space-y-3"
                  >
                    {/* Top Row: Brand Logo, Date, Total Cost & Odometer */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3.5">
                        {/* Circular Fuel Brand Logo matching the SPBU station name */}
                        <StationLogo
                          stationName={record.stationName}
                          fuelCategory={vehicle?.fuelCategory}
                          className="w-11 h-11"
                        />

                        <div>
                          {/* Date & Time */}
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {formattedDate} {record.time ? `• ${record.time}` : ""}
                          </div>
                          {/* Big Total Rupiah */}
                          <div className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                            {formatRupiah(record.totalCost)}
                          </div>
                        </div>
                      </div>

                      {/* Right: Odometer and Delta Distance */}
                      <div className="text-right flex flex-col items-end">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-100 font-mono">
                            {record.odometer.toLocaleString("id-ID")} km
                          </span>
                          {/* Menu button */}
                          <div className="relative ml-1">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveMenuId(isMenuOpen ? null : record.id)
                              }
                              className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/60 transition"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {/* Dropdown Menu */}
                            {isMenuOpen && (
                              <div className="absolute right-0 top-6 w-36 bg-white dark:bg-[#121722] border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 py-1 text-xs">
                                {record.receiptImage && (
                                  <button
                                    onClick={() => {
                                      setPreviewReceipt(record.receiptImage || null);
                                      setActiveMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white text-left"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-blue-500" />
                                    Lihat Struk
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    onEditRecord(record);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white text-left"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-amber-500" />
                                  Edit Data
                                </button>
                                <button
                                  onClick={() => {
                                    setRecordToDelete(record);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 text-left"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Hapus
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Delta KM */}
                        {record.distanceTraveled !== undefined ? (
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                            +{record.distanceTraveled} km
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">
                            Pengisian awal
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle Row: Liter & Unit Price with Droplet Icon */}
                    <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 pl-1">
                      <Droplet className="w-4 h-4 text-blue-500 dark:text-blue-400 fill-blue-500/20 shrink-0" />
                      <span className="font-mono font-medium">
                        {formatDecimals(record.liters)} l
                      </span>
                      <span className="text-slate-400">→</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">
                        {formatRupiah(record.pricePerLiter)}/l
                      </span>
                      {record.octaneOrGrade && (
                        <span className="text-slate-500 dark:text-slate-400">
                          ({record.octaneOrGrade})
                        </span>
                      )}
                    </div>

                    {/* Notes if available */}
                    {record.notes && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 pl-1 italic">
                        "{record.notes}"
                      </div>
                    )}

                    {/* Divider */}
                    <div className="border-t border-slate-100 dark:border-slate-800/80 my-1" />

                    {/* Efficiency & Cost Per KM Row */}
                    <div className="flex items-center flex-wrap gap-x-6 gap-y-1 text-xs pl-1 text-slate-700 dark:text-slate-300">
                      {/* Fuel Efficiency (km/l or L/100km) */}
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="text-slate-500 dark:text-slate-400">
                          {fuelUnit === "l/100km" ? "L/100km:" : "km/l:"}
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white font-mono">
                          {fuelUnit === "l/100km"
                            ? record.fuelEfficiencyKmPerL && record.fuelEfficiencyKmPerL > 0
                              ? (100 / record.fuelEfficiencyKmPerL).toFixed(2).replace(".", ",")
                              : "-"
                            : formatDecimals(record.fuelEfficiencyKmPerL)}
                        </span>
                      </div>

                      {/* Rp/km */}
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full border border-slate-400 text-slate-600 dark:text-slate-300 text-[10px] flex items-center justify-center font-bold">
                          $
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white font-mono">
                          {record.costPerKm ? `${formatRupiah(record.costPerKm)}/km` : "-"}
                        </span>
                      </div>

                      {record.receiptImage && (
                        <button
                          onClick={() => setPreviewReceipt(record.receiptImage || null)}
                          className="ml-auto text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
                        >
                          <Eye className="w-3 h-3" />
                          Foto Struk
                        </button>
                      )}
                    </div>

                    {/* Location & Station Name */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 pl-1 pt-0.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="truncate">
                        {record.location
                          ? `${record.location} - ${record.stationName}`
                          : record.stationName}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Modal for Receipt Photo Preview */}
      {previewReceipt && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="relative max-w-lg w-full bg-white dark:bg-[#151c2b] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                Foto Struk Pembelian BBM
              </span>
              <button
                onClick={() => setPreviewReceipt(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <div className="p-3 max-h-[75vh] overflow-auto flex items-center justify-center bg-slate-900">
              <img
                src={previewReceipt}
                alt="Struk BBM"
                className="max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Android Floating Action Button (FAB) (+) */}
      <div className="fixed bottom-24 right-4 sm:right-6 z-30">
        <button
          type="button"
          onClick={onOpenManualAdd}
          className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-2xl bg-blue-600 hover:bg-blue-500 text-white transition active:scale-95 shadow-blue-600/30"
          title="Tambah Pengisian BBM"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>

      {/* In-App Delete Confirmation Modal (100% works inside iframes without window.confirm) */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#161d2d] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Hapus Data Bensin?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Apakah Anda yakin ingin menghapus data pengisian ini? Data ini akan dihapus dari riwayat.
                </p>
              </div>
            </div>

            {/* Record Summary Card */}
            <div className="p-3 bg-slate-50 dark:bg-[#111724] rounded-xl border border-slate-200 dark:border-slate-800/80 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">SPBU</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <StationLogo
                    stationName={recordToDelete.stationName}
                    fuelCategory={vehicle?.fuelCategory}
                    className="w-4 h-4 !border-none !shadow-none inline-block"
                  />
                  {recordToDelete.stationName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Tanggal</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {recordToDelete.date} {recordToDelete.time ? `• ${recordToDelete.time}` : ""}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Total Biaya</span>
                <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {formatRupiah(recordToDelete.totalCost)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Volume & Odometer</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {recordToDelete.liters} L • {recordToDelete.odometer.toLocaleString("id-ID")} km
                </span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteRecord(recordToDelete.id);
                  setRecordToDelete(null);
                }}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl transition shadow-md shadow-rose-600/20"
              >
                Ya, Hapus Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
