import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase App safely (singleton)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Google Drive & Google Spreadsheets scopes for syncing application files & sheets
provider.addScope("https://www.googleapis.com/auth/drive.file");
provider.addScope("https://www.googleapis.com/auth/spreadsheets");
provider.setCustomParameters({
  prompt: "select_account",
});

export interface LocalUserRecord {
  uid: string;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  photoURL?: string;
  createdAt: string;
}

const LOCAL_USERS_KEY = "bbm_registered_users_v1";
const ACTIVE_LOCAL_USER_KEY = "bbm_active_local_user_v1";

export function getRegisteredLocalUsers(): LocalUserRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Filter out any corrupted entries (e.g. invalid emails or missing uids)
    return parsed.filter(
      (u) =>
        u &&
        typeof u.email === "string" &&
        u.email.includes("@") &&
        typeof u.uid === "string"
    );
  } catch {
    return [];
  }
}

export function saveRegisteredLocalUsers(users: LocalUserRecord[]) {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

export function getActiveLocalUser(): LocalUserRecord | null {
  try {
    const raw = localStorage.getItem(ACTIVE_LOCAL_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.email === "string" &&
      parsed.email.includes("@") &&
      parsed.uid
    ) {
      return parsed;
    }
    localStorage.removeItem(ACTIVE_LOCAL_USER_KEY);
    return null;
  } catch {
    return null;
  }
}

export function setActiveLocalUser(user: LocalUserRecord | null) {
  if (user) {
    localStorage.setItem(ACTIVE_LOCAL_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(ACTIVE_LOCAL_USER_KEY);
  }
}

const GOOGLE_TOKEN_KEY = "bbm_google_token";
const GOOGLE_TOKEN_TIME_KEY = "bbm_google_token_time";
const TOKEN_MAX_AGE_MS = 50 * 60 * 1000; // 50 minutes (Google tokens last 60 minutes)

let isSigningIn = false;
let cachedAccessToken: string | null = localStorage.getItem(GOOGLE_TOKEN_KEY);
let authListeners: Array<(user: User | null, token: string | null) => void> = [];

export function hasGoogleAccessToken(): boolean {
  const token = cachedAccessToken || localStorage.getItem(GOOGLE_TOKEN_KEY);
  if (!token) return false;
  const timeStr = localStorage.getItem(GOOGLE_TOKEN_TIME_KEY);
  if (!timeStr) return false;
  const age = Date.now() - parseInt(timeStr, 10);
  return !isNaN(age) && age < TOKEN_MAX_AGE_MS;
}

export function clearGoogleAccessToken(): void {
  cachedAccessToken = null;
  localStorage.removeItem(GOOGLE_TOKEN_KEY);
  localStorage.removeItem(GOOGLE_TOKEN_TIME_KEY);
}

function notifyAuthListeners(user: User | null, token: string | null) {
  authListeners.forEach((listener) => listener(user, token));
}

/**
 * Creates a mock Firebase-compatible User object from a LocalUserRecord
 */
function createSyntheticUser(local: LocalUserRecord): User {
  return {
    uid: local.uid,
    email: local.email,
    displayName: local.name,
    photoURL: local.photoURL || null,
    emailVerified: true,
    isAnonymous: false,
    phoneNumber: local.phone || null,
    providerData: [
      {
        uid: local.uid,
        displayName: local.name,
        email: local.email,
        phoneNumber: local.phone || null,
        photoURL: local.photoURL || null,
        providerId: "password",
      },
    ],
    metadata: {
      creationTime: local.createdAt,
      lastSignInTime: new Date().toISOString(),
    },
    refreshToken: "local_refresh_token",
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => "local_token",
    getIdTokenResult: async () => ({} as any),
    reload: async () => {},
    toJSON: () => local,
  } as unknown as User;
}

export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  const listener = (user: User | null, token: string | null) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user, token);
    } else {
      // Check if there is an active local user session
      const local = getActiveLocalUser();
      if (local) {
        const synUser = createSyntheticUser(local);
        if (onAuthSuccess) onAuthSuccess(synUser, null);
      } else {
        if (onAuthFailure) onAuthFailure();
      }
    }
  };

  authListeners.push(listener);

  // If local user is already active upon init, notify immediately
  const localInitial = getActiveLocalUser();
  if (localInitial && !auth.currentUser) {
    const synUser = createSyntheticUser(localInitial);
    if (onAuthSuccess) onAuthSuccess(synUser, null);
  }

  const unsubscribeFirebase = onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      // Clear local user if Firebase auth succeeds
      setActiveLocalUser(null);
      let token: string | null = null;
      if (hasGoogleAccessToken()) {
        token = cachedAccessToken || localStorage.getItem(GOOGLE_TOKEN_KEY);
        cachedAccessToken = token;
      } else {
        clearGoogleAccessToken();
      }
      notifyAuthListeners(user, token);
    } else {
      clearGoogleAccessToken();
      const local = getActiveLocalUser();
      if (local) {
        const synUser = createSyntheticUser(local);
        notifyAuthListeners(synUser, null);
      } else {
        notifyAuthListeners(null, null);
      }
    }
  });

  return () => {
    authListeners = authListeners.filter((l) => l !== listener);
    unsubscribeFirebase();
  };
};

