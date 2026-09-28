/**
 * Scan struk SPBU via Gemini AI (opsi A — key milik pengguna).
 * Alur: foto/upload struk -> kompres di perangkat -> kirim ke Gemini REST API
 * langsung dari perangkat -> terima JSON terstruktur -> isi form catatan BBM.
 * Key disimpan lokal di perangkat (localStorage), tidak dikirim ke mana pun
 * selain API Google.
 */

const STORAGE_KEY = "digifuel_gemini_api_key";
const GEMINI_MODEL = "gemini-2.0-flash";

export function getGeminiApiKey(): string {
  try {
    return (localStorage.getItem(STORAGE_KEY) || "").trim();
  } catch {
    return "";
  }
}

export function setGeminiApiKey(key: string) {
  try {
    localStorage.setItem(STORAGE_KEY, (key || "").trim());
  } catch {
    // abaikan
  }
}

export function clearGeminiApiKey() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // abaikan
  }
}

export interface ReceiptScanData {
  brand?: string | null;
  stationCode?: string | null;
  stationPlace?: string | null;
  stationName?: string | null;
  fuelProduct?: string | null;
  liters?: number | null;
  pricePerLiter?: number | null;
  totalCost?: number | null;
  date?: string | null; // DD/MM/YYYY
  time?: string | null; // HH:MM (24 jam)
  city?: string | null;
  transactionNo?: string | null;
  pumpNo?: string | null;
  operatorName?: string | null;
  plateNumber?: string | null;
  paymentMethod?: string | null;
  cashPaid?: number | null;
  changeAmount?: number | null;
}

export interface MappedReceipt {
  stationName: string;
  fuelType: string;
  octaneOrGrade: string;
  liters: string; // format tampilan Indonesia (koma desimal)
  pricePerLiter: string;
  totalCost: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  location: string;
  notes: string;
  warnings: string[];
}

const SCAN_PROMPT = `Kamu membaca foto struk pengisian BBM SPBU Indonesia (Pertamina, Shell, BP, Vivo, dll).
Ekstrak data berikut dan jawab HANYA dengan satu objek JSON valid, tanpa markdown, tanpa penjelasan.

Aturan:
- Angka polos tanpa pemisah ribuan; desimal pakai titik (contoh: 37.12).
- "liters": volume BBM dalam liter dari baris Volume/Jumlah liter.
- "pricePerLiter": harga jual per liter yang DIBAYAR konsumen (baris Harga Jual), bukan harga non-subsidi.
- "totalCost": total yang dibayar konsumen (baris Dibayar Konsumen / Total).
- "date": format DD/MM/YYYY. "time": format HH:MM 24 jam.
- "brand": salah satu dari "pertamina", "shell", "bp", "vivo", "lainnya" (huruf kecil).
- "stationCode": kode angka SPBU bila ada (contoh: "3415108"), selain itu null.
- "stationPlace": nama lokasi SPBU bila ada (contoh: "Tanah Tinggi"), selain itu null.
- "stationName": nama SPBU persis seperti tertulis di struk.
- "fuelProduct": jenis BBM persis seperti tertulis (contoh: "PERTALITE").
- Field yang tidak terbaca jelas diisi null.

Skema JSON:
{"brand":null,"stationCode":null,"stationPlace":null,"stationName":null,"fuelProduct":null,"liters":null,"pricePerLiter":null,"totalCost":null,"date":null,"time":null,"city":null,"transactionNo":null,"pumpNo":null,"operatorName":null,"plateNumber":null,"paymentMethod":null,"cashPaid":null,"changeAmount":null}`;

function toDisplayNumber(n: number): string {
  return String(Math.round(n));
}

function toDisplayDecimal(n: number): string {
  // Format Indonesia: koma sebagai desimal, tanpa nol ekor berlebih
  const s = String(Math.round(n * 100) / 100);
  return s.replace(".", ",");
}

