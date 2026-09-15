import React from "react";

export type StationBrand =
  | "pertamina"
  | "shell"
  | "bp"
  | "vivo"
  | "total"
  | "mobil"
  | "petronas"
  | "spklu"
  | "generic";

/**
 * Detects the gas station brand based on the station name or fuel category.
 */
export function detectStationBrand(
  stationName?: string,
  fuelCategory?: string
): StationBrand {
  if (!stationName || !stationName.trim()) {
    if (fuelCategory === "Elektrik") return "spklu";
    return "pertamina";
  }

  const s = stationName.toLowerCase().trim();

  // 1. SPKLU / Electric / PLN
  if (
    s.includes("spklu") ||
    s.includes("pln") ||
    s.includes("charging") ||
    s.includes("charge") ||
    s.includes("listrik") ||
    /\b(ev|tesla|ioniq)\b/i.test(s) ||
    fuelCategory === "Elektrik"
  ) {
    return "spklu";
  }

  // 2. Shell
  if (
    s.includes("shell") ||
    s.includes("v-power") ||
    s.includes("vpower") ||
    s.includes("fuelsave")
  ) {
    return "shell";
  }

  // 3. BP (British Petroleum / BP-AKR)
  if (
    /\b(bp|bp-akr|bpakr)\b/i.test(s) ||
    s.includes("bp akr") ||
    s.includes("bp-akr") ||
    s.includes("british petroleum") ||
    s.includes("castrol")
  ) {
    return "bp";
  }

  // 4. Vivo (PT Vivo Energy Indonesia)
  if (s.includes("vivo") || s.includes("revvo")) {
    return "vivo";
  }

  // 5. Total / TotalEnergies
  if (
    s.includes("total") ||
    s.includes("totalenergies") ||
    s.includes("excellium")
  ) {
    return "total";
  }

  // 6. Mobil / ExxonMobil
  if (
    s.includes("exxon") ||
    s.includes("esso") ||
    /\bmobil\b/i.test(s) ||
    s.includes("mobil 1") ||
    s.includes("mobil1")
  ) {
    return "mobil";
  }

  // 7. Petronas
  if (s.includes("petronas") || s.includes("primax")) {
    return "petronas";
  }

  // 8. Pertamina
  if (
    s.includes("pertamina") ||
    s.includes("pertamax") ||
    s.includes("pertalite") ||
    s.includes("dexlite") ||
    s.includes("spbu") ||
    s.includes("pom bensin")
  ) {
    return "pertamina";
  }

  return "generic";
}

export function getStationBrandLabel(brand: StationBrand): string {
  switch (brand) {
    case "pertamina":
      return "Pertamina";
    case "shell":
      return "Shell";
    case "bp":
      return "BP";
    case "vivo":
      return "Vivo";
    case "total":
      return "Total";
    case "mobil":
      return "Mobil";
    case "petronas":
      return "Petronas";
    case "spklu":
      return "SPKLU / PLN";
    default:
      return "SPBU";
  }
}

