import React, { useState, useEffect } from "react";
import {
  Fuel,
  Sparkles,
  Zap,
  Search,
  ChevronDown,
  Info,
  MapPin,
  Navigation,
} from "lucide-react";
import { StationLogo } from "./StationLogo";

export interface FuelPriceItem {
  id: string;
  brand: "pertamina" | "shell" | "bp" | "vivo" | "spklu";
  brandName: string;
  fuelName: string;
  category: "Bensin" | "Diesel" | "Elektrik";
  octaneOrGrade: string; // e.g. "RON 90", "RON 92", "CN 51", "kWh"
  price: number; // in IDR
  unit: string; // "/ liter" or "/ kWh"
  status?: "stabil" | "turun" | "subsidi";
  note?: string;
}

export const FUEL_PRICES_TODAY: FuelPriceItem[] = [
  // Pertamina
  {
    id: "pertamina-pertalite",
    brand: "pertamina",
    brandName: "Pertamina",
    fuelName: "Pertalite",
    category: "Bensin",
    octaneOrGrade: "RON 90",
    price: 10000,
    unit: "/ L",
    status: "subsidi",
    note: "Harga subsidi nasional",
  },
  {
    id: "pertamina-pertamax",
    brand: "pertamina",
    brandName: "Pertamina",
    fuelName: "Pertamax",
    category: "Bensin",
    octaneOrGrade: "RON 92",
    price: 12950,
    unit: "/ L",
    status: "stabil",
  },
  {
    id: "pertamina-green-95",
    brand: "pertamina",
    brandName: "Pertamina",
    fuelName: "Pertamax Green 95",
    category: "Bensin",
    octaneOrGrade: "RON 95",
    price: 13900,
    unit: "/ L",
    status: "stabil",
    note: "Bioetanol 5% (E5)",
  },
  {
    id: "pertamina-turbo",
    brand: "pertamina",
    brandName: "Pertamina",
    fuelName: "Pertamax Turbo",
    category: "Bensin",
    octaneOrGrade: "RON 98",
    price: 14400,
    unit: "/ L",
    status: "stabil",
  },
  {
    id: "pertamina-biosolar",
    brand: "pertamina",
    brandName: "Pertamina",
    fuelName: "Bio Solar",
    category: "Diesel",
    octaneOrGrade: "CN 48",
    price: 6800,
    unit: "/ L",
    status: "subsidi",
    note: "Harga subsidi nasional",
  },
  {
    id: "pertamina-dexlite",
    brand: "pertamina",
    brandName: "Pertamina",
    fuelName: "Dexlite",
    category: "Diesel",
    octaneOrGrade: "CN 51",
    price: 13050,
    unit: "/ L",
    status: "stabil",
  },
  {
    id: "pertamina-dex",
    brand: "pertamina",
    brandName: "Pertamina",
    fuelName: "Pertamina Dex",
    category: "Diesel",
    octaneOrGrade: "CN 53",
    price: 13400,
    unit: "/ L",
    status: "stabil",
  },

  // Shell
  {
    id: "shell-super",
    brand: "shell",
    brandName: "Shell",
    fuelName: "Shell Super",
    category: "Bensin",
    octaneOrGrade: "RON 92",
    price: 12930,
    unit: "/ L",
    status: "stabil",
  },
  {
    id: "shell-vpower",
    brand: "shell",
    brandName: "Shell",
    fuelName: "Shell V-Power",
    category: "Bensin",
    octaneOrGrade: "RON 95",
    price: 13590,
    unit: "/ L",
    status: "stabil",
  },
  {
    id: "shell-vpower-nitro",
    brand: "shell",
    brandName: "Shell",
    fuelName: "Shell V-Power Nitro+",
    category: "Bensin",
    octaneOrGrade: "RON 98",
    price: 13820,
    unit: "/ L",
    status: "stabil",
  },
  {
    id: "shell-vpower-diesel",
    brand: "shell",
    brandName: "Shell",
    fuelName: "Shell V-Power Diesel",
    category: "Diesel",
    octaneOrGrade: "CN 51",
    price: 13720,
    unit: "/ L",
    status: "stabil",
  },

  // BP-AKR
  {
    id: "bp-92",
    brand: "bp",
    brandName: "BP-AKR",
    fuelName: "BP 92",
    category: "Bensin",
    octaneOrGrade: "RON 92",
    price: 12850,
    unit: "/ L",
    status: "stabil",
  },
  {
    id: "bp-ultimate",
    brand: "bp",
    brandName: "BP-AKR",
    fuelName: "BP Ultimate",
    category: "Bensin",
    octaneOrGrade: "RON 95",
    price: 13590,
    unit: "/ L",
    status: "stabil",
  },
  {
    id: "bp-diesel",
    brand: "bp",
    brandName: "BP-AKR",
    fuelName: "BP Diesel",
    category: "Diesel",
    octaneOrGrade: "CN 51",
    price: 13600,
    unit: "/ L",
    status: "stabil",
  },

  // Vivo
  {
    id: "vivo-revvo-90",
    brand: "vivo",
    brandName: "Vivo",
    fuelName: "Revvo 90",
    category: "Bensin",
    octaneOrGrade: "RON 90",
    price: 12700,
    unit: "/ L",
    status: "stabil",
  },
  {
    id: "vivo-revvo-92",
    brand: "vivo",
    brandName: "Vivo",
    fuelName: "Revvo 92",
    category: "Bensin",
    octaneOrGrade: "RON 92",
    price: 12900,
    unit: "/ L",
    status: "stabil",
  },
  {
    id: "vivo-revvo-95",
    brand: "vivo",
    brandName: "Vivo",
    fuelName: "Revvo 95",
    category: "Bensin",
    octaneOrGrade: "RON 95",
    price: 13550,
    unit: "/ L",
    status: "stabil",
  },

  // SPKLU PLN / Electric
  {
    id: "spklu-pln-regular",
    brand: "spklu",
    brandName: "PLN",
    fuelName: "SPKLU PLN AC/DC Standar",
    category: "Elektrik",
    octaneOrGrade: "AC / DC Fast",
    price: 2466,
    unit: "/ kWh",
    status: "stabil",
    note: "Tarif resmi Permen ESDM",
  },
  {
    id: "spklu-pln-ultrafast",
    brand: "spklu",
    brandName: "PLN",
    fuelName: "SPKLU Ultra Fast Charging",
    category: "Elektrik",
    octaneOrGrade: "DC >100 kW",
    price: 2475,
    unit: "/ kWh",
    status: "stabil",
  },
  {
    id: "charging-pln-home",
    brand: "spklu",
    brandName: "PLN Rumah",
    fuelName: "Home Charging PLN",
    category: "Elektrik",
    octaneOrGrade: "Tarif Rumah Tangga",
    price: 1699,
    unit: "/ kWh",
    status: "stabil",
    note: "Diskon 30% pukul 22.00-05.00",
  },
];

