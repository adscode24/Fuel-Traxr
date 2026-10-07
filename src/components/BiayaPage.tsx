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
  Car,
  Edit2,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { Vehicle, ServiceHistoryEntry, ExpenseCategory, ServiceItem } from "../types";
import { ExpenseEntryModal } from "./ExpenseEntryModal";
import { ServiceReminders } from "./ServiceReminders";

interface Props {
  vehicle: Vehicle | null;
  serviceHistory: ServiceHistoryEntry[];
  services?: ServiceItem[];
  onAddExpense?: (
    entry: Omit<ServiceHistoryEntry, "id" | "createdAt">
  ) => void;
  onSaveExpense?: (entry: ServiceHistoryEntry) => void;
  onDeleteExpense: (id: string) => void;
  onOpenRegisterVehicle?: () => void;
  // Handler jadwal servis (opsional — halaman servis akan disembunyikan bila kosong)
  onAddService?: (item: Omit<ServiceItem, "id">) => void;
  onUpdateService?: (item: ServiceItem) => void;
  onDeleteService?: (id: string) => void;
  onAddServiceHistory?: (
    entry: Omit<ServiceHistoryEntry, "id" | "createdAt">
  ) => void;
  onDeleteServiceHistory?: (id: string) => void;
}

type PageView = "biaya" | "servis";

/** Pemindah tampilan utama di halaman Biaya: Buku Biaya vs Jadwal Servis. */
const PageViewSwitcher: React.FC<{
  value: PageView;
  onChange: (v: PageView) => void;
}> = ({ value, onChange }) => (
  <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-white dark:bg-[#151c2a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
    <button
      type="button"
      onClick={() => onChange("biaya")}
      className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition ${
        value === "biaya"
          ? "bg-blue-600 text-white shadow-xs"
          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
      }`}
    >
      <Wallet className="w-4 h-4" />
      <span>Buku Biaya</span>
    </button>
    <button
      type="button"
      onClick={() => onChange("servis")}
      className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition ${
        value === "servis"
          ? "bg-blue-600 text-white shadow-xs"
          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
      }`}
    >
      <Wrench className="w-4 h-4" />
      <span>Jadwal Servis</span>
    </button>
  </div>
);

