import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import type {
  Vehicle,
  FuelRecord,
  ServiceItem,
  ServiceHistoryEntry,
} from "../types";
import { db } from "./firebase";

export const VAULT_COLLECTION = "fuelVaults";
export const VAULT_VERSIONS_COLLECTION = "fuelVaultVersions";
export const VAULT_SCHEMA_VERSION = 2;
export const MAX_VAULT_VERSIONS = 20; // 20 versi terakhir per akun

export interface VaultVersionMeta {
  id: string;
  /** updatedAt dari vault saat snapshot diambil ( kapan datanya dibuat) */
  createdAt: string;
  /** kapan snapshot ini disimpan (kapan ditimpa) */
  snapshotAt: string;
  vehicles: number;
  fuelRecords: number;
  services: number;
  serviceHistory: number;
}

export interface VaultPayload {
  vehicles: Vehicle[];
  fuelRecords: FuelRecord[];
  services: ServiceItem[];
  serviceHistory: ServiceHistoryEntry[];
}

export interface CloudVault extends VaultPayload {
  ownerEmail: string | null;
  displayName: string | null;
  vaultCode: string;
  updatedAt: string; // ISO string
  schemaVersion: number;
}

export type CloudSyncErrorCode =
  | "permission-denied"
  | "unavailable"
  | "not-enabled"
  | "unknown";

export class CloudSyncError extends Error {
  code: CloudSyncErrorCode;
  constructor(message: string, code: CloudSyncErrorCode = "unknown") {
    super(message);
    this.code = code;
  }
}

const VAULT_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // tanpa I,O,0,1 agar mudah dibaca

/**
 * Firestore MENOLAK nilai `undefined` (melempar "Unsupported field value").
 * Objek aplikasi (kendaraan, catatan BBM, servis) punya banyak field opsional
 * yang sering `undefined` (mis. `image`, `notes`, `octaneOrGrade`, `odometer`).
 * Klon JSON menghilangkan semua key undefined secara rekursif sehingga
 * setiap push vault dijamin tidak pernah crash karena ini.
 */
function sanitizeForFirestore<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value ?? null)) as T;
  } catch {
    return value;
  }
}

/** Kode Vault Cloud, mis. "DF-7KQ2XA". Unik per akun, dibuat sekali lalu permanen. */
export function generateVaultCode(): string {
  let suffix = "";
  try {
    const buf = new Uint32Array(6);
    crypto.getRandomValues(buf);
    for (let i = 0; i < 6; i++) {
      suffix += VAULT_CODE_ALPHABET[buf[i] % VAULT_CODE_ALPHABET.length];
    }
  } catch {
    for (let i = 0; i < 6; i++) {
      suffix += VAULT_CODE_ALPHABET[Math.floor(Math.random() * VAULT_CODE_ALPHABET.length)];
    }
  }
  return `DF-${suffix}`;
}

function vaultDocRef(uid: string) {
  return doc(db, VAULT_COLLECTION, uid);
}

function toFriendlyError(err: unknown): CloudSyncError {
  const code = (err as { code?: string })?.code || "";
  const message = (err as Error)?.message || String(err);
  if (code === "permission-denied") {
    return new CloudSyncError(
      "Akses cloud ditolak. Periksa Firestore Rules (izinkan read/write untuk pemilik uid). Lihat FIRESTORE_SETUP.md.",
      "permission-denied"
    );
  }
  if (code === "unavailable" || /offline|network|unavailable|failed to get document/i.test(message)) {
    return new CloudSyncError(
      "Cloud tidak terjangkau (offline). Data tersimpan lokal dan akan tersinkron otomatis saat online.",
      "unavailable"
    );
  }
  if (code === "failed-precondition" || /database .* does not exist|not been created/i.test(message)) {
    return new CloudSyncError(
      "Database Firestore belum dibuat di Firebase Console. Lihat FIRESTORE_SETUP.md untuk mengaktifkannya.",
      "not-enabled"
    );
  }
  return new CloudSyncError(message || "Gagal sinkronisasi cloud.", "unknown");
}

/**
 * Pastikan dokumen vault milik user ada. Jika belum ada, buat dengan
 * vaultCode baru + data lokal awal (agar HP pertama langsung naik ke cloud).
 */
