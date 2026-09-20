export type FuelBrandId = "pertamina" | "shell" | "bp" | "vivo" | "spklu";

export interface FuelBrandInfo {
  id: FuelBrandId;
  name: string;
  shortLabel: string;
  description: string;
}

export interface FuelPriceItem {
  id: string;
  brand: FuelBrandId;
  brandName: string;
  fuelName: string;
  category: "Bensin" | "Diesel" | "Elektrik";
  octaneOrGrade: string; // e.g. "RON 90", "RON 92", "CN 51", "kWh"
  price: number; // in IDR
  unit: string; // "/ L" or "/ kWh"
  status?: "subsidi" | "stabil" | "turun" | "naik";
  isAvailable: boolean; // Must be true to be displayed
  note?: string;
  lastUpdated?: string;
}

export const ALL_BRANDS: FuelBrandInfo[] = [
  { id: "pertamina", name: "Pertamina", shortLabel: "Pertamina", description: "SPBU Pertamina Nasional" },
  { id: "shell", name: "Shell", shortLabel: "Shell", description: "SPBU Shell Indonesia" },
  { id: "bp", name: "BP-AKR", shortLabel: "BP-AKR", description: "SPBU BP-AKR Fuel" },
  { id: "vivo", name: "Vivo", shortLabel: "Vivo", description: "SPBU PT Vivo Energy Indonesia" },
  { id: "spklu", name: "SPKLU PLN", shortLabel: "PLN EV", description: "Stasiun Pengisian Kendaraan Listrik Umum" },
];

/**
 * Official Daily Fuel Price List in Indonesia (Jabodetabek & Nasional Baseline)
 * Note: Each item has isAvailable flag. Only available fuels and brands with available fuels will be shown.
 */
export const INITIAL_FUEL_PRICES: FuelPriceItem[] = [
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
    isAvailable: true,
    note: "Harga subsidi resmi pemerintah",
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
    isAvailable: true,
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
    isAvailable: true,
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
    isAvailable: true,
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
    isAvailable: true,
    note: "Solar subsidi nasional",
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
    isAvailable: true,
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
    isAvailable: true,
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
    isAvailable: true,
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
    isAvailable: true,
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
    isAvailable: true,
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
    isAvailable: true,
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
    isAvailable: true,
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
    isAvailable: true,
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
    isAvailable: true,
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
    isAvailable: true,
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
    isAvailable: true,
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
    isAvailable: true,
  },

  // SPKLU PLN
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
    isAvailable: true,
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
    isAvailable: true,
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
    isAvailable: true,
    note: "Diskon 30% pukul 22.00-05.00",
  },
];

const STORAGE_CUSTOM_FUEL_KEY = "bbm_fuel_prices_custom_v2";
const STORAGE_LAST_REFRESH_KEY = "bbm_fuel_prices_last_refresh_v2";

/**
 * Returns formatted daily date in Indonesian (e.g., "Minggu, 20 September 2026")
 */
export function getDailyUpdateDateFormatted(): string {
  return new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Retrieves all stored fuel price items (including custom availability or price edits)
 */
export function getAllFuelPriceItems(): FuelPriceItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_FUEL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Merge with any missing initial items to guarantee up-to-date catalog
        const map = new Map<string, FuelPriceItem>();
        INITIAL_FUEL_PRICES.forEach((item) => map.set(item.id, { ...item }));
        parsed.forEach((custom: FuelPriceItem) => {
          if (custom && custom.id) {
            map.set(custom.id, { ...map.get(custom.id), ...custom });
          }
        });
        return Array.from(map.values());
      }
    }
  } catch (err) {
    console.warn("Failed to load custom fuel prices from device:", err);
  }
  return INITIAL_FUEL_PRICES;
}

/**
 * Saves modified fuel prices or availability to device localStorage
 */
export function saveFuelPriceItems(items: FuelPriceItem[]): void {
  try {
    localStorage.setItem(STORAGE_CUSTOM_FUEL_KEY, JSON.stringify(items));
    localStorage.setItem(STORAGE_LAST_REFRESH_KEY, new Date().toISOString());
  } catch (err) {
    console.error("Failed to save fuel prices to device:", err);
  }
}

/**
 * Returns ONLY fuels that are available (isAvailable === true).
 * Strictly complies with user mandate: "yang tampil hanya yang tersedia saja."
 */
export function getAvailableFuelPrices(): FuelPriceItem[] {
  const all = getAllFuelPriceItems();
  return all.filter((item) => item.isAvailable === true);
}

/**
 * Returns ONLY brands that have at least one available fuel.
 * Strictly complies with user mandate: "jika bensin dari brand tertentu tidak tersedia maka tidak usah ditampilkan."
 */
export function getAvailableBrands(availablePrices?: FuelPriceItem[]): FuelBrandInfo[] {
  const prices = availablePrices || getAvailableFuelPrices();
  return ALL_BRANDS.filter((brand) =>
    prices.some((p) => p.brand === brand.id && p.isAvailable)
  );
}

/**
 * Checks if a specific brand has any available fuel
 */
export function isBrandAvailable(brandId: FuelBrandId, availablePrices?: FuelPriceItem[]): boolean {
  const prices = availablePrices || getAvailableFuelPrices();
  return prices.some((p) => p.brand === brandId && p.isAvailable);
}

/**
 * Toggles availability of a fuel item
 */
export function toggleFuelAvailability(fuelId: string, isAvailable: boolean): FuelPriceItem[] {
  const all = getAllFuelPriceItems();
  const updated = all.map((item) => {
    if (item.id === fuelId) {
      return { ...item, isAvailable };
    }
    return item;
  });
  saveFuelPriceItems(updated);
  return updated;
}

/**
 * Toggles availability of an entire brand (e.g. if a brand does not operate in the user's city)
 */
export function toggleBrandAvailability(brandId: FuelBrandId, isAvailable: boolean): FuelPriceItem[] {
  const all = getAllFuelPriceItems();
  const updated = all.map((item) => {
    if (item.brand === brandId) {
      return { ...item, isAvailable };
    }
    return item;
  });
  saveFuelPriceItems(updated);
  return updated;
}

/**
 * Resets fuel prices and availability back to official defaults
 */
export function resetFuelPricesToDefault(): FuelPriceItem[] {
  localStorage.removeItem(STORAGE_CUSTOM_FUEL_KEY);
  localStorage.setItem(STORAGE_LAST_REFRESH_KEY, new Date().toISOString());
  return INITIAL_FUEL_PRICES;
}
