import { getAccessToken } from "./firebaseAuth";
import { Vehicle, FuelRecord, ServiceHistoryEntry, ServiceItem } from "../types";

export interface SpreadsheetSyncPayload {
  vehicles: Vehicle[];
  fuelRecords: FuelRecord[];
  serviceHistory: ServiceHistoryEntry[];
  services: ServiceItem[];
  userEmail?: string | null;
}

export interface SpreadsheetInfo {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  lastSyncedAt: string;
}

const STORAGE_KEY_SPREADSHEET_ID = "bbm_spreadsheet_id";
const STORAGE_KEY_SPREADSHEET_URL = "bbm_spreadsheet_url";
const STORAGE_KEY_SPREADSHEET_SYNCED = "bbm_spreadsheet_synced_at";
const STORAGE_KEY_SPREADSHEET_TITLE = "bbm_spreadsheet_title";

export function getCachedSpreadsheetInfo(): SpreadsheetInfo | null {
  const id = localStorage.getItem(STORAGE_KEY_SPREADSHEET_ID);
  const url = localStorage.getItem(STORAGE_KEY_SPREADSHEET_URL);
  if (!id || !url) return null;
  return {
    spreadsheetId: id,
    spreadsheetUrl: url,
    title: localStorage.getItem(STORAGE_KEY_SPREADSHEET_TITLE) || "BBM & Servis Kendaraan",
    lastSyncedAt: localStorage.getItem(STORAGE_KEY_SPREADSHEET_SYNCED) || "",
  };
}

export function saveCachedSpreadsheetInfo(info: SpreadsheetInfo) {
  localStorage.setItem(STORAGE_KEY_SPREADSHEET_ID, info.spreadsheetId);
  localStorage.setItem(STORAGE_KEY_SPREADSHEET_URL, info.spreadsheetUrl);
  localStorage.setItem(STORAGE_KEY_SPREADSHEET_TITLE, info.title);
  localStorage.setItem(STORAGE_KEY_SPREADSHEET_SYNCED, info.lastSyncedAt);
}

export function clearCachedSpreadsheetInfo() {
  localStorage.removeItem(STORAGE_KEY_SPREADSHEET_ID);
  localStorage.removeItem(STORAGE_KEY_SPREADSHEET_URL);
  localStorage.removeItem(STORAGE_KEY_SPREADSHEET_TITLE);
  localStorage.removeItem(STORAGE_KEY_SPREADSHEET_SYNCED);
}

// Find existing spreadsheet or create a new one in user's Google Drive
export async function findOrCreateSpreadsheet(
  token: string,
  userEmail?: string | null
): Promise<{ id: string; url: string; title: string }> {
  const targetTitle = userEmail
    ? `BBM & Servis Kendaraan - ${userEmail}`
    : "BBM & Servis Kendaraan - Data Saya";

  // Check if we already have a cached ID and verify it exists
  const cached = getCachedSpreadsheetInfo();
  if (cached?.spreadsheetId) {
    try {
      const checkRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${cached.spreadsheetId}?fields=spreadsheetId,properties.title`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (checkRes.ok) {
        const data = await checkRes.json();
        return {
          id: cached.spreadsheetId,
          url: cached.spreadsheetUrl,
          title: data.properties?.title || targetTitle,
        };
      }
    } catch {
      // Continue to search by name
    }
  }

  // Search Drive for file
  const query = encodeURIComponent(
    `name = '${targetTitle}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`
  );
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      const file = searchData.files[0];
      const url =
        file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}/edit`;
      return { id: file.id, url, title: file.name };
    }
  }

  // Create new Spreadsheet
  const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        title: targetTitle,
      },
      sheets: [
        { properties: { title: "Catatan BBM" } },
        { properties: { title: "Riwayat Biaya & Servis" } },
        { properties: { title: "Data Kendaraan" } },
        { properties: { title: "Jadwal Servis" } },
      ],
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Gagal membuat Google Spreadsheet: ${errText}`);
  }

  const created = await createRes.json();
  const url =
    created.spreadsheetUrl ||
    `https://docs.google.com/spreadsheets/d/${created.spreadsheetId}/edit`;

  return {
    id: created.spreadsheetId,
    url,
    title: targetTitle,
  };
}

