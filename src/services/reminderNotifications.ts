/**
 * Notifikasi pengingat servis — mendukung SEMUA platform:
 * - Android/iOS native (Capacitor): @capacitor/local-notifications.
 * - Desktop & PWA/web: Web Notification API + Service Worker (butuh izin,
 *   tidak ada di iOS Safari PWA karena limitations browser).
 */
import { LocalNotifications } from "@capacitor/local-notifications";
import { isNativePlatform } from "./firebase";
import type { ServiceItem } from "../types";

const SETTING_KEY = "digifuel_notify_service";
const LAST_SENT_KEY = "digifuel_notify_service_last";
const CHANNEL_ID = "digifuel-service";

export function getServiceNotifyEnabled(): boolean {
  try {
    const v = localStorage.getItem(SETTING_KEY);
    return v === null ? true : v === "1";
  } catch {
    return true;
  }
}

export function setServiceNotifyEnabled(enabled: boolean) {
  try {
    localStorage.setItem(SETTING_KEY, enabled ? "1" : "0");
  } catch {
    // abaikan
  }
}

/** Web Notification API tersedia? (desktop + PWA, bukan iOS Safari PWA) */
function hasWebNotificationSupport(): boolean {
  try {
    return typeof window !== "undefined" && "Notification" in window;
  } catch {
    return false;
  }
}

/** Service Worker terdaftar? (PWA terpasang / desktop) */
async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  try {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
    const reg = await navigator.serviceWorker.getRegistration();
    return reg ?? null;
  } catch {
    return null;
  }
}

/**
 * Platform notifikasi yang aktif: "native" | "web" | "unsupported"
 */
export async function getNotificationPlatform(): Promise<"native" | "web" | "unsupported"> {
  if (isNativePlatform()) return "native";
  if (hasWebNotificationSupport()) return "web";
  return "unsupported";
}

/** Status izin notifikasi sistem: "granted" | "denied" | "prompt" | "unavailable". */
export async function getNotificationPermissionStatus(): Promise<string> {
  if (isNativePlatform()) {
    try {
      const r = await LocalNotifications.checkPermissions();
      return r.display || "prompt";
    } catch {
      return "prompt";
    }
  }
  if (hasWebNotificationSupport()) {
    try {
      return Notification.permission;
    } catch {
      return "prompt";
    }
  }
  return "unavailable";
}

/**
 * Minta izin notifikasi.
 * PENTING (web): Notification.requestPermission() WAJIB dipanggil langsung
 * di dalam user gesture (klik), tanpa await sebelumnya, jika tidak browser
 * akan menolak secara diam-diam. Karena itu fungsi ini tidak melakukan await
 * apa pun sebelum memanggil requestPermission().
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (isNativePlatform()) {
    try {
      const r = await LocalNotifications.requestPermissions();
      return r.display === "granted";
    } catch {
      return false;
    }
  }
  if (hasWebNotificationSupport()) {
    try {
      if (Notification.permission === "granted") return true;
      // Dipanggil langsung (synchronous call) agar tetap dalam user gesture.
      const result = await Notification.requestPermission();
      return result === "granted";
    } catch {
      return false;
    }
  }
  return false;
}

async function ensureChannel() {
  if (!isNativePlatform()) return;
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: "Pengingat Servis",
      description: "Pengingat jadwal servis & perawatan kendaraan DigiFuel.",
      importance: 4,
      visibility: 1,
      vibration: true,
    });
  } catch {
    // channel sudah ada / platform tidak mendukung — abaikan
  }
}

async function clearPendingServiceNotifications() {
  if (!isNativePlatform()) return;
  try {
    const pending = await LocalNotifications.getPending();
    const ids = (pending.notifications || [])
      .map((n) => n.id)
      .filter((id) => id >= 1000 && id < 2000);
    if (ids.length > 0) {
      await LocalNotifications.cancel({ notifications: ids.map((id) => ({ id })) });
    }
  } catch {
    // abaikan
  }
}

/** Tunggu SW benar-benar aktif (dibatasi waktu agar tidak menggantung). */
async function waitForActiveServiceWorker(timeoutMs = 4000): Promise<ServiceWorkerRegistration | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const reg = await getServiceWorkerRegistration();
    if (reg) {
      // SW harus punya worker aktif agar showNotification() ter-hoist
      if (reg.active) return reg;
      try {
        await navigator.serviceWorker.ready;
        return reg;
      } catch {
        return reg;
      }
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
}

