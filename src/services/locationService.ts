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
 * Reverse geocode latitude and longitude to readable Indonesian City / District
 */
async function reverseGeocodeCoords(
  lat: number,
  lon: number
): Promise<{ city: string; district?: string; province?: string; formattedAddress?: string }> {
  try {
    // Try OpenStreetMap Nominatim with quick 3.5s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
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
    console.warn("Reverse geocoding fetch failed, falling back to coordinate bounds:", err);
  }

  // Graceful coordinate bounds approximation for Indonesia's key regions
  return estimateCityFromCoords(lat, lon);
}

function estimateCityFromCoords(lat: number, lon: number) {
  // Garut area
  if (lat >= -7.4 && lat <= -7.0 && lon >= 107.7 && lon <= 108.1) {
    return { city: "Garut", province: "Jawa Barat", formattedAddress: "Garut, Jawa Barat" };
  }
  // Bogor / Gunung Putri area
  if (lat >= -6.8 && lat <= -6.4 && lon >= 106.7 && lon <= 107.1) {
    return { city: "Bogor", province: "Jawa Barat", formattedAddress: "Bogor, Jawa Barat" };
  }
  // Jakarta Area
  if (lat >= -6.4 && lat <= -6.0 && lon >= 106.6 && lon <= 107.0) {
    return { city: "Jakarta", province: "DKI Jakarta", formattedAddress: "Jakarta" };
  }
  // Bandung Area
  if (lat >= -7.1 && lat <= -6.8 && lon >= 107.4 && lon <= 107.8) {
    return { city: "Bandung", province: "Jawa Barat", formattedAddress: "Bandung, Jawa Barat" };
  }
  // Surabaya Area
  if (lat >= -7.4 && lat <= -7.1 && lon >= 107.2 && lon <= 112.9) {
    return { city: "Surabaya", province: "Jawa Timur", formattedAddress: "Surabaya, Jawa Timur" };
  }

  return {
    city: "Indonesia",
    formattedAddress: "Indonesia",
  };
}

/**
 * Requests GPS permission and reads current user coordinates + city
 */
export async function requestAndDetectUserLocation(): Promise<UserLocationInfo> {
  setAskedLocationPermission();

  if (!navigator.geolocation) {
    throw new Error("Browser Anda tidak mendukung deteksi lokasi Geolocation.");
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const geo = await reverseGeocodeCoords(latitude, longitude);
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
          resolve(locationInfo);
        } catch {
          const fallbackInfo: UserLocationInfo = {
            city: "Indonesia",
            latitude,
            longitude,
            formattedAddress: "Indonesia",
            source: "gps",
          };
          setStoredUserLocation(fallbackInfo);
          resolve(fallbackInfo);
        }
      },
      (err) => {
        let msg = "Izin akses lokasi ditolak atau tidak tersedia.";
        if (err.code === err.PERMISSION_DENIED) {
          msg = "Akses lokasi ditolak. Anda dapat mengaktifkannya di pengaturan browser.";
        } else if (err.code === err.TIMEOUT) {
          msg = "Waktu membaca lokasi habis (timeout).";
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
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
