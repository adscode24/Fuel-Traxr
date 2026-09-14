import React, { useState, useMemo } from "react";
import {
  Wallet,
  Plus,
  Trash2,
  Calendar,
  Search,
  Wrench,
  CreditCard,
  Layers,
  MapPin,
  Gauge,
  X,
  FileText,
  AlertCircle,
} from "lucide-react";
import { Vehicle, ServiceHistoryEntry, ExpenseCategory } from "../types";

interface Props {
  vehicle: Vehicle;
  serviceHistory: ServiceHistoryEntry[];
  onAddExpense: (
    entry: Omit<ServiceHistoryEntry, "id" | "createdAt">
  ) => void;
  onDeleteExpense: (id: string) => void;
}

export const BiayaPage: React.FC<Props> = ({
  vehicle,
  serviceHistory,
  onAddExpense,
  onDeleteExpense,
}) => {
  const [activeFilter, setActiveFilter] = useState<string>("Semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State for Manual Expense
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<ExpenseCategory>("Service");
  const [title, setTitle] = useState("");
  const [cost, setCost] = useState("");
  const [odometer, setOdometer] = useState<string>(
    vehicle.currentOdometer ? String(vehicle.currentOdometer) : ""
  );
  const [workshop, setWorkshop] = useState("");
  const [notes, setNotes] = useState("");

  // Format currency in Rupiah
  const formatRupiah = (val: number) => {
    return `Rp${Math.round(val).toLocaleString("id-ID")}`;
  };

  // Filter history strictly for current active vehicle
  const vehicleExpenses = useMemo(() => {
    return serviceHistory
      .filter((h) => h.vehicleId === vehicle.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [serviceHistory, vehicle.id]);

  // Aggregate totals
  const totals = useMemo(() => {
    let totalAll = 0;
    let totalService = 0;
    let totalEtoll = 0;
    let totalLainnya = 0;

    vehicleExpenses.forEach((exp) => {
      const amount = exp.cost || 0;
      totalAll += amount;

      const catLower = (exp.category || "").toLowerCase();
      if (
        catLower === "service" ||
        catLower === "oil" ||
        catLower === "brake" ||
        catLower === "tires" ||
        catLower === "transmission" ||
        catLower === "filter" ||
        catLower === "general"
      ) {
        totalService += amount;
      } else if (catLower === "top up etoll" || catLower === "etoll") {
        totalEtoll += amount;
      } else {
        totalLainnya += amount;
      }
    });

    return { totalAll, totalService, totalEtoll, totalLainnya };
  }, [vehicleExpenses]);

  // Filtered expenses list
  const filteredList = useMemo(() => {
    return vehicleExpenses.filter((item) => {
      // Category filter
      if (activeFilter !== "Semua") {
        const itemCat = item.category || "Lainnya";
        if (activeFilter === "Service") {
          const catLower = itemCat.toLowerCase();
          const isServ =
            catLower === "service" ||
            catLower === "oil" ||
            catLower === "brake" ||
            catLower === "tires" ||
            catLower === "transmission" ||
            catLower === "filter" ||
            catLower === "general";
          if (!isServ) return false;
        } else if (activeFilter === "Top Up Etoll") {
          if (itemCat !== "Top Up Etoll") return false;
        } else if (activeFilter === "Lainnya") {
          if (itemCat === "Service" || itemCat === "Top Up Etoll") return false;
        }
      }

      // Search filter by title, category, notes, workshop, or date
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchCategory = (item.category || "").toLowerCase().includes(q);
        const matchNotes = (item.notes || "").toLowerCase().includes(q);
        const matchWorkshop = (item.workshop || "").toLowerCase().includes(q);
        const matchDate = item.date.includes(q);
        return matchTitle || matchCategory || matchNotes || matchWorkshop || matchDate;
      }

      return true;
    });
  }, [vehicleExpenses, activeFilter, searchQuery]);

  const handleOpenAddModal = () => {
    setDate(new Date().toISOString().slice(0, 10));
    setCategory("Service");
    setTitle("");
    setCost("");
    setOdometer(
      vehicle.currentOdometer ? String(vehicle.currentOdometer) : ""
    );
    setWorkshop("");
    setNotes("");
    setIsModalOpen(true);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Harap masukkan nama / keterangan biaya.");
      return;
    }
    const parsedCost = parseFloat(cost.replace(/[^0-9]/g, ""));
    if (!parsedCost || parsedCost <= 0) {
      alert("Harap masukkan nominal biaya yang valid.");
      return;
    }

    onAddExpense({
      vehicleId: vehicle.id,
      title: title.trim(),
      category: category,
      date: date || new Date().toISOString().slice(0, 10),
      cost: parsedCost,
      odometer: odometer ? Number(odometer) : undefined,
      workshop: workshop.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    setIsModalOpen(false);
  };

  const getCategoryBadge = (cat: string) => {
    const c = cat.toLowerCase();
    if (
      c === "service" ||
      c === "oil" ||
      c === "brake" ||
      c === "tires" ||
      c === "transmission" ||
      c === "filter" ||
      c === "general"
    ) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
          <Wrench className="w-2.5 h-2.5" />
          Service
        </span>
      );
    } else if (c === "top up etoll" || c === "etoll") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
          <CreditCard className="w-2.5 h-2.5" />
          Top Up Etoll
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20">
        <Layers className="w-2.5 h-2.5" />
        Lainnya
      </span>
    );
  };

  return (
    <div className="space-y-4 pb-20 text-slate-800 dark:text-slate-100 transition-colors">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#182132] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Riwayat Biaya Kendaraan
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Catatan pengeluaran Service, Top Up Etoll, dan biaya operasional lainnya
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Tambah Biaya Baru
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Total Semua Biaya */}
        <div className="bg-white dark:bg-[#182132] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Total Biaya
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white font-mono mt-1">
            {formatRupiah(totals.totalAll)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {vehicleExpenses.length} transaksi tercatat
          </div>
        </div>

        {/* Kategori: Service */}
        <div className="bg-white dark:bg-[#182132] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
            <Wrench className="w-3 h-3" />
            Service
          </div>
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400 font-mono mt-1">
            {formatRupiah(totals.totalService)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Perawatan &amp; perbaikan
          </div>
        </div>

        {/* Kategori: Top Up Etoll */}
        <div className="bg-white dark:bg-[#182132] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <CreditCard className="w-3 h-3" />
            Top Up Etoll
          </div>
          <div className="text-lg font-bold text-amber-600 dark:text-amber-400 font-mono mt-1">
            {formatRupiah(totals.totalEtoll)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Tarif tol &amp; uang elektronik
          </div>
        </div>

        {/* Kategori: Lainnya */}
        <div className="bg-white dark:bg-[#182132] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-medium text-purple-600 dark:text-purple-400 flex items-center gap-1">
            <Layers className="w-3 h-3" />
            Lainnya
          </div>
          <div className="text-lg font-bold text-purple-600 dark:text-purple-400 font-mono mt-1">
            {formatRupiah(totals.totalLainnya)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Parkir, cuci, aksesoris, dll
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white dark:bg-[#182132] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#101622] rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            {["Semua", "Service", "Top Up Etoll", "Lainnya"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  activeFilter === tab
                    ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white font-semibold shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Menampilkan <b>{filteredList.length}</b> catatan
          </span>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan judul biaya atau kategori (Service, Top Up Etoll, Lainnya)..."
            className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-200 dark:border-slate-700/80 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* List of Manual Expense Records */}
      {filteredList.length === 0 ? (
        <div className="bg-white dark:bg-[#182132] p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Belum Ada Riwayat Biaya
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
              Catat riwayat biaya seperti Service bengkel, Top Up E-Toll tol, atau pengeluaran operasional lainnya.
            </p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Catat Biaya Pertama
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredList.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-[#182132] p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-start justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {getCategoryBadge(item.category)}
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {item.date}
                  </span>
                  {item.odometer && (
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-0.5">
                      <Gauge className="w-3 h-3 text-slate-400" />
                      {item.odometer.toLocaleString("id-ID")} km
                    </span>
                  )}
                </div>

                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {item.title}
                </h4>

                {(item.workshop || item.notes) && (
                  <div className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                    {item.workshop && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span>{item.workshop}</span>
                      </div>
                    )}
                    {item.notes && (
                      <p className="text-[11px] italic text-slate-500 dark:text-slate-400">
                        "{item.notes}"
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Price & Delete Action */}
              <div className="text-right flex flex-col items-end justify-between self-stretch shrink-0">
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatRupiah(item.cost || 0)}
                </div>

                <button
                  onClick={() => setDeletingId(item.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition mt-2"
                  title="Hapus riwayat biaya ini"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal for Deleting Record */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#151c2b] border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-sm p-5 space-y-3 shadow-2xl text-slate-900 dark:text-slate-100 transition-colors">
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Hapus Riwayat Biaya?
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Apakah Anda yakin ingin menghapus catatan biaya ini? Tindakan ini
              tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteExpense(deletingId);
                  setDeletingId(null);
                }}
                className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow-sm transition active:scale-95"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add Manual Expense */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-white dark:bg-[#151c2b] text-slate-900 dark:text-slate-100 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col transition-colors">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#192235]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-500/15 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Catat Biaya Kendaraan
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{vehicle.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form
              onSubmit={handleSaveExpense}
              className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                {/* Tanggal */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#101622]"
                  />
                </div>

                {/* Kategori: Dropdown strictly: Service, Top Up Etoll, Lainnya */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Kategori *
                  </label>
                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as ExpenseCategory)
                    }
                    required
                    className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#101622]"
                  >
                    <option value="Service">Service</option>
                    <option value="Top Up Etoll">Top Up Etoll</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              {/* Keterangan / Judul Biaya */}
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Keterangan / Nama Biaya *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    category === "Service"
                      ? "Contoh: Ganti Oli Mesin & Filter"
                      : category === "Top Up Etoll"
                      ? "Contoh: Top Up Mandiri e-Money / Flazz"
                      : "Contoh: Cuci Mobil & Jamur Kaca"
                  }
                  required
                  className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#101622]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Nominal Biaya */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Nominal Biaya (Rp) *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cost}
                    onChange={(e) =>
                      setCost(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    placeholder="Contoh: 350000"
                    required
                    className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#101622] font-mono"
                  />
                </div>

                {/* Odometer */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Odometer Terkini (KM)
                  </label>
                  <input
                    type="number"
                    value={odometer}
                    onChange={(e) => setOdometer(e.target.value)}
                    placeholder={String(vehicle.currentOdometer)}
                    className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#101622] font-mono"
                  />
                </div>
              </div>

              {/* Tempat / Bengkel / Merchant */}
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tempat / Bengkel / Merchant
                </label>
                <input
                  type="text"
                  value={workshop}
                  onChange={(e) => setWorkshop(e.target.value)}
                  placeholder="Contoh: Auto2000 BSD, Indomaret, dsb"
                  className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#101622]"
                />
              </div>

              {/* Catatan Tambahan */}
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Catatan Tambahan
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan pengerjaan atau detail transaksi..."
                  className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#101622]"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-sm transition active:scale-95"
                >
                  Simpan Biaya
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
