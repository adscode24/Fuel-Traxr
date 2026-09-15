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
    return raw ? JSON.parse(raw) : [];
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
    return raw ? JSON.parse(raw) : null;
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

let isSigningIn = false;
let cachedAccessToken: string | null = localStorage.getItem("bbm_google_token");
let authListeners: Array<(user: User | null, token: string | null) => void> = [];

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
      const token = cachedAccessToken || localStorage.getItem("bbm_google_token");
      if (token) {
        cachedAccessToken = token;
      }
      notifyAuthListeners(user, token);
    } else {
      cachedAccessToken = null;
      localStorage.removeItem("bbm_google_token");
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
 * is not configured in Firebase console.
 */
export const registerWithEmail = async (
  name: string,
  email: string,
  pass: string,
  phone?: string
): Promise<User> => {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();

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

    // Also record into local registered list for quick switching
    const users = getRegisteredLocalUsers().filter((u) => u.email !== cleanEmail);
    users.push({
      uid: cred.user.uid,
      name: cleanName,
      email: cleanEmail,
      phone: phone?.trim(),
      createdAt: new Date().toISOString(),
    });
    saveRegisteredLocalUsers(users);

    return cred.user;
  } catch (firebaseErr: any) {
    console.warn("Firebase email registration warning:", firebaseErr?.code, firebaseErr?.message);

    // If Firebase disallowed or network error, fallback to local storage authentication
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

  try {
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    return cred.user;
  } catch (firebaseErr: any) {
    console.warn("Firebase email login warning:", firebaseErr?.code, firebaseErr?.message);

    // Check in local registered users
    const users = getRegisteredLocalUsers();
    const match = users.find(
      (u) => u.email.toLowerCase() === cleanEmail && (!u.password || u.password === pass)
    );

    if (match) {
      setActiveLocalUser(match);
      const synthetic = createSyntheticUser(match);
      notifyAuthListeners(synthetic, null);
      return synthetic;
    }

    // Map common Firebase errors to helpful Indonesian messages
    if (firebaseErr?.code === "auth/invalid-credential" || firebaseErr?.code === "auth/wrong-password") {
      throw new Error("Email atau kata sandi yang Anda masukkan salah.");
    } else if (firebaseErr?.code === "auth/user-not-found") {
      throw new Error("Akun dengan email ini tidak ditemukan. Silakan lakukan pendaftaran.");
    } else if (firebaseErr?.code === "auth/too-many-requests") {
      throw new Error("Terlalu banyak percobaan masuk gagal. Coba lagi dalam beberapa menit.");
    }

    throw new Error(firebaseErr?.message || "Gagal masuk. Periksa kembali email dan kata sandi Anda.");
  }
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
    localStorage.setItem("bbm_google_token", cachedAccessToken);
    setActiveLocalUser(null);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error("Sign in error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken || localStorage.getItem("bbm_google_token");
};

export const logoutGoogle = async () => {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn("Firebase signout error:", e);
  }
  cachedAccessToken = null;
  localStorage.removeItem("bbm_google_token");
  setActiveLocalUser(null);
  notifyAuthListeners(null, null);
};

export const logoutUser = logoutGoogle;

