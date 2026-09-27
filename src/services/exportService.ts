import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import {
  Vehicle,
  FuelRecord,
  ServiceItem,
  ServiceHistoryEntry,
  MonthlySummary,
} from "../types";

export interface ExportFile {
  blob: Blob;
  fileName: string;
  mimeType: string;
}

/** Semua nilai yang masuk ke dokumen harus string/number valid — jsPDF crash jika undefined. */
function txt(v: unknown, fallback = "-"): string {
  if (v === null || v === undefined) return fallback;
  const s = String(v);
  return s.length > 0 ? s : fallback;
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

function dateStr(v: unknown): string {
  return typeof v === "string" && v.length > 0 ? v : "-";
}

function safeVehicleName(vehicle: Vehicle | null | undefined): string {
  const name = vehicle?.name?.trim() || "Kendaraan";
  return name.replace(/\s+/g, "_").replace(/[\\/:*?"<>|]/g, "");
}

function datedFileName(prefix: string, vehicle: Vehicle | null | undefined, ext: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${prefix}_${safeVehicleName(vehicle)}_${date}.${ext}`;
}

export function exportToExcel(
  vehicle: Vehicle | null,
  records: FuelRecord[],
  services: ServiceItem[],
  monthlySummaries: MonthlySummary[],
  serviceHistory: ServiceHistoryEntry[] = []
): ExportFile {
  const safeVehicle: Vehicle = vehicle ?? {
    id: "all",
    name: "Semua Kendaraan",
    type: "car",
    licensePlate: "-",
    currentOdometer: 0,
    fuelTankCapacity: 0,
    defaultFuelType: "-",
  };
  const safeRecords = Array.isArray(records) ? records : [];
  const safeServices = Array.isArray(services) ? services : [];
  const safeSummaries = Array.isArray(monthlySummaries) ? monthlySummaries : [];
  const safeHistory = Array.isArray(serviceHistory) ? serviceHistory : [];

  const wb = XLSX.utils.book_new();

  // 1. Fuel Records Sheet
  const fuelRows = safeRecords.map((r, index) => ({
    No: index + 1,
    Tanggal: dateStr(r.date),
    Waktu: txt(r.time),
    Kendaraan: txt(safeVehicle.name),
    "Plat Nomor": txt(safeVehicle.licensePlate),
    "Odometer (KM)": num(r.odometer),
    "Jarak Tempuh (+KM)": r.distanceTraveled ?? "-",
    "Jenis BBM": txt(r.fuelType) + (r.octaneOrGrade ? ` (${r.octaneOrGrade})` : ""),
    "Harga / Liter (Rp)": num(r.pricePerLiter),
    "Volume (Liter)": num(r.liters),
    "Total Biaya (Rp)": num(r.totalCost),
    "Konsumsi (km/L)": r.fuelEfficiencyKmPerL ?? "-",
    "Biaya / KM (Rp/km)": r.costPerKm ?? "-",
    "SPBU / Lokasi": `${txt(r.stationName)} - ${txt(r.location)}`,
    "Tangki Penuh": r.isFullTank ? "Ya" : "Tidak",
    Catatan: txt(r.notes),
  }));
  const wsFuel = XLSX.utils.json_to_sheet(fuelRows);
  XLSX.utils.book_append_sheet(wb, wsFuel, "Riwayat BBM");

  // 2. Monthly Summary Sheet
  const summaryRows = safeSummaries.map((m) => ({
    Bulan: txt(m.monthName, txt(m.monthKey)),
    "Total Biaya (Rp)": num(m.totalCost),
    "Total Liter": num(m.totalLiters),
    "Total Jarak (KM)": num(m.totalDistance),
    "Jumlah Pengisian": num(m.fillCount),
    "Rata-rata Konsumsi (km/L)": m.avgConsumptionKmPerL || "-",
    "Rata-rata Biaya / KM (Rp)": m.avgCostPerKm || "-",
    "Rata-rata Harga / Liter (Rp)": num(m.avgPricePerLiter),
  }));
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan Bulanan");

  // 3. Service History Sheet
  if (safeHistory.length > 0) {
    const historyRows = safeHistory.map((h, index) => ({
      No: index + 1,
      Tanggal: dateStr(h.date),
      "Item Servis": txt(h.title, "Servis"),
      Kategori: txt(h.category),
      "Odometer (KM)": h.odometer ?? "-",
      "Biaya Servis (Rp)": h.cost ? h.cost : 0,
      "Bengkel / Tempat": txt(h.workshop),
      Catatan: txt(h.notes),
    }));
    const wsHistory = XLSX.utils.json_to_sheet(historyRows);
    XLSX.utils.book_append_sheet(wb, wsHistory, "Riwayat Servis Selesai");
  }

  // 4. Service Schedule Sheet
  const serviceRows = safeServices.map((s, index) => {
    const kmRemaining = num(s.nextServiceOdometer) - num(safeVehicle.currentOdometer);
    let statusText = "Aman";
    if (kmRemaining <= 0) {
      statusText = "JATUH TEMPO (Terlewat!)";
    } else if (kmRemaining <= 500) {
      statusText = "Segera Servis (<500 km)";
    }

    return {
      No: index + 1,
      "Item Servis": txt(s.title, "Servis"),
      Kategori: txt(s.category),
      "Interval (KM)": num(s.intervalKm),
      "Servis Terakhir (KM)": num(s.lastServiceOdometer),
      "Servis Berikutnya (KM)": num(s.nextServiceOdometer),
      "Odometer Saat Ini (KM)": num(safeVehicle.currentOdometer),
      "Sisa Jarak (KM)": kmRemaining,
      Status: statusText,
      Catatan: txt(s.notes),
    };
  });
  const wsService = XLSX.utils.json_to_sheet(serviceRows);
  XLSX.utils.book_append_sheet(wb, wsService, "Jadwal Servis");

  const fileName = datedFileName("DigiFuel", safeVehicle, "xlsx");
  const bytes = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return { blob, fileName, mimeType: blob.type };
}

export function exportToPDF(
  vehicle: Vehicle | null,
  records: FuelRecord[],
  services: ServiceItem[],
  monthlySummaries: MonthlySummary[],
  serviceHistory: ServiceHistoryEntry[] = []
): ExportFile {
  void monthlySummaries;
  const safeVehicle: Vehicle = vehicle ?? {
    id: "all",
    name: "Semua Kendaraan",
    type: "car",
    licensePlate: "-",
    currentOdometer: 0,
    fuelTankCapacity: 0,
    defaultFuelType: "-",
  };
  const safeRecords = Array.isArray(records) ? records : [];
  const safeServices = Array.isArray(services) ? services : [];
  const safeHistory = Array.isArray(serviceHistory) ? serviceHistory : [];

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxY = pageHeight - 15;
  let y = 16;

  const ensureSpace = (needed: number) => {
    if (y + needed > maxY) {
      doc.addPage();
      y = 20;
    }
  };

  // Header Banner
  doc.setFillColor(22, 28, 43); // Dark navy
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("DIGIFUEL - LAPORAN KENDARAAN", 14, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(190, 205, 230);
  doc.text(
    `Kendaraan: ${txt(safeVehicle.name)} (${txt(safeVehicle.licensePlate)}) | Odometer: ${num(safeVehicle.currentOdometer).toLocaleString("id-ID")} KM`,
    14,
    19
  );
  doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}`, 14, 24);

  y = 35;

  // Summary Metrics Card
  const totalSpend = safeRecords.reduce((acc, r) => acc + num(r.totalCost), 0);
  const totalServiceSpend = safeHistory.reduce((acc, h) => acc + num(h.cost), 0);
  const totalLiters = safeRecords.reduce((acc, r) => acc + num(r.liters), 0);
  const totalDist = safeRecords.reduce((acc, r) => acc + num(r.distanceTraveled), 0);
  const avgEfficiency =
    totalLiters > 0 && totalDist > 0 ? (totalDist / totalLiters).toFixed(2) : "-";

  doc.setFillColor(245, 247, 250);
  doc.roundedRect(14, y, pageWidth - 28, 24, 2, 2, "F");

  doc.setTextColor(40, 45, 60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Ringkasan Total Pengeluaran & Statistik:", 18, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Biaya BBM: Rp ${totalSpend.toLocaleString("id-ID")}`, 18, y + 13);
  doc.text(`Biaya Servis: Rp ${totalServiceSpend.toLocaleString("id-ID")}`, 18, y + 19);
  doc.text(`Total Biaya: Rp ${(totalSpend + totalServiceSpend).toLocaleString("id-ID")}`, 90, y + 13);
  doc.text(`Total BBM: ${totalLiters.toFixed(1)} L`, 90, y + 19);
  doc.text(`Total Jarak: ${totalDist.toLocaleString("id-ID")} km`, 150, y + 13);
  doc.text(`Konsumsi: ${avgEfficiency} km/L`, 150, y + 19);

  y += 32;

  // Section 1: Riwayat Pengisian Terakhir
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20, 25, 40);
  doc.text("Riwayat Pengisian Bahan Bakar Terkini", 14, y);
  y += 5;

  // Table header
  doc.setFillColor(235, 240, 248);
  doc.rect(14, y, pageWidth - 28, 6.5, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 40, 60);

  doc.text("Tanggal", 16, y + 4.5);
  doc.text("Odometer", 38, y + 4.5);
  doc.text("Jarak", 58, y + 4.5);
  doc.text("BBM", 76, y + 4.5);
  doc.text("Liter", 102, y + 4.5);
  doc.text("Biaya (Rp)", 120, y + 4.5);
  doc.text("km/L", 148, y + 4.5);
  doc.text("SPBU / Lokasi", 164, y + 4.5);

  y += 6.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(50, 55, 70);

  const shownRecords = safeRecords.slice(0, 30);
  if (shownRecords.length === 0) {
    doc.text("Belum ada catatan pengisian pada filter ini.", 16, y + 4);
    y += 5.5;
  }
  shownRecords.forEach((r, idx) => {
    ensureSpace(5.5);
    if (idx % 2 === 1) {
      doc.setFillColor(250, 251, 253);
      doc.rect(14, y, pageWidth - 28, 5.5, "F");
    }

    doc.text(dateStr(r.date), 16, y + 4);
    doc.text(`${num(r.odometer).toLocaleString("id-ID")} km`, 38, y + 4);
    doc.text(r.distanceTraveled ? `+${r.distanceTraveled} km` : "-", 58, y + 4);
    doc.text(txt(r.fuelType, "BBM").substring(0, 12), 76, y + 4);
    doc.text(`${num(r.liters)} L`, 102, y + 4);
    doc.text(`Rp ${num(r.totalCost).toLocaleString("id-ID")}`, 120, y + 4);
    doc.text(r.fuelEfficiencyKmPerL ? `${r.fuelEfficiencyKmPerL}` : "-", 148, y + 4);
    const loc = txt(r.stationName, "-").substring(0, 18);
    doc.text(loc, 164, y + 4);

    y += 5.5;
  });

  y += 7;

  // Section 2: Riwayat Servis yang Telah Dilakukan
  if (safeHistory.length > 0) {
    ensureSpace(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 25, 40);
    doc.text("Riwayat Servis yang Pernah Dilakukan", 14, y);
    y += 5;

    doc.setFillColor(235, 240, 248);
    doc.rect(14, y, pageWidth - 28, 6.5, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 40, 60);

    doc.text("Tanggal", 16, y + 4.5);
    doc.text("Item Pekerjaan Servis", 42, y + 4.5);
    doc.text("Odometer", 110, y + 4.5);
    doc.text("Bengkel", 135, y + 4.5);
    doc.text("Biaya (Rp)", 170, y + 4.5);

    y += 6.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(50, 55, 70);

    safeHistory.slice(0, 20).forEach((h, idx) => {
      ensureSpace(5.5);
      if (idx % 2 === 1) {
        doc.setFillColor(250, 251, 253);
        doc.rect(14, y, pageWidth - 28, 5.5, "F");
      }

      doc.text(dateStr(h.date), 16, y + 4);
      doc.text(txt(h.title, "Servis").substring(0, 36), 42, y + 4);
      doc.text(h.odometer !== undefined && h.odometer !== null ? `${num(h.odometer).toLocaleString("id-ID")} km` : "-", 110, y + 4);
      doc.text(txt(h.workshop).substring(0, 18), 135, y + 4);
      doc.text(h.cost ? `Rp ${num(h.cost).toLocaleString("id-ID")}` : "-", 170, y + 4);

      y += 5.5;
    });

    y += 7;
  }

  // Section 3: Jadwal Servis Berkala
  ensureSpace(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20, 25, 40);
  doc.text("Status Jadwal Servis Berkala Mendatang", 14, y);
  y += 5;

  doc.setFillColor(235, 240, 248);
  doc.rect(14, y, pageWidth - 28, 6.5, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 40, 60);

  doc.text("Item Servis", 16, y + 4.5);
  doc.text("Interval", 75, y + 4.5);
  doc.text("Terakhir Servis", 98, y + 4.5);
  doc.text("Servis Berikutnya", 130, y + 4.5);
  doc.text("Sisa Jarak / Status", 162, y + 4.5);

  y += 6.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);

  if (safeServices.length === 0) {
    doc.setTextColor(50, 55, 70);
    doc.text("Belum ada jadwal servis.", 16, y + 4);
    y += 5.5;
  }
  safeServices.forEach((s, idx) => {
    ensureSpace(5.5);
    const remaining = num(s.nextServiceOdometer) - num(safeVehicle.currentOdometer);
    if (idx % 2 === 1) {
      doc.setFillColor(250, 251, 253);
      doc.rect(14, y, pageWidth - 28, 5.5, "F");
    }

    doc.setTextColor(40, 45, 60);
    doc.text(txt(s.title, "Servis").substring(0, 32), 16, y + 4);
    doc.text(`${num(s.intervalKm).toLocaleString("id-ID")} km`, 75, y + 4);
    doc.text(`${num(s.lastServiceOdometer).toLocaleString("id-ID")} km`, 98, y + 4);
    doc.text(`${num(s.nextServiceOdometer).toLocaleString("id-ID")} km`, 130, y + 4);

    if (remaining <= 0) {
      doc.setTextColor(220, 38, 38);
      doc.text(`TERLEWAT (${remaining} km)`, 162, y + 4);
    } else if (remaining <= 500) {
      doc.setTextColor(217, 119, 6);
      doc.text(`Segera (${remaining} km)`, 162, y + 4);
    } else {
      doc.setTextColor(22, 101, 52);
      doc.text(`Aman (+${remaining} km)`, 162, y + 4);
    }

    y += 5.5;
  });

  const fileName = datedFileName("DigiFuel", safeVehicle, "pdf");
  const blob = doc.output("blob");
  return { blob, fileName, mimeType: "application/pdf" };
}
