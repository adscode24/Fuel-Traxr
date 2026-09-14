import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Lazy initialize Gemini client to avoid crashes if key is initially absent
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Scan Receipt OCR endpoint using Gemini 3.8 Flash
app.post("/api/scan-receipt", async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 in request body" });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const imageMime = mimeType || "image/jpeg";

    const ai = getGeminiClient();

    const prompt = `Anda adalah asisten cerdas untuk membaca struk pengisian BBM (Bahan Bakar Minyak) SPBU seperti Pertamina, Shell, BP-AKR, Vivo, dll di Indonesia.
Analisis foto struk ini dan ekstrak data berikut secara teliti:
- date: tanggal pengisian dalam format YYYY-MM-DD. Jika tahun tidak jelas, gunakan tahun saat ini (2026).
- time: waktu pengisian dalam format HH:mm (opsional, contoh: "14:35")
- fuelType: jenis bahan bakar (contoh: "Pertalite", "Pertamax", "Pertamax Turbo", "Solar", "Dexlite", "Pertamina Dex", "Shell Super", "Shell V-Power", "BP 92", dll).
- pricePerLiter: harga per liter dalam Rupiah (angka murni tanpa titik/koma, contoh: 10000 atau 12950).
- totalLiters: total volume liter yang dibeli (angka desimal float, contoh: 27.11 atau 30.0).
- totalCost: total biaya/nominal uang yang dibayarkan dalam Rupiah (angka murni tanpa titik/koma, contoh: 271100).
- stationName: nama SPBU / kode SPBU jika tertera (contoh: "SPBU Pertamina 34.151.08", "Shell Daan Mogot", dsb).
- location: nama jalan, kecamatan, atau kota SPBU (contoh: "Kecamatan Tangerang", "Jakarta Barat", dsb).
- odometer: jika ada catatan angka odometer/KM kendaraan tertulis di struk (angka murni, atau null jika tidak ada).
- notes: catatan tambahan penting dari struk jika ada.

Jika ada angka yang kurang jelas atau struk terpotong, berikan perkiraan terbaik yang masuk akal berdasarkan rumus: totalCost = pricePerLiter * totalLiters.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [
        {
          inlineData: {
            mimeType: imageMime,
            data: cleanBase64,
          },
        },
        { text: prompt },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING, description: "Format YYYY-MM-DD" },
            time: { type: Type.STRING, description: "Format HH:mm" },
            fuelType: { type: Type.STRING, description: "Jenis BBM" },
            pricePerLiter: { type: Type.NUMBER, description: "Harga per liter dalam Rupiah" },
            totalLiters: { type: Type.NUMBER, description: "Volume liter" },
            totalCost: { type: Type.NUMBER, description: "Total pengeluaran dalam Rupiah" },
            stationName: { type: Type.STRING, description: "Nama SPBU" },
            location: { type: Type.STRING, description: "Lokasi SPBU" },
            odometer: { type: Type.NUMBER, description: "Odometer KM jika ada" },
            notes: { type: Type.STRING, description: "Catatan struk" },
          },
          required: ["date", "fuelType", "pricePerLiter", "totalLiters", "totalCost"],
        },
      },
    });

    const responseText = response.text?.trim() || "{}";
    const parsedData = JSON.parse(responseText);

    return res.json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    console.error("Error scanning receipt with Gemini:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Gagal memproses gambar struk dengan Gemini AI",
    });
  }
});

// Vite middleware & Static Serving setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