function toIsoDate(dmy: string | null | undefined): string {
  if (!dmy) return "";
  const m = dmy.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (!m) return "";
  let [, d, mo, y] = m;
  if (y.length === 2) y = "20" + y;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function toTimeHM(t: string | null | undefined): string {
  if (!t) return "";
  const m = t.match(/(\d{1,2})[:.](\d{2})/);
  if (!m) return "";
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/(\s+)/)
    .map((w) => (w.trim() ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join("");
}

const BRAND_LABEL: Record<string, string> = {
  pertamina: "Pertamina",
  shell: "Shell",
  bp: "BP",
  vivo: "Vivo",
};

/** Normalisasi nama SPBU ke format aplikasi, mis. "SPBU Pertamina 34.151.08 Tanah Tinggi". */
export function normalizeStationName(data: ReceiptScanData): string {
  const brandKey = (data.brand || "").toLowerCase();
  const brandLabel = BRAND_LABEL[brandKey] || (data.brand ? titleCase(data.brand) : "");
  const digits = (data.stationCode || "").replace(/\D/g, "");
  let codePart = "";
  if (brandKey === "pertamina" && digits.length === 7) {
    codePart = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  } else if (digits) {
    codePart = digits;
  }
  const place = data.stationPlace ? titleCase(data.stationPlace) : "";
  const parts = ["SPBU", brandLabel, codePart, place].filter(Boolean);
  const normalized = parts.join(" ").replace(/\s+/g, " ").trim();
  if (normalized.length > 4) return normalized;
  // Fallback: nama persis dari struk
  return (data.stationName || "").trim();
}

interface FuelMap {
  fuelType: string;
  octaneOrGrade: string;
}

/** Mapping nama produk SPBU -> Jenis BBM + okta/grade aplikasi. Urutan penting (spesifik dulu). */
const PRODUCT_MAP: { match: string[]; fuelType: string; octaneOrGrade: string }[] = [
  { match: ["pertamax turbo"], fuelType: "Pertamax Turbo (98)", octaneOrGrade: "98" },
  { match: ["pertamax green", "green 95"], fuelType: "Pertamax Green (95)", octaneOrGrade: "95" },
  { match: ["pertamax"], fuelType: "Pertamax (92)", octaneOrGrade: "92" },
  { match: ["pertalite"], fuelType: "Pertalite (90)", octaneOrGrade: "90" },
  { match: ["premium"], fuelType: "Premium (88)", octaneOrGrade: "88" },
  { match: ["pertamina dex"], fuelType: "Pertamina Dex", octaneOrGrade: "CN53" },
  { match: ["dexlite"], fuelType: "Dexlite", octaneOrGrade: "CN51" },
  { match: ["biosolar", "solar"], fuelType: "Biosolar", octaneOrGrade: "CN48" },
  { match: ["v-power nitro", "nitro+"], fuelType: "Shell V-Power Nitro+", octaneOrGrade: "98" },
  { match: ["v-power diesel"], fuelType: "Shell V-Power Diesel", octaneOrGrade: "Diesel" },
  { match: ["v-power", "vpower"], fuelType: "Shell V-Power (95)", octaneOrGrade: "95" },
  { match: ["shell super", "super"], fuelType: "Shell Super (92)", octaneOrGrade: "92" },
  { match: ["bp ultimate", "ultimate"], fuelType: "BP Ultimate", octaneOrGrade: "" },
  { match: ["bp 92", "bensin bp"], fuelType: "BP 92", octaneOrGrade: "92" },
  { match: ["revvo 95"], fuelType: "Vivo Revvo 95", octaneOrGrade: "95" },
  { match: ["revvo 92"], fuelType: "Vivo Revvo 92", octaneOrGrade: "92" },
  { match: ["revvo 90"], fuelType: "Vivo Revvo 90", octaneOrGrade: "90" },
];

export function mapFuelProduct(product: string | null | undefined): FuelMap {
  const p = (product || "").toLowerCase().trim();
  if (!p) return { fuelType: "", octaneOrGrade: "" };
  for (const entry of PRODUCT_MAP) {
    if (entry.match.some((m) => p.includes(m))) {
      return { fuelType: entry.fuelType, octaneOrGrade: entry.octaneOrGrade };
    }
  }
  return { fuelType: product!.trim(), octaneOrGrade: "" };
}

/**
 * Kompres foto struk di perangkat (max 1600px, JPEG 0.85) agar hemat kuota & cepat.
 * Mengembalikan { base64 (tanpa prefix), mime }.
 */
export function compressReceiptImage(dataUrl: string): Promise<{ base64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const MAX_DIM = 1600;
        let { width, height } = img;
        const scale = Math.min(1, MAX_DIM / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas tidak didukung di perangkat ini.");
        ctx.drawImage(img, 0, 0, width, height);
        const out = canvas.toDataURL("image/jpeg", 0.85);
        const base64 = out.split(",")[1] || "";
        if (!base64) throw new Error("Gagal memproses gambar.");
        resolve({ base64, mime: "image/jpeg" });
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error("File gambar tidak dapat dibaca."));
    img.src = dataUrl;
  });
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Gagal membaca file."));
    reader.readAsDataURL(file);
  });
}