export async function ensureUserVault(
  user: User,
  initialLocal?: VaultPayload
): Promise<CloudVault> {
  try {
    const ref = vaultDocRef(user.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data() as Partial<CloudVault>;
      // Lengkapi vaultCode lama yang belum punya
      if (!data.vaultCode) {
        const vaultCode = generateVaultCode();
        await setDoc(
          ref,
          {
            vaultCode,
            ownerEmail: user.email ?? data.ownerEmail ?? null,
            displayName: user.displayName ?? data.displayName ?? null,
            schemaVersion: VAULT_SCHEMA_VERSION,
          },
          { merge: true }
        );
        return {
          vehicles: (data.vehicles as Vehicle[]) ?? [],
          fuelRecords: (data.fuelRecords as FuelRecord[]) ?? [],
          services: (data.services as ServiceItem[]) ?? [],
          serviceHistory: (data.serviceHistory as ServiceHistoryEntry[]) ?? [],
          ownerEmail: user.email ?? null,
          displayName: user.displayName ?? null,
          vaultCode,
          updatedAt: (data.updatedAt as string) ?? new Date().toISOString(),
          schemaVersion: VAULT_SCHEMA_VERSION,
        };
      }
      return {
        vehicles: (data.vehicles as Vehicle[]) ?? [],
        fuelRecords: (data.fuelRecords as FuelRecord[]) ?? [],
        services: (data.services as ServiceItem[]) ?? [],
        serviceHistory: (data.serviceHistory as ServiceHistoryEntry[]) ?? [],
        ownerEmail: (data.ownerEmail as string | null) ?? user.email ?? null,
        displayName: (data.displayName as string | null) ?? user.displayName ?? null,
        vaultCode: data.vaultCode as string,
        updatedAt: (data.updatedAt as string) ?? new Date().toISOString(),
        schemaVersion: VAULT_SCHEMA_VERSION,
      };
    }
    // Belum ada -> buat baru, bawa data lokal HP pertama jika ada
    const vaultCode = generateVaultCode();
    const fresh: CloudVault = {
      vehicles: sanitizeForFirestore(initialLocal?.vehicles ?? []),
      fuelRecords: sanitizeForFirestore(initialLocal?.fuelRecords ?? []),
      services: sanitizeForFirestore(initialLocal?.services ?? []),
      serviceHistory: sanitizeForFirestore(initialLocal?.serviceHistory ?? []),
      ownerEmail: user.email ?? null,
      displayName: user.displayName ?? null,
      vaultCode,
      updatedAt: new Date().toISOString(),
      schemaVersion: VAULT_SCHEMA_VERSION,
    };
    await setDoc(ref, fresh);
    return fresh;
  } catch (err) {
    throw toFriendlyError(err);
  }
}

function countsOf(v: VaultPayload) {
  return {
    vehicles: v.vehicles.length,
    fuelRecords: v.fuelRecords.length,
    services: v.services.length,
    serviceHistory: v.serviceHistory.length,
  };
}

/**
 * Simpan snapshot vault saat ini ke koleksi versi SEBELUM ditimpa.
 * Ini yang membuat data lama bisa dipulihkan (kebalikan dari "ketimpa permanen").
 */
async function snapshotCurrentVault(user: User): Promise<void> {
  try {
    const snap = await getDoc(vaultDocRef(user.uid));
    if (!snap.exists()) return; // belum ada data -> tidak ada yang perlu disimpan
    const data = snap.data() as Partial<CloudVault>;
    const payload: VaultPayload = {
      vehicles: (data.vehicles as Vehicle[]) ?? [],
      fuelRecords: (data.fuelRecords as FuelRecord[]) ?? [],
      services: (data.services as ServiceItem[]) ?? [],
      serviceHistory: (data.serviceHistory as ServiceHistoryEntry[]) ?? [],
    };
    // Jangan snapshot vault kosong (mis. sebelum data pertama masuk).
    const c = countsOf(payload);
    if (c.vehicles + c.fuelRecords + c.serviceHistory === 0) return;

    await addDoc(collection(db, VAULT_VERSIONS_COLLECTION), {
      uid: user.uid,
      createdAt: data.updatedAt || new Date().toISOString(),
      snapshotAt: new Date().toISOString(),
      vault: sanitizeForFirestore(payload),
      ...c,
    });

    // Bersihkan versi lama agar tidak membengkak
    const old = await getDocs(
      query(
        collection(db, VAULT_VERSIONS_COLLECTION),
        where("uid", "==", user.uid),
        orderBy("snapshotAt", "desc")
      )
    );
    const docs = old.docs;
    const toRemove = docs.slice(MAX_VAULT_VERSIONS);
    await Promise.all(toRemove.map((d) => deleteDoc(d.ref).catch(() => undefined)));
  } catch (err) {
    // Riwayat versi tidak boleh menggagalkan upload utama.
    console.warn("Gagal menyimpan riwayat versi:", err);
  }
}

