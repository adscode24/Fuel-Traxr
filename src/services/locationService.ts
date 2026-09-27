import { Geolocation } from "@capacitor/geolocation";
import { isNativePlatform } from "./firebase";

export interface UserLocationInfo {
  city: string;
  district?: string;
  province?: string;
  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
  source: "gps" | "cache" | "default";
}

export interface SPBUStationOption {
  id: string;
  name: string; // e.g. "SPBU Pertamina 34-44116"
  brand: "pertamina" | "shell" | "bp" | "vivo" | "spklu";
  address: string; // e.g. "Jl. Oto Iskandar Dinata, Tarogong Kaler, Garut"
  city: string;
}

const STORAGE_KEY = "oto_app_user_location";
const PERMISSION_ASKED_KEY = "oto_app_location_permission_prompted";

/**
 * Curated list of notable SPBU stations in major Indonesian regions,
 * with ability to dynamically match user's current city/regency.
 */
export const KNOWN_STATIONS_DATABASE: SPBUStationOption[] = [
  // Garut / Priangan Timur (matching sample receipt)
  {
    id: "pertamina-34-44116",
    name: "SPBU Pertamina 34-44116",
    brand: "pertamina",
    address: "Jl. Oto Iskandar Dinata, Tarogong Kaler",
    city: "Garut",
  },
  {
    id: "pertamina-34-44101",
    name: "SPBU Pertamina 34-44101",
    brand: "pertamina",
    address: "Jl. Cimanuk, Tarogong Kidul",
    city: "Garut",
  },
  {
    id: "pertamina-34-44105",
    name: "SPBU Pertamina 34-44105",
    brand: "pertamina",
    address: "Jl. Perintis Kemerdekaan",
    city: "Garut",
  },

  // Bogor / Gunung Putri (matching sample BP receipt)
  {
    id: "bp-gunung-puteri",
    name: "BP-AKR Gunung Puteri",
    brand: "bp",
    address: "Jl. Raya Ciangsana / Gunung Putri",
    city: "Bogor",
  },
  {
    id: "pertamina-34-16901",
    name: "SPBU Pertamina 34-16901",
    brand: "pertamina",
    address: "Jl. Raya Gunung Putri No. 45",
    city: "Bogor",
  },
  {
    id: "shell-cibinong",
    name: "Shell Cibinong Raya",
    brand: "shell",
    address: "Jl. Raya Jakarta-Bogor KM 44",
    city: "Bogor",
  },
  {
    id: "pertamina-31-16101",
    name: "SPBU Pertamina 31.161.01 Pajajaran",
    brand: "pertamina",
    address: "Jl. Pajajaran No. 35",
    city: "Bogor",
  },

  // Jakarta Selatan & Pusat
  {
    id: "pertamina-31-12801",
    name: "SPBU Pertamina 31.128.01 MT Haryono",
    brand: "pertamina",
    address: "Jl. MT Haryono Kav. 18",
    city: "Jakarta Selatan",
  },
  {
    id: "shell-gatot-subroto",
    name: "Shell Gatot Subroto",
    brand: "shell",
    address: "Jl. Gatot Subroto No. 32",
    city: "Jakarta Selatan",
  },
  {
    id: "bp-tebet",
    name: "BP-AKR Tebet",
    brand: "bp",
    address: "Jl. Prof. Dr. Soepomo No. 23",
    city: "Jakarta Selatan",
  },
  {
    id: "vivo-mt-haryono",
    name: "SPBU Vivo MT Haryono",
    brand: "vivo",
    address: "Jl. MT Haryono No. 12",
    city: "Jakarta Selatan",
  },
  {
    id: "spklu-pln-gambir",
    name: "SPKLU PLN UID Jakarta Raya",
    brand: "spklu",
    address: "Jl. M.I. Ridwan Rais No. 1",
    city: "Jakarta Pusat",
  },

  // Jakarta Barat & Tangerang
  {
    id: "pertamina-34-11701",
    name: "SPBU Pertamina 34.117.01 Daan Mogot",
    brand: "pertamina",
    address: "Jl. Daan Mogot KM 10",
    city: "Jakarta Barat",
  },
  {
    id: "shell-daan-mogot",
    name: "Shell Daan Mogot",
    brand: "shell",
    address: "Jl. Daan Mogot KM 11",
    city: "Jakarta Barat",
  },
  {
    id: "vivo-kedoya",
    name: "SPBU Vivo Kedoya",
    brand: "vivo",
    address: "Jl. Panjang No. 5",
    city: "Jakarta Barat",
  },
  {
    id: "bp-bsd-boulevard",
    name: "BP-AKR BSD Boulevard",
    brand: "bp",
    address: "Jl. BSD Raya Utama, Pagedangan",
    city: "Tangerang",
  },
  {
    id: "pertamina-34-15108",
    name: "SPBU Pertamina 34.151.08 Serpong",
    brand: "pertamina",
    address: "Jl. Raya Serpong KM 7",
    city: "Tangerang Selatan",
  },
  {
    id: "shell-bsd",
    name: "Shell BSD City",
    brand: "shell",
    address: "Jl. Pahlawan Seribu BSD",
    city: "Tangerang Selatan",
  },

  // Bandung
  {
    id: "pertamina-34-40112",
    name: "SPBU Pertamina 34.401.12 Dago",
    brand: "pertamina",
    address: "Jl. Ir. H. Juanda No. 139",
    city: "Bandung",
  },
  {
    id: "shell-pasteur",
    name: "Shell Pasteur",
    brand: "shell",
    address: "Jl. Dr. Djunjunan No. 150",
    city: "Bandung",
  },
  {
    id: "bp-buah-batu",
    name: "BP-AKR Buah Batu",
    brand: "bp",
    address: "Jl. Terusan Buah Batu No. 112",
    city: "Bandung",
  },
  {
    id: "vivo-pasirkaliki",
    name: "SPBU Vivo Pasirkaliki",
    brand: "vivo",
    address: "Jl. Pasirkaliki No. 160",
    city: "Bandung",
  },
  {
    id: "spklu-pln-asia-afrika",
    name: "SPKLU PLN Asia Afrika",
    brand: "spklu",
    address: "Jl. Asia Afrika No. 63",
    city: "Bandung",
  },

  // Bekasi & Depok
  {
    id: "pertamina-34-17101",
    name: "SPBU Pertamina 34.171.01 Ahmad Yani",
    brand: "pertamina",
    address: "Jl. Jend. Ahmad Yani No. 1",
    city: "Bekasi",
  },
  {
    id: "shell-harapan-indah",
    name: "Shell Harapan Indah",
    brand: "shell",
    address: "Boulevard Harapan Indah",
    city: "Bekasi",
  },
  {
    id: "pertamina-34-16401",
    name: "SPBU Pertamina 34.164.01 Margonda",
    brand: "pertamina",
    address: "Jl. Margonda Raya No. 188",
    city: "Depok",
  },
  {
    id: "bp-margonda",
    name: "BP-AKR Margonda Raya",
    brand: "bp",
    address: "Jl. Margonda Raya No. 340",
    city: "Depok",
  },

  // Surabaya
  {
    id: "pertamina-51-60165",
    name: "SPBU Pertamina 51.601.65 Jemursari",
    brand: "pertamina",
    address: "Jl. Raya Jemursari No. 11",
    city: "Surabaya",
  },
  {
    id: "shell-kenjeran",
    name: "Shell Kenjeran",
    brand: "shell",
    address: "Jl. Kenjeran No. 420",
    city: "Surabaya",
  },
  {
    id: "bp-gubeng",
    name: "BP-AKR Raya Gubeng",
    brand: "bp",
    address: "Jl. Raya Gubeng No. 58",
    city: "Surabaya",
  },
  {
    id: "spklu-pln-surabaya-barat",
    name: "SPKLU PLN Embong Trengguli",
    brand: "spklu",
    address: "Jl. Embong Trengguli No. 19",
    city: "Surabaya",
  },

  // Semarang & Yogyakarta
  {
    id: "pertamina-44-50101",
    name: "SPBU Pertamina 44.501.01 Pemuda",
    brand: "pertamina",
    address: "Jl. Pemuda No. 70",
    city: "Semarang",
  },
  {
    id: "shell-gajahmada-semarang",
    name: "Shell Gajah Mada",
    brand: "shell",
    address: "Jl. Gajah Mada No. 102",
    city: "Semarang",
  },
  {
    id: "pertamina-44-55281",
    name: "SPBU Pertamina 44.552.81 Sagan",
    brand: "pertamina",
    address: "Jl. Prof. Yohanes No. 54",
    city: "Yogyakarta",
  },
  {
    id: "shell-adisucipto-jogja",
    name: "Shell Laksda Adisucipto",
    brand: "shell",
    address: "Jl. Laksda Adisucipto KM 7",
    city: "Yogyakarta",
  },

  // Bali & Denpasar
  {
    id: "pertamina-54-80106",
    name: "SPBU Pertamina 54.801.06 Sunset Road",
    brand: "pertamina",
    address: "Jl. Sunset Road No. 88, Kuta",
    city: "Badung / Denpasar",
  },
  {
    id: "shell-sunset-road",
    name: "Shell Sunset Road",
    brand: "shell",
    address: "Jl. Sunset Road Kuta",
    city: "Badung / Denpasar",
  },
  {
    id: "spklu-itdc-nusa-dua",
    name: "SPKLU ITDC Nusa Dua",
    brand: "spklu",
    address: "Kawasan Pariwisata Nusa Dua Lot NW",
    city: "Badung",
  },

  // Medan & Makassar
  {
    id: "pertamina-14-20111",
    name: "SPBU Pertamina 14.201.11 Adam Malik",
    brand: "pertamina",
    address: "Jl. H. Adam Malik No. 5",
    city: "Medan",
  },
  {
    id: "shell-sisingamangaraja",
    name: "Shell SM Raja",
    brand: "shell",
    address: "Jl. Sisingamangaraja No. 89",
    city: "Medan",
  },
  {
    id: "pertamina-74-90115",
    name: "SPBU Pertamina 74.901.15 Urip Sumoharjo",
    brand: "pertamina",
    address: "Jl. Urip Sumoharjo KM 4",
    city: "Makassar",
  },
];

