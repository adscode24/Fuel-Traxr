import React, { useState, useEffect, useMemo } from "react";
import { User } from "firebase/auth";
import { Fuel, Loader2 } from "lucide-react";
import {
  Vehicle,
  FuelRecord,
  ServiceItem,
  ServiceHistoryEntry,
  FuelEfficiencyUnit,
} from "./types";
import {
  getStoredVehicles,
  saveStoredVehicles,
  getStoredFuelRecords,
  saveStoredFuelRecords,
  recalculateRecords,
  getStoredServices,
  saveStoredServices,
  getStoredServiceHistory,
  saveStoredServiceHistory,
  resetAllAppData,
  exportDeviceBackup,
  DeviceBackupPayload,
} from "./services/storage";
import { initAuth, logoutGoogle } from "./services/firebaseAuth";

import { AndroidHeader } from "./components/AndroidHeader";
import { BottomNav, NavTab } from "./components/BottomNav";
import { MileageLog } from "./components/MileageLog";
import { StatsDashboard } from "./components/StatsDashboard";
import { BiayaPage } from "./components/BiayaPage";
import { ReportPage } from "./components/ReportPage";
import { SettingsPage } from "./components/SettingsPage";
import { ManualEntryModal } from "./components/ManualEntryModal";
import { VehicleSelectorModal } from "./components/VehicleSelectorModal";
import { LocationPermissionBanner } from "./components/LocationPermissionBanner";
import { AuthModal } from "./components/AuthModal";
import { UserProfileModal } from "./components/UserProfileModal";
import { OfflineIndicator } from "./components/OfflineIndicator";

