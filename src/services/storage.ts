import { Vehicle, FuelRecord, ServiceItem, ServiceHistoryEntry, MonthlySummary } from "../types";

const VEHICLES_STORAGE_KEY = "bbm_app_vehicles_v1";
const FUEL_RECORDS_KEY = "bbm_app_records_v1";
const SERVICES_KEY = "bbm_app_services_v1";
const SERVICE_HISTORY_KEY = "bbm_app_service_history_v1";
const DUMMY_PURGED_KEY = "bbm_app_dummy_purged_v3";

function getScopedKey(baseKey: string, userId?: string | null): string {
  if (userId) {
    // Sanitize user ID / email to be safe in storage keys
    const safeUser = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
    return `${baseKey}_usr_${safeUser}`;
  }
  return baseKey;
}

export const DEFAULT_VEHICLES: Vehicle[] = [];

export const DEFAULT_FUEL_RECORDS: FuelRecord[] = [];

export const DEFAULT_SERVICES: ServiceItem[] = [];

export const DEFAULT_SERVICE_HISTORY: ServiceHistoryEntry[] = [];

/**
 * Ensures all previous dummy records (rec-1 to rec-5, dummy history, etc.) are purged
 * so the user starts with a completely clean slate as requested.
 */
export function purgeDummyDataIfPresent(userId?: string | null): void {
  try {
    const isPurged = localStorage.getItem(getScopedKey(DUMMY_PURGED_KEY, userId));
    if (!isPurged) {
      const recordsKey = getScopedKey(FUEL_RECORDS_KEY, userId);
      const rawRecords = localStorage.getItem(recordsKey);
      if (rawRecords) {
        try {
          const parsed = JSON.parse(rawRecords);
          if (Array.isArray(parsed) && parsed.some((r: any) => r.id?.startsWith("rec-"))) {
            localStorage.setItem(recordsKey, JSON.stringify([]));
          }
        } catch (_) {
          localStorage.setItem(recordsKey, JSON.stringify([]));
        }
      }

      const historyKey = getScopedKey(SERVICE_HISTORY_KEY, userId);
      const rawHistory = localStorage.getItem(historyKey);
      if (rawHistory) {
        try {
          const parsedH = JSON.parse(rawHistory);
          if (Array.isArray(parsedH) && parsedH.some((h: any) => h.id?.startsWith("hist-"))) {
            localStorage.setItem(historyKey, JSON.stringify([]));
          }
        } catch (_) {
          localStorage.setItem(historyKey, JSON.stringify([]));
        }
      }

      localStorage.setItem(getScopedKey(DUMMY_PURGED_KEY, userId), "true");
    }
  } catch (e) {
    console.error("Failed to run dummy purge check:", e);
  }
}

export function resetAllAppData(userId?: string | null): void {
  try {
    localStorage.setItem(getScopedKey(FUEL_RECORDS_KEY, userId), JSON.stringify([]));
    localStorage.setItem(getScopedKey(SERVICE_HISTORY_KEY, userId), JSON.stringify([]));
    localStorage.setItem(getScopedKey(SERVICES_KEY, userId), JSON.stringify([]));
    localStorage.setItem(getScopedKey(VEHICLES_STORAGE_KEY, userId), JSON.stringify([]));
    localStorage.setItem(getScopedKey(DUMMY_PURGED_KEY, userId), "true");
  } catch (e) {
    console.error("Failed to reset all data:", e);
  }
}

export function getStoredVehicles(userId?: string | null): Vehicle[] {
  purgeDummyDataIfPresent(userId);
  const key = getScopedKey(VEHICLES_STORAGE_KEY, userId);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [];
    }
    // Filter out dummy auto-created "Mobil Utama" with no plate and 0 odometer
    const filtered = parsed.filter(
      (v: Vehicle) =>
        !(
          v.id === "veh-1" &&
          (v.name === "Mobil Utama" || v.name === "Kendaraan Saya") &&
          !v.licensePlate &&
          v.currentOdometer === 0
        )
    );
    return filtered;
  } catch (e) {
    console.error("Failed to load vehicles from storage:", e);
    return [];
  }
}

export function saveStoredVehicles(vehicles: Vehicle[], userId?: string | null): void {
  try {
    localStorage.setItem(getScopedKey(VEHICLES_STORAGE_KEY, userId), JSON.stringify(vehicles));
  } catch (e) {
    console.error("Failed to save vehicles:", e);
  }
}

export function getStoredFuelRecords(userId?: string | null): FuelRecord[] {
  purgeDummyDataIfPresent(userId);
  const key = getScopedKey(FUEL_RECORDS_KEY, userId);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      if (userId) {
        const guestRaw = localStorage.getItem(FUEL_RECORDS_KEY);
        if (guestRaw) {
          try {
            const guestParsed = JSON.parse(guestRaw);
            if (Array.isArray(guestParsed) && guestParsed.length > 0) {
              localStorage.setItem(key, guestRaw);
              return guestParsed;
            }
          } catch {}
        }
      }
      localStorage.setItem(key, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to load fuel records:", e);
    return [];
  }
}

export function saveStoredFuelRecords(records: FuelRecord[], userId?: string | null): void {
  try {
    localStorage.setItem(getScopedKey(FUEL_RECORDS_KEY, userId), JSON.stringify(records));
  } catch (e) {
    console.error("Failed to save fuel records:", e);
  }
}

export function getStoredServices(userId?: string | null): ServiceItem[] {
  purgeDummyDataIfPresent(userId);
  const key = getScopedKey(SERVICES_KEY, userId);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to load services:", e);
    return [];
  }
}

