export interface Vehicle {
  id: string;
  name: string;
  type: "car" | "motorcycle";
  licensePlate: string;
  currentOdometer: number;
  fuelTankCapacity: number; // liters or Kwh
  defaultFuelType: string;
  fuelCategory?: "Bensin" | "Diesel" | "Elektrik";
  tankCapacityUnit?: "L" | "Kwh";
  image?: string;
}

export interface FuelRecord {
  id: string;
  vehicleId: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  odometer: number; // KM
  previousOdometer?: number; // KM
  distanceTraveled?: number; // KM
  fuelType: string; // e.g. "Pertamax (92)", "Pertalite (90)", "Dexlite"
  octaneOrGrade?: string; // "90", "92", "98", "CN51"
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  fuelEfficiencyKmPerL?: number; // km / L
  costPerKm?: number; // Rp / km
  stationName: string; // e.g. "SPBU Pertamina 34.151.08"
  location: string; // e.g. "Kecamatan Tangerang"
  isFullTank: boolean;
  receiptImage?: string; // base64 or URL
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceItem {
  id: string;
  vehicleId: string;
  title: string; // e.g. "Ganti Oli Mesin & Filter"
  category: "oil" | "brake" | "transmission" | "filter" | "tires" | "general";
  intervalKm: number; // e.g. 10000 km
  lastServiceOdometer: number; // KM at last service
  nextServiceOdometer: number; // lastServiceOdometer + intervalKm
  lastServiceDate?: string;
  notes?: string;
}

export type ExpenseCategory = "Service" | "Top Up Etoll" | "Lainnya";

export type FuelEfficiencyUnit = "km/l" | "l/100km";

export interface ServiceHistoryEntry {
  id: string;
  vehicleId: string;
  serviceItemId?: string;
  title: string;
  category: ExpenseCategory | string;
  odometer?: number;
  date: string; // YYYY-MM-DD
  cost?: number; // Biaya (Rp)
  workshop?: string; // Nama bengkel / tempat
  notes?: string;
  createdAt: string;
}

export interface MonthlySummary {
  monthKey: string; // "YYYY-MM"
  monthName: string; // "September 2026"
  totalCost: number;
  totalLiters: number;
  totalDistance: number;
  fillCount: number;
  avgConsumptionKmPerL: number;
  avgCostPerKm: number;
  avgPricePerLiter: number;
  records: FuelRecord[];
}

export interface DriveSyncStatus {
  isSignedIn: boolean;
  userEmail: string | null;
  userName: string | null;
  userPhoto: string | null;
  lastSyncedAt: string | null;
  fileId: string | null;
  isSyncing: boolean;
  syncError: string | null;
}