/**
 * Register a new user with Name, Email, Password, and optional Phone.
 * Tries Firebase Auth first, with graceful local fallback if Email/Password provider
 * is not configured in Firebase console or encounters network/configuration issues.
 */
export const registerWithEmail = async (
  name: string,
  email: string,
  pass: string,
  phone?: string
): Promise<User> => {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();

  // Pre-validate
  if (!cleanEmail || !cleanEmail.includes("@")) {
    throw new Error("Format alamat email tidak valid.");
  }
  if (!pass || pass.length < 6) {
    throw new Error("Kata sandi minimal harus 6 karakter.");
  }

  try {
    // Attempt Firebase registration
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    if (cred.user && cleanName) {
      try {
        await updateProfile(cred.user, { displayName: cleanName });
      } catch (err) {
        console.warn("Could not update profile displayName:", err);
      }
    }

    // Also record into local registered list with password for fast reliable fallback
    const users = getRegisteredLocalUsers().filter((u) => u.email !== cleanEmail);
    users.push({
      uid: cred.user.uid,
      name: cleanName,
      email: cleanEmail,
      password: pass,
      phone: phone?.trim(),
      createdAt: new Date().toISOString(),
    });
    saveRegisteredLocalUsers(users);
    setActiveLocalUser(null);

    return cred.user;
  } catch (firebaseErr: any) {
    console.warn("Firebase email registration warning:", firebaseErr?.code, firebaseErr?.message);

    // If already in use or invalid credentials in Firebase, provide immediate feedback
    if (firebaseErr?.code === "auth/email-already-in-use") {
      throw new Error("Alamat email ini sudah terdaftar di sistem. Silakan masuk.");
    }
    if (firebaseErr?.code === "auth/weak-password") {
      throw new Error("Kata sandi terlalu lemah. Gunakan minimal 6 karakter.");
    }
    if (firebaseErr?.code === "auth/invalid-email") {
      throw new Error("Format alamat email tidak valid.");
    }

    // Fallback to local storage authentication (e.g. if Firebase Auth provider not active or network error)
    const users = getRegisteredLocalUsers();
    const existing = users.find((u) => u.email === cleanEmail);
    if (existing) {
      throw new Error("Alamat email ini sudah terdaftar. Silakan masuk.");
    }

    const newLocalUser: LocalUserRecord = {
      uid: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name: cleanName,
      email: cleanEmail,
      password: pass,
      phone: phone?.trim(),
      createdAt: new Date().toISOString(),
    };

    users.push(newLocalUser);
    saveRegisteredLocalUsers(users);
    setActiveLocalUser(newLocalUser);

    const synthetic = createSyntheticUser(newLocalUser);
    notifyAuthListeners(synthetic, null);
    return synthetic;
  }
};

/**
 * Login with Email and Password.
 * Tries Firebase Auth first, falls back to local user store.
 */