export function saveStoredServices(services: ServiceItem[], userId?: string | null): void {
  try {
    localStorage.setItem(getScopedKey(SERVICES_KEY, userId), JSON.stringify(services));
  } catch (e) {
    console.error("Failed to save services:", e);
  }
}

export function getStoredServiceHistory(userId?: string | null): ServiceHistoryEntry[] {
  purgeDummyDataIfPresent(userId);
  const key = getScopedKey(SERVICE_HISTORY_KEY, userId);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      if (userId) {
        const guestRaw = localStorage.getItem(SERVICE_HISTORY_KEY);
        if (guestRaw) {
          try {
            const guestParsed = JSON.parse(guestRaw);
            if (Array.isArray(guestParsed) && guestParsed.length > 0) {
              localStorage.setItem(key, guestRaw);
              return guestParsed;
            }
          } catch {}
        }
      }
      localStorage.setItem(key, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to load service history:", e);
    return [];
  }
}

export function saveStoredServiceHistory(history: ServiceHistoryEntry[], userId?: string | null): void {
  try {
    localStorage.setItem(getScopedKey(SERVICE_HISTORY_KEY, userId), JSON.stringify(history));
  } catch (e) {
    console.error("Failed to save service history:", e);
  }
}

// Recalculates consumption metrics for a list of records belonging to a vehicle
export function recalculateRecords(records: FuelRecord[]): FuelRecord[] {
  if (!records || records.length === 0) return [];

  // Sort oldest to newest by odometer / date
  const sorted = [...records].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.odometer - b.odometer;
  });

  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) {
      sorted[i].previousOdometer = undefined;
      sorted[i].distanceTraveled = undefined;
      sorted[i].fuelEfficiencyKmPerL = undefined;
      sorted[i].costPerKm = undefined;
    } else {
      const prev = sorted[i - 1];
      const dist = sorted[i].odometer - prev.odometer;
      sorted[i].previousOdometer = prev.odometer;
      if (dist > 0) {
        sorted[i].distanceTraveled = dist;
        if (sorted[i].liters > 0) {
          sorted[i].fuelEfficiencyKmPerL = Number((dist / sorted[i].liters).toFixed(2));
          sorted[i].costPerKm = Number((sorted[i].totalCost / dist).toFixed(2));
        }
      }
    }
  }

  // Return sorted newest to oldest for display
  return sorted.sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return b.odometer - a.odometer;
  });
}

export function calculateMonthlySummaries(records: FuelRecord[]): MonthlySummary[] {
  if (!records || records.length === 0) return [];

  const groups: Record<string, FuelRecord[]> = {};

  records.forEach((r) => {
    const key = r.date.slice(0, 7); // YYYY-MM
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });

  return Object.entries(groups)
    .sort(([keyA], [keyB]) => keyB.localeCompare(keyA))
    .map(([monthKey, list]) => {
      const dateObj = new Date(`${monthKey}-01T00:00:00`);
      const monthName = !isNaN(dateObj.getTime())
        ? dateObj.toLocaleDateString("id-ID", {
            month: "long",
            year: "numeric",
          })
        : monthKey;

      const totalCost = list.reduce((acc, r) => acc + r.totalCost, 0);
      const totalLiters = list.reduce((acc, r) => acc + r.liters, 0);
      const totalDistance = list.reduce((acc, r) => acc + (r.distanceTraveled || 0), 0);
      const fillCount = list.length;

      const avgConsumptionKmPerL =
        totalLiters > 0 && totalDistance > 0
          ? Number((totalDistance / totalLiters).toFixed(2))
          : 0;

      const avgCostPerKm =
        totalDistance > 0 ? Number((totalCost / totalDistance).toFixed(2)) : 0;

      const avgPricePerLiter =
        totalLiters > 0 ? Math.round(totalCost / totalLiters) : 0;

      return {
        monthKey,
        monthName,
        totalCost,
        totalLiters: Number(totalLiters.toFixed(2)),
        totalDistance,
        fillCount,
        avgConsumptionKmPerL,
        avgCostPerKm,
        avgPricePerLiter,
        records: list,
      };
    });
}

export interface DeviceBackupPayload {
  app: string;
  version: number;
  exportedAt: string;
  storageType: "device_local";
  vehicles: Vehicle[];
  fuelRecords: FuelRecord[];
  services: ServiceItem[];
  serviceHistory: ServiceHistoryEntry[];
}

/**
 * Downloads a complete JSON backup file of all vehicles, fuel records, services,
 * and service history directly to the user's device memory.
 */
export function exportDeviceBackup(
  vehicles: Vehicle[],
  fuelRecords: FuelRecord[],
  services: ServiceItem[],
  serviceHistory: ServiceHistoryEntry[]
): void {
  const payload: DeviceBackupPayload = {
    app: "Catatan BBM & Servis Kendaraan",
    version: 2,
    exportedAt: new Date().toISOString(),
    storageType: "device_local",
    vehicles,
    fuelRecords,
    services,
    serviceHistory,
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;

  const link = document.createElement("a");
  link.href = url;
  link.download = `catatan_bbm_backup_${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Reads and parses a JSON backup file uploaded from the user's device.
 */
export async function parseDeviceBackupFile(file: File): Promise<Partial<DeviceBackupPayload>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        if (typeof parsed !== "object" || parsed === null) {
          throw new Error("Format file cadangan tidak valid.");
        }
        resolve(parsed);
      } catch (err: any) {
        reject(new Error("Gagal membaca file cadangan: Format JSON tidak sesuai."));
      }
    };
    reader.onerror = () => reject(new Error("Gagal membaca file dari perangkat."));
    reader.readAsText(file);
  });
}