/**
 * Reads cached location from local storage
 */
export function getStoredUserLocation(): UserLocationInfo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Persists location to local storage
 */
export function setStoredUserLocation(info: UserLocationInfo) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
  } catch (err) {
    console.error("Failed to store location:", err);
  }
}

/**
 * Checks if location permission prompt has been shown before
 */
export function hasAskedLocationPermission(): boolean {
  try {
    return localStorage.getItem(PERMISSION_ASKED_KEY) === "true";
  } catch {
    return false;
  }
}

export function setAskedLocationPermission() {
  try {
    localStorage.setItem(PERMISSION_ASKED_KEY, "true");
  } catch {
    // ignore
  }
}

/**
 * Reverse geocode latitude and longitude to readable Indonesian City / District.
 * Berlapis: Nominatim OSM -> BigDataCloud (tanpa API key) -> perkiraan batas koordinat.
 */
async function reverseGeocodeCoords(
  lat: number,
  lon: number
): Promise<{ city: string; district?: string; province?: string; formattedAddress?: string }> {
  // 1. OpenStreetMap Nominatim
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "Accept-Language": "id, en",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const city =
        addr.city ||
        addr.town ||
        addr.municipality ||
        addr.county ||
        addr.regency ||
        addr.state_district ||
        "Indonesia";
      const district = addr.suburb || addr.district || addr.quarter || addr.village;
      const province = addr.state;

      // Clean Indonesian prefix like "Kota " or "Kabupaten "
      const cleanCity = city.replace(/^(Kota|Kabupaten)\s+/i, "").trim();

      return {
        city: cleanCity || city,
        district,
        province,
        formattedAddress: [district, cleanCity || city, province]
          .filter(Boolean)
          .join(", "),
      };
    }
  } catch (err) {
    console.warn("Nominatim reverse geocoding failed, trying BigDataCloud:", err);
  }

  // 2. BigDataCloud free client-side reverse geocode (no key, CORS enabled)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=id`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      const city = data.city || data.locality || data.principalSubdivision || "Indonesia";
      const province = data.principalSubdivision;
      return {
        city,
        district: data.locality && data.locality !== city ? data.locality : undefined,
        province,
        formattedAddress: [data.locality, city, province].filter(Boolean).join(", ") || city,
      };
    }
  } catch (err) {
    console.warn("BigDataCloud reverse geocoding failed, falling back to coordinate bounds:", err);
  }

  // 3. Graceful coordinate bounds approximation for Indonesia's key regions
  return estimateCityFromCoords(lat, lon);
}