export function App() {
  // Auth state & loading
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Core Data States (stored locally on device)
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => getStoredVehicles());
  const [activeVehicleId, setActiveVehicleId] = useState<string>(() => {
    const list = getStoredVehicles();
    return list[0]?.id || "";
  });
  const [records, setRecords] = useState<FuelRecord[]>(() => getStoredFuelRecords());
  const [services, setServices] = useState<ServiceItem[]>(() => getStoredServices());
  const [serviceHistory, setServiceHistory] = useState<ServiceHistoryEntry[]>(() =>
    getStoredServiceHistory()
  );

  // Unit of Measurement: "km/l" | "l/100km"
  const [fuelUnit, setFuelUnit] = useState<FuelEfficiencyUnit>(() => {
    const saved = localStorage.getItem("bbm_fuel_unit");
    return saved === "l/100km" ? "l/100km" : "km/l";
  });

  const handleChangeFuelUnit = (unit: FuelEfficiencyUnit) => {
    setFuelUnit(unit);
    localStorage.setItem("bbm_fuel_unit", unit);
    showToast(`Satuan konsumsi BBM diubah ke ${unit === "km/l" ? "km/L" : "L/100km"}`);
  };

  // UI Navigation & Modals - Default is "home" as requested
  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FuelRecord | null>(null);

  // Auth & Profile State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">("login");
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Show temporary toast notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Setup Auth Listener with multi-user partitioned data loading
  useEffect(() => {
    const unsubscribe = initAuth(
      (u) => {
        setUser(u);
        setAuthLoading(false);
        const scopedVehicles = getStoredVehicles(u.uid);
        setVehicles(scopedVehicles);
        setActiveVehicleId(scopedVehicles[0]?.id || "");
        setRecords(getStoredFuelRecords(u.uid));
        setServices(getStoredServices(u.uid));
        setServiceHistory(getStoredServiceHistory(u.uid));
      },
      () => {
        setUser(null);
        setAuthLoading(false);
        const guestVehicles = getStoredVehicles(null);
        setVehicles(guestVehicles);
        setActiveVehicleId(guestVehicles[0]?.id || "");
        setRecords(getStoredFuelRecords(null));
        setServices(getStoredServices(null));
        setServiceHistory(getStoredServiceHistory(null));
      }
    );

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  // Compute active vehicle object
  const activeVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === activeVehicleId) || vehicles[0] || null;
  }, [vehicles, activeVehicleId]);

  // If vehicle was deleted or activeVehicleId is invalid, reset to first vehicle
  useEffect(() => {
    if (vehicles.length > 0 && !vehicles.some((v) => v.id === activeVehicleId)) {
      setActiveVehicleId(vehicles[0].id);
    }
  }, [vehicles, activeVehicleId]);

  // Fuel Records Handlers
  const handleSaveFuelRecord = (recordData: Partial<FuelRecord>) => {
    let targetVehicle = activeVehicle;
    if (!targetVehicle) {
      if (vehicles.length > 0) {
        targetVehicle = vehicles[0];
        setActiveVehicleId(vehicles[0].id);
      } else {
        // Auto create default vehicle so user can start recording immediately
        const defaultVeh: Vehicle = {
          id: `v-${Date.now()}`,
          name: "Kendaraan Saya",
          type: "car",
          licensePlate: "-",
          fuelTankCapacity: 45,
          defaultFuelType: recordData.fuelType || "Pertalite",
          fuelCategory: "Bensin",
          currentOdometer: Number(recordData.odometer) || 0,
        };
        const updatedVehicles = [defaultVeh];
        setVehicles(updatedVehicles);
        setActiveVehicleId(defaultVeh.id);
        saveStoredVehicles(updatedVehicles, user?.uid);
        targetVehicle = defaultVeh;
      }
    }

    const odoNum = Number(recordData.odometer) || 0;

    if (editingRecord) {
      // Update existing record
      const updated = records.map((r) =>
        r.id === editingRecord.id
          ? {
              ...r,
              ...recordData,
              vehicleId: targetVehicle.id,
              date: recordData.date || r.date,
              odometer: odoNum,
              fuelType: recordData.fuelType || r.fuelType,
              octaneOrGrade: recordData.octaneOrGrade || r.octaneOrGrade,
              liters: Number(recordData.liters) || r.liters,
              pricePerLiter: Number(recordData.pricePerLiter) || r.pricePerLiter,
              totalCost: Number(recordData.totalCost) || r.totalCost,
              stationName: recordData.stationName || r.stationName,
              location: recordData.location || r.location,
              isFullTank: recordData.isFullTank ?? r.isFullTank,
              notes: recordData.notes || r.notes,
              updatedAt: new Date().toISOString(),
            }
          : r
      );
      const calculated = recalculateRecords(updated);
      setRecords(calculated);
      saveStoredFuelRecords(calculated, user?.uid);
      showToast("Catatan pengisian BBM berhasil diperbarui.");
    } else {
      // Create new record
      const nowIso = new Date().toISOString();
      const newRecord: FuelRecord = {
        id: `rec-${Date.now()}`,
        vehicleId: targetVehicle.id,
        date: recordData.date || nowIso.split("T")[0],
        time: recordData.time,
        odometer: odoNum,
        fuelType: recordData.fuelType || "Bensin",
        octaneOrGrade: recordData.octaneOrGrade,
        liters: Number(recordData.liters) || 0,
        pricePerLiter: Number(recordData.pricePerLiter) || 0,
        totalCost: Number(recordData.totalCost) || 0,
        stationName: recordData.stationName || "SPBU",
        location: recordData.location || "-",
        isFullTank: recordData.isFullTank ?? true,
        notes: recordData.notes,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const updated = [newRecord, ...records];
      const calculated = recalculateRecords(updated);
      setRecords(calculated);
      saveStoredFuelRecords(calculated, user?.uid);

      // Automatically update vehicle's current odometer if this entry is higher
      if (odoNum > (targetVehicle.currentOdometer || 0)) {
        const updatedVehicles = vehicles.map((v) =>
          v.id === targetVehicle.id ? { ...v, currentOdometer: odoNum } : v
        );
        setVehicles(updatedVehicles);
        saveStoredVehicles(updatedVehicles, user?.uid);
      }

      showToast("Catatan pengisian BBM berhasil disimpan di perangkat.");
    }
  };

  const handleDeleteFuelRecord = (recordId: string) => {
    const updated = records.filter((r) => r.id !== recordId);
    const calculated = recalculateRecords(updated);
    setRecords(calculated);
    saveStoredFuelRecords(calculated, user?.uid);
    showToast("Catatan pengisian BBM telah dihapus.");
  };

  // Service Reminders Handlers
  const handleSaveServiceItem = (item: ServiceItem) => {
    const exists = services.some((s) => s.id === item.id);
    const updated = exists
      ? services.map((s) => (s.id === item.id ? item : s))
      : [...services, item];

    setServices(updated);
    saveStoredServices(updated, user?.uid);
    showToast(`Pengingat servis "${item.title}" disimpan.`);
  };

  const handleDeleteServiceItem = (serviceId: string) => {
    const updated = services.filter((s) => s.id !== serviceId);
    setServices(updated);
    saveStoredServices(updated, user?.uid);
    showToast("Jadwal servis dihapus.");
  };

  // Service History & Expenses Handlers
  const handleSaveServiceHistory = (entry: ServiceHistoryEntry) => {
    const exists = serviceHistory.some((h) => h.id === entry.id);
    const updated = exists
      ? serviceHistory.map((h) => (h.id === entry.id ? entry : h))
      : [entry, ...serviceHistory];

    setServiceHistory(updated);
    saveStoredServiceHistory(updated, user?.uid);
    showToast(`Riwayat biaya "${entry.title}" dicatat.`);
  };

  const handleDeleteServiceHistory = (id: string) => {
    const updated = serviceHistory.filter((h) => h.id !== id);
    setServiceHistory(updated);
    saveStoredServiceHistory(updated, user?.uid);
    showToast("Catatan riwayat biaya telah dihapus.");
  };

  // Vehicle Handlers
  const handleAddVehicle = (v: Omit<Vehicle, "id">) => {
    const newVeh: Vehicle = {
      ...v,
      id: `v-${Date.now()}`,
    };
    const updated = [...vehicles, newVeh];
    setVehicles(updated);
    saveStoredVehicles(updated, user?.uid);
    setActiveVehicleId(newVeh.id);
    showToast(`Kendaraan baru "${v.name}" ditambahkan.`);
  };

  const handleUpdateVehicle = (v: Vehicle) => {
    const updated = vehicles.map((item) => (item.id === v.id ? v : item));
    setVehicles(updated);
    saveStoredVehicles(updated, user?.uid);
    showToast(`Data kendaraan "${v.name}" diperbarui.`);
  };

  // Device Backup: Export JSON directly to device
  const handleExportDeviceBackup = () => {
    exportDeviceBackup(vehicles, records, services, serviceHistory);
    showToast("Berkas cadangan (.json) berhasil diunduh ke perangkat Anda!");
  };

  // Device Backup: Import JSON file from device
  const handleImportDeviceBackup = (backup: Partial<DeviceBackupPayload>) => {
    if (backup.vehicles && Array.isArray(backup.vehicles) && backup.vehicles.length > 0) {
      setVehicles(backup.vehicles);
      saveStoredVehicles(backup.vehicles, user?.uid);
      setActiveVehicleId(backup.vehicles[0].id);
    }
    if (backup.fuelRecords && Array.isArray(backup.fuelRecords)) {
      setRecords(backup.fuelRecords);
      saveStoredFuelRecords(backup.fuelRecords, user?.uid);
    }
    if (backup.services && Array.isArray(backup.services)) {
      setServices(backup.services);
      saveStoredServices(backup.services, user?.uid);
    }
    if (backup.serviceHistory && Array.isArray(backup.serviceHistory)) {
      setServiceHistory(backup.serviceHistory);
      saveStoredServiceHistory(backup.serviceHistory, user?.uid);
    }
    showToast("Data cadangan berhasil dipulihkan ke perangkat!");
  };

  // Reset all local app data
  const handleResetAllData = () => {
    resetAllAppData();
    setVehicles(getStoredVehicles());
    setRecords([]);
    setServices([]);
    setServiceHistory([]);
    setActiveVehicleId("");
    showToast("Semua data lokal telah dibersihkan.");
  };

  // Auth & Profile UI Handlers
  const handleOpenAuth = (mode: "login" | "register" = "login") => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleOpenProfile = () => {
    setIsProfileModalOpen(true);
  };

  const handleAuthSuccess = (u: User) => {
    setUser(u);
    setIsAuthModalOpen(false);
    showToast(`Selamat datang, ${u.displayName || u.email}!`);
  };

  const handleLoggedOut = async () => {
    try {
      await logoutGoogle();
      setUser(null);
      showToast("Berhasil keluar dari akun.");
    } catch (err: any) {
      showToast(`Gagal keluar: ${err.message || err}`);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="flex items-center gap-3 text-blue-500 mb-3">
          <Fuel className="w-8 h-8 animate-bounce" />
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <div className="text-white font-bold text-sm tracking-wide">
          Memuat Catatan BBM &amp; Servis...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0c1017] text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-900/90 dark:bg-slate-800/95 text-white text-xs font-semibold rounded-full shadow-lg border border-slate-700/60 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200 flex items-center gap-2 max-w-sm text-center">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Offline Status Indicator */}
      <OfflineIndicator />

      {/* Persistent Mobile Android-Style App Header */}
      <AndroidHeader
        activeVehicle={activeVehicle}
        onOpenVehicleSelector={() => setIsVehicleModalOpen(true)}
        user={user}
        onOpenAuth={handleOpenAuth}
        onOpenProfile={handleOpenProfile}
      />

      {/* Main Tab Content */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-5 pb-[max(7rem,calc(env(safe-area-inset-bottom)+6rem))]">
        {/* Tab 1: Dashboard / Home */}
        {activeTab === "home" && (
          <StatsDashboard
            records={records}
            vehicle={activeVehicle}
            serviceHistory={serviceHistory}
            onOpenManualAdd={() => {
              setEditingRecord(null);
              setIsManualModalOpen(true);
            }}
            onOpenManualEntry={() => {
              setEditingRecord(null);
              setIsManualModalOpen(true);
            }}
            onNavigateTab={(tab: NavTab) => setActiveTab(tab)}
            onSelectPriceForEntry={(fuelData) => {
              setEditingRecord(fuelData as any);
              setIsManualModalOpen(true);
            }}
            onOpenRegisterVehicle={() => setIsVehicleModalOpen(true)}
            fuelUnit={fuelUnit}
          />
        )}

        {/* Tab 2: Bensin (Fuel Records & Log) */}
        {(activeTab === "bensin" || activeTab === "log") && (
          <MileageLog
            records={records}
            vehicle={activeVehicle}
            onOpenManualAdd={() => {
              setEditingRecord(null);
              setIsManualModalOpen(true);
            }}
            onOpenManualEntry={() => {
              setEditingRecord(null);
              setIsManualModalOpen(true);
            }}
            onEditRecord={(record) => {
              setEditingRecord(record);
              setIsManualModalOpen(true);
            }}
            onDeleteRecord={handleDeleteFuelRecord}
            onOpenRegisterVehicle={() => setIsVehicleModalOpen(true)}
            fuelUnit={fuelUnit}
          />
        )}

        {/* Tab 3: Biaya (Services & Maintenance) */}
        {activeTab === "biaya" && (
          <BiayaPage
            vehicle={activeVehicle}
            serviceHistory={serviceHistory}
            onSaveExpense={handleSaveServiceHistory}
            onAddExpense={(entry) => {
              const newEntry: ServiceHistoryEntry = {
                ...entry,
                id: `exp-${Date.now()}`,
                createdAt: new Date().toISOString(),
              };
              handleSaveServiceHistory(newEntry);
            }}
            onDeleteExpense={handleDeleteServiceHistory}
            onOpenRegisterVehicle={() => setIsVehicleModalOpen(true)}
          />
        )}

        {/* Tab 4: Laporan Page */}
        {activeTab === "report" && (
          <ReportPage
            vehicle={activeVehicle}
            vehicles={vehicles}
            records={records}
            services={services}
            serviceHistory={serviceHistory}
            fuelUnit={fuelUnit}
            onOpenRegisterVehicle={() => setIsVehicleModalOpen(true)}
          />
        )}

        {/* Tab 5: Setting (Device Storage, Satuan Unit Ukur, Tema, Reset Data) */}
        {activeTab === "setting" && (
          <SettingsPage
            fuelUnit={fuelUnit}
            onChangeFuelUnit={handleChangeFuelUnit}
            vehicles={vehicles}
            records={records}
            serviceHistory={serviceHistory}
            onResetAllData={handleResetAllData}
            onExportDeviceBackup={handleExportDeviceBackup}
            onImportDeviceBackup={handleImportDeviceBackup}
            user={user}
            onOpenAuth={handleOpenAuth}
            onOpenProfile={handleOpenProfile}
            onSignOut={handleLoggedOut}
          />
        )}
      </main>

      {/* Floating Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
      />

      {/* Manual Fuel Record Entry / Edit Modal */}
      <ManualEntryModal
        isOpen={isManualModalOpen}
        onClose={() => {
          setIsManualModalOpen(false);
          setEditingRecord(null);
        }}
        activeVehicle={activeVehicle}
        editingRecord={editingRecord}
        onSaveRecord={handleSaveFuelRecord}
      />

      {/* Vehicle Selector / Switcher Modal */}
      <VehicleSelectorModal
        isOpen={isVehicleModalOpen}
        onClose={() => setIsVehicleModalOpen(false)}
        vehicles={vehicles}
        activeVehicleId={activeVehicle?.id || ""}
        onSelectVehicle={setActiveVehicleId}
        onAddVehicle={handleAddVehicle}
        onUpdateVehicle={handleUpdateVehicle}
      />

      {/* Location Permission Prompt Banner on First Entry */}
      <LocationPermissionBanner
        onLocationUpdated={(loc) => {
          showToast(`📍 Lokasi terdeteksi: ${loc.city}`);
        }}
      />

      {/* Login & Registration Modal (for switching accounts or from Settings) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* User Profile / Account Modal */}
      {user && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          user={user}
          vehiclesCount={vehicles.length}
          recordsCount={records.length}
          onOpenSwitchAccount={() => handleOpenAuth("login")}
          onLoggedOut={handleLoggedOut}
        />
      )}
    </div>
  );
}

export default App;
