import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { isNativePlatform } from "./firebase";
import type { ExportFile } from "./exportService";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Gagal membaca berkas."));
    reader.readAsDataURL(blob);
  });
}

/**
 * Menyimpan + membagikan berkas di aplikasi native Android/iOS.
 * Anchor download blob tidak berfungsi di WebView native, jadi berkas
 * ditulis ke cache lalu dibuka lewat dialog Share sistem.
 * Mengembalikan true jika berhasil ditangani secara native.
 */
async function shareNativeFile(file: ExportFile): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    const base64 = await blobToBase64(file.blob);
    const saved = await Filesystem.writeFile({
      path: file.fileName,
      data: base64,
      directory: Directory.Cache,
    });
    try {
      await Share.share({
        title: file.fileName,
        text: `Dokumen DigiFuel: ${file.fileName}`,
        url: saved.uri,
        dialogTitle: "Bagikan / Simpan Dokumen",
      });
    } catch {
      // Pengguna menutup dialog share — berkas tetap tersimpan di cache.
    }
    return true;
  } catch {
    return false;
  }
}

function downloadViaBrowser(file: ExportFile): void {
  const url = URL.createObjectURL(file.blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = file.fileName;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

/**
 * Unduh/ bagikan berkas ekspor (Excel/PDF) yang bekerja di semua platform:
 * - Android native (Capacitor): tulis ke cache + dialog Share sistem.
 * - Web / PWA / mobile browser: unduhan browser biasa (+ Web Share bila tersedia).
 */
export async function downloadExportFile(file: ExportFile): Promise<"shared" | "downloaded"> {
  if (await shareNativeFile(file)) return "shared";

  // Mobile browser: coba Web Share dengan file terlebih dahulu agar bisa disimpan ke HP
  try {
    const nav = navigator as Navigator & {
      canShare?: (data: { files: File[] }) => boolean;
      share?: (data: { files: File[]; title?: string }) => Promise<void>;
    };
    if (isNativePlatform() && typeof nav.canShare === "function" && typeof nav.share === "function") {
      const f = new File([file.blob], file.fileName, { type: file.mimeType });
      if (nav.canShare({ files: [f] })) {
        await nav.share({ files: [f], title: file.fileName });
        return "shared";
      }
    }
  } catch {
    // Pengguna membatalkan share / tidak didukung -> lanjut ke unduhan browser
  }

  downloadViaBrowser(file);
  return "downloaded";
}
