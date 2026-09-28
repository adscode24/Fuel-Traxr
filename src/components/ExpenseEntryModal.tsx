import React, { useState, useEffect } from "react";
import { Wallet } from "lucide-react";
import { Vehicle, ServiceHistoryEntry } from "../types";
import { BottomSheet } from "./BottomSheet";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  editingItem?: ServiceHistoryEntry | null;
  onAddExpense?: (entry: Omit<ServiceHistoryEntry, "id" | "createdAt">) => void;
  onSaveExpense?: (entry: ServiceHistoryEntry) => void;
}

export const ExpenseEntryModal: React.FC<Props> = ({
  isOpen,
  onClose,
  vehicle,
  editingItem = null,
  onAddExpense,
  onSaveExpense,
}) => {

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<string>("Service");
  const [title, setTitle] = useState("");
  const [cost, setCost] = useState("");
  const [odometer, setOdometer] = useState<string>("");
  const [workshop, setWorkshop] = useState("");
  const [notes, setNotes] = useState("");

  // Reset / isi form setiap kali dibuka
  useEffect(() => {
    if (!isOpen) return;
    if (editingItem) {
      setDate(editingItem.date || new Date().toISOString().slice(0, 10));
      setCategory(editingItem.category || "Service");
      setTitle(editingItem.title || "");
      setCost(editingItem.cost ? String(Math.round(editingItem.cost)) : "");
      setOdometer(editingItem.odometer ? String(editingItem.odometer) : "");
      setWorkshop(editingItem.workshop || "");
      setNotes(editingItem.notes || "");
    } else {
      setDate(new Date().toISOString().slice(0, 10));
      setCategory("Service");
      setTitle("");
      setCost("");
      setOdometer(vehicle?.currentOdometer ? String(vehicle.currentOdometer) : "");
      setWorkshop("");
      setNotes("");
    }
  }, [isOpen, editingItem, vehicle]);

  if (!isOpen) return null;

  // Submit handler (supports both add and edit)
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      return;
    }
    const parsedCost = parseFloat(cost.replace(/[^0-9]/g, ""));
    if (!parsedCost || parsedCost <= 0) {
      return;
    }

    const currentVehId = vehicle?.id || "default";

    if (editingItem) {
      // Update existing item
      const updatedEntry: ServiceHistoryEntry = {
        ...editingItem,
        vehicleId: currentVehId,
        title: title.trim(),
        category: category,
        date: date || new Date().toISOString().slice(0, 10),
        cost: parsedCost,
        odometer: odometer ? Number(odometer) : undefined,
        workshop: workshop.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      if (onSaveExpense) {
        onSaveExpense(updatedEntry);
      }
    } else {
      // Create new item
      const newEntry: ServiceHistoryEntry = {
        id: `exp-${Date.now()}`,
        vehicleId: currentVehId,
        title: title.trim(),
        category: category,
        date: date || new Date().toISOString().slice(0, 10),
        cost: parsedCost,
        odometer: odometer ? Number(odometer) : undefined,
        workshop: workshop.trim() || undefined,
        notes: notes.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      if (onSaveExpense) {
        onSaveExpense(newEntry);
      } else if (onAddExpense) {
        onAddExpense(newEntry);
      }
    }

    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} id="expense_entry" maxWidth="max-w-md">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#192235]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-500/15 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingItem ? "Edit Data Biaya" : "Catat Biaya Kendaraan"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {vehicle?.name || "Kendaraan"}
              </p>
            </div>
          </div>
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
                className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#101622]"
              />
            </div>

            {/* Kategori Biaya */}
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Kategori *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#101622]"
              >
                <option value="Service">Servis &amp; Bengkel</option>
                <option value="Top Up Etoll">Top Up E-Toll</option>
                <option value="Pajak & STNK">Pajak &amp; STNK</option>
                <option value="Parkir & Cuci">Parkir &amp; Cuci</option>
                <option value="Lainnya">Biaya Lainnya</option>
              </select>
            </div>
          </div>

          {/* Keterangan / Judul Biaya */}
          <div>
            <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nama / Keterangan Biaya *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                category === "Service"
                  ? "Contoh: Ganti Oli Mesin & Filter Oli"
                  : category === "Top Up Etoll"
                  ? "Contoh: Top Up Saldo Mandiri e-Money / Flazz"
                  : category === "Pajak & STNK"
                  ? "Contoh: Pajak Kendaraan Bermotor Tahunan (PKB)"
                  : category === "Parkir & Cuci"
                  ? "Contoh: Cuci Mobil & Poles Kaca"
                  : "Contoh: Beli Pengharum Kabin & Aksesoris"
              }
              required
              className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#101622]"
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
                onChange={(e) => setCost(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="Contoh: 350000"
                required
                className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#101622] font-mono"
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
                placeholder={String(vehicle?.currentOdometer || 0)}
                className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#101622] font-mono"
              />
            </div>
          </div>

          {/* Tempat / Bengkel / Merchant */}
          <div>
            <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
              Bengkel / Tempat / Merchant
            </label>
            <input
              type="text"
              value={workshop}
              onChange={(e) => setWorkshop(e.target.value)}
              placeholder="Contoh: Auto2000 Pasteur, Indomaret, Samsat Outlet"
              className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#101622]"
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
              className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#101622]"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
            >
              {editingItem ? "Perbarui Biaya" : "Simpan Biaya"}
            </button>
          </div>
        </form>
    </BottomSheet>
  );
};
