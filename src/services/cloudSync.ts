import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import type { User } from "firebase/auth";
import type {
  Vehicle,
  FuelRecord,
  ServiceItem,
  ServiceHistoryEntry,
} from "../types";
import { db } from "./firebase";

export const VAULT_COLLECTION = "fuelVaults";
export const VAULT_SCHEMA_VERSION = 2;

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
      vehicles: initialLocal?.vehicles ?? [],
      fuelRecords: initialLocal?.fuelRecords ?? [],
      services: initialLocal?.services ?? [],
      serviceHistory: initialLocal?.serviceHistory ?? [],
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

/** Dorong seluruh state lokal ke cloud (last-write-wins per vault). */
export async function pushVault(
  user: User,
  vaultCode: string,
  payload: VaultPayload
): Promise<string> {
  try {
    const updatedAt = new Date().toISOString();
    await setDoc(
      vaultDocRef(user.uid),
      {
        vehicles: payload.vehicles,
        fuelRecords: payload.fuelRecords,
        services: payload.services,
        serviceHistory: payload.serviceHistory,
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

/**
 * Listener realtime lintas perangkat. Setiap edit dari HP/laptop lain
 * langsung memicu onData di perangkat ini.
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
