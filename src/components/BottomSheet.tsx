import React from "react";
import { useAndroidBackButton } from "../hooks/useAndroidBackButton";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** ID unik untuk tombol back Android */
  id: string;
  /** Lebar maksimum sheet, mis. "max-w-sm" */
  maxWidth?: string;
  children: React.ReactNode;
}

/**
 * Bottom sheet standar aplikasi: muncul dari bawah, tertutup saat
 * pengguna mengetuk area di luar sheet atau menekan tombol back.
 * Sengaja tanpa tombol X.
 */
export const BottomSheet: React.FC<Props> = ({
  isOpen,
  onClose,
  id,
  maxWidth = "max-w-lg",
  children,
}) => {
  useAndroidBackButton({ isOpen, onClose, id });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`w-full ${maxWidth} mx-auto bg-white dark:bg-[#151c2b] text-slate-900 dark:text-slate-100 rounded-t-3xl border-t border-x border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in slide-in-from-bottom duration-250`}
      >
        {/* Android drag pill */}
        <div className="pt-2.5 pb-1 flex justify-center shrink-0" aria-hidden="true">
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>
        {children}
      </div>
    </div>
  );
};
