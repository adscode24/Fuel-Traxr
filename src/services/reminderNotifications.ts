/**
 * Notifikasi pengingat servis native (Android/iOS via @capacitor/local-notifications).
 * Web/PWA: no-op aman (tidak ada notifikasi sistem, banner dalam aplikasi tetap jalan).
 */
import { LocalNotifications } from "@capacitor/local-notifications";
import { isNativePlatform } from "./firebase";
import type { ServiceItem } from "../types";

const SETTING_KEY = "digifuel_notify_service";
const LAST_SENT_KEY = "digifuel_notify_service_last";

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

/** Status izin notifikasi sistem: "granted" | "denied" | "prompt" | "unavailable". */
export async function getNotificationPermissionStatus(): Promise<string> {
  if (!isNativePlatform()) return "unavailable";
  try {
    const r = await LocalNotifications.checkPermissions();
    return r.display || "prompt";
  } catch {
    return "prompt";
  }
}

/** Minta izin notifikasi ke sistem (memunculkan dialog Android). */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    const r = await LocalNotifications.requestPermissions();
    return r.display === "granted";
  } catch {
    return false;
  }
}

const CHANNEL_ID = "digifuel-service";

async function ensureChannel() {
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

async function clearPendingServiceNotifications() {  try {
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

/**
 * Jadwalkan ringkasan servis jatuh tempo. Anti-spam: maksimal 1x per hari
 * untuk daftar yang sama (fingerprint disimpan lokal).
 */
export async function maybeNotifyServiceDue(
  services: ServiceItem[],
  currentKm: number
): Promise<"sent" | "skipped" | "disabled" | "denied"> {
  if (!getServiceNotifyEnabled()) return "disabled";
  if (!isNativePlatform()) return "skipped";
  if (!services || services.length === 0) return "skipped";

  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") return "denied";
  } catch {
    return "denied";
  }

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

  try {
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
    try {
      localStorage.setItem(LAST_SENT_KEY, fingerprint);
    } catch {
      // abaikan
    }
    return "sent";
  } catch {
    return "skipped";
  }
}

/** Hapus semua notifikasi servis terjadwal (dipakai saat fitur dimatikan). */
export async function cancelServiceNotifications() {
  await clearPendingServiceNotifications();
}

/** Notifikasi tes: muncul ~3 detik setelah dipanggil. */
export async function sendTestNotification(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  const ok = await ensureNotificationPermission();
  if (!ok) return false;
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
