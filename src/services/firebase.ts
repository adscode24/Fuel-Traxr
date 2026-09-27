import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Singleton Firebase app (aman untuk Web + Capacitor native)
export const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(firebaseApp);

// Persistensi auth eksplisit agar tahan restart di WebView Android/iOS.
// Capacitor tetap memakai localStorage di dalam WebView, jadi ini kompatibel native.
try {
  // Fire-and-forget: jangan blokir startup aplikasi.
  setPersistence(auth, browserLocalPersistence).catch(() => {});
} catch {
  // abaikan — Firebase tetap fallback ke default persistence
}

// Firestore dengan cache lokal persisten (offline-first).
// Di Android WebView ini memakai IndexedDB sehingga tetap bisa baca/tulis offline.
let _db: Firestore;
try {
  _db = initializeFirestore(firebaseApp, {
    localCache: persistentLocalCache({}),
  });
} catch {
  // Sudah diinisialisasi (hot-reload / double import) -> pakai instance existing
  _db = getFirestore(firebaseApp);
}
export const db = _db;

/** True jika berjalan di dalam wrapper native Capacitor (Android/iOS). */
export function isNativePlatform(): boolean {
  try {
    const w = window as unknown as {
      Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
    };
    if (w.Capacitor?.isNativePlatform) return w.Capacitor.isNativePlatform();
    if (w.Capacitor?.getPlatform) {
      const p = w.Capacitor.getPlatform();
      return p === "android" || p === "ios";
    }
  } catch {
    // abaikan
  }
  return false;
}

/**
 * UID lokal/sintetis (fallback offline) tidak punya otorisasi cloud.
 * Ciri: "usr_..." atau guest demo. Hanya UID Firebase asli yang boleh sync.
 */
export function isCloudCapableUid(uid?: string | null): boolean {
  if (!uid) return false;
  if (uid.startsWith("usr_")) return false;
  if (uid === "usr_guest_demo") return false;
  return true;
}