interface Props {
  vehicleCategory?: "Bensin" | "Diesel" | "Elektrik";
  onSelectPriceForEntry?: (item: FuelPriceItem) => void;
}

export const FuelPriceTodayCard: React.FC<Props> = ({
  vehicleCategory = "Bensin",
}) => {
  // Accordion state: DEFAULT CLOSED per request
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>(
    vehicleCategory || "Bensin"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  // User location coordinates (if available) for pinpoint Google Maps search
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );

  useEffect(() => {
    if (typeof navigator !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          // Silently fallback; Google Maps natively locates device via IP/GPS
        },
        { enableHighAccuracy: false, timeout: 5000 }
      );
    }
  }, []);

  // Formatted today string
  const todayFormatted = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Construct Google Maps search URL based on brand & user location
  const getGoogleMapsUrl = (brand: string, brandName: string) => {
    let query = `SPBU ${brandName} terdekat`;
    if (brand === "spklu") {
      query = "SPKLU PLN terdekat";
    } else if (brand === "bp") {
      query = "SPBU BP AKR terdekat";
    } else if (brand === "vivo") {
      query = "SPBU Vivo terdekat";
    } else if (brand === "pertamina") {
      query = "SPBU Pertamina terdekat";
    } else if (brand === "shell") {
      query = "SPBU Shell terdekat";
    }

    if (userCoords) {
      return `https://www.google.com/maps/search/${encodeURIComponent(
        query
      )}/@${userCoords.lat},${userCoords.lng},14z`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      query
    )}`;
  };

  const filteredPrices = FUEL_PRICES_TODAY.filter((item) => {
    if (selectedBrand !== "all" && item.brand !== selectedBrand) return false;
    if (selectedCategory !== "all" && item.category !== selectedCategory)
      return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.fuelName.toLowerCase().includes(q);
      const matchBrand = item.brandName.toLowerCase().includes(q);
      const matchGrade = item.octaneOrGrade.toLowerCase().includes(q);
      if (!matchName && !matchBrand && !matchGrade) return false;
    }
    return true;
  });

  // Items to display inside the accordion
  const displayItems = isExpanded
    ? filteredPrices
    : filteredPrices.slice(0, 6);

  return (
    <div
      id="fuel-price-today-card"
      className="bg-white dark:bg-[#151c2c] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors"
    >
      {/* Accordion Toggle Header */}
      <button
        type="button"
        id="accordion-fuel-prices-header"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/70 dark:hover:bg-[#182133]/60 transition-colors focus:outline-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-2xs">
            <Fuel className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                Daftar Harga BBM Hari Ini
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 whitespace-nowrap">
                Update Resmi
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              Pertamina • Shell • BP-AKR • Vivo • SPKLU PLN ({todayFormatted})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hidden sm:inline">
            {isOpen ? "Tutup Daftar" : "Lihat Harga & SPBU"}
          </span>
          <div
            className={`w-7 h-7 rounded-lg bg-slate-100 dark:bg-[#1f283d] flex items-center justify-center text-slate-500 dark:text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-blue-600 dark:text-blue-400" : ""
            }`}
          >
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </button>

      {/* Accordion Content Body (Collapsed by Default) */}
      {isOpen && (
        <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 dark:border-slate-800/80 space-y-4 animate-in fade-in-50 duration-200">
          {/* Category & Brand Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3">
            {/* Category Tabs: Bensin / Diesel / Elektrik */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-[#0e1420] rounded-xl border border-slate-200 dark:border-slate-800 text-xs self-start sm:self-auto">
              {(["all", "Bensin", "Diesel", "Elektrik"] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg font-medium transition ${
                    selectedCategory === cat
                      ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white font-semibold shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {cat === "all" ? "Semua" : cat}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-56 shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari jenis BBM (mis: Pertamax)..."
                className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Brand Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => setSelectedBrand("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                selectedBrand === "all"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                  : "bg-slate-100 dark:bg-[#0e1420] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              Semua SPBU
            </button>
            {[
              { id: "pertamina", label: "Pertamina" },
              { id: "shell", label: "Shell" },
              { id: "bp", label: "BP-AKR" },
              { id: "vivo", label: "Vivo" },
              { id: "spklu", label: "SPKLU PLN" },
            ].map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedBrand(b.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  selectedBrand === b.id
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-[#0e1420] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                <StationLogo
                  stationName={b.id}
                  className="w-3.5 h-3.5 !border-none !shadow-none inline-block"
                />
                <span>{b.label}</span>
              </button>
            ))}
          </div>

          {/* Fuel Price Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayItems.length === 0 ? (
              <div className="col-span-full py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                Tidak ada data bahan bakar yang cocok dengan filter.
              </div>
            ) : (
              displayItems.map((item) => {
                const mapsUrl = getGoogleMapsUrl(item.brand, item.brandName);
                return (
                  <div
                    key={item.id}
                    id={`fuel-card-${item.id}`}
                    className="p-3.5 bg-slate-50 dark:bg-[#111724] hover:bg-slate-100/80 dark:hover:bg-[#141d2e] rounded-xl border border-slate-200/80 dark:border-slate-800/80 transition flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <StationLogo
                            stationName={item.brand}
                            className="w-6 h-6 !border-none !shadow-none shrink-0"
                          />
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
                              {item.fuelName}
                            </h4>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                              {item.brandName}
                            </span>
                          </div>
                        </div>

                        {/* Octane / Grade Tag */}
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white dark:bg-[#1b2436] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold shrink-0">
                          {item.octaneOrGrade}
                        </span>
                      </div>

                      {item.note && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1 font-medium">
                          <Info className="w-3 h-3 shrink-0" />
                          <span>{item.note}</span>
                        </p>
                      )}
                    </div>

                    {/* Price & Action: SPBU Terdekat Button (NO "PILIH" BUTTON) */}
                    <div className="mt-3.5 pt-2.5 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-extrabold text-slate-900 dark:text-white font-mono leading-tight">
                          Rp {item.price.toLocaleString("id-ID")}
                          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 ml-1">
                            {item.unit}
                          </span>
                        </div>
                        {item.status === "subsidi" ? (
                          <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                            Subsidi Pemerintah
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-400 dark:text-slate-500">
                            Harga Non-Subsidi
                          </span>
                        )}
                      </div>

                      {/* Tombol SPBU Terdekat -> Google Maps */}
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        title={`Buka Google Maps mencari ${
                          item.brand === "spklu" ? "SPKLU PLN" : `SPBU ${item.brandName}`
                        } terdekat`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-500/15 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-blue-600 dark:text-blue-400 dark:hover:text-white text-xs font-semibold rounded-lg border border-blue-200 dark:border-blue-500/30 hover:border-blue-600 dark:hover:border-blue-600 transition shadow-2xs active:scale-95 whitespace-nowrap shrink-0"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>
                          {item.brand === "spklu" ? "SPKLU Terdekat" : "SPBU Terdekat"}
                        </span>
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Show more toggle */}
          {filteredPrices.length > 6 && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 py-1 px-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 transition"
              >
                <span>
                  {isExpanded
                    ? "Tampilkan Lebih Sedikit"
                    : `Lihat Semua (${filteredPrices.length} Jenis BBM)`}
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
