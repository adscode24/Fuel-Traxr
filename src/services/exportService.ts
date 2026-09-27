import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import {
  Vehicle,
  FuelRecord,
  ServiceItem,
  ServiceHistoryEntry,
  MonthlySummary,
} from "../types";

export function exportToExcel(
  vehicle: Vehicle,
  records: FuelRecord[],
  services: ServiceItem[],
  monthlySummaries: MonthlySummary[],
  serviceHistory: ServiceHistoryEntry[] = []
) {
  const wb = XLSX.utils.book_new();

  // 1. Fuel Records Sheet
  const fuelRows = records.map((r, index) => ({
    No: index + 1,
    Tanggal: r.date,
    Waktu: r.time || "-",
    Kendaraan: vehicle.name,
    "Plat Nomor": vehicle.licensePlate,
    "Odometer (KM)": r.odometer,
    "Jarak Tempuh (+KM)": r.distanceTraveled ?? "-",
    "Jenis BBM": r.fuelType + (r.octaneOrGrade ? ` (${r.octaneOrGrade})` : ""),
    "Harga / Liter (Rp)": r.pricePerLiter,
    "Volume (Liter)": r.liters,
    "Total Biaya (Rp)": r.totalCost,
    "Konsumsi (km/L)": r.fuelEfficiencyKmPerL ?? "-",
    "Biaya / KM (Rp/km)": r.costPerKm ?? "-",
    "SPBU / Lokasi": `${r.stationName} - ${r.location}`,
    "Tangki Penuh": r.isFullTank ? "Ya" : "Tidak",
    Catatan: r.notes || "-",
  }));
  const wsFuel = XLSX.utils.json_to_sheet(fuelRows);
  XLSX.utils.book_append_sheet(wb, wsFuel, "Riwayat BBM");

  // 2. Monthly Summary Sheet
  const summaryRows = monthlySummaries.map((m) => ({
    Bulan: m.monthName,
    "Total Biaya (Rp)": m.totalCost,
    "Total Liter": m.totalLiters,
    "Total Jarak (KM)": m.totalDistance,
    "Jumlah Pengisian": m.fillCount,
    "Rata-rata Konsumsi (km/L)": m.avgConsumptionKmPerL || "-",
    "Rata-rata Biaya / KM (Rp)": m.avgCostPerKm || "-",
    "Rata-rata Harga / Liter (Rp)": m.avgPricePerLiter,
  }));
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan Bulanan");

  // 3. Service History Sheet
  if (serviceHistory.length > 0) {
    const historyRows = serviceHistory.map((h, index) => ({
      No: index + 1,
      Tanggal: h.date,
      "Item Servis": h.title,
      Kategori: h.category,
      "Odometer (KM)": h.odometer,
      "Biaya Servis (Rp)": h.cost ? h.cost : 0,
      "Bengkel / Tempat": h.workshop || "-",
      Catatan: h.notes || "-",
    }));
    const wsHistory = XLSX.utils.json_to_sheet(historyRows);
    XLSX.utils.book_append_sheet(wb, wsHistory, "Riwayat Servis Selesai");
  }

  // 4. Service Schedule Sheet
  const serviceRows = services.map((s, index) => {
    const kmRemaining = s.nextServiceOdometer - vehicle.currentOdometer;
    let statusText = "Aman";
    if (kmRemaining <= 0) {
      statusText = "JATUH TEMPO (Terlewat!)";
    } else if (kmRemaining <= 500) {
      statusText = "Segera Servis (<500 km)";
    }

    return {
      No: index + 1,
      "Item Servis": s.title,
      Kategori: s.category,
      "Interval (KM)": s.intervalKm,
      "Servis Terakhir (KM)": s.lastServiceOdometer,
      "Servis Berikutnya (KM)": s.nextServiceOdometer,
      "Odometer Saat Ini (KM)": vehicle.currentOdometer,
      "Sisa Jarak (KM)": kmRemaining,
      Status: statusText,
      Catatan: s.notes || "-",
    };
  });
  const wsService = XLSX.utils.json_to_sheet(serviceRows);
  XLSX.utils.book_append_sheet(wb, wsService, "Jadwal Servis");

  const fileName = `Fuel_Tracker_${vehicle.name.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function exportToPDF(
  vehicle: Vehicle,
  records: FuelRecord[],
  services: ServiceItem[],
  monthlySummaries: MonthlySummary[],
  serviceHistory: ServiceHistoryEntry[] = []
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 16;

  // Header Banner
  doc.setFillColor(22, 28, 43); // Dark navy
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("FUEL TRACKER - LAPORAN KENDARAAN", 14, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(190, 205, 230);
  doc.text(
    `Kendaraan: ${vehicle.name} (${vehicle.licensePlate}) | Odometer: ${vehicle.currentOdometer.toLocaleString("id-ID")} KM`,
    14,
    19
  );
  doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}`, 14, 24);

  y = 35;

  // Summary Metrics Card
  const totalSpend = records.reduce((acc, r) => acc + r.totalCost, 0);
  const totalServiceSpend = serviceHistory.reduce((acc, h) => acc + (h.cost || 0), 0);
  const totalLiters = records.reduce((acc, r) => acc + r.liters, 0);
  const totalDist = records.reduce((acc, r) => acc + (r.distanceTraveled || 0), 0);
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

  records.slice(0, 10).forEach((r, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(250, 251, 253);
      doc.rect(14, y, pageWidth - 28, 5.5, "F");
    }

    doc.text(r.date, 16, y + 4);
    doc.text(`${r.odometer.toLocaleString("id-ID")} km`, 38, y + 4);
    doc.text(r.distanceTraveled ? `+${r.distanceTraveled} km` : "-", 58, y + 4);
    doc.text(r.fuelType.substring(0, 12), 76, y + 4);
    doc.text(`${r.liters} L`, 102, y + 4);
    doc.text(`Rp ${r.totalCost.toLocaleString("id-ID")}`, 120, y + 4);
    doc.text(r.fuelEfficiencyKmPerL ? `${r.fuelEfficiencyKmPerL}` : "-", 148, y + 4);
    const loc = `${r.stationName}`.substring(0, 18);
    doc.text(loc, 164, y + 4);

    y += 5.5;
  });

  y += 7;

  // Section 2: Riwayat Servis yang Telah Dilakukan
  if (serviceHistory.length > 0) {
    if (y > 230) {
      doc.addPage();
      y = 20;
    }

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

    serviceHistory.slice(0, 8).forEach((h, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(250, 251, 253);
        doc.rect(14, y, pageWidth - 28, 5.5, "F");
      }

      doc.text(h.date, 16, y + 4);
      doc.text(h.title.substring(0, 36), 42, y + 4);
      doc.text(`${h.odometer.toLocaleString("id-ID")} km`, 110, y + 4);
      doc.text((h.workshop || "-").substring(0, 18), 135, y + 4);
      doc.text(h.cost ? `Rp ${h.cost.toLocaleString("id-ID")}` : "-", 170, y + 4);

      y += 5.5;
    });

    y += 7;
  }

  // Section 3: Jadwal Servis Berkala
  if (y > 230) {
    doc.addPage();
    y = 20;
  }

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

  services.forEach((s, idx) => {
    const remaining = s.nextServiceOdometer - vehicle.currentOdometer;
    if (idx % 2 === 1) {
      doc.setFillColor(250, 251, 253);
      doc.rect(14, y, pageWidth - 28, 5.5, "F");
    }

    doc.setTextColor(40, 45, 60);
    doc.text(s.title.substring(0, 32), 16, y + 4);
    doc.text(`${s.intervalKm.toLocaleString("id-ID")} km`, 75, y + 4);
    doc.text(`${s.lastServiceOdometer.toLocaleString("id-ID")} km`, 98, y + 4);
    doc.text(`${s.nextServiceOdometer.toLocaleString("id-ID")} km`, 130, y + 4);

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

  const fileName = `Fuel_Tracker_${vehicle.name.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}