function extractJson(text: string): ReceiptScanData {
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Respons AI tidak dikenali. Coba foto ulang dengan struk yang jelas.");
  }
  return JSON.parse(cleaned.slice(start, end + 1)) as ReceiptScanData;
}

function mapScanError(status: number, bodyText: string): string {
  if (status === 400 && /api key|api_key|key/i.test(bodyText)) {
    return "API key Gemini tidak valid. Periksa kembali key di Pengaturan.";
  }
  if (status === 403) {
    return "Akses Gemini ditolak. Pastikan API key aktif dan billing/kuota mencukupi.";
  }
  if (status === 429) {
    return "Kuota Gemini habis sementara. Tunggu beberapa menit lalu coba lagi.";
  }
  if (status === 404) {
    return "Model Gemini tidak tersedia. Coba lagi nanti.";
  }
  return `Gagal memindai struk (${status || "jaringan"}). Periksa koneksi internet lalu coba lagi.`;
}

/** Kirim gambar ke Gemini dan kembalikan data terstruktur. */
export async function scanReceiptImage(
  imageBase64: string,
  mimeType: string,
  apiKey: string
): Promise<ReceiptScanData> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
              { text: SCAN_PROMPT },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
          maxOutputTokens: 1024,
        },
      }),
    });
  } catch {
    throw new Error("Tidak dapat menghubungi Gemini. Periksa koneksi internet lalu coba lagi.");
  }
  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(mapScanError(res.status, bodyText));
  }
  const json = await res.json().catch(() => null);
  const text: string | undefined =
    json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || undefined;
  if (!text) {
    throw new Error("Gemini tidak mengembalikan hasil. Coba foto ulang dengan struk yang jelas.");
  }
  return extractJson(text);
}

/** Ubah hasil scan menjadi nilai form + peringatan validasi. */
export function mapScanToForm(data: ReceiptScanData): MappedReceipt {
  const warnings: string[] = [];
  const fuel = mapFuelProduct(data.fuelProduct);
  if (data.fuelProduct && !fuel.octaneOrGrade && !/bp ultimate/i.test(data.fuelProduct)) {
    warnings.push(`Produk "${data.fuelProduct}" tidak dikenal — periksa Jenis BBM.`);
  }

  const liters = typeof data.liters === "number" && data.liters > 0 ? data.liters : 0;
  const price =
    typeof data.pricePerLiter === "number" && data.pricePerLiter > 0 ? data.pricePerLiter : 0;
  const total = typeof data.totalCost === "number" && data.totalCost > 0 ? data.totalCost : 0;

  if (liters && price && total) {
    const expected = liters * price;
    const diff = Math.abs(expected - total) / total;
    if (diff > 0.02) {
      warnings.push("Angka struk tidak konsisten (volume × harga ≠ total) — periksa kembali.");
    }
  } else {
    warnings.push("Sebagian angka tidak terbaca — lengkapi manual yang kosong.");
  }

  const noteParts: string[] = [];
  if (data.transactionNo) noteParts.push(`No. Trans: ${data.transactionNo}`);
  if (data.pumpNo) noteParts.push(`Pompa: ${data.pumpNo}`);
  if (data.operatorName) noteParts.push(`Operator: ${data.operatorName}`);
  if (data.plateNumber) noteParts.push(`Plat: ${data.plateNumber}`);
  if (data.paymentMethod) {
    let pay = data.paymentMethod;
    if (typeof data.cashPaid === "number" && data.cashPaid > 0) {
      pay += ` ${Math.round(data.cashPaid).toLocaleString("id-ID")}`;
    }
    if (typeof data.changeAmount === "number" && data.changeAmount !== 0) {
      pay += ` (kembali ${Math.round(Math.abs(data.changeAmount)).toLocaleString("id-ID")})`;
    }
    noteParts.push(pay);
  }

  const location = [data.city].filter(Boolean).join(", ");

  return {
    stationName: normalizeStationName(data),
    fuelType: fuel.fuelType,
    octaneOrGrade: fuel.octaneOrGrade,
    liters: liters ? toDisplayDecimal(liters) : "",
    pricePerLiter: price ? toDisplayNumber(price) : "",
    totalCost: total ? toDisplayNumber(total) : "",
    date: toIsoDate(data.date),
    time: toTimeHM(data.time),
    location,
    notes: noteParts.join(" • "),
    warnings,
  };
}