function inBounds(lat: number, lon: number, latMin: number, latMax: number, lonMin: number, lonMax: number) {
  return lat >= latMin && lat <= latMax && lon >= lonMin && lon <= lonMax;
}

function estimateCityFromCoords(lat: number, lon: number) {
  // Cek kotak kecil/spesifik dulu sebelum kotak besar agar tidak tertelan tetangga.
  // Tangerang
  if (inBounds(lat, lon, -6.4, -6.1, 106.5, 106.75)) {
    return { city: "Tangerang", province: "Banten", formattedAddress: "Tangerang, Banten" };
  }
  // Depok
  if (inBounds(lat, lon, -6.5, -6.3, 106.7, 106.95)) {
    return { city: "Depok", province: "Jawa Barat", formattedAddress: "Depok, Jawa Barat" };
  }
  // Bekasi
  if (inBounds(lat, lon, -6.3, -6.1, 106.9, 107.1)) {
    return { city: "Bekasi", province: "Jawa Barat", formattedAddress: "Bekasi, Jawa Barat" };
  }
  // Bogor / Gunung Putri area
  if (inBounds(lat, lon, -6.8, -6.4, 106.7, 107.1)) {
    return { city: "Bogor", province: "Jawa Barat", formattedAddress: "Bogor, Jawa Barat" };
  }
  // Jakarta Area
  if (inBounds(lat, lon, -6.4, -6.0, 106.6, 107.0)) {
    return { city: "Jakarta", province: "DKI Jakarta", formattedAddress: "Jakarta" };
  }
  // Garut area
  if (inBounds(lat, lon, -7.4, -7.0, 107.7, 108.1)) {
    return { city: "Garut", province: "Jawa Barat", formattedAddress: "Garut, Jawa Barat" };
  }
  // Bandung Area
  if (inBounds(lat, lon, -7.1, -6.8, 107.4, 107.9)) {
    return { city: "Bandung", province: "Jawa Barat", formattedAddress: "Bandung, Jawa Barat" };
  }
  // Semarang
  if (inBounds(lat, lon, -7.1, -6.9, 110.2, 110.6)) {
    return { city: "Semarang", province: "Jawa Tengah", formattedAddress: "Semarang, Jawa Tengah" };
  }
  // Yogyakarta
  if (inBounds(lat, lon, -7.9, -7.6, 110.2, 110.6)) {
    return { city: "Yogyakarta", province: "DI Yogyakarta", formattedAddress: "Yogyakarta, DI Yogyakarta" };
  }
  // Surabaya Area
  if (inBounds(lat, lon, -7.4, -7.1, 112.5, 112.9)) {
    return { city: "Surabaya", province: "Jawa Timur", formattedAddress: "Surabaya, Jawa Timur" };
  }
  // Medan
  if (inBounds(lat, lon, 3.4, 3.8, 98.5, 98.9)) {
    return { city: "Medan", province: "Sumatera Utara", formattedAddress: "Medan, Sumatera Utara" };
  }
  // Makassar
  if (inBounds(lat, lon, -5.3, -4.9, 119.3, 119.7)) {
    return { city: "Makassar", province: "Sulawesi Selatan", formattedAddress: "Makassar, Sulawesi Selatan" };
  }
  // Denpasar / Badung
  if (inBounds(lat, lon, -8.8, -8.5, 115.0, 115.4)) {
    return { city: "Denpasar", province: "Bali", formattedAddress: "Denpasar, Bali" };
  }

  return {
    city: "Indonesia",
    formattedAddress: "Indonesia",
  };
}

