import { FuelEfficiencyUnit } from "../types";

export function formatEfficiency(
  kmPerLiter: number | undefined | null,
  unit?: FuelEfficiencyUnit | string
): { value: string; unitLabel: string; full: string } {
  const isL100 = unit === "l/100km";
  const unitLabel = isL100 ? "L/100km" : "km/L";

  if (!kmPerLiter || kmPerLiter <= 0 || isNaN(kmPerLiter)) {
    return { value: "-", unitLabel, full: "-" };
  }

  if (isL100) {
    const l100 = (100 / kmPerLiter).toFixed(2);
    return {
      value: l100,
      unitLabel: "L/100km",
      full: `${l100} L/100km`,
    };
  }

  const kmL = kmPerLiter.toFixed(2);
  return {
    value: kmL,
    unitLabel: "km/L",
    full: `${kmL} km/L`,
  };
}

export function getUnitLabel(unit?: FuelEfficiencyUnit | string): string {
  return unit === "l/100km" ? "L/100km" : "km/L";
}
