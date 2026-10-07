import React, { useState } from "react";
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Check,
  Calendar,
  Sparkles,
  ShieldCheck,
  History,
  Store,
  DollarSign,
  FileText,
} from "lucide-react";
import { Vehicle, ServiceItem, ServiceHistoryEntry } from "../types";
import { BottomSheet } from "./BottomSheet";

interface Props {
  vehicle: Vehicle;
  services: ServiceItem[];
  serviceHistory: ServiceHistoryEntry[];
  onAddService: (item: Omit<ServiceItem, "id">) => void;
  onUpdateService: (item: ServiceItem) => void;
  onDeleteService: (id: string) => void;
  onAddServiceHistory: (entry: Omit<ServiceHistoryEntry, "id" | "createdAt">) => void;
  onDeleteServiceHistory: (id: string) => void;
}

export const ServiceReminders: React.FC<Props> = ({
  vehicle,
  services,
  serviceHistory,
  onAddService,
  onUpdateService,
  onDeleteService,
  onAddServiceHistory,
  onDeleteServiceHistory,
}) => {
  const [activeTab, setActiveTab] = useState<"schedules" | "history">("schedules");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddHistoryModal, setShowAddHistoryModal] = useState(false);
  const [markingDoneItem, setMarkingDoneItem] = useState<ServiceItem | null>(null);

  // New Schedule Form State
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<ServiceItem["category"]>("oil");
  const [newInterval, setNewInterval] = useState(10000);
  const [newLastKm, setNewLastKm] = useState(vehicle.currentOdometer);
  const [newNotes, setNewNotes] = useState("");

  // Mark Done / Add History Form State
  const [doneDate, setDoneDate] = useState(new Date().toISOString().slice(0, 10));
  const [doneOdometer, setDoneOdometer] = useState(vehicle.currentOdometer);
  const [doneCost, setDoneCost] = useState<number | "">("");
  const [doneWorkshop, setDoneWorkshop] = useState("");
  const [doneNotes, setDoneNotes] = useState("");

  // Standalone Add History Form State
  const [histTitle, setHistTitle] = useState("");
  const [histCategory, setHistCategory] = useState<ServiceItem["category"]>("oil");
  const [histDate, setHistDate] = useState(new Date().toISOString().slice(0, 10));
  const [histOdometer, setHistOdometer] = useState(vehicle.currentOdometer);
  const [histCost, setHistCost] = useState<number | "">("");
  const [histWorkshop, setHistWorkshop] = useState("");
  const [histNotes, setHistNotes] = useState("");

  const currentKm = vehicle.currentOdometer;

  // Filter history for current vehicle
  const vehicleHistory = serviceHistory
    .filter((h) => h.vehicleId === vehicle.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Classify services
  const overdueServices: { item: ServiceItem; kmOver: number }[] = [];
  const nearServices: { item: ServiceItem; kmLeft: number }[] = [];
  const safeServices: { item: ServiceItem; kmLeft: number }[] = [];

  services.forEach((s) => {
    const diff = s.nextServiceOdometer - currentKm;
    if (diff <= 0) {
      overdueServices.push({ item: s, kmOver: Math.abs(diff) });
    } else if (diff <= 500) {
      nearServices.push({ item: s, kmLeft: diff });
    } else {
      safeServices.push({ item: s, kmLeft: diff });
    }
  });

  const formatRupiah = (val: number) => {
    return `Rp${val.toLocaleString("id-ID")}`;
  };

  const openMarkDoneModal = (item: ServiceItem) => {
    setMarkingDoneItem(item);
    setDoneDate(new Date().toISOString().slice(0, 10));
    setDoneOdometer(currentKm);
    setDoneCost("");
    setDoneWorkshop("");
    setDoneNotes(item.notes || "");
  };

  const handleConfirmMarkDone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!markingDoneItem) return;

    const parsedOdo = Number(doneOdometer) || currentKm;
    const parsedCost = doneCost ? Number(doneCost) : undefined;

    // 1. Record into Service History
    onAddServiceHistory({
      vehicleId: vehicle.id,
      title: markingDoneItem.title,
      category: markingDoneItem.category,
      odometer: parsedOdo,
      date: doneDate,
      cost: parsedCost,
      workshop: doneWorkshop || undefined,
      notes: doneNotes || undefined,
    });

    // 2. Update service schedule interval
    const updated: ServiceItem = {
      ...markingDoneItem,
      lastServiceOdometer: parsedOdo,
      nextServiceOdometer: parsedOdo + markingDoneItem.intervalKm,
      lastServiceDate: doneDate,
    };
    onUpdateService(updated);

    setMarkingDoneItem(null);
  };

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    onAddService({
      vehicleId: vehicle.id,
      title: newTitle,
      category: newCategory,
      intervalKm: Number(newInterval),
      lastServiceOdometer: Number(newLastKm),
      nextServiceOdometer: Number(newLastKm) + Number(newInterval),
      lastServiceDate: new Date().toISOString().slice(0, 10),
      notes: newNotes,
    });

    setNewTitle("");
    setNewNotes("");
    setShowAddModal(false);
  };

  const handleCreateHistory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!histTitle) return;

    onAddServiceHistory({
      vehicleId: vehicle.id,
      title: histTitle,
      category: histCategory,
      odometer: Number(histOdometer) || currentKm,
      date: histDate,
      cost: histCost ? Number(histCost) : undefined,
      workshop: histWorkshop || undefined,
      notes: histNotes || undefined,
    });

    setHistTitle("");
    setHistCost("");
    setHistWorkshop("");
    setHistNotes("");
    setShowAddHistoryModal(false);
  };

  const handleDeleteHistoryEntry = (entry: ServiceHistoryEntry) => {
    const confirmMessage = `Hapus catatan riwayat servis "${entry.title}" pada ${entry.date} (${entry.odometer.toLocaleString("id-ID")} KM)?\n\nData riwayat servis ini akan dihapus permanen.`;
    if (window.confirm(confirmMessage)) {
      onDeleteServiceHistory(entry.id);
    }
  };

  return (
    <div className="space-y-4 pb-20 text-slate-800 dark:text-slate-100 transition-colors">
      {/* Current Vehicle Status Header */}
      <div className="bg-white dark:bg-[#182132] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-500/30">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Servis &amp; Perawatan: {vehicle.name}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Odometer Terkini:{" "}
              <span className="text-slate-900 dark:text-white font-mono font-bold">
                {currentKm.toLocaleString("id-ID")} KM
              </span>{" "}
              ({vehicle.licensePlate})
            </p>
          </div>
        </div>

        {/* Tab switcher: Jadwal vs Riwayat */}
        <div className="flex items-center bg-slate-100 dark:bg-[#111724] p-1 rounded-xl border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("schedules")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === "schedules"
                ? "bg-white dark:bg-[#20293d] text-blue-600 dark:text-blue-400 font-semibold shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Jadwal Berkala ({services.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === "history"
                ? "bg-white dark:bg-[#20293d] text-blue-600 dark:text-blue-400 font-semibold shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Riwayat Selesai ({vehicleHistory.length})</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: JADWAL SERVIS BERKALA */}
      {activeTab === "schedules" && (
        <div className="space-y-4">
          {/* Action Bar */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Pengingat otomatis berdasarkan jarak odometer
            </span>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Jadwal</span>
            </button>
          </div>

          {/* Critical Notification Banner if Overdue */}
          {overdueServices.length > 0 && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-600/50 text-rose-800 dark:text-rose-200 flex items-start gap-3 shadow-sm">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <div className="font-bold text-rose-700 dark:text-rose-300">
                  Perhatian: {overdueServices.length} Jadwal Servis Terlewat (Jatuh Tempo)!
                </div>
                <p className="text-rose-700/90 dark:text-rose-200/90">
                  {overdueServices.map((o) => o.item.title).join(", ")}. Segera lakukan servis berkala untuk menjaga keandalan kendaraan.
                </p>
              </div>
            </div>
          )}

          {/* Warning Notification Banner if Near Due */}
          {nearServices.length > 0 && overdueServices.length === 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/40 text-amber-800 dark:text-amber-200 flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-0.5">
                <div className="font-semibold text-amber-700 dark:text-amber-300">
                  Pengingat: Servis Berkala Mendekati Batas KM (&lt; 500 km)
                </div>
                <p className="text-amber-700/90 dark:text-amber-200/90">
                  {nearServices.map((n) => `${n.item.title} (tersisa ${n.kmLeft} km)`).join(", ")}.
                </p>
              </div>
            </div>
          )}

          {/* All Service Items List */}
          <div className="space-y-3">
            {services.map((item) => {
              const diff = item.nextServiceOdometer - currentKm;
              const isOverdue = diff <= 0;
              const isNear = diff > 0 && diff <= 500;

              const progressPercent = Math.min(
                100,
                Math.max(
                  0,
                  ((currentKm - item.lastServiceOdometer) / item.intervalKm) * 100
                )
              );

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition shadow-sm ${
                    isOverdue
                      ? "bg-rose-50/50 dark:bg-[#1c1822] border-rose-200 dark:border-rose-600/40"
                      : isNear
                      ? "bg-amber-50/50 dark:bg-[#1f1e24] border-amber-200 dark:border-amber-500/40"
                      : "bg-white dark:bg-[#182132] border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                            isOverdue
                              ? "bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-500/40"
                              : isNear
                              ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/40"
                              : "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/40"
                          }`}
                        >
                          {isOverdue ? "Terlewat" : isNear ? "Mendekati" : "Aman"}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {item.title}
                        </h3>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Interval setiap{" "}
                        <span className="text-slate-800 dark:text-slate-200 font-mono font-medium">
                          {item.intervalKm.toLocaleString("id-ID")} KM
                        </span>{" "}
                        • Terakhir pada:{" "}
                        <span className="text-slate-700 dark:text-slate-300 font-mono">
                          {item.lastServiceOdometer.toLocaleString("id-ID")} KM
                        </span>
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-semibold">
                        {isOverdue ? (
                          <span className="text-rose-600 dark:text-rose-400 font-mono font-bold">
                            Terlewat {Math.abs(diff).toLocaleString("id-ID")} KM!
                          </span>
                        ) : (
                          <span
                            className={`font-mono font-bold ${
                              isNear
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            Sisa {diff.toLocaleString("id-ID")} KM
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                        Target: {item.nextServiceOdometer.toLocaleString("id-ID")} KM
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOverdue
                            ? "bg-rose-500"
                            : isNear
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Buttons & Notes */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-xs">
                      {item.notes || `Servis rutin berkala`}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openMarkDoneModal(item)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-600/20 hover:bg-emerald-100 dark:hover:bg-emerald-600/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 text-xs font-semibold transition active:scale-95"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Selesai Servis
                      </button>
                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              `Hapus jadwal pengingat "${item.title}"?`
                            )
                          ) {
                            onDeleteService(item.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Hapus Jadwal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: RIWAYAT SERVIS SELESAI (With Delete Capability!) */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {/* Action Bar */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Riwayat servis masa lalu yang telah diselesaikan
            </span>
            <button
              onClick={() => setShowAddHistoryModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Riwayat Servis</span>
            </button>
          </div>

          {vehicleHistory.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white dark:bg-[#141a26] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
                <History className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Belum Ada Riwayat Servis
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
                Catat servis yang sudah pernah dilakukan atau klik tombol "Selesai Servis" pada jadwal berkala.
              </p>
              <button
                onClick={() => setShowAddHistoryModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition"
              >
                + Catat Riwayat Servis Manual
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {vehicleHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="p-4 rounded-2xl bg-white dark:bg-[#182132] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                        {entry.category}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {entry.title}
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{entry.date}</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1 font-mono font-medium text-slate-700 dark:text-slate-300">
                        <span>{entry.odometer.toLocaleString("id-ID")} KM</span>
                      </div>
                      {entry.workshop && (
                        <>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <Store className="w-3.5 h-3.5 text-slate-400" />
                            <span>{entry.workshop}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {entry.notes && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-0.5 italic">
                        "{entry.notes}"
                      </p>
                    )}
                  </div>

                  {/* Right side: Cost & Delete Button */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/80">
                    <div className="text-right">
                      <div className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {entry.cost ? formatRupiah(entry.cost) : "Biaya: -"}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Servis Selesai
                      </div>
                    </div>

                    {/* Delete Capability for Service History */}
                    <button
                      onClick={() => handleDeleteHistoryEntry(entry)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-800 transition active:scale-95"
                      title="Hapus riwayat servis ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Mark Service Schedule As Done */}
      {markingDoneItem && (
        <BottomSheet isOpen onClose={() => setMarkingDoneItem(null)} id="svc_mark_done" maxWidth="max-w-md">
          <div className="p-5 space-y-4 overflow-y-auto">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" />
                <span>Penyelesaian Servis</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                Catat Servis: {markingDoneItem.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pencatatan ini akan otomatis masuk ke Riwayat Servis dan memperbarui jadwal berikutnya.
              </p>
            </div>

            <form onSubmit={handleConfirmMarkDone} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Servis
                  </label>
                  <input
                    type="date"
                    value={doneDate}
                    onChange={(e) => setDoneDate(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-[#10141e] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Odometer Saat Servis (KM)
                  </label>
                  <input
                    type="number"
                    value={doneOdometer}
                    onChange={(e) => setDoneOdometer(Number(e.target.value))}
                    required
                    className="w-full bg-slate-50 dark:bg-[#10141e] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Total Biaya (Rp)
                  </label>
                  <input
                    type="number"
                    value={doneCost}
                    onChange={(e) =>
                      setDoneCost(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    placeholder="Contoh: 450000"
                    className="w-full bg-slate-50 dark:bg-[#10141e] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Bengkel
                  </label>
                  <input
                    type="text"
                    value={doneWorkshop}
                    onChange={(e) => setDoneWorkshop(e.target.value)}
                    placeholder="Misal: Auto2000, Shop&Drive"
                    className="w-full bg-slate-50 dark:bg-[#10141e] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan Tambahan / Garansi
                </label>
                <input
                  type="text"
                  value={doneNotes}
                  onChange={(e) => setDoneNotes(e.target.value)}
                  placeholder="Misal: Oli Shell Helix Ultra 0W-20 4L + Filter Oli Genuine"
                  className="w-full bg-slate-50 dark:bg-[#10141e] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMarkingDoneItem(null)}
                  className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow transition"
                >
                  Simpan &amp; Perbarui Jadwal
                </button>
              </div>
            </form>
          </div>
        </BottomSheet>
      )}

      {/* Modal: Add Manual Service History */}
      {showAddHistoryModal && (
        <BottomSheet isOpen onClose={() => setShowAddHistoryModal(false)} id="svc_add_history" maxWidth="max-w-md">
          <div className="p-5 space-y-4 overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Catat Riwayat Servis yang Pernah Dilakukan
            </h3>

            <form onSubmit={handleCreateHistory} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Pekerjaan Servis
                </label>
                <input
                  type="text"
                  value={histTitle}
                  onChange={(e) => setHistTitle(e.target.value)}
                  placeholder="Contoh: Ganti Kampas Rem Depan & Minyak Rem"
                  required
                  className="w-full bg-slate-50 dark:bg-[#10141e] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kategori
                  </label>
                  <select
                    value={histCategory}
                    onChange={(e) =>
                      setHistCategory(e.target.value as ServiceItem["category"])
                    }
                    className="w-full bg-slate-50 dark:bg-[#10141e] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="oil">Oli Mesin &amp; Filter</option>
                    <option value="brake">Pengereman</option>
                    <option value="transmission">Transmisi / Gardan</option>
                    <option value="filter">Filter Udara / AC</option>
                    <option value="tires">Ban &amp; Spooring</option>
                    <option value="general">Umum / Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Servis
                  </label>
                  <input
                    type="date"
                    value={histDate}
                    onChange={(e) => setHistDate(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-[#10141e] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Odometer Saat Servis (KM)
                  </label>
                  <input
                    type="number"
                    value={histOdometer}
                    onChange={(e) => setHistOdometer(Number(e.target.value))}
                    required
                    className="w-full bg-slate-50 dark:bg-[#10141e] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Biaya Servis (Rp)
                  </label>
                  <input
                    type="number"
                    value={histCost}
                    onChange={(e) =>
                      setHistCost(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    placeholder="Contoh: 350000"
                    className="w-full bg-slate-50 dark:bg-[#10141e] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Bengkel / Lokasi
                </label>
                <input
                  type="text"
                  value={histWorkshop}
                  onChange={(e) => setHistWorkshop(e.target.value)}
                  placeholder="Misal: Bengkel Resmi Honda / Berkah Motor"
                  className="w-full bg-slate-50 dark:bg-[#10141e] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan / Part yang Diganti
                </label>
                <input
                  type="text"
                  value={histNotes}
                  onChange={(e) => setHistNotes(e.target.value)}
                  placeholder="Misal: Kampas rem merk Bendix, part OEM"
                  className="w-full bg-slate-50 dark:bg-[#10141e] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddHistoryModal(false)}
                  className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow transition"
                >
                  Simpan ke Riwayat
                </button>
              </div>
            </form>
          </div>
        </BottomSheet>
      )}

      {/* Modal: Add Service Schedule */}
      {showAddModal && (
        <BottomSheet isOpen onClose={() => setShowAddModal(false)} id="svc_add_schedule" maxWidth="max-w-md">
          <div className="p-5 space-y-4 overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Tambah Pengingat Servis Berkala
            </h3>

            <form onSubmit={handleCreateSchedule} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Pekerjaan Servis
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Contoh: Ganti Busi Iridium, Cek Aki, Radiator Coolant"
                  required
                  className="w-full bg-slate-50 dark:bg-[#10141e] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kategori
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) =>
                      setNewCategory(e.target.value as ServiceItem["category"])
                    }
                    className="w-full bg-slate-50 dark:bg-[#10141e] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="oil">Oli Mesin &amp; Filter</option>
                    <option value="brake">Pengereman</option>
                    <option value="transmission">Transmisi / Gardan</option>
                    <option value="filter">Filter Udara / AC</option>
                    <option value="tires">Ban &amp; Kaki-kaki</option>
                    <option value="general">Umum / Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Interval Servis (KM)
                  </label>
                  <input
                    type="number"
                    value={newInterval}
                    onChange={(e) => setNewInterval(Number(e.target.value))}
                    required
                    step={1000}
                    className="w-full bg-slate-50 dark:bg-[#10141e] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  KM Terakhir Diservis
                </label>
                <input
                  type="number"
                  value={newLastKm}
                  onChange={(e) => setNewLastKm(Number(e.target.value))}
                  required
                  className="w-full bg-slate-50 dark:bg-[#10141e] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan / Spesifikasi Oli / Sparepart
                </label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Misal: 0W-20 API SP, 4 Liter"
                  className="w-full bg-slate-50 dark:bg-[#10141e] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow transition"
                >
                  Simpan Jadwal
                </button>
              </div>
            </form>
          </div>
        </BottomSheet>
      )}
    </div>
  );
};