interface StationLogoProps {
  stationName?: string;
  fuelCategory?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const StationLogo: React.FC<StationLogoProps> = ({
  stationName,
  fuelCategory,
  className = "w-11 h-11",
  size = "md",
}) => {
  const brand = detectStationBrand(stationName, fuelCategory);

  const containerClasses = `rounded-full flex items-center justify-center shrink-0 overflow-hidden relative shadow-sm border border-slate-200 dark:border-slate-700/60 bg-white ${className}`;

  switch (brand) {
    case "shell":
      return (
        <div
          className={containerClasses}
          title={stationName || "Shell"}
          aria-label="Shell Logo"
        >
          {/* Shell Pecten Scallop SVG */}
          <svg viewBox="0 0 100 100" className="w-[84%] h-[84%]" fill="none">
            {/* Scallop Outer Shell Yellow with Red Border */}
            <path
              d="M20 74 C16 54, 18 34, 33 23 C41 17, 59 17, 67 23 C82 34, 84 54, 80 74 C74 73, 67 76, 50 76 C33 76, 26 73, 20 74 Z"
              fill="#FFD200"
              stroke="#DD1D21"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            {/* Base Red Pedestal */}
            <path
              d="M32 75 L32 83 C32 85, 68 85, 68 83 L68 75 Z"
              fill="#DD1D21"
            />
            {/* Radiating Red Grooves */}
            <path
              d="M50 75 L50 20"
              stroke="#DD1D21"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            <path
              d="M44 75 L37 25"
              stroke="#DD1D21"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            <path
              d="M56 75 L63 25"
              stroke="#DD1D21"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            <path
              d="M38 75 L28 34"
              stroke="#DD1D21"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <path
              d="M62 75 L72 34"
              stroke="#DD1D21"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <path
              d="M32 75 L22 48"
              stroke="#DD1D21"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path
              d="M68 75 L78 48"
              stroke="#DD1D21"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      );

    case "bp":
      return (
        <div
          className={containerClasses}
          title={stationName || "BP"}
          aria-label="BP Logo"
        >
          {/* BP Helios Sunburst Flower SVG */}
          <svg viewBox="0 0 100 100" className="w-[84%] h-[84%]" fill="none">
            {/* Outer dark green rays */}
            <g transform="translate(50, 50)">
              {[0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5].map(
                (angle) => (
                  <path
                    key={`outer-${angle}`}
                    d="M-3 -44 L0 -48 L3 -44 L3 -22 L-3 -22 Z"
                    fill="#007A3D"
                    transform={`rotate(${angle})`}
                  />
                )
              )}
              {/* Middle lime green rays */}
              {[11.25, 33.75, 56.25, 78.75, 101.25, 123.75, 146.25, 168.75, 191.25, 213.75, 236.25, 258.75, 281.25, 303.75, 326.25, 348.75].map(
                (angle) => (
                  <path
                    key={`mid-${angle}`}
                    d="M-3.5 -36 L0 -40 L3.5 -36 L3 -16 L-3 -16 Z"
                    fill="#78BE20"
                    transform={`rotate(${angle})`}
                  />
                )
              )}
              {/* Inner yellow petals */}
              {[0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5].map(
                (angle) => (
                  <path
                    key={`in-${angle}`}
                    d="M-3 -26 L0 -30 L3 -26 L2.5 -10 L-2.5 -10 Z"
                    fill="#FFD100"
                    transform={`rotate(${angle + 11.25})`}
                  />
                )
              )}
              {/* Central White Disc */}
              <circle cx="0" cy="0" r="14" fill="#FFFFFF" />
              {/* Subtle BP letters in dark green */}
              <text
                x="0"
                y="5"
                textAnchor="middle"
                fill="#007A3D"
                fontSize="12"
                fontWeight="900"
                fontFamily="sans-serif"
              >
                bp
              </text>
            </g>
          </svg>
        </div>
      );

    case "vivo":
      return (
        <div
          className={`${containerClasses} !bg-[#004A99]`}
          title={stationName || "Vivo"}
          aria-label="Vivo Logo"
        >
          {/* Vivo Energy Indonesia SVG */}
          <svg viewBox="0 0 100 100" className="w-[82%] h-[82%]" fill="none">
            {/* Stylized Modern Winged V */}
            <path
              d="M24 28 L43 70 L50 70 L34 28 Z"
              fill="#00B8F1"
            />
            <path
              d="M76 28 L57 70 L50 70 L66 28 Z"
              fill="#FFFFFF"
            />
            {/* Center diamond accent */}
            <path
              d="M50 42 L55 50 L50 58 L45 50 Z"
              fill="#00E5FF"
            />
            {/* Lower brand text */}
            <text
              x="50"
              y="88"
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize="14"
              fontWeight="900"
              letterSpacing="1"
              fontFamily="sans-serif"
            >
              vivo
            </text>
          </svg>
        </div>
      );

    case "total":
      return (
        <div
          className={containerClasses}
          title={stationName || "TotalEnergies"}
          aria-label="TotalEnergies Logo"
        >
          {/* TotalEnergies Multicolored Energy Swirl */}
          <svg viewBox="0 0 100 100" className="w-[86%] h-[86%]" fill="none">
            {/* Curved interwoven ribbons */}
            <path
              d="M20 50 A30 30 0 0 1 50 20 L50 28 A22 22 0 0 0 28 50 Z"
              fill="#ED1C24"
            />
            <path
              d="M50 20 A30 30 0 0 1 80 50 L72 50 A22 22 0 0 0 50 28 Z"
              fill="#FF9E1B"
            />
            <path
              d="M80 50 A30 30 0 0 1 50 80 L50 72 A22 22 0 0 0 72 50 Z"
              fill="#FFD200"
            />
            <path
              d="M50 80 A30 30 0 0 1 20 50 L28 50 A22 22 0 0 0 50 72 Z"
              fill="#0055A5"
            />
            <text
              x="50"
              y="55"
              textAnchor="middle"
              fill="#1E293B"
              fontSize="11"
              fontWeight="900"
              fontFamily="sans-serif"
            >
              TOTAL
            </text>
          </svg>
        </div>
      );

    case "mobil":
      return (
        <div
          className={containerClasses}
          title={stationName || "Mobil / ExxonMobil"}
          aria-label="Mobil Logo"
        >
          {/* Mobil blue text with iconic red 'o' */}
          <svg viewBox="0 0 100 100" className="w-[86%] h-[86%]" fill="none">
            <rect x="14" y="66" width="72" height="4" rx="2" fill="#ED1C24" />
            <text
              x="18"
              y="52"
              fill="#002D72"
              fontSize="22"
              fontWeight="900"
              fontFamily="sans-serif"
            >
              M
              <tspan fill="#ED1C24">o</tspan>
              bil
            </text>
          </svg>
        </div>
      );

    case "petronas":
      return (
        <div
          className={`${containerClasses} !bg-[#00A39D]`}
          title={stationName || "Petronas"}
          aria-label="Petronas Logo"
        >
          {/* Petronas Teardrop Drop SVG */}
          <svg viewBox="0 0 100 100" className="w-[84%] h-[84%]" fill="none">
            {/* Outer Drop in white */}
            <path
              d="M50 16 C50 16, 26 50, 26 66 C26 79, 37 88, 50 88 C63 88, 74 79, 74 66 C74 50, 50 16, 50 16 Z"
              fill="#FFFFFF"
            />
            {/* Inner Spiral in Petronas Green */}
            <path
              d="M50 32 C50 32, 36 54, 36 65 C36 73, 42 79, 50 79 C57 79, 63 73, 63 65 C63 56, 54 48, 50 48 C46 48, 43 51, 43 55 C43 58, 46 61, 50 61 Z"
              fill="#00A39D"
            />
          </svg>
        </div>
      );

    case "spklu":
      return (
        <div
          className={`${containerClasses} !bg-gradient-to-br !from-emerald-500 !to-teal-700 !border-emerald-400/40`}
          title={stationName || "SPKLU PLN"}
          aria-label="SPKLU EV Charging Logo"
        >
          {/* SPKLU Lightning Bolt & EV Plug */}
          <svg viewBox="0 0 100 100" className="w-[80%] h-[80%]" fill="none">
            {/* Charging Ring */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="#A7F3D0"
              strokeWidth="4"
              strokeDasharray="8 4"
            />
            {/* Lightning bolt */}
            <path
              d="M54 18 L34 50 L48 50 L42 82 L68 46 L52 46 Z"
              fill="#FEF08A"
              stroke="#EAB308"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      );

    case "generic":
      return (
        <div
          className={containerClasses}
          title={stationName || "SPBU"}
          aria-label="SPBU Fuel Station Logo"
        >
          {/* Clean fuel dispenser pump icon */}
          <svg viewBox="0 0 100 100" className="w-[80%] h-[80%]" fill="none">
            {/* Pump Body */}
            <rect
              x="22"
              y="26"
              width="38"
              height="54"
              rx="6"
              fill="#2563EB"
            />
            {/* Meter window */}
            <rect
              x="28"
              y="34"
              width="26"
              height="16"
              rx="3"
              fill="#FFFFFF"
            />
            <rect
              x="32"
              y="38"
              width="18"
              height="3"
              rx="1"
              fill="#2563EB"
            />
            <rect
              x="32"
              y="43"
              width="12"
              height="3"
              rx="1"
              fill="#94A3B8"
            />
            {/* Pump base */}
            <rect
              x="18"
              y="78"
              width="46"
              height="6"
              rx="2"
              fill="#1E293B"
            />
            {/* Hose & Nozzle */}
            <path
              d="M60 40 C74 40, 78 52, 78 64 C78 72, 73 75, 73 68 L73 48 L68 44"
              stroke="#475569"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <rect
              x="70"
              y="44"
              width="6"
              height="10"
              rx="2"
              fill="#EF4444"
            />
          </svg>
        </div>
      );

    case "pertamina":
    default:
      return (
        <div
          className={containerClasses}
          title={stationName || "SPBU Pertamina"}
          aria-label="Pertamina Logo"
        >
          {/* Pertamina Official Three-Parallelogram Mark */}
          <svg viewBox="0 0 100 100" className="w-[82%] h-[82%]" fill="none">
            {/* Blue parallelogram */}
            <path
              d="M20 70 L48 22 L72 22 L44 70 Z"
              fill="#005BAA"
            />
            {/* Red shape */}
            <path
              d="M48 22 L78 22 L86 36 L56 36 Z"
              fill="#ED1C24"
            />
            {/* Green parallelogram */}
            <path
              d="M32 70 L44 70 L60 44 L48 44 Z"
              fill="#8DC63F"
            />
          </svg>
        </div>
      );
  }
};
