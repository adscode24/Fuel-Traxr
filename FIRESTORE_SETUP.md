# Cloud Vault Setup — Sinkron Online Multi-Perangkat (Wajib 5 menit)

Agar daftar dengan **email A di HP Anda** lalu login dengan **email + password A yang sama di HP/ laptop lain** menampilkan data yang sama dan setiap edit tersinkron, aktifkan 2 hal di Firebase Console:

## 1. Aktifkan Email/Password Auth
1. Buka https://console.firebase.google.com → project `gen-lang-client-0414609237`
2. **Build → Authentication → Sign-in method**
3. Enable **Email/Password** → Save.

## 2. Aktifkan Firestore + Rules
1. **Build → Firestore Database → Create database** → mode **Production** → lokasi `asia-southeast2 (Jakarta)` bila ada.
2. **Firestore → Rules** → copy isi file `firestore.rules` di repo ini → **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /fuelVaults/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

## 3. Cara kerja aplikasi (sudah dikode)
- Register/login email → `ensureUserVault()` membuat dokumen `fuelVaults/{uid}` berisi `vaultCode` unik (mis. `DF-7KQ2XA`), `ownerEmail`, + seluruh data lokal HP pertama.
- Setiap edit kendaraan/BBM/servis → debounce ±900ms → `pushVault()` ke dokumen yang sama.
- `onSnapshot()` realtime → HP/laptop lain yang login akun sama langsung menerima data baru.
- Offline (termasuk WebView Android): tulis tetap ke `localStorage` + cache Firestore persisten, status jadi `Offline`, otomatis push saat online.
- Akun lokal `usr_...` / tamu **tidak** menyentuh cloud (Mode Lokal).
- Kode Vault tampil di **Pengaturan → Cloud Vault** dan **Profil**, bisa disalin.
- Di Android native, tombol Google disembunyikan (popup tidak didukung WebView) — gunakan Email & Sandi agar sinkron tetap jalan.

## 4. Uji lintas perangkat
1. HP-1: Daftar `a@mail.com` → tambah 1 kendaraan + 1 catatan BBM → catat Kode Vault di Pengaturan.
2. HP-2 / laptop: Login `a@mail.com` (password sama) → kendaraan + catatan muncul sama + Kode Vault sama.
3. Edit di HP-2 (mis. tambah biaya servis) → dalam ±2 detik muncul di HP-1 (status `Tersinkron HH:MM`).

## 5. Troubleshooting
- `permission-denied` → Rules belum publish / salah project / belum login.
- `Database does not exist` → Firestore belum di-Create (langkah 2).
- `auth/operation-not-allowed` → Email/Password provider belum di-Enable (langkah 1).
- Data lama tidak muncul setelah login → itu isolasi per akun yang benar; setiap email punya vault sendiri.
- Reset di Pengaturan saat login cloud akan mengosongkan vault cloud juga (lalu tersinkron ke semua perangkat).
