import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  Upload,
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { Vehicle, FuelRecord } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeVehicle: Vehicle;
  onSaveRecord: (record: Partial<FuelRecord>) => void;
}

export const ReceiptScannerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  activeVehicle,
  onSaveRecord,
}) => {
  const [mode, setMode] = useState<"camera" | "upload">("upload");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState(false);

  // Form data fields - empty until receipt scan completes
  const [formData, setFormData] = useState({
    date: "",
    time: "",
    odometer: "" as number | "",
    fuelType: "",
    octaneOrGrade: "",
    pricePerLiter: "" as number | "",
    liters: "" as number | "",
    totalCost: "" as number | "",
    stationName: "",
    location: "",
    isFullTank: true,
    notes: "",
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reset all fields to blank state
  const resetAllFields = () => {
    setSelectedImage(null);
    setScanSuccess(false);
    setScanError(null);
    setFormData({
      date: "",
      time: "",
      odometer: "",
      fuelType: "",
      octaneOrGrade: "",
      pricePerLiter: "",
      liters: "",
      totalCost: "",
      stationName: "",
      location: "",
      isFullTank: true,
      notes: "",
    });
  };

  // Stop camera stream on unmount or mode switch
  useEffect(() => {
    if (mode === "camera" && isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [mode, isOpen]);

  const startCamera = async () => {
    try {
      setScanError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.warn("Camera access failed or unavailable:", err);
      setScanError("Tidak dapat mengakses kamera. Silakan unggah foto struk.");
      setMode("upload");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setSelectedImage(dataUrl);
      stopCamera();
      analyzeReceiptWithAI(dataUrl);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setSelectedImage(base64);
      analyzeReceiptWithAI(base64, file.type);
    };
    reader.readAsDataURL(file);
  };

  // Call Gemini OCR backend
  const analyzeReceiptWithAI = async (imageBase64: string, mimeType?: string) => {
    setIsScanning(true);
    setScanError(null);
    setScanSuccess(false);

    try {
      const res = await fetch("/api/scan-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          mimeType: mimeType || "image/jpeg",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal mengenali struk.");
      }

      const data = json.data;
      setScanSuccess(true);

      // Map to form
      const detectedFuel = data.fuelType || "Pertalite";
      let detectedOctane = "90";
      if (/92|pertamax/i.test(detectedFuel)) detectedOctane = "92";
      if (/98|turbo/i.test(detectedFuel)) detectedOctane = "98";
      if (/solar|dex/i.test(detectedFuel)) detectedOctane = "CN51";

      const parsedPrice = Number(data.pricePerLiter) || "";
      const parsedLiters = Number(data.totalLiters) || "";
      const parsedTotal = Number(data.totalCost) || (parsedPrice && parsedLiters ? Math.round(Number(parsedPrice) * Number(parsedLiters)) : "");

      // Populate form fields only after scan is completed
      setFormData({
        date: data.date || new Date().toISOString().slice(0, 10),
        time: data.time || new Date().toTimeString().slice(0, 5),
        fuelType: detectedFuel,
        octaneOrGrade: detectedOctane,
        pricePerLiter: parsedPrice,
        liters: parsedLiters,
        totalCost: parsedTotal,
        stationName: data.stationName || "SPBU Pertamina",
        location: data.location || "Indonesia",
        odometer: data.odometer ? Number(data.odometer) : (activeVehicle.currentOdometer ? activeVehicle.currentOdometer + 300 : ""),
        isFullTank: true,
        notes: data.notes || "Hasil deteksi struk SPBU via Gemini AI",
      });
    } catch (err: any) {
      console.error("AI Scan Error:", err);
      setScanError(
        err.message ||
          "Gagal memproses struk otomatis. Anda dapat mengisi kolom data secara manual."
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handlePriceOrLiterChange = (price: number | "", liter: number | "") => {
    const numPrice = typeof price === "number" ? price : parseFloat(String(price)) || 0;
    const numLiter = typeof liter === "number" ? liter : parseFloat(String(liter)) || 0;
    const cost = numPrice > 0 && numLiter > 0 ? Math.round(numPrice * numLiter) : "";
    setFormData((prev) => ({
      ...prev,
      pricePerLiter: price,
      liters: liter,
      totalCost: cost,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveRecord({
      vehicleId: activeVehicle.id,
      date: formData.date,
      time: formData.time,
      odometer: Number(formData.odometer),
      fuelType: formData.fuelType,
      octaneOrGrade: formData.octaneOrGrade,
      liters: Number(formData.liters),
      pricePerLiter: Number(formData.pricePerLiter),
      totalCost: Number(formData.totalCost),
      stationName: formData.stationName,
      location: formData.location,
      isFullTank: formData.isFullTank,
      notes: formData.notes,
      receiptImage: selectedImage || undefined,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#151c2b] text-slate-900 dark:text-slate-100 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#192235]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-500/15 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Foto &amp; Scan Struk BBM
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Deteksi otomatis via Gemini AI untuk {activeVehicle.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Mode Tabs (Kamera & Unggah Foto) */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-[#0e1420] rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setMode("camera")}
              className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition ${
                mode === "camera"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              Kamera Langsung
            </button>
            <button
              type="button"
              onClick={() => setMode("upload")}
              className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition ${
                mode === "upload"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Unggah Foto Struk
            </button>
          </div>

          {/* Camera Stream View */}
          {mode === "camera" && !selectedImage && (
            <div className="relative rounded-xl overflow-hidden bg-black aspect-[3/4] max-h-64 flex items-center justify-center border border-slate-700">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-4 flex justify-center">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-full shadow-lg flex items-center gap-2 transition active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                  Ambil Foto Struk
                </button>
              </div>
            </div>
          )}

          {/* Upload View */}
          {mode === "upload" && !selectedImage && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-xl p-6 text-center cursor-pointer transition bg-slate-50/70 dark:bg-[#111724]/50 flex flex-col items-center justify-center gap-2 group"
            >
              <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition">
                <Upload className="w-6 h-6" />
              </div>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Pilih atau Seret Foto Struk BBM
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Mendukung struk SPBU Pertamina, Shell, BP, Vivo (JPG, PNG)
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          )}

          {/* Scanned Image Preview & Status */}
          {selectedImage && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-[#111724] rounded-xl border border-slate-200 dark:border-slate-800">
              <img
                src={selectedImage}
                alt="Struk BBM"
                className="w-16 h-16 object-cover rounded-lg border border-slate-300 dark:border-slate-700"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {isScanning ? (
                    <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 text-xs font-medium animate-pulse">
                      <Sparkles className="w-4 h-4 animate-spin" />
                      Membaca struk dengan Gemini AI...
                    </div>
                  ) : scanSuccess ? (
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      Berhasil terdeteksi otomatis!
                    </div>
                  ) : scanError ? (
                    <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 text-xs font-medium">
                      <AlertCircle className="w-4 h-4" />
                      Silakan lengkapi kolom data di bawah
                    </div>
                  ) : null}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  Foto struk tersimpan sebagai bukti transaksi
                </p>
              </div>
              <button
                type="button"
                onClick={resetAllFields}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800"
                title="Ganti Foto / Reset"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Editable Confirmation Form */}
          <form id="receipt-form" onSubmit={handleSubmit} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tanggal Pengisian
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  required
                  className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#101622]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Waktu / Jam
                </label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) =>
                    setFormData({ ...formData, time: e.target.value })
                  }
                  className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#101622]"
                />
              </div>
            </div>

            {/* Odometer */}
            <div className="p-3 bg-slate-50 dark:bg-[#111724] rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                  Odometer Saat Ini (KM)
                </label>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  Terakhir: {activeVehicle.currentOdometer.toLocaleString("id-ID")} km
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={formData.odometer}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      odometer: Number(e.target.value),
                    })
                  }
                  min={activeVehicle.currentOdometer}
                  required
                  className="flex-1 bg-white dark:bg-[#151d2d] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">KM</span>
              </div>
              {formData.odometer > activeVehicle.currentOdometer && (
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                  +{(formData.odometer - activeVehicle.currentOdometer).toLocaleString("id-ID")} km perjalanan sejak pengisian lalu
                </div>
              )}
            </div>

            {/* Fuel Type & Octane */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Jenis Bahan Bakar
                </label>
                <select
                  value={formData.fuelType}
                  onChange={(e) => {
                    const fuel = e.target.value;
                    let price: number | "" = formData.pricePerLiter;
                    let octane = "90";
                    if (fuel === "Pertalite") {
                      price = 10000;
                      octane = "90";
                    } else if (fuel === "Pertamax") {
                      price = 12950;
                      octane = "92";
                    } else if (fuel === "Pertamax Turbo") {
                      price = 14400;
                      octane = "98";
                    } else if (fuel === "Dexlite") {
                      price = 14550;
                      octane = "CN51";
                    } else if (fuel === "Shell Super") {
                      price = 13200;
                      octane = "92";
                    }
                    const numLiter = typeof formData.liters === "number" ? formData.liters : parseFloat(String(formData.liters)) || 0;
                    setFormData((prev) => ({
                      ...prev,
                      fuelType: fuel,
                      octaneOrGrade: octane,
                      pricePerLiter: price,
                      totalCost: price && numLiter ? Math.round(Number(price) * numLiter) : prev.totalCost,
                    }));
                  }}
                  className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#101622]"
                >
                  <option value="">-- Pilih Jenis Bahan Bakar --</option>
                  <option value="Pertalite">Pertalite (RON 90)</option>
                  <option value="Pertamax">Pertamax (RON 92)</option>
                  <option value="Pertamax Turbo">Pertamax Turbo (RON 98)</option>
                  <option value="Dexlite">Dexlite (CN 51)</option>
                  <option value="Pertamina Dex">Pertamina Dex (CN 53)</option>
                  <option value="Bio Solar">Bio Solar</option>
                  <option value="Shell Super">Shell Super (RON 92)</option>
                  <option value="Shell V-Power">Shell V-Power (RON 95)</option>
                  <option value="BP 92">BP 92</option>
                  <option value="BP Ultimate">BP Ultimate</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Harga / Liter (Rp)
                </label>
                <input
                  type="number"
                  value={formData.pricePerLiter}
                  onChange={(e) =>
                    handlePriceOrLiterChange(
                      Number(e.target.value),
                      formData.liters
                    )
                  }
                  required
                  className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#101622] font-mono"
                />
              </div>
            </div>

            {/* Liter & Total Cost */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Volume (Liter)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.liters}
                  onChange={(e) =>
                    handlePriceOrLiterChange(
                      formData.pricePerLiter,
                      Number(e.target.value)
                    )
                  }
                  required
                  className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#101622] font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Total Biaya (Rp)
                </label>
                <input
                  type="number"
                  value={formData.totalCost}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      totalCost: Number(e.target.value),
                    })
                  }
                  required
                  className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#101622] font-mono"
                />
              </div>
            </div>

            {/* Station and Location */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nama SPBU
                </label>
                <input
                  type="text"
                  value={formData.stationName}
                  onChange={(e) =>
                    setFormData({ ...formData, stationName: e.target.value })
                  }
                  placeholder="SPBU Pertamina 34.xxx"
                  className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#101622]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Lokasi / Kota
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder="Kecamatan Tangerang"
                  className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#101622]"
                />
              </div>
            </div>

            {/* Full Tank Checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isFullTank"
                checked={formData.isFullTank}
                onChange={(e) =>
                  setFormData({ ...formData, isFullTank: e.target.checked })
                }
                className="w-4 h-4 rounded text-blue-600 bg-slate-100 dark:bg-[#101622] border-slate-300 dark:border-slate-700 focus:ring-0 cursor-pointer"
              />
              <label
                htmlFor="isFullTank"
                className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none"
              >
                Isi Penuh (Full Tank) —{" "}
                <span className="text-slate-500 dark:text-slate-400">
                  Direkomendasikan agar perhitungan km/L akurat
                </span>
              </label>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Catatan Tambahan (Opsional)
              </label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Misal: Perjalanan mudik, sebelum ganti oli"
                className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#101622]"
              />
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#172031] flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            {formData.odometer > activeVehicle.currentOdometer && (
              <span>
                Konsumsi diperkirakan: ~
                {(
                  (formData.odometer - activeVehicle.currentOdometer) /
                  formData.liters
                ).toFixed(2)}{" "}
                km/L
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition"
            >
              Batal
            </button>
            <button
              type="submit"
              form="receipt-form"
              className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-sm transition active:scale-95"
            >
              Simpan Pencatatan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