export const loginWithEmail = async (email: string, pass: string): Promise<User> => {
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanEmail || !pass) {
    throw new Error("Harap masukkan alamat email dan kata sandi Anda.");
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    setActiveLocalUser(null);

    // Keep local records up to date with this user
    const users = getRegisteredLocalUsers();
    const existing = users.find((u) => u.email === cleanEmail);
    if (existing) {
      existing.password = pass;
      existing.name = cred.user.displayName || existing.name;
    } else {
      users.push({
        uid: cred.user.uid,
        name: cred.user.displayName || cleanEmail.split("@")[0],
        email: cleanEmail,
        password: pass,
        createdAt: new Date().toISOString(),
      });
    }
    saveRegisteredLocalUsers(users);

    return cred.user;
  } catch (firebaseErr: any) {
    console.warn("Firebase email login warning:", firebaseErr?.code, firebaseErr?.message);

    // Check in local registered users
    const users = getRegisteredLocalUsers();
    const match = users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (match) {
      if (match.password && match.password !== pass) {
        throw new Error("Kata sandi yang Anda masukkan salah.");
      }
      setActiveLocalUser(match);
      const synthetic = createSyntheticUser(match);
      notifyAuthListeners(synthetic, null);
      return synthetic;
    }

    // Map common Firebase errors to helpful Indonesian messages
    if (
      firebaseErr?.code === "auth/invalid-credential" ||
      firebaseErr?.code === "auth/wrong-password"
    ) {
      throw new Error("Email atau kata sandi yang Anda masukkan salah.");
    } else if (firebaseErr?.code === "auth/user-not-found") {
      throw new Error("Akun dengan email ini tidak ditemukan. Silakan lakukan pendaftaran.");
    } else if (firebaseErr?.code === "auth/too-many-requests") {
      throw new Error("Terlalu banyak percobaan masuk gagal. Coba lagi dalam beberapa menit.");
    } else if (firebaseErr?.code === "auth/invalid-email") {
      throw new Error("Alamat email tidak valid.");
    }

    // If Firebase disallowed or network error, and no local match
    if (
      firebaseErr?.code === "auth/operation-not-allowed" ||
      firebaseErr?.code === "auth/configuration-not-found"
    ) {
      throw new Error("Akun dengan email ini belum terdaftar. Silakan pilih tab 'Pendaftaran'.");
    }

    throw new Error(firebaseErr?.message || "Gagal masuk. Periksa kembali email dan kata sandi Anda.");
  }
};

/**
 * Fast Guest / Demo Mode Login.
 * Instantly logs in locally without requiring credentials.
 */
export const loginAsGuest = (): User => {
  const users = getRegisteredLocalUsers();
  let guest = users.find((u) => u.email === "tamu@bbm.local");
  if (!guest) {
    guest = {
      uid: "usr_guest_demo",
      name: "Pengguna Tamu",
      email: "tamu@bbm.local",
      createdAt: new Date().toISOString(),
    };
    users.push(guest);
    saveRegisteredLocalUsers(users);
  }
  setActiveLocalUser(guest);
  const synUser = createSyntheticUser(guest);
  notifyAuthListeners(synUser, null);
  return synUser;
};

/**
 * Send password reset email
 */
export const sendResetPassword = async (email: string): Promise<void> => {
  const cleanEmail = email.trim().toLowerCase();
  try {
    await sendPasswordResetEmail(auth, cleanEmail);
  } catch (err: any) {
    console.warn("Firebase reset password error:", err);
    // Check if user exists locally
    const users = getRegisteredLocalUsers();
    const exists = users.some((u) => u.email === cleanEmail);
    if (!exists && err?.code === "auth/user-not-found") {
      throw new Error("Email tidak ditemukan dalam sistem.");
    }
    // For local or success simulation, don't throw blocking errors
  }
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Gagal memperoleh token akses Google");
    }

    cachedAccessToken = credential.accessToken;
    localStorage.setItem(GOOGLE_TOKEN_KEY, cachedAccessToken);
    localStorage.setItem(GOOGLE_TOKEN_TIME_KEY, Date.now().toString());
    setActiveLocalUser(null);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error("Sign in error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const requestGoogleAccessToken = async (): Promise<string> => {
  const res = await googleSignIn();
  if (!res?.accessToken) {
    throw new Error("Otorisasi akun Google dibatalkan atau tidak memberikan token akses.");
  }
  return res.accessToken;
};

export const getAccessToken = async (): Promise<string | null> => {
  if (hasGoogleAccessToken()) {
    return cachedAccessToken || localStorage.getItem(GOOGLE_TOKEN_KEY);
  }
  // Token is expired or missing
  clearGoogleAccessToken();
  return null;
};

export const logoutGoogle = async () => {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn("Firebase signout error:", e);
  }
  clearGoogleAccessToken();
  setActiveLocalUser(null);
  notifyAuthListeners(null, null);
};

export const logoutUser = logoutGoogle;