/** Daftar versi vault tersimpan (terbaru dulu). */
export async function listVaultVersions(user: User): Promise<VaultVersionMeta[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, VAULT_VERSIONS_COLLECTION),
        where("uid", "==", user.uid),
        orderBy("snapshotAt", "desc"),
        limit(MAX_VAULT_VERSIONS)
      )
    );
    return snap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        createdAt: (data.createdAt as string) || (data.snapshotAt as string) || "",
        snapshotAt: (data.snapshotAt as string) || "",
        vehicles: Number(data.vehicles) || 0,
        fuelRecords: Number(data.fuelRecords) || 0,
        services: Number(data.services) || 0,
        serviceHistory: Number(data.serviceHistory) || 0,
      };
    });
  } catch (err) {
    throw toFriendlyError(err);
  }
}

/** Ambil isi penuh satu versi (untuk dipulihkan ke perangkat). */
export async function getVaultVersion(user: User, versionId: string): Promise<VaultPayload | null> {
  try {
    const snap = await getDoc(doc(db, VAULT_VERSIONS_COLLECTION, versionId));
    if (!snap.exists()) return null;
    const data = snap.data() as { vault?: VaultPayload };
    return data.vault ?? null;
  } catch (err) {
    throw toFriendlyError(err);
  }
}

/** Dorong seluruh state lokal ke cloud (menyimpan versi lama lebih dulu). */
export async function pushVault(
  user: User,
  vaultCode: string,
  payload: VaultPayload
): Promise<string> {
  try {
    await snapshotCurrentVault(user);
    const updatedAt = new Date().toISOString();
    await setDoc(
      vaultDocRef(user.uid),
      {
        vehicles: sanitizeForFirestore(payload.vehicles),
        fuelRecords: sanitizeForFirestore(payload.fuelRecords),
        services: sanitizeForFirestore(payload.services),
        serviceHistory: sanitizeForFirestore(payload.serviceHistory),
        ownerEmail: user.email ?? null,
        displayName: user.displayName ?? null,
        vaultCode,
        updatedAt,
        schemaVersion: VAULT_SCHEMA_VERSION,
      },
      { merge: true }
    );
    return updatedAt;
  } catch (err) {
    throw toFriendlyError(err);
  }
}

/** Ambil vault sekali dari cloud (untuk tombol Download dari Cloud). */
export async function pullVault(user: User): Promise<CloudVault | null> {
  try {
    const snap = await getDoc(vaultDocRef(user.uid));
    if (!snap.exists()) return null;
    const data = snap.data() as Partial<CloudVault>;
    return {
      vehicles: (data.vehicles as Vehicle[]) ?? [],
      fuelRecords: (data.fuelRecords as FuelRecord[]) ?? [],
      services: (data.services as ServiceItem[]) ?? [],
      serviceHistory: (data.serviceHistory as ServiceHistoryEntry[]) ?? [],
      ownerEmail: (data.ownerEmail as string | null) ?? user.email ?? null,
      displayName: (data.displayName as string | null) ?? user.displayName ?? null,
      vaultCode: (data.vaultCode as string) ?? "",
      updatedAt: (data.updatedAt as string) ?? new Date().toISOString(),
      schemaVersion: (data.schemaVersion as number) ?? VAULT_SCHEMA_VERSION,
    };
  } catch (err) {
    throw toFriendlyError(err);
  }
}

/**
 * Listener realtime lintas perangkat. Perubahannya hanya memberi TANDA
 * "ada data lebih baru di cloud" — tidak menimpa data lokal sendiri.
 * Pengambilan data hanya terjadi lewat tombol Download dari Cloud.
 */
export function subscribeVault(
  user: User,
  onData: (vault: CloudVault | null) => void,
  onError: (err: CloudSyncError) => void
): () => void {
  try {
    return onSnapshot(
      vaultDocRef(user.uid),
      (snap) => {
        try {
          if (!snap.exists()) {
            onData(null);
            return;
          }
          const data = snap.data() as Partial<CloudVault>;
          onData({
            vehicles: (data.vehicles as Vehicle[]) ?? [],
            fuelRecords: (data.fuelRecords as FuelRecord[]) ?? [],
            services: (data.services as ServiceItem[]) ?? [],
            serviceHistory: (data.serviceHistory as ServiceHistoryEntry[]) ?? [],
            ownerEmail: (data.ownerEmail as string | null) ?? user.email ?? null,
            displayName: (data.displayName as string | null) ?? user.displayName ?? null,
            vaultCode: (data.vaultCode as string) ?? "",
            updatedAt: (data.updatedAt as string) ?? new Date(0).toISOString(),
            schemaVersion: (data.schemaVersion as number) ?? VAULT_SCHEMA_VERSION,
          });
        } catch (err) {
          onError(toFriendlyError(err));
        }
      },
      (err) => onError(toFriendlyError(err))
    );
  } catch (err) {
    onError(toFriendlyError(err));
    return () => {};
  }
}
