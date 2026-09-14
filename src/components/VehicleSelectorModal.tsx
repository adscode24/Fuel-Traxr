import React, { useState } from "react";
import { Car, Bike, Plus, Check, X, Edit2, Gauge } from "lucide-react";
import { Vehicle } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  activeVehicleId: string;
  onSelectVehicle: (id: string) => void;
  onAddVehicle: (v: Omit<Vehicle, "id">) => void;
  onUpdateVehicle: (v: Vehicle) => void;
}

export const VehicleSelectorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  vehicles,
  activeVehicleId,
  onSelectVehicle,
  onAddVehicle,
  onUpdateVehicle,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  // New vehicle form state
  const [name, setName] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [type, setType] = useState<"car" | "motorcycle">("car");
  const [fuelCategory, setFuelCategory] = useState<"Bensin" | "Diesel" | "Elektrik">("Bensin");
  const [tankCapacity, setTankCapacity] = useState(45);
  const [currentOdometer, setCurrentOdometer] = useState(70000);

  if (!isOpen) return null;

  const isElectric = fuelCategory === "Elektrik";
  const capacityUnit = isElectric ? "Kwh" : "L";

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    onAddVehicle({
      name,
      licensePlate,
      type,
      fuelCategory,
      tankCapacityUnit: capacityUnit,
      defaultFuelType:
        fuelCategory === "Elektrik"
          ? "Listrik / EV"
          : fuelCategory === "Diesel"
          ? "Bio Solar / Dexlite"
          : "Pertalite",
      fuelTankCapacity: Number(tankCapacity),
      currentOdometer: Number(currentOdometer),
    });

    setName("");
    setLicensePlate("");
    setFuelCategory("Bensin");
    setTankCapacity(45);
    setShowAddForm(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;
    const editIsElectric = editingVehicle.fuelCategory === "Elektrik";
    onUpdateVehicle({
      ...editingVehicle,
      tankCapacityUnit: editIsElectric ? "Kwh" : "L",
    });
    setEditingVehicle(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#151c2b] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Car className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Pilih Kendaraan</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of Vehicles */}
        {!showAddForm && !editingVehicle && (
          <div className="space-y-2.5 overflow-y-auto pr-1">
            {vehicles.map((v) => {
              const isSelected = v.id === activeVehicleId;
              return (
                <div
                  key={v.id}
                  onClick={() => {
                    onSelectVehicle(v.id);
                    onClose();
                  }}
                  className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                    isSelected
                      ? "bg-blue-50 border-blue-500 text-blue-900 dark:bg-blue-600/20 dark:border-blue-500 dark:text-white"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100 dark:bg-[#192233] dark:border-slate-800 dark:hover:bg-[#1f2a3f] text-slate-800 dark:text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {v.type === "car" ? (
                        <Car className="w-5 h-5" />
                      ) : (
                        <Bike className="w-5 h-5" />
                      )}
                    </div>
                      <div>
                      <div className="text-sm font-semibold flex items-center gap-2">
                        <span>{v.name}</span>
                        {v.licensePlate && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-black/40 font-mono text-slate-700 dark:text-slate-300">
                            {v.licensePlate}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1 flex items-center gap-1.5 flex-wrap">
                        <span>{v.currentOdometer.toLocaleString("id-ID")} KM</span>
                        <span>•</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            v.fuelCategory === "Elektrik"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : v.fuelCategory === "Diesel"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                          }`}
                        >
                          {v.fuelCategory || "Bensin"}
                        </span>
                        <span>•</span>
                        <span>
                          {v.fuelCategory === "Elektrik" ? "Baterai" : "Tangki"}{" "}
                          {v.fuelTankCapacity} {v.tankCapacityUnit || (v.fuelCategory === "Elektrik" ? "Kwh" : "L")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingVehicle(v);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700/60 transition"
                      title="Edit Odometer / Info"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition"
            >
              <Plus className="w-4 h-4" />
              Tambah Kendaraan Baru
            </button>
          </div>
        )}

        {/* Add Vehicle Form */}
        {showAddForm && (
          <form onSubmit={handleCreate} className="space-y-3 overflow-y-auto">
            <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Informasi Kendaraan Baru
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Nama / Merk Kendaraan</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Toyota Veloz, Hyundai Ioniq 5, Honda PCX 160"
                required
                className="w-full bg-slate-50 dark:bg-[#10141e] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#10141e]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Jenis Kendaraan</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as "car" | "motorcycle")}
                  className="w-full bg-slate-50 dark:bg-[#10141e] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#10141e]"
                >
                  <option value="car">Mobil</option>
                  <option value="motorcycle">Sepeda Motor</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Plat Nomor</label>
                <input
                  type="text"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  placeholder="B 1234 XYZ"
                  className="w-full bg-slate-50 dark:bg-[#10141e] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white uppercase focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#10141e] font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Jenis Bahan Bakar</label>
                <select
                  value={fuelCategory}
                  onChange={(e) => {
                    const val = e.target.value as "Bensin" | "Diesel" | "Elektrik";
                    setFuelCategory(val);
                    if (val === "Elektrik" && tankCapacity === 45) {
                      setTankCapacity(58); // default EV battery kWh
                    }
                  }}
                  className="w-full bg-slate-50 dark:bg-[#10141e] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#10141e]"
                >
                  <option value="Bensin">Bensin</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Elektrik">Elektrik</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {fuelCategory === "Elektrik" ? "Kapasitas Baterai (Kwh)" : "Kapasitas Tangki (L)"}
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={tankCapacity}
                    onChange={(e) => setTankCapacity(Number(e.target.value))}
                    required
                    className="flex-1 bg-slate-50 dark:bg-[#10141e] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#10141e] font-mono"
                  />
                  <span className="text-xs font-semibold font-mono text-slate-600 dark:text-slate-400 shrink-0">
                    {capacityUnit}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Odometer Awal (KM)</label>
              <input
                type="number"
                value={currentOdometer}
                onChange={(e) => setCurrentOdometer(Number(e.target.value))}
                required
                className="w-full bg-slate-50 dark:bg-[#10141e] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#10141e] font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition active:scale-95"
              >
                Simpan
              </button>
            </div>
          </form>
        )}

        {/* Edit Vehicle Form */}
        {editingVehicle && (
          <form onSubmit={handleSaveEdit} className="space-y-3 overflow-y-auto">
            <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Edit Kendaraan: {editingVehicle.name}
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Kendaraan</label>
              <input
                type="text"
                value={editingVehicle.name}
                onChange={(e) =>
                  setEditingVehicle({ ...editingVehicle, name: e.target.value })
                }
                required
                className="w-full bg-slate-50 dark:bg-[#10141e] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#10141e]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Plat Nomor</label>
                <input
                  type="text"
                  value={editingVehicle.licensePlate}
                  onChange={(e) =>
                    setEditingVehicle({
                      ...editingVehicle,
                      licensePlate: e.target.value,
                    })
                  }
                  className="w-full bg-slate-50 dark:bg-[#10141e] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white uppercase focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#10141e] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Jenis Bahan Bakar</label>
                <select
                  value={editingVehicle.fuelCategory || "Bensin"}
                  onChange={(e) => {
                    const val = e.target.value as "Bensin" | "Diesel" | "Elektrik";
                    setEditingVehicle({
                      ...editingVehicle,
                      fuelCategory: val,
                      tankCapacityUnit: val === "Elektrik" ? "Kwh" : "L",
                    });
                  }}
                  className="w-full bg-slate-50 dark:bg-[#10141e] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#10141e]"
                >
                  <option value="Bensin">Bensin</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Elektrik">Elektrik</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {editingVehicle.fuelCategory === "Elektrik"
                    ? "Kapasitas Baterai (Kwh)"
                    : "Kapasitas Tangki (L)"}
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="any"
                    value={editingVehicle.fuelTankCapacity ?? 45}
                    onChange={(e) =>
                      setEditingVehicle({
                        ...editingVehicle,
                        fuelTankCapacity: Number(e.target.value),
                      })
                    }
                    required
                    placeholder="Kapasitas tangki atau baterai"
                    className="flex-1 bg-slate-50 dark:bg-[#10141e] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#10141e] font-mono"
                  />
                  <span className="text-xs font-semibold font-mono text-slate-600 dark:text-slate-400 shrink-0">
                    {editingVehicle.fuelCategory === "Elektrik" ? "Kwh" : "L"}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Odometer Terkini (KM)</label>
                <input
                  type="number"
                  value={editingVehicle.currentOdometer}
                  onChange={(e) =>
                    setEditingVehicle({
                      ...editingVehicle,
                      currentOdometer: Number(e.target.value),
                    })
                  }
                  required
                  className="w-full bg-slate-50 dark:bg-[#10141e] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#10141e] font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingVehicle(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition active:scale-95"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
