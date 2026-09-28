import React, { useState, useEffect } from "react";
import {
  X,
  Fuel,
  Calendar,
  MapPin,
  Gauge,
  Calculator,
  Navigation,
  Loader2,
  ChevronDown,
  Edit3,
  ListFilter,
  CheckCircle2,
} from "lucide-react";
import { Vehicle, FuelRecord } from "../types";
import {
  StationLogo,
  detectStationBrand,
  getStationBrandLabel,
} from "./StationLogo";
import {
  getStoredUserLocation,
  requestAndDetectUserLocation,
  getStationsForUserLocation,
  SPBUStationOption,
  UserLocationInfo,
} from "../services/locationService";
import { useAndroidBackButton } from "../hooks/useAndroidBackButton";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeVehicle: Vehicle | null;
  editingRecord?: FuelRecord | null;
  onSaveRecord: (record: Partial<FuelRecord>) => void;
}

// Helper to get formatted local current date (YYYY-MM-DD) and current time (HH:mm)
const getNowDateTime = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`,
  };
};

export const ManualEntryModal: React.FC<Props> = ({
  isOpen,
  onClose,
  activeVehicle,
  editingRecord,
  onSaveRecord,
}) => {
  useAndroidBackButton({ isOpen, onClose, id: "manual_entry" });

  // Tanggal dan waktu pengisian secara default diisi dengan tanggal dan waktu saat melakukan pengisian, namun bisa diedit
  const [date, setDate] = useState(() => getNowDateTime().date);
  const [time, setTime] = useState(() => getNowDateTime().time);
  const [odometer, setOdometer] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [octaneOrGrade, setOctaneOrGrade] = useState("");
  const [pricePerLiter, setPricePerLiter] = useState("");
  const [liters, setLiters] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [stationName, setStationName] = useState("");
  const [location, setLocation] = useState("");
  const [isFullTank, setIsFullTank] = useState(false);
  const [notes, setNotes] = useState("");

  // Location & SPBU Dropdown States
  const [userLocation, setUserLocation] = useState<UserLocationInfo | null>(() =>
    getStoredUserLocation()
  );
  const [isLocating, setIsLocating] = useState(false);
  const [locationSuccessMsg, setLocationSuccessMsg] = useState<string | null>(null);
  const [isCustomStation, setIsCustomStation] = useState(false);

  // Helper to parse numbers from string supporting both comma (,) and dot (.)
  const parseNum = (val: string): number => {
    if (!val) return 0;
    const clean = val.replace(",", ".").trim();
    const n = parseFloat(clean);
    return isNaN(n) ? 0 : n;
  };

  useEffect(() => {
    if (editingRecord) {
      setDate(editingRecord.date || getNowDateTime().date);
      setTime(editingRecord.time || getNowDateTime().time);
      setOdometer(editingRecord.odometer ? String(editingRecord.odometer) : "");
      setFuelType(editingRecord.fuelType || "");
      setOctaneOrGrade(editingRecord.octaneOrGrade || "");
      setPricePerLiter(
        editingRecord.pricePerLiter ? String(editingRecord.pricePerLiter) : ""
      );
      setLiters(
        editingRecord.liters
          ? String(editingRecord.liters).replace(".", ",")
          : ""
      );
      setTotalCost(
        editingRecord.totalCost ? String(editingRecord.totalCost) : ""
      );
      setStationName(editingRecord.stationName || "");
      setLocation(editingRecord.location || "");
      setIsFullTank(editingRecord.isFullTank ?? false);
      setNotes(editingRecord.notes || "");
      setIsCustomStation(false);
    } else {
      // Default tanggal & waktu pengisian saat ini, kolom lainnya mulai kosong
      const now = getNowDateTime();
      setDate(now.date);
      setTime(now.time);
      setOdometer("");
      setFuelType("");
      setOctaneOrGrade("");
      setPricePerLiter("");
      setLiters("");
      setTotalCost("");
      setStationName("");
      setIsFullTank(false);
      setNotes("");
      setIsCustomStation(false);

      // Auto fill location from stored user location if available
      const stored = getStoredUserLocation();
      if (stored) {
        setUserLocation(stored);
        const autoLoc =
          stored.formattedAddress ||
          `${stored.district ? stored.district + ", " : ""}${stored.city}`;
        setLocation(autoLoc);
      } else {
        setLocation("");
      }
    }
  }, [editingRecord, isOpen]);

  // Handle GPS location detection
  const handleDetectLocation = async () => {
    setIsLocating(true);
    setLocationSuccessMsg(null);
    try {
      const loc = await requestAndDetectUserLocation();
      setUserLocation(loc);
      const formatted =
        loc.formattedAddress ||
        `${loc.district ? loc.district + ", " : ""}${loc.city}`;
      setLocation(formatted);
      setLocationSuccessMsg(`📍 Lokasi terdeteksi: ${loc.city}`);
      setTimeout(() => setLocationSuccessMsg(null), 3500);
    } catch (err: unknown) {
      console.warn("GPS Location error:", err);
      alert((err as Error)?.message || "Tidak dapat mendeteksi lokasi otomatis.");
    } finally {
      setIsLocating(false);
    }
  };

  // Filter stations based on detected city / location text
  const currentCityQuery = userLocation?.city || location || "";
  const availableStations = getStationsForUserLocation(
    currentCityQuery,
    activeVehicle?.fuelCategory
  );

  if (!isOpen) return null;

  // Handler: When user changes Harga per Liter
  const handlePriceChange = (newPriceStr: string) => {
    setPricePerLiter(newPriceStr);
    const p = parseNum(newPriceStr);
    const l = parseNum(liters);
    const c = parseNum(totalCost);

    if (p > 0) {
      if (l > 0) {
        // Compute total cost: price * volume
        const calculatedCost = Math.round(p * l);
        setTotalCost(String(calculatedCost));
      } else if (c > 0) {
        // Compute volume: cost / price
        const calculatedLiters = (c / p).toFixed(2).replace(".", ",");
        setLiters(calculatedLiters);
      }
    }
  };

  // Handler: When user changes Volume (Liter) - accepts decimal with comma (,)
  const handleLitersChange = (newLitersStr: string) => {
    // Allow digits, comma, and dot
    const filtered = newLitersStr.replace(/[^0-9.,]/g, "");
    setLiters(filtered);

    const l = parseNum(filtered);
    const p = parseNum(pricePerLiter);

    if (p > 0) {
      if (l > 0) {
        // Auto-calculate Total Biaya
        const calculatedCost = Math.round(p * l);
        setTotalCost(String(calculatedCost));
      } else if (filtered.trim() === "") {
        setTotalCost("");
      }
    }
  };

  // Handler: When user changes Total Biaya (Rp)
  const handleTotalCostChange = (newCostStr: string) => {
    const filtered = newCostStr.replace(/[^0-9]/g, "");
    setTotalCost(filtered);

    const c = parseNum(filtered);
    const p = parseNum(pricePerLiter);

    if (p > 0) {
      if (c > 0) {
        // Auto-calculate Volume (Liter) in decimal with comma
        const calculatedLiters = (c / p).toFixed(2).replace(".", ",");
        setLiters(calculatedLiters);
      } else if (filtered.trim() === "") {
        setLiters("");
      }
    }
  };

  const handleSetToday = () => {
    const now = getNowDateTime();
    setDate(now.date);
    setTime(now.time);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedOdometer = parseNum(odometer);
    const parsedLiters = parseNum(liters);
    const parsedPrice = parseNum(pricePerLiter);
    const parsedTotal = parseNum(totalCost);

    if (!date) {
      alert("Harap pilih tanggal pengisian.");
      return;
    }
    if (!parsedOdometer) {
      alert("Harap masukkan angka odometer kendaraan.");
      return;
    }
    if (!parsedLiters || parsedLiters <= 0) {
      alert("Harap masukkan volume pengisian BBM dalam liter.");
      return;
    }
    if (!parsedTotal || parsedTotal <= 0) {
      alert("Harap isi harga dan total biaya pengisian.");
      return;
    }

    onSaveRecord({
      ...(editingRecord ? { id: editingRecord.id } : {}),
      vehicleId: activeVehicle?.id || "",
      date: date,
      time: time || undefined,
      odometer: parsedOdometer,
      fuelType: fuelType || "Bahan Bakar",
      octaneOrGrade: octaneOrGrade || undefined,
      liters: parsedLiters,
      pricePerLiter: parsedPrice,
      totalCost: parsedTotal,
      stationName: stationName || "SPBU",
      location: location || "-",
      isFullTank: isFullTank,
      notes: notes || undefined,
    });
    onClose();
  };

  const isElectric = activeVehicle?.fuelCategory === "Elektrik";
  const capacityUnit = isElectric ? "Kwh" : "Liter";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#151c2b] text-slate-900 dark:text-slate-100 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#192235]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-500/15 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Fuel className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingRecord
                  ? "Edit Catatan Pengisian"
                  : isElectric
                  ? "Catat Pengisian Baterai Listrik (EV)"
                  : "Catat Pengisian BBM Manual"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeVehicle?.name || "Kendaraan"} • {activeVehicle?.fuelCategory || "Bensin"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form
          id="manual-record-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs"
        >
          {/* Quick Date Helper */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              Waktu &amp; Odometer
            </span>
            <button
              type="button"
              onClick={handleSetToday}
              className="text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium hover:underline flex items-center gap-1"
            >
              <Calendar className="w-3 h-3" />
              Gunakan Waktu Sekarang
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Pengisian *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
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
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="HH:mm"
                className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#101622]"
              />
            </div>
          </div>

          {/* Odometer */}
          <div className="p-3 bg-slate-50 dark:bg-[#111724] rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                Odometer Saat Ini (KM) *
              </label>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                Terkini: {(activeVehicle?.currentOdometer || 0).toLocaleString("id-ID")}{" "}
                km
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                placeholder="Masukkan angka odometer..."
                required
                className="flex-1 bg-white dark:bg-[#151d2d] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">KM</span>
            </div>
            {activeVehicle && parseNum(odometer) > activeVehicle.currentOdometer && (
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                +
                {(
                  parseNum(odometer) - activeVehicle.currentOdometer
                ).toLocaleString("id-ID")}{" "}
                km jarak tempuh sejak odometer sebelumnya
              </div>
            )}
          </div>

          {/* Fuel type & Price Per Liter/Kwh */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                {isElectric ? "Sumber / Tipe Pengisian" : "Jenis Bahan Bakar"}
              </label>
              <select
                value={fuelType}
                onChange={(e) => {
                  const val = e.target.value;
                  setFuelType(val);
                  if (val === "Pertalite") setOctaneOrGrade("90");
                  else if (val === "Pertamax") setOctaneOrGrade("92");
                  else if (val === "Pertamax Turbo") setOctaneOrGrade("98");
                  else if (val === "Dexlite") setOctaneOrGrade("CN51");
                  else if (val === "Pertamina Dex") setOctaneOrGrade("CN53");
                  else if (val === "Shell Super") setOctaneOrGrade("92");
                  else if (val === "Shell V-Power") setOctaneOrGrade("95");
                  else setOctaneOrGrade("");
                }}
                className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#101622]"
              >
                <option value="">-- {isElectric ? "Pilih Tipe Pengisian" : "Pilih Jenis BBM"} --</option>
                {isElectric ? (
                  <>
                    <option value="SPKLU PLN Ultra Fast (200kW)">SPKLU PLN Ultra Fast (200kW)</option>
                    <option value="SPKLU PLN Fast Charging (50kW)">SPKLU PLN Fast Charging (50kW)</option>
                    <option value="SPKLU PLN Medium Charging (22kW)">SPKLU PLN Medium Charging (22kW)</option>
                    <option value="Home Charging (Listrik Rumah)">Home Charging (Listrik Rumah)</option>
                    <option value="SPKLU Shell Recharge">SPKLU Shell Recharge</option>
                    <option value="SPKLU Lainnya">SPKLU Swasta / Mall</option>
                  </>
                ) : (
                  <>
                    <option value="Pertalite">Pertalite (RON 90)</option>
                    <option value="Pertamax">Pertamax (RON 92)</option>
                    <option value="Pertamax Turbo">Pertamax Turbo (RON 98)</option>
                    <option value="Dexlite">Dexlite (CN 51)</option>
                    <option value="Pertamina Dex">Pertamina Dex (CN 53)</option>
                    <option value="Bio Solar">Bio Solar</option>
                    <option value="Shell Super">Shell Super</option>
                    <option value="Shell V-Power">Shell V-Power</option>
                    <option value="BP 92">BP 92</option>
                    <option value="Lainnya">Bahan Bakar Lainnya</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                {isElectric ? "Tarif / Kwh (Rp) *" : "Harga / Liter (Rp) *"}
              </label>
              <input
                type="number"
                value={pricePerLiter}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder={isElectric ? "Contoh: 2466" : "Contoh: 10000"}
                required
                className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#101622] font-mono"
              />
            </div>
          </div>

          {/* Volume and Total (Bidirectional auto-calculation with comma decimal support) */}
          <div className="p-3 bg-slate-50 dark:bg-[#111724] rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
              <Calculator className="w-3.5 h-3.5" />
              <span>Kalkulasi Otomatis {isElectric ? "Energi & Biaya" : "Volume & Biaya"}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isElectric ? "Energi Baterai (Kwh) *" : "Volume (Liter) *"}
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal ml-1">
                    (Bisa koma, misal: 25,5)
                  </span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={liters}
                  onChange={(e) => handleLitersChange(e.target.value)}
                  placeholder={isElectric ? "Contoh: 32,5" : "Contoh: 27,11"}
                  required
                  className="w-full bg-white dark:bg-[#151d2d] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-cyan-600 dark:text-cyan-400 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Total Biaya (Rp) *
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal ml-1">
                    (Otomatis)
                  </span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={totalCost}
                  onChange={(e) => handleTotalCostChange(e.target.value)}
                  placeholder="Contoh: 80000"
                  required
                  className="w-full bg-white dark:bg-[#151d2d] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
              * Isi Tarif dan {capacityUnit} untuk menghitung Total Biaya otomatis, atau sebaliknya.
            </p>
          </div>

          {/* Station and Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Nama SPBU with Smart Dropdown List */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300">
                  {isElectric ? "Lokasi SPKLU / Stasiun" : "Nama SPBU"}
                </label>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                    <StationLogo
                      stationName={stationName}
                      fuelCategory={activeVehicle?.fuelCategory}
                      className="w-4 h-4 !border-none !shadow-none inline-block"
                    />
                    <span>
                      {getStationBrandLabel(
                        detectStationBrand(stationName, activeVehicle?.fuelCategory)
                      )}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsCustomStation(!isCustomStation)}
                    className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium hover:underline flex items-center gap-0.5"
                  >
                    {isCustomStation ? (
                      <>
                        <ListFilter className="w-3 h-3" />
                        <span>Pilih Dropdown</span>
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-3 h-3" />
                        <span>Ketik Manual</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {!isCustomStation ? (
                /* SPBU Dropdown List based on User Location */
                <div className="relative flex items-center">
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                    <StationLogo
                      stationName={stationName}
                      fuelCategory={activeVehicle?.fuelCategory}
                      className="w-5 h-5 !border-none !shadow-none"
                    />
                  </div>
                  <select
                    value={stationName}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "__CUSTOM__") {
                        setIsCustomStation(true);
                        return;
                      }
                      setStationName(val);
                      // Auto-fill location if station has a known address
                      const match = availableStations.find((s) => s.name === val);
                      if (match) {
                        const targetLoc = `${match.address}, ${match.city}`;
                        setLocation(targetLoc);
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#101622] appearance-none cursor-pointer"
                  >
                    <option value="">
                      {userLocation?.city
                        ? `-- Pilih SPBU di ${userLocation.city} / Terdekat --`
                        : "-- Pilih Nama SPBU di Lokasi Anda --"}
                    </option>

                    {/* Group: SPBU di Sekitar Lokasi Pengguna */}
                    <optgroup
                      label={`📍 SPBU di Area ${
                        userLocation?.city || location || "Sekitar Anda"
                      }`}
                    >
                      {availableStations
                        .filter(
                          (s) =>
                            !userLocation?.city ||
                            s.city.toLowerCase().includes(userLocation.city.toLowerCase()) ||
                            (userLocation?.district &&
                              s.address.toLowerCase().includes(userLocation.district.toLowerCase()))
                        )
                        .map((st) => (
                          <option key={st.id} value={st.name}>
                            {st.name} — {st.address} ({st.city})
                          </option>
                        ))}
                    </optgroup>

                    {/* Group: SPBU Populer / Kota Lainnya */}
                    <optgroup label="⭐ Jaringan SPBU Lainnya">
                      {availableStations
                        .filter(
                          (s) =>
                            userLocation?.city &&
                            !s.city.toLowerCase().includes(userLocation.city.toLowerCase())
                        )
                        .map((st) => (
                          <option key={st.id} value={st.name}>
                            {st.name} ({st.city})
                          </option>
                        ))}
                    </optgroup>

                    <optgroup label="Lainnya">
                      <option value="__CUSTOM__">
                        ✏️ Ketik Nama SPBU Lainnya...
                      </option>
                    </optgroup>
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              ) : (
                /* Freeform Custom Text Input */
                <div className="relative flex items-center">
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <StationLogo
                      stationName={stationName}
                      fuelCategory={activeVehicle?.fuelCategory}
                      className="w-5 h-5 !border-none !shadow-none"
                    />
                  </div>
                  <input
                    type="text"
                    value={stationName}
                    onChange={(e) => setStationName(e.target.value)}
                    placeholder={
                      isElectric
                        ? "Contoh: SPKLU Rest Area KM 57"
                        : "Contoh: SPBU Pertamina 34-44116"
                    }
                    autoFocus
                    className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#101622]"
                  />
                </div>
              )}

              {/* Quick Brand Selector Pills */}
              <div className="flex items-center flex-wrap gap-1 mt-1.5">
                {isElectric ? (
                  ["SPKLU PLN", "Shell Recharge", "Charging Rumah"].map((brand) => (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => {
                        setStationName(brand);
                        setIsCustomStation(true);
                      }}
                      className={`text-[10px] px-2 py-0.5 rounded-md border transition ${
                        stationName.toLowerCase().includes(brand.toLowerCase())
                          ? "bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-medium"
                          : "bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      {brand}
                    </button>
                  ))
                ) : (
                  ["Pertamina", "Shell", "BP", "Vivo", "Total"].map((brand) => (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => {
                        // Check if there is an exact station for this brand in current city
                        const match = availableStations.find(
                          (s) =>
                            s.brand.toLowerCase() === brand.toLowerCase() &&
                            (!userLocation?.city ||
                              s.city.toLowerCase().includes(userLocation.city.toLowerCase()))
                        );
                        if (match) {
                          setStationName(match.name);
                          setLocation(`${match.address}, ${match.city}`);
                          setIsCustomStation(false);
                        } else {
                          setStationName(`SPBU ${brand}`);
                          setIsCustomStation(true);
                        }
                      }}
                      className={`text-[10px] px-2 py-0.5 rounded-md border transition ${
                        stationName.toLowerCase().includes(brand.toLowerCase())
                          ? "bg-blue-500/15 border-blue-500 text-blue-600 dark:text-blue-400 font-medium"
                          : "bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      {brand}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Lokasi / Kota with GPS Auto-Detect */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300">
                  Lokasi / Kota
                </label>
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={isLocating}
                  className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700 dark:hover:text-blue-300 transition hover:underline px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 disabled:opacity-50"
                  title="Deteksi Kota Otomatis dengan GPS"
                >
                  {isLocating ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Mendeteksi...</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-3 h-3" />
                      <span>Deteksi Lokasi GPS</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative flex items-center">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Contoh: Tarogong Kaler, Garut"
                  className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-300 dark:border-slate-700 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#101622]"
                />
              </div>

              {locationSuccessMsg && (
                <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 animate-in fade-in duration-200 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{locationSuccessMsg}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="manualIsFullTank"
              checked={isFullTank}
              onChange={(e) => setIsFullTank(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 bg-slate-100 dark:bg-[#101622] border-slate-300 dark:border-slate-700 focus:ring-0 cursor-pointer"
            />
            <label
              htmlFor="manualIsFullTank"
              className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none"
            >
              {isElectric ? "Pengisian Baterai Penuh (100% Full Charge)" : "Pengisian Tangki Penuh (Full Tank)"}
            </label>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
              Catatan Pengisian
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan tambahan perjalanan..."
              className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#101622]"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#172031] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition"
          >
            Batal
          </button>
          <button
            type="submit"
            form="manual-record-form"
            className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-sm transition active:scale-95"
          >
            Simpan Catatan
          </button>
        </div>
      </div>
    </div>
  );
};
