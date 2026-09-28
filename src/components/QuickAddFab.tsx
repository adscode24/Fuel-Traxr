import React, { useState } from "react";
import { Plus, Droplet, Wallet } from "lucide-react";

interface Props {
  onAddFuel: () => void;
  onAddExpense: () => void;
}

/**
 * Floating + di halaman Home. Saat diklik, dua tombol mini mengembang
 * ke atas (wraparound/stagger): Catat Bensin & Catat Biaya.
 */
export const QuickAddFab: React.FC<Props> = ({ onAddFuel, onAddExpense }) => {
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[1px] animate-in fade-in duration-200"
          onClick={close}
        />
      )}

      <div className="fixed bottom-24 right-4 sm:right-6 z-50 flex flex-col items-end gap-3">
        {/* Opsi 1: Catat Bensin */}
        <div
          className={`flex items-center gap-2.5 transition-all duration-200 ${
            open
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 translate-y-4 scale-75 pointer-events-none"
          }`}
        >
          <span className="text-[11px] font-bold bg-white dark:bg-[#151c2c] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1.5 shadow-lg">
            Catat Bensin
          </span>
          <button
            type="button"
            onClick={() => {
              close();
              onAddFuel();
            }}
            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl bg-sky-500 hover:bg-sky-400 text-white transition active:scale-90"
            title="Catat Pengisian BBM"
            aria-label="Catat Pengisian BBM"
          >
            <Droplet className="w-5 h-5" />
          </button>
        </div>

        {/* Opsi 2: Catat Biaya */}
        <div
          className={`flex items-center gap-2.5 transition-all duration-200 delay-75 ${
            open
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 translate-y-4 scale-75 pointer-events-none"
          }`}
        >
          <span className="text-[11px] font-bold bg-white dark:bg-[#151c2c] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1.5 shadow-lg">
            Catat Biaya
          </span>
          <button
            type="button"
            onClick={() => {
              close();
              onAddExpense();
            }}
            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl bg-amber-500 hover:bg-amber-400 text-white transition active:scale-90"
            title="Catat Biaya Kendaraan"
            aria-label="Catat Biaya Kendaraan"
          >
            <Wallet className="w-5 h-5" />
          </button>
        </div>

        {/* Tombol utama + */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl bg-blue-600 hover:bg-blue-500 text-white transition active:scale-95 shadow-blue-600/30"
          title={open ? "Tutup" : "Tambah Cepat"}
          aria-label={open ? "Tutup" : "Tambah Cepat"}
        >
          <Plus
            className={`w-7 h-7 stroke-[2.5] transition-transform duration-200 ${
              open ? "rotate-45" : ""
            }`}
          />
        </button>
      </div>
    </>
  );
};