export const BiayaPage: React.FC<Props> = ({
  vehicle,
  serviceHistory = [],
  services,
  onAddExpense,
  onSaveExpense,
  onDeleteExpense,
  onOpenRegisterVehicle,
  onAddService,
  onUpdateService,
  onDeleteService,
  onAddServiceHistory,
  onDeleteServiceHistory,
}) => {
  const [pageView, setPageView] = useState<PageView>("biaya");
  const [activeFilter, setActiveFilter] = useState<string>("Semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceHistoryEntry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});

  // Current calendar month key (e.g. "2026-09")
  const currentMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  // Determine if a month group should be collapsed
  // Requirement: "accordion secara default tampil tertutup untuk bulan yang sudah lewat"
  const isMonthCollapsed = (monthKey: string) => {
    if (monthKey in collapsedMonths) {
      return collapsedMonths[monthKey];
    }
    // Default: bulan yang sudah lewat (< currentMonthKey) tampil tertutup (collapsed)
    if (monthKey !== "Lainnya" && monthKey < currentMonthKey) {
      return true;
    }
    return false;
  };

  // Form state dikelola di ExpenseEntryModal
  // Format currency in Indonesian Rupiah
  const formatRupiah = (val: number, withDecimals = false) => {
    if (isNaN(val) || val === undefined || val === null) return "Rp0";
    const num = Math.round(val);
    return `Rp${num.toLocaleString("id-ID")}`;
  };

  // Safe date formatter (DD/MM/YYYY)
  const formatDisplayDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr || "-";
    }
  };

  // Filter history strictly for current active vehicle (or all if no active vehicle)
  const vehicleExpenses = useMemo(() => {
    if (!Array.isArray(serviceHistory)) return [];
    if (!vehicle) return serviceHistory;
    return serviceHistory.filter((h) => !h.vehicleId || h.vehicleId === vehicle.id);
  }, [serviceHistory, vehicle]);

  // Filtered expenses list by active category filter and search query
  const filteredList = useMemo(() => {
    return vehicleExpenses.filter((item) => {
      const itemCat = (item.category || "Lainnya").toLowerCase();

      // Category filter check
      if (activeFilter !== "Semua") {
        if (activeFilter === "Service") {
          const isServ =
            itemCat.includes("serv") ||
            itemCat === "oil" ||
            itemCat === "brake" ||
            itemCat === "tires" ||
            itemCat === "transmission" ||
            itemCat === "filter" ||
            itemCat === "general";
          if (!isServ) return false;
        } else if (activeFilter === "Top Up Etoll") {
          if (!itemCat.includes("etoll") && !itemCat.includes("tol")) return false;
        } else if (activeFilter === "Pajak & STNK") {
          if (!itemCat.includes("pajak") && !itemCat.includes("stnk") && !itemCat.includes("kir"))
            return false;
        } else if (activeFilter === "Parkir & Cuci") {
          if (!itemCat.includes("parkir") && !itemCat.includes("cuci")) return false;
        } else if (activeFilter === "Lainnya") {
          if (
            itemCat.includes("serv") ||
            itemCat.includes("etoll") ||
            itemCat.includes("tol") ||
            itemCat.includes("pajak") ||
            itemCat.includes("stnk") ||
            itemCat.includes("parkir") ||
            itemCat.includes("cuci")
          ) {
            return false;
          }
        }
      }

      // Search filter by title, category, notes, workshop, or date
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (item.title || "").toLowerCase().includes(q);
        const matchCategory = itemCat.includes(q);
        const matchNotes = (item.notes || "").toLowerCase().includes(q);
        const matchWorkshop = (item.workshop || "").toLowerCase().includes(q);
        const matchDate = (item.date || "").includes(q);
        return matchTitle || matchCategory || matchNotes || matchWorkshop || matchDate;
      }

      return true;
    });
  }, [vehicleExpenses, activeFilter, searchQuery]);

  // Sort descending by date (newest first)
  const sortedExpenses = useMemo(() => {
    return [...filteredList].sort((a, b) => {
      const dateA = a.date || "";
      const dateB = b.date || "";
      return dateB.localeCompare(dateA);
    });
  }, [filteredList]);

  // Group by Month (e.g. "2026-09" -> September 2026)
  const monthGroups = useMemo(() => {
    const map = new Map<string, { key: string; label: string; items: ServiceHistoryEntry[] }>();

    sortedExpenses.forEach((item) => {
      const rawDate = item.date || "";
      let monthKey = "Lainnya";
      let monthLabel = "Catatan Lainnya";

      if (rawDate && rawDate.length >= 7) {
        monthKey = rawDate.slice(0, 7);
        const [yearStr, monthStr] = monthKey.split("-");
        const y = parseInt(yearStr, 10);
        const m = parseInt(monthStr, 10);
        if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
          const d = new Date(y, m - 1, 1);
          monthLabel = d.toLocaleDateString("id-ID", {
            month: "long",
            year: "numeric",
          });
        } else {
          monthLabel = monthKey;
        }
      }

      if (!map.has(monthKey)) {
        map.set(monthKey, { key: monthKey, label: monthLabel, items: [] });
      }
      map.get(monthKey)!.items.push(item);
    });

    return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
  }, [sortedExpenses]);

  // Accordion toggle for month groups
  const toggleMonth = (monthKey: string) => {
    setCollapsedMonths((prev) => {
      const currentVal = isMonthCollapsed(monthKey);
      return {
        ...prev,
        [monthKey]: !currentVal,
      };
    });
  };

  const handleExpandAllMonths = () => {
    const allOpen: Record<string, boolean> = {};
    monthGroups.forEach((g) => {
      allOpen[g.key] = false;
    });
    setCollapsedMonths(allOpen);
  };

  const handleCollapseAllMonths = () => {
    const allClosed: Record<string, boolean> = {};
    monthGroups.forEach((g) => {
      allClosed[g.key] = true;
    });
    setCollapsedMonths(allClosed);
  };

  // Open modal for new expense
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  // Open modal for editing an existing expense
  const handleOpenEditModal = (item: ServiceHistoryEntry) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  // Visual helper: category style badge & icon
  const getCategoryMeta = (catStr?: string) => {
    const catLower = (catStr || "").toLowerCase();
    if (
      catLower.includes("serv") ||
      catLower === "oil" ||
      catLower === "brake" ||
      catLower === "tires" ||
      catLower === "filter"
    ) {
      return {
        label: "Servis",
        icon: Wrench,
        badgeBg: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 border-blue-200 dark:border-blue-500/30",
        avatarBg: "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400",
      };
    }
    if (catLower.includes("etoll") || catLower.includes("tol")) {
      return {
        label: "Top Up E-Toll",
        icon: CreditCard,
        badgeBg: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-amber-200 dark:border-amber-500/30",
        avatarBg: "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400",
      };
    }
    if (catLower.includes("pajak") || catLower.includes("stnk") || catLower.includes("kir")) {
      return {
        label: "Pajak & STNK",
        icon: FileText,
        badgeBg: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30",
        avatarBg: "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400",
      };
    }
    if (catLower.includes("parkir") || catLower.includes("cuci")) {
      return {
        label: "Parkir & Cuci",
        icon: Car,
        badgeBg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30",
        avatarBg: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
      };
    }
    return {
      label: catStr || "Lainnya",
      icon: Layers,
      badgeBg: "bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400 border-purple-200 dark:border-purple-500/30",
      avatarBg: "bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400",
    };
  };

  // If user has not registered vehicle yet AND no expenses, prompt registration
  if (!vehicle && serviceHistory.length === 0) {
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
              Daftarkan mobil atau motor Anda sekarang untuk mulai mencatat biaya servis berkala, isi saldo e-toll, pajak, dan pengeluaran operasional.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            <button
              onClick={onOpenRegisterVehicle}
              className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition active:scale-98 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Daftarkan Kendaraan Anda</span>
            </button>
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition cursor-pointer"
            >
              <Wallet className="w-4 h-4" />
              <span>Catat Biaya Langsung</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const showServisView =
    pageView === "servis" &&
    !!vehicle &&
    !!onAddService &&
    !!onUpdateService &&
    !!onDeleteService &&
    !!onAddServiceHistory &&
    !!onDeleteServiceHistory;

  const vehicleServices = useMemo(() => {
    if (!Array.isArray(services)) return [];
    if (!vehicle) return services;
    return services.filter((s) => !s.vehicleId || s.vehicleId === vehicle.id);
  }, [services, vehicle]);

  if (showServisView && vehicle) {
    return (
      <div className="space-y-4 pb-28 text-slate-800 dark:text-slate-100 transition-colors">
        <PageViewSwitcher value={pageView} onChange={setPageView} />

        <ServiceReminders
          vehicle={vehicle}
          services={vehicleServices}
          serviceHistory={vehicleExpenses}
          onAddService={onAddService!}
          onUpdateService={onUpdateService!}
          onDeleteService={onDeleteService!}
          onAddServiceHistory={onAddServiceHistory!}
          onDeleteServiceHistory={onDeleteServiceHistory!}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-28 text-slate-800 dark:text-slate-100 transition-colors">
      <PageViewSwitcher value={pageView} onChange={setPageView} />

      {/* Dedicated Expense Page Header */}
      <div className="bg-white dark:bg-[#151c2a] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 dark:text-white">
                Buku Biaya Kendaraan
              </h1>
              {vehicle?.name && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {vehicle.name}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Catatan transaksi servis, e-toll, pajak, dan pengeluaran operasional
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-xs transition active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Catat Biaya Baru</span>
        </button>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="bg-white dark:bg-[#151c2a] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          {[
            { id: "Semua", label: "Semua", icon: null },
            { id: "Service", label: "Servis & Perawatan", icon: Wrench },
            { id: "Top Up Etoll", label: "Top Up E-Toll", icon: CreditCard },
            { id: "Pajak & STNK", label: "Pajak & STNK", icon: FileText },
            { id: "Parkir & Cuci", label: "Parkir & Cuci", icon: Car },
            { id: "Lainnya", label: "Lainnya", icon: Layers },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium text-xs whitespace-nowrap transition cursor-pointer shrink-0 ${
                  isActive
                    ? "bg-blue-600 text-white font-semibold shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Input Bar */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari transaksi (contoh: Oli, e-Money, Pajak, Auto2000, 2026-09)..."
            className="w-full bg-slate-50 dark:bg-[#10141e] border border-slate-200 dark:border-slate-700/80 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Counter Info */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 pt-0.5">
          <span>
            Menampilkan <b>{filteredList.length}</b> transaksi biaya
            {activeFilter !== "Semua" ? ` (${activeFilter})` : ""}
          </span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-rose-500 hover:underline font-medium cursor-pointer"
            >
              Reset Pencarian
            </button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {filteredList.length === 0 && (
        <div className="bg-white dark:bg-[#141a26] p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            {searchQuery ? <Search className="w-6 h-6" /> : <Wallet className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {searchQuery ? "Transaksi Tidak Ditemukan" : "Belum Ada Catatan Biaya"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
              {searchQuery
                ? `Tidak ada transaksi yang cocok dengan kata kunci "${searchQuery}". Coba kata kunci lain.`
                : "Catat pengeluaran seperti servis berkala di bengkel, isi saldo kartu e-toll, pajak STNK, atau cuci kendaraan."}
            </p>
          </div>
          <button
            type="button"
            onClick={searchQuery ? () => setSearchQuery("") : handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-xs"
          >
            {searchQuery ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{searchQuery ? "Hapus Filter Pencarian" : "+ Catat Biaya Pertama"}</span>
          </button>
        </div>
      )}

      {/* Grouped Month Lists with Accordion Feature */}
      {monthGroups.length > 1 && (
        <div className="flex items-center justify-between px-1 pt-1 pb-0.5 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium">
            Riwayat per Bulan ({monthGroups.length} bulan)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExpandAllMonths}
              className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
            >
              Buka Semua
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={handleCollapseAllMonths}
              className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:underline cursor-pointer"
            >
              Tutup Semua
            </button>
          </div>
        </div>
      )}

      {monthGroups.map(({ key: monthKey, label: monthLabel, items: monthItems }) => {
        const monthTotal = monthItems.reduce((acc, h) => acc + (Number(h.cost) || 0), 0);
        const isCollapsed = isMonthCollapsed(monthKey);

        return (
          <div key={monthKey} className="space-y-2.5">
            {/* Interactive Month Accordion Header Card */}
            <button
              type="button"
              onClick={() => toggleMonth(monthKey)}
              aria-expanded={!isCollapsed}
              className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 group select-none shadow-xs cursor-pointer ${
                isCollapsed
                  ? "bg-white dark:bg-[#151c2a] hover:bg-slate-50 dark:hover:bg-[#1a2233] border-slate-200 dark:border-slate-800"
                  : "bg-gradient-to-r from-purple-50/70 via-white to-slate-50/50 dark:from-[#1b192e] dark:via-[#151c2a] dark:to-[#121722] border-purple-200/80 dark:border-purple-800/60"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    isCollapsed
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-purple-600"
                      : "bg-purple-600 text-white shadow-xs"
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white capitalize truncate">
                      {monthLabel}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 shrink-0">
                      {monthItems.length} transaksi
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block truncate">
                    Total pengeluaran bulan ini
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <span className="font-mono font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                  {formatRupiah(monthTotal)}
                </span>
                <div
                  className={`p-1 rounded-lg text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-transform duration-200 ${
                    isCollapsed ? "-rotate-90" : "rotate-0"
                  }`}
                >
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </button>

            {/* List of Expense Transaction Cards for this month */}
            {!isCollapsed && (
              <div className="space-y-2.5 pt-0.5 animate-in fade-in duration-200">
                {monthItems.map((item) => {
                  const meta = getCategoryMeta(item.category);
                  const Icon = meta.icon;
                  const formattedDate = formatDisplayDate(item.date);

                  return (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-[#192131] hover:bg-slate-50 dark:hover:bg-[#1d2638] p-4 rounded-2xl border border-slate-200 dark:border-slate-800/90 shadow-xs transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      {/* Left: Category Icon & Details */}
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meta.avatarBg}`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${meta.badgeBg}`}
                            >
                              <Icon className="w-2.5 h-2.5" />
                              <span>{meta.label}</span>
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{formattedDate}</span>
                            </span>
                            {item.odometer && (
                              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded">
                                <Gauge className="w-3 h-3 text-slate-400" />
                                <span>{item.odometer.toLocaleString("id-ID")} km</span>
                              </span>
                            )}
                          </div>

                          <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {item.title}
                          </h3>

                          {(item.workshop || item.notes) && (
                            <div className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5 pt-0.5">
                              {item.workshop && (
                                <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                  <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
                                  <span className="truncate">{item.workshop}</span>
                                </div>
                              )}
                              {item.notes && (
                                <p className="text-[11px] italic text-slate-500 dark:text-slate-400 line-clamp-2">
                                  "{item.notes}"
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Nominal & Action Buttons */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2.5 sm:pt-0 border-slate-100 dark:border-slate-800 shrink-0">
                        <div className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                          {formatRupiah(item.cost || 0)}
                        </div>

                        {/* Edit & Delete Action Buttons */}
                        <div className="flex items-center gap-1 mt-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition cursor-pointer"
                            title="Edit data biaya ini"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(item.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer"
                            title="Hapus riwayat biaya ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Floating Action Button (FAB) (+) */}
      <div className="fixed bottom-24 right-4 sm:right-6 z-30">
        <button
          type="button"
          onClick={handleOpenAddModal}
          className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-2xl bg-blue-600 hover:bg-blue-500 text-white transition active:scale-95 shadow-blue-600/30 cursor-pointer"
          title="Catat Biaya Baru"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>

      {/* Confirmation Modal for Deleting Record */}
      {deletingId && (
        <div
          className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeletingId(null);
          }}
        >
          <div className="bg-white dark:bg-[#151c2b] border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-sm p-5 space-y-3 shadow-2xl text-slate-900 dark:text-slate-100 transition-colors">
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Hapus Riwayat Biaya?
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Apakah Anda yakin ingin menghapus catatan biaya ini? Data ini akan dihapus permanen dari perangkat.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteExpense(deletingId);
                  setDeletingId(null);
                }}
                className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Expense (extracted component) */}
      <ExpenseEntryModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        vehicle={vehicle}
        editingItem={editingItem}
        onAddExpense={onAddExpense}
        onSaveExpense={onSaveExpense}
      />
    </div>
  );
};