// Synchronize all application data into Google Spreadsheet
export async function syncAllToGoogleSpreadsheet(
  payload: SpreadsheetSyncPayload
): Promise<SpreadsheetInfo> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error(
      "Sesi Google belum aktif. Silakan hubungkan akun Google Anda di pengaturan."
    );
  }

  const { id: spreadsheetId, url: spreadsheetUrl, title } =
    await findOrCreateSpreadsheet(token, payload.userEmail);

  // Map vehicle ID to Vehicle object for name lookup
  const vehicleMap = new Map<string, Vehicle>();
  payload.vehicles.forEach((v) => vehicleMap.set(v.id, v));

  // 1. Data Sheet: Catatan BBM
  const fuelHeaders = [
    "No",
    "ID Catatan",
    "Kendaraan",
    "Tanggal",
    "Waktu",
    "Odometer (km)",
    "Jarak Tempuh (km)",
    "Jenis Bahan Bakar",
    "Octane / Grade",
    "Harga / Liter (Rp)",
    "Volume (Liter)",
    "Total Biaya (Rp)",
    "Konsumsi (km/L)",
    "Biaya per km (Rp)",
    "Nama SPBU",
    "Lokasi",
    "Full Tank",
    "Catatan",
  ];

  const fuelRows = payload.fuelRecords.map((r, index) => {
    const vehName = vehicleMap.get(r.vehicleId)?.name || "Kendaraan";
    return [
      index + 1,
      r.id,
      vehName,
      r.date,
      r.time || "",
      r.odometer,
      r.distanceTraveled ?? "",
      r.fuelType,
      r.octaneOrGrade || "",
      r.pricePerLiter,
      r.liters,
      r.totalCost,
      r.fuelEfficiencyKmPerL ?? "",
      r.costPerKm ?? "",
      r.stationName || "",
      r.location || "",
      r.isFullTank ? "Ya" : "Tidak",
      r.notes || "",
    ];
  });

  // 2. Data Sheet: Riwayat Biaya & Servis
  const serviceHistoryHeaders = [
    "No",
    "ID Riwayat",
    "Kendaraan",
    "Tanggal",
    "Kategori",
    "Keterangan Pekerjaan / Biaya",
    "Total Biaya (Rp)",
    "Odometer (km)",
    "Bengkel / Tempat",
    "Catatan",
  ];

  const serviceHistoryRows = payload.serviceHistory.map((h, index) => {
    const vehName = vehicleMap.get(h.vehicleId)?.name || "Kendaraan";
    return [
      index + 1,
      h.id,
      vehName,
      h.date,
      h.category,
      h.title,
      h.cost ?? 0,
      h.odometer ?? "",
      h.workshop || "",
      h.notes || "",
    ];
  });

  // 3. Data Sheet: Data Kendaraan
  const vehicleHeaders = [
    "No",
    "ID Kendaraan",
    "Nama Kendaraan",
    "Jenis Kendaraan",
    "Plat Nomor",
    "Kategori Bahan Bakar",
    "Kapasitas Tangki / Baterai",
    "Satuan",
    "Odometer Terkini (km)",
    "Bahan Bakar Default",
  ];

  const vehicleRows = payload.vehicles.map((v, index) => {
    return [
      index + 1,
      v.id,
      v.name,
      v.type === "car" ? "Mobil" : "Sepeda Motor",
      v.licensePlate,
      v.fuelCategory || "Bensin",
      v.fuelTankCapacity,
      v.tankCapacityUnit || (v.fuelCategory === "Elektrik" ? "Kwh" : "L"),
      v.currentOdometer,
      v.defaultFuelType || "",
    ];
  });

  // 4. Data Sheet: Jadwal Servis
  const serviceHeaders = [
    "No",
    "ID Jadwal",
    "Kendaraan",
    "Pekerjaan Servis",
    "Kategori",
    "Interval (km)",
    "Odometer Servis Terakhir (km)",
    "Odometer Servis Berikutnya (km)",
    "Tanggal Terakhir",
    "Catatan",
  ];

  const serviceRows = payload.services.map((s, index) => {
    const vehName = vehicleMap.get(s.vehicleId)?.name || "Kendaraan";
    return [
      index + 1,
      s.id,
      vehName,
      s.title,
      s.category,
      s.intervalKm,
      s.lastServiceOdometer,
      s.nextServiceOdometer,
      s.lastServiceDate || "",
      s.notes || "",
    ];
  });

  // Helper to ensure sheet exists and update it
  const sheetsToUpdate = [
    { name: "Catatan BBM", values: [fuelHeaders, ...fuelRows] },
    {
      name: "Riwayat Biaya & Servis",
      values: [serviceHistoryHeaders, ...serviceHistoryRows],
    },
    { name: "Data Kendaraan", values: [vehicleHeaders, ...vehicleRows] },
    { name: "Jadwal Servis", values: [serviceHeaders, ...serviceRows] },
  ];

  for (const item of sheetsToUpdate) {
    // 1. Clear previous content to guarantee deleted items in app are deleted in spreadsheet
    try {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
          item.name
        )}!A1:Z10000:clear`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch {
      // In case sheet name needs creation, we attempt update directly
    }

    // 2. Put updated values
    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
        item.name
      )}!A1?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          range: `${item.name}!A1`,
          majorDimension: "ROWS",
          values: item.values,
        }),
      }
    );

    if (!updateRes.ok) {
      console.warn(`Gagal memperbarui tab "${item.name}":`, await updateRes.text());
    }
  }

  const now = new Date().toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const result: SpreadsheetInfo = {
    spreadsheetId,
    spreadsheetUrl,
    title,
    lastSyncedAt: `${now} WIB`,
  };

  saveCachedSpreadsheetInfo(result);
  return result;
}