/**
 * Ambil koordinat perangkat.
 * - Android/iOS native (Capacitor): lewat plugin @capacitor/geolocation agar
 *   izin runtime Android diminta resmi + manifest permission ikut ter-merge saat build.
 * - Web / PWA: lewat navigator.geolocation browser.
 */
async function getDeviceCoordinates(): Promise<{ latitude: number; longitude: number }> {
  if (isNativePlatform()) {
    const deniedMsg =
      "Akses lokasi ditolak. Buka Pengaturan HP → Aplikasi → DigiFuel → Izin → aktifkan Lokasi, lalu coba lagi.";
    try {
      // 1. Cek status izin dulu — kalau sudah ditolak permanen,
      //    dialog sistem tidak akan muncul lagi, langsung arahkan ke Pengaturan.
      try {
        const checked = await Geolocation.checkPermissions();
        if (checked.location === "denied" && checked.coarseLocation === "denied") {
          throw new Error(deniedMsg);
        }
      } catch (err: unknown) {
        if ((err as Error)?.message === deniedMsg) throw err;
        // checkPermissions gagal (plugin lama) — lanjut ke request.
      }
      // 2. Minta izin resmi ke sistem (memunculkan dialog izin Android).
      try {
        const req = await Geolocation.requestPermissions();
        if (req.location === "denied" && req.coarseLocation === "denied") {
          throw new Error(deniedMsg);
        }
      } catch (err: unknown) {
        if ((err as Error)?.message === deniedMsg) throw err;
        // Lanjut — getCurrentPosition akan memberi pesan error yang jelas bila ditolak.
      }
      // 3. Baca posisi: coba akurasi tinggi dulu (GPS), fallback ke akurasi
      //    rendah (WiFi/seluler) yang jauh lebih cepat & hemat daya di dalam ruangan.
      try {
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 30000,
        });
        return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      } catch (firstErr: unknown) {
        const msg = (firstErr as Error)?.message || "";
        if (/denied|permission|not authorized/i.test(msg)) throw new Error(deniedMsg);
        const retry = await Geolocation.getCurrentPosition({
          enableHighAccuracy: false,
          timeout: 20000,
          maximumAge: 120000,
        });
        return { latitude: retry.coords.latitude, longitude: retry.coords.longitude };
      }
    } catch (err: unknown) {
      throw new Error(mapNativeLocationError(err));
    }
  }

  if (!navigator.geolocation) {
    throw new Error("Browser Anda tidak mendukung deteksi lokasi Geolocation.");
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => reject(new Error(mapWebLocationError(err))),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      }
    );
  });
}

