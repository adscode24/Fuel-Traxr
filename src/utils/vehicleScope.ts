/**
 * Pemisah data per kendaraan aktif.
 * Catatan TANPA vehicleId (data lama) dianggap milik bersama dan tampil
 * di semua kendaraan agar tidak hilang.
 */
export function scopeByVehicle<T extends { vehicleId?: string }>(
  list: T[],
  vehicleId?: string | null
): T[] {
  if (!Array.isArray(list)) return [];
  if (!vehicleId) return list;
  return list.filter((item) => !item.vehicleId || item.vehicleId === vehicleId);
}