/** Tampilkan notifikasi web lewat Service Worker, atau API langsung sebagai cadangan. */
async function showWebNotification(title: string, body: string): Promise<boolean> {
  const options: NotificationOptions = {
    body,
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    tag: "digifuel-service",
  } as NotificationOptions;

  // Jalur utama: Service Worker (tetap tampil walau tab tidak terbuka)
  const reg = await waitForActiveServiceWorker();
  if (reg) {
    try {
      await reg.showNotification(title, options);
      return true;
    } catch {
      // jatuh ke API langsung
    }
  }

  // Cadangan: API Notification langsung (hanya tampil saat tab fokus)
  try {
    if (typeof Notification === "undefined") return false;
    new Notification(title, options);
    return true;
  } catch {
    return false;
  }
}

/**
 * Jadwalkan ringkasan servis jatuh tempo. Anti-spam: maksimal 1x per hari
 * untuk daftar yang sama (fingerprint disimpan lokal).
 */
export async function maybeNotifyServiceDue(
  services: ServiceItem[],
  currentKm: number
): Promise<"sent" | "skipped" | "disabled" | "denied"> {
  if (!getServiceNotifyEnabled()) return "disabled";
  if (!services || services.length === 0) return "skipped";

  const platform = await getNotificationPlatform();
  if (platform === "unsupported") return "skipped";
  if (!(await ensureNotificationPermission())) return "denied";

  const overdue = services.filter((s) => s.nextServiceOdometer - currentKm <= 0);
  const near = services.filter((s) => {
    const diff = s.nextServiceOdometer - currentKm;
    return diff > 0 && diff <= 500;
  });
  if (overdue.length === 0 && near.length === 0) return "skipped";

  const fingerprint = [
    overdue.map((s) => s.id).sort().join(","),
    near.map((s) => s.id).sort().join(","),
    new Date().toISOString().slice(0, 10),
  ].join("|");
  try {
    if (localStorage.getItem(LAST_SENT_KEY) === fingerprint) return "skipped";
  } catch {
    // lanjut
  }

  const title =
    overdue.length > 0
      ? `⚠️ ${overdue.length} servis terlewat`
      : `🔧 ${near.length} servis mendekati jadwal`;
  const names = [...overdue, ...near].slice(0, 3).map((s) => s.title).join(", ");
  const body =
    overdue.length > 0
      ? `${names}${overdue.length + near.length > 3 ? ` +${overdue.length + near.length - 3} lainnya` : ""} — segera jadwalkan.`
      : `${names} — siap-siap jadwalkan servis.`;

  let ok = false;
  try {
    if (isNativePlatform()) {
      await ensureChannel();
      await clearPendingServiceNotifications();
      await LocalNotifications.schedule({
        notifications: [
          {
            id: 1001,
            title,
            body,
            schedule: { at: new Date(Date.now() + 5000) },
            smallIcon: "ic_launcher",
            channelId: CHANNEL_ID,
          },
        ],
      });
      ok = true;
    } else {
      ok = await showWebNotification(title, body);
    }
  } catch {
    ok = false;
  }

  if (ok) {
    try {
      localStorage.setItem(LAST_SENT_KEY, fingerprint);
    } catch {
      // abaikan
    }
    return "sent";
  }
  return "skipped";
}

/** Hapus semua notifikasi servis terjadwal (dipakai saat fitur dimatikan). */
export async function cancelServiceNotifications() {
  await clearPendingServiceNotifications();
}

/** Notifikasi tes: muncul ~3 detik setelah dipanggil. */
export async function sendTestNotification(): Promise<boolean> {
  const platform = await getNotificationPlatform();
  if (platform === "unsupported") return false;
  if (!(await ensureNotificationPermission())) return false;

  if (isNativePlatform()) {
    try {
      await ensureChannel();
      await LocalNotifications.schedule({
        notifications: [
          {
            id: 1999,
            title: "🔔 DigiFuel",
            body: "Notifikasi pengingat servis aktif di perangkat ini.",
            schedule: { at: new Date(Date.now() + 3000) },
            smallIcon: "ic_launcher",
            channelId: CHANNEL_ID,
          },
        ],
      });
      return true;
    } catch {
      return false;
    }
  }

  // Web: beri jeda singkat agar dialog izin sempat terlihat sebelum notifikasi
  await new Promise((r) => setTimeout(r, 600));
  return showWebNotification(
    "🔔 DigiFuel",
    "Notifikasi pengingat servis aktif di perangkat ini."
  );
}