# Android Native Setup — DigiFuel

## Syarat server (sekali saja, wajib)
1. Firebase Console → **Authentication → Sign-in method** → Enable **Email/Password**.
   Tanpa ini, daftar/masuk akan menampilkan instruksi — tidak lagi dibuatkan akun lokal diam-diam.
2. **Firestore Database** → Create database → **Rules** → paste `firestore.rules` → Publish.
   Detail: `FIRESTORE_SETUP.md`.

## Build APK (lokal)
```bash
npm install
npm run build
npx cap add android   # pertama kali saja
npx cap sync android  # wajib tiap tambah/update plugin Capacitor
npx cap open android  # Build APK via Android Studio
```

Plugin native yang dipakai (otomatis ikut saat `npm install` + `cap sync`):
- `@capacitor/geolocation` — izin lokasi runtime Android + permission ter-merge otomatis ke `AndroidManifest`. Tidak perlu edit manifest manual.
- `@capacitor/filesystem` + `@capacitor/share` — ekspor Excel/PDF di native disimpan via dialog Share sistem (anchor download blob tidak berfungsi di WebView).

CI (`.github/workflows/android-apk.yml`) sudah menjalankan `npm install` + `cap sync`, jadi APK hasil CI mencakup semua plugin di atas.

## Perilaku lintas platform
- Daftar dengan email A di website → login dengan email + sandi A yang sama di HP Android / web-mobile langsung masuk, data sama (Cloud Vault `DF-XXXXXX` sama). Tidak perlu daftar ulang.
- Sesi offline hanya untuk akun yang pernah login di perangkat itu; pendaftaran akun baru butuh internet sekali saja.
- Data Tamu (tanpa login) di perangkat akan dimigrasikan ke vault cloud saat akun Firebase login pertama kali di perangkat tersebut.
