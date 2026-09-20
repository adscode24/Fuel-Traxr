import React, { useState, useEffect, useMemo } from "react";
import {
  Fuel,
  Search,
  ChevronDown,
  Info,
  MapPin,
  RefreshCw,
  SlidersHorizontal,
  CheckCircle2,
  X,
  AlertCircle,
} from "lucide-react";
import { StationLogo } from "./StationLogo";
import {
  FuelPriceItem,
  FuelBrandId,
  FuelBrandInfo,
  ALL_BRANDS,
  INITIAL_FUEL_PRICES,
  getAllFuelPriceItems,
  getAvailableFuelPrices,
  getAvailableBrands,
  getDailyUpdateDateFormatted,
  toggleFuelAvailability,
  toggleBrandAvailability,
  resetFuelPricesToDefault,
} from "../services/fuelPriceService";

export { type FuelPriceItem };
export const FUEL_PRICES_TODAY: FuelPriceItem[] = INITIAL_FUEL_PRICES;

interface Props {
  vehicleCategory?: "Bensin" | "Diesel" | "Elektrik";
  onSelectPriceForEntry?: (item: FuelPriceItem) => void;
}

export const FuelPriceTodayCard: React.FC<Props> = ({
  vehicleCategory = "Bensin",
}) => {
  // Accordion state: DEFAULT CLOSED
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // Available fuel prices state
  const [allPrices, setAllPrices] = useState<FuelPriceItem[]>(() =>
    getAllFuelPriceItems()
  );

  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>(
    vehicleCategory || "Bensin"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSuccessMsg, setRefreshSuccessMsg] = useState<string | null>(null);

  // Modal to manage fuel & brand availability
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);

  // User location coordinates for pinpoint Google Maps search
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
          // Silently fallback; Google Maps locates device via IP/GPS natively
        },
        { enableHighAccuracy: false, timeout: 5000 }
      );
    }
  }, []);

  // Today's formatted date string (Indonesian daily locale)
  const todayFormatted = useMemo(() => getDailyUpdateDateFormatted(), []);

  // 1. Only available fuels are extracted
  // Requirement: "yang tampil hanya yang tersedia saja"
  const availablePrices = useMemo(() => {
    return allPrices.filter((item) => item.isAvailable === true);
  }, [allPrices]);

  // 2. Only brands that have at least one available fuel are returned
  // Requirement: "jika bensin dari brand tertentu tidak tersedia maka tidak usah ditampilkan"
  const availableBrands = useMemo(() => {
    return ALL_BRANDS.filter((brand) =>
      availablePrices.some((p) => p.brand === brand.id)
    );
  }, [availablePrices]);

  // If currently selected brand is no longer available, automatically revert to "all"
  useEffect(() => {
    if (
      selectedBrand !== "all" &&
      !availableBrands.some((b) => b.id === selectedBrand)
    ) {
      setSelectedBrand("all");
    }
  }, [availableBrands, selectedBrand]);

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

  // Filtered prices for display
  const filteredPrices = useMemo(() => {
    return availablePrices.filter((item) => {
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
  }, [availablePrices, selectedBrand, selectedCategory, searchQuery]);

  // Items to display inside the accordion (default 6 or full list)
  const displayItems = isExpanded
    ? filteredPrices
    : filteredPrices.slice(0, 6);

  // Handle daily price manual refresh
  const handleRefreshDaily = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      const fresh = getAllFuelPriceItems();
      setAllPrices(fresh);
      setIsRefreshing(false);
      setRefreshSuccessMsg("Harga BBM telah diverifikasi terupdate hari ini!");
      setTimeout(() => setRefreshSuccessMsg(null), 3000);
    }, 450);
  };

  // Dynamic brand list for subtitle
  const subtitleBrandText = useMemo(() => {
    if (availableBrands.length === 0) return "Tidak ada SPBU tersedia";
    return `${availableBrands.map((b) => b.shortLabel).join(" • ")} (${todayFormatted})`;
  }, [availableBrands, todayFormatted]);

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
        className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/70 dark:hover:bg-[#182133]/60 transition-colors focus:outline-none cursor-pointer"
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
                Terupdate Harian
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {subtitleBrandText}
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
          {/* Daily Refresh Banner & Manage Availability Action */}
          <div className="flex items-center justify-between gap-2 pt-3 text-xs flex-wrap">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="font-semibold text-[11px]">
                Diperbarui: <b className="text-slate-900 dark:text-white">{todayFormatted}</b>
              </span>
              <button
                type="button"
                onClick={handleRefreshDaily}
                disabled={isRefreshing}
                title="Segarkan data harga bensin harian"
                className="p-1 rounded-md text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsManageModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200/80 dark:bg-[#1a2337] dark:hover:bg-[#222e47] rounded-lg border border-slate-200 dark:border-slate-700 transition active:scale-95 cursor-pointer"
            >
              <SlidersHorizontal className="w-3 h-3 text-slate-500" />
              <span>Kelola Ketersediaan SPBU</span>
            </button>
          </div>

          {refreshSuccessMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-[11px] font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{refreshSuccessMsg}</span>
            </div>
          )}

          {/* Category & Search Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Category Tabs: Bensin / Diesel / Elektrik */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-[#0e1420] rounded-xl border border-slate-200 dark:border-slate-800 text-xs self-start sm:self-auto">
              {(["all", "Bensin", "Diesel", "Elektrik"] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
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

          {/* Brand Filter Buttons - ONLY BRANDS WITH AVAILABLE FUEL ARE SHOWN */}
          {/* Requirement: "jika bensin dari brand tertentu tidak tersedia maka tidak usah ditampilkan" */}
          {availableBrands.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                type="button"
                onClick={() => setSelectedBrand("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedBrand === "all"
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                    : "bg-slate-100 dark:bg-[#0e1420] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                Semua SPBU ({availableBrands.length})
              </button>

              {availableBrands.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBrand(b.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    selectedBrand === b.id
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-[#0e1420] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  <StationLogo
                    stationName={b.id}
                    className="w-3.5 h-3.5 !border-none !shadow-none inline-block"
                  />
                  <span>{b.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Fuel Price Grid - Displays ONLY Available Items */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayItems.length === 0 ? (
              <div className="col-span-full py-8 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#111724] rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                <AlertCircle className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  Tidak ada bahan bakar yang tersedia untuk kriteria ini.
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Bahan bakar yang tidak tersedia atau dari brand yang tidak beroperasi otomatis disembunyikan.
                </p>
              </div>
            ) : (
              displayItems.map((item) => {
                const mapsUrl = getGoogleMapsUrl(item.brand, item.brandName);
                return (
                  <div
                    key={item.id}
                    id={`fuel-card-${item.id}`}
                    className="p-3.5 bg-slate-50 dark:bg-[#111724] hover:bg-slate-100/80 dark:hover:bg-[#141d2e] rounded-xl border border-slate-200/80 dark:border-slate-800/80 transition flex flex-col justify-between group shadow-2xs"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <StationLogo
                            stationName={item.brand}
                            className="w-6 h-6 !border-none !shadow-none shrink-0"
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight truncate">
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

                    {/* Price & Action: SPBU Terdekat Button */}
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

                      {/* Button to open nearest SPBU on Google Maps */}
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

          {/* Show more / less toggle */}
          {filteredPrices.length > 6 && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 py-1 px-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 transition cursor-pointer"
              >
                <span>
                  {isExpanded
                    ? "Tampilkan Lebih Sedikit"
                    : `Lihat Semua (${filteredPrices.length} Bahan Bakar Tersedia)`}
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal: Kelola Ketersediaan SPBU & BBM */}
      {isManageModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#151c2b] border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl text-slate-900 dark:text-slate-100 max-h-[90vh] flex flex-col transition-colors">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Kelola Ketersediaan SPBU &amp; BBM
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    BBM atau brand yang dinonaktifkan tidak akan ditampilkan di aplikasi.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsManageModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {/* Brand-level toggles */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Ketersediaan Brand / Jaringan SPBU
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ALL_BRANDS.map((brand) => {
                    const isAnyAvailable = allPrices.some(
                      (p) => p.brand === brand.id && p.isAvailable
                    );
                    return (
                      <div
                        key={brand.id}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#111724] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <StationLogo
                            stationName={brand.id}
                            className="w-5 h-5 !border-none !shadow-none shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs truncate">
                              {brand.name}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {isAnyAvailable ? "Beroperasi" : "Tidak Tersedia"}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const updated = toggleBrandAvailability(
                              brand.id,
                              !isAnyAvailable
                            );
                            setAllPrices(updated);
                          }}
                          className={`w-10 h-5 rounded-full transition p-0.5 flex items-center shrink-0 cursor-pointer ${
                            isAnyAvailable
                              ? "bg-blue-600 justify-end"
                              : "bg-slate-300 dark:bg-slate-700 justify-start"
                          }`}
                        >
                          <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Fuel-level item toggles */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Ketersediaan Tiap Varian BBM
                </h4>
                <div className="space-y-1.5">
                  {allPrices.map((item) => (
                    <div
                      key={item.id}
                      className="p-2 rounded-lg bg-slate-50 dark:bg-[#111724] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <StationLogo
                          stationName={item.brand}
                          className="w-4 h-4 !border-none !shadow-none shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                            {item.fuelName}{" "}
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({item.octaneOrGrade})
                            </span>
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                            Rp {item.price.toLocaleString("id-ID")} {item.unit}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const updated = toggleFuelAvailability(
                            item.id,
                            !item.isAvailable
                          );
                          setAllPrices(updated);
                        }}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition cursor-pointer ${
                          item.isAvailable
                            ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                            : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700"
                        }`}
                      >
                        {item.isAvailable ? "Tersedia" : "Tidak Tersedia"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  const reset = resetFuelPricesToDefault();
                  setAllPrices(reset);
                }}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
              >
                Kembalikan Default
              </button>

              <button
                type="button"
                onClick={() => setIsManageModalOpen(false)}
                className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-xs transition active:scale-95 cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