function mapNativeLocationError(err: unknown): string {
  const msg = (err as Error)?.message || "";
  if (/denied|permission|not authorized/i.test(msg)) {
    return "Akses lokasi ditolak. Buka Pengaturan HP → Aplikasi → DigiFuel → Izin → aktifkan Lokasi, lalu coba lagi.";
  }
  if (/timeout|timed out/i.test(msg)) {
    return "Waktu membaca lokasi habis. Pastikan GPS aktif dan Anda di area terbuka, lalu coba lagi.";
  }
  if (/unavailable|disabled|location/i.test(msg)) {
    return "Layanan lokasi tidak tersedia. Aktifkan GPS/Lokasi di HP Anda lalu coba lagi.";
  }
  return msg || "Gagal membaca lokasi perangkat.";
}

function mapWebLocationError(err: GeolocationPositionError): string {
  if (err.code === err.PERMISSION_DENIED) {
    return "Akses lokasi ditolak. Klik ikon gembok di address bar browser → izinkan Lokasi, lalu coba lagi.";
  } else if (err.code === err.POSITION_UNAVAILABLE) {
    return "Posisi tidak tersedia. Pastikan GPS/layanan lokasi perangkat aktif lalu coba lagi.";
  } else if (err.code === err.TIMEOUT) {
    return "Waktu membaca lokasi habis (timeout). Coba lagi dalam beberapa detik.";
  }
  return "Izin akses lokasi ditolak atau tidak tersedia.";
}

/**
 * Requests location permission and reads current user coordinates + city.
 * Hanya menandai "sudah diminta" bila BERHASIL — agar banner bisa tampil lagi
 * dan pengguna bisa mencoba ulang bila gagal.
 */
export async function requestAndDetectUserLocation(): Promise<UserLocationInfo> {
  const { latitude, longitude } = await getDeviceCoordinates();

  let geo = { city: "Indonesia", formattedAddress: "Indonesia" } as {
    city: string;
    district?: string;
    province?: string;
    formattedAddress?: string;
  };
  try {
    geo = await reverseGeocodeCoords(latitude, longitude);
  } catch {
    geo = estimateCityFromCoords(latitude, longitude);
  }

  const locationInfo: UserLocationInfo = {
    city: geo.city,
    district: geo.district,
    province: geo.province,
    latitude,
    longitude,
    formattedAddress: geo.formattedAddress || geo.city,
    source: "gps",
  };
  setStoredUserLocation(locationInfo);
  setAskedLocationPermission();
  return locationInfo;
}

/**
 * Get station suggestions filtered by current user's city or fuel type
 */
export function getStationsForUserLocation(
  userCity?: string,
  fuelCategory?: string
): SPBUStationOption[] {
  const normCity = (userCity || "").toLowerCase().trim();

  // If electric, prioritize SPKLU
  if (fuelCategory === "Elektrik") {
    const spklu = KNOWN_STATIONS_DATABASE.filter((s) => s.brand === "spklu");
    const other = KNOWN_STATIONS_DATABASE.filter((s) => s.brand !== "spklu");
    return [...spklu, ...other];
  }

  if (!normCity || normCity === "indonesia") {
    return KNOWN_STATIONS_DATABASE;
  }

  // Filter stations matching user's city
  const localMatches = KNOWN_STATIONS_DATABASE.filter(
    (s) =>
      s.city.toLowerCase().includes(normCity) ||
      normCity.includes(s.city.toLowerCase()) ||
      s.address.toLowerCase().includes(normCity)
  );

  if (localMatches.length >= 3) {
    // Return matching stations first, then other popular ones
    const others = KNOWN_STATIONS_DATABASE.filter((s) => !localMatches.includes(s));
    return [...localMatches, ...others];
  }

  return KNOWN_STATIONS_DATABASE;
}
