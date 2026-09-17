import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  getStoredServices,
  saveStoredServices,
  getStoredServiceHistory,
  saveStoredServiceHistory,
  resetAllAppData,
} from "./services/storage";
import { initAuth, googleSignIn, logoutGoogle } from "./services/firebaseAuth";
import {
  syncDataToGoogleDrive,
  downloadDataFromGoogleDrive,
  SyncPayload,
} from "./services/driveService";
import {
  syncAllToGoogleSpreadsheet,
  getCachedSpreadsheetInfo,
  SpreadsheetInfo,
} from "./services/sheetsService";

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
import { AuthPage } from "./components/AuthPage";
import { UserProfileModal } from "./components/UserProfileModal";
import { getStoredUserLocation, UserLocationInfo } from "./services/locationService";

export function App() {
  // Auth state & loading
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Core Data States
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

  // Google Drive, Spreadsheet & Auth State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">("login");
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [autoSync, setAutoSync] = useState<boolean>(() => {
    return localStorage.getItem("bbm_auto_sync") !== "false";
  });
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [spreadsheetInfo, setSpreadsheetInfo] = useState<SpreadsheetInfo | null>(() =>
    getCachedSpreadsheetInfo()
  );
  const [isSyncingSpreadsheet, setIsSyncingSpreadsheet] = useState(false);
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
        setSpreadsheetInfo(getCachedSpreadsheetInfo());
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
        setSpreadsheetInfo(getCachedSpreadsheetInfo());
      }
    );
    return () => unsubscribe();
  }, []);

  // Save autoSync setting
  useEffect(() => {
    localStorage.setItem("bbm_auto_sync", autoSync ? "true" : "false");
  }, [autoSync]);

  // Active Vehicle Object (null if user has not registered any vehicle yet)
  const activeVehicle = useMemo<Vehicle | null>(() => {
    if (vehicles.length === 0) return null;
    const found = vehicles.find((v) => v.id === activeVehicleId);
    if (found) return found;
    return vehicles[0] || null;
  }, [vehicles, activeVehicleId]);

  // Filter records for active vehicle, sorted newest first
  const activeVehicleRecords = useMemo(() => {
    if (!activeVehicle) return [];
    return records
      .filter((r) => r.vehicleId === activeVehicle.id)
      .sort((a, b) => b.date.localeCompare(a.date) || b.odometer - a.odometer);
  }, [records, activeVehicle]);

  // Filter services for active vehicle
  const activeVehicleServices = useMemo(() => {
    if (!activeVehicle) return [];
    return services.filter((s) => s.vehicleId === activeVehicle.id);
  }, [services, activeVehicle]);

  // Filter service history for active vehicle
  const activeVehicleServiceHistory = useMemo(() => {
    if (!activeVehicle) return [];
    return serviceHistory
      .filter((h) => h.vehicleId === activeVehicle.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [serviceHistory, activeVehicle]);

  // Payload for Google Drive Sync
  const getFullPayload = useCallback((): SyncPayload => {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      app: "BBM & Servis Kendaraan",
      vehicles,
      fuelRecords: records,
      services,
      serviceHistory,
    };
  }, [vehicles, records, services, serviceHistory]);

  // Trigger background auto sync if enabled (both Google Drive and Google Sheets)
  const triggerAutoSync = useCallback(async () => {
    if (!user || !autoSync) return;
    try {
      setIsSyncing(true);
      const payload: SyncPayload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        app: "BBM & Servis Kendaraan",
        vehicles,
        fuelRecords: records,
        services,
        serviceHistory,
      };
      await syncDataToGoogleDrive(payload);
      const timeStr = new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setLastSyncedAt(timeStr);
    } catch (err: any) {
      console.warn("Auto-sync to Google Drive skipped or failed:", err);
    } finally {
      setIsSyncing(false);
    }

    // Auto-sync to Google Spreadsheet
    try {
      const sheetRes = await syncAllToGoogleSpreadsheet({
        vehicles,
        fuelRecords: records,
        serviceHistory,
        services,
        userEmail: user.email || undefined,
      });
      setSpreadsheetInfo(sheetRes);
    } catch (sheetErr: any) {
      console.warn("Auto-sync to Google Sheets skipped or failed:", sheetErr);
    }
  }, [user, autoSync, vehicles, records, services, serviceHistory]);

  // Sync to drive and spreadsheet whenever records, vehicles, services, or serviceHistory change
  useEffect(() => {
    if (user && autoSync) {
      const timer = setTimeout(() => {
        triggerAutoSync();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [records, vehicles, services, serviceHistory, user, autoSync, triggerAutoSync]);

  // Add or Edit Fuel Record
  const handleSaveFuelRecord = (data: Partial<FuelRecord>) => {
    if (!activeVehicle && vehicles.length === 0) {
      setIsVehicleModalOpen(true);
      showToast("Silakan daftarkan kendaraan Anda terlebih dahulu.");
      return;
    }

    const targetVehicleId = activeVehicle?.id || vehicles[0]?.id || "";
    let updatedRecords: FuelRecord[];
    const isEdit = Boolean(data.id);

    if (isEdit) {
      updatedRecords = records.map((r) =>
        r.id === data.id ? ({ ...r, ...data } as FuelRecord) : r
      );
    } else {
      // Calculate distance traveled and efficiency compared to previous record
      const prevRecords = records
        .filter((r) => r.vehicleId === targetVehicleId)
        .sort((a, b) => b.odometer - a.odometer);

      const lastRecord = prevRecords[0];
      let distanceTraveled: number | undefined;
      let fuelEfficiencyKmPerL: number | undefined;
      let costPerKm: number | undefined;

      const newOdometer = Number(data.odometer);
      const liters = Number(data.liters);
      const totalCost = Number(data.totalCost);

      if (lastRecord && newOdometer > lastRecord.odometer) {
        distanceTraveled = newOdometer - lastRecord.odometer;
        if (liters > 0) {
          fuelEfficiencyKmPerL = Number((distanceTraveled / liters).toFixed(2));
        }
        if (distanceTraveled > 0) {
          costPerKm = Number((totalCost / distanceTraveled).toFixed(2));
        }
      }

      const newRecord: FuelRecord = {
        id: `f-${Date.now()}`,
        vehicleId: targetVehicleId,
        date: data.date || new Date().toISOString().slice(0, 10),
        time: data.time || new Date().toTimeString().slice(0, 5),
        odometer: newOdometer,
        distanceTraveled,
        fuelType: data.fuelType || "Pertalite",
        octaneOrGrade: data.octaneOrGrade || "90",
        liters,
        pricePerLiter: Number(data.pricePerLiter),
        totalCost,
        stationName: data.stationName || "SPBU Pertamina",
        location: data.location || "Indonesia",
        isFullTank: data.isFullTank ?? true,
        notes: data.notes,
        fuelEfficiencyKmPerL,
        costPerKm,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      updatedRecords = [newRecord, ...records];
    }

    setRecords(updatedRecords);
    saveStoredFuelRecords(updatedRecords, user?.uid);

    // Update vehicle's current odometer if newer
    if (activeVehicle && data.odometer && data.odometer > activeVehicle.currentOdometer) {
      const updatedVehicles = vehicles.map((v) =>
        v.id === activeVehicle.id
          ? { ...v, currentOdometer: Number(data.odometer) }
          : v
      );
      setVehicles(updatedVehicles);
      saveStoredVehicles(updatedVehicles, user?.uid);
    }

    showToast(
      isEdit ? "Catatan BBM berhasil diperbarui!" : "Catatan BBM berhasil disimpan!"
    );
  };

  // Delete Fuel Record
  const handleDeleteRecord = (id: string) => {
    const updated = records.filter((r) => r.id !== id);
    setRecords(updated);
    saveStoredFuelRecords(updated, user?.uid);
    showToast("Catatan pengisian BBM dihapus.");
  };

  // Service History Handlers
  const handleAddServiceHistory = (
    entry: Omit<ServiceHistoryEntry, "id" | "createdAt">
  ) => {
    const newEntry: ServiceHistoryEntry = {
      ...entry,
      id: `sh-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [newEntry, ...serviceHistory];
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

  // Google Drive Connection & Restore Handlers
  const handleConnectGoogle = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        showToast(`Terhubung dengan Google Drive & Spreadsheet (${res.user.email})`);
      }
    } catch (err: any) {
      showToast(`Gagal menghubungkan Google: ${err.message || err}`);
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await logoutGoogle();
      setUser(null);
      showToast("Koneksi Google telah diputuskan.");
    } catch (err: any) {
      showToast(`Gagal memutuskan koneksi: ${err.message || err}`);
    }
  };

  const handleManualSync = async () => {
    if (!user) {
      showToast("Silakan hubungkan akun Google terlebih dahulu.");
      return;
    }
    try {
      setIsSyncing(true);
      const payload = getFullPayload();
      await syncDataToGoogleDrive(payload);
      const timeStr = new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setLastSyncedAt(timeStr);
      showToast("Data armada berhasil dicadangkan ke Google Drive!");
    } catch (err: any) {
      showToast(`Gagal mencadangkan: ${err.message || err}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncSpreadsheet = async () => {
    if (!user) {
      showToast("Silakan hubungkan akun Google terlebih dahulu.");
      return;
    }
    try {
      setIsSyncingSpreadsheet(true);
      const info = await syncAllToGoogleSpreadsheet({
        vehicles,
        fuelRecords: records,
        serviceHistory,
        services,
        userEmail: user.email || undefined,
      });
      setSpreadsheetInfo(info);
      showToast("Data berhasil disinkronkan ke Google Spreadsheet!");
    } catch (err: any) {
      showToast(`Gagal sinkron spreadsheet: ${err.message || err}`);
    } finally {
      setIsSyncingSpreadsheet(false);
    }
  };

  const handleRestoreFromDrive = async () => {
    if (!user) {
      showToast("Silakan hubungkan akun Google Drive terlebih dahulu.");
      return;
    }
    try {
      setIsSyncing(true);
      const backup = await downloadDataFromGoogleDrive();
      if (backup.vehicles && backup.vehicles.length > 0) {
        setVehicles(backup.vehicles);
        saveStoredVehicles(backup.vehicles, user.uid);
        setActiveVehicleId(backup.vehicles[0].id);
      }
      if (backup.fuelRecords) {
        setRecords(backup.fuelRecords);
        saveStoredFuelRecords(backup.fuelRecords, user.uid);
      }
      if (backup.services) {
        setServices(backup.services);
        saveStoredServices(backup.services, user.uid);
      }
      if (backup.serviceHistory) {
        setServiceHistory(backup.serviceHistory);
        saveStoredServiceHistory(backup.serviceHistory, user.uid);
      }
      showToast("Data cadangan berhasil dipulihkan dari Google Drive!");
    } catch (err: any) {
      showToast(`Gagal memulihkan data: ${err.message || err}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Reset all data handler for SettingsPage
  const handleResetAllData = () => {
    resetAllAppData(user?.uid);
    const freshVehicles = getStoredVehicles(user?.uid);
    setVehicles(freshVehicles);
    setActiveVehicleId(freshVehicles[0]?.id || "");
    setRecords([]);
    setServices([]);
    setServiceHistory([]);
    showToast("Semua data berhasil dibersihkan.");
  };

  const handleOpenAuth = (mode: "login" | "register" = "login") => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleOpenProfile = () => {
    setIsProfileModalOpen(true);
  };

  const handleAuthSuccess = (u: User) => {
    setUser(u);
    const scopedVehicles = getStoredVehicles(u.uid);
    setVehicles(scopedVehicles);
    setActiveVehicleId(scopedVehicles[0]?.id || "");
    setRecords(getStoredFuelRecords(u.uid));
    setServices(getStoredServices(u.uid));
    setServiceHistory(getStoredServiceHistory(u.uid));
    setSpreadsheetInfo(getCachedSpreadsheetInfo());
    showToast(`Selamat datang, ${u.displayName || u.email}!`);
  };

  const handleLoggedOut = () => {
    setUser(null);
    const guestVehicles = getStoredVehicles(null);
    setVehicles(guestVehicles);
    setActiveVehicleId(guestVehicles[0]?.id || "");
    setRecords(getStoredFuelRecords(null));
    setServices(getStoredServices(null));
    setServiceHistory(getStoredServiceHistory(null));
    setSpreadsheetInfo(getCachedSpreadsheetInfo());
    showToast("Anda telah keluar dari akun.");
  };

  // 1. Initial Auth Loading State
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center animate-pulse mb-3 shadow-lg shadow-blue-500/25">
          <Fuel className="w-6 h-6" />
        </div>
        <div className="flex items-center gap-2 text-slate-300 text-xs font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          <span>Memuat aplikasi...</span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated State: Mandatory Login / Register Page per request
  if (!user) {
    return (
      <AuthPage
        onAuthSuccess={(loggedInUser) => {
          handleAuthSuccess(loggedInUser);
        }}
      />
    );
  }

  // 3. Authenticated User View
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f141f] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors selection:bg-blue-600 selection:text-white">
      {/* Android Top App Bar */}
      <AndroidHeader
        activeVehicle={activeVehicle}
        onOpenVehicleSelector={() => setIsVehicleModalOpen(true)}
        user={user}
        onOpenAuth={handleOpenAuth}
        onOpenProfile={handleOpenProfile}
      />

      {/* Floating Toast Alert */}
      {toastMessage && (
        <div className="fixed top-16 inset-x-0 z-50 flex justify-center px-4 pointer-events-none animate-in fade-in slide-in-from-top-2">
          <div className="bg-slate-900 dark:bg-[#1e2738] border border-slate-700 dark:border-blue-500/50 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            {toastMessage}
          </div>
        </div>
      )}

      {/* Main Content Area with generous bottom padding for floating dock nav */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-3.5 sm:p-4 pb-28 sm:pb-32">
        {/* Tab 1: Home (Halaman Utama / Grafik & Statistik) */}
        {activeTab === "home" && (
          <StatsDashboard
            vehicle={activeVehicle}
            records={activeVehicleRecords}
            serviceHistory={activeVehicleServiceHistory}
            fuelUnit={fuelUnit}
            onOpenManualAdd={() => {
              setEditingRecord(null);
              setIsManualModalOpen(true);
            }}
            onNavigateTab={setActiveTab}
            onOpenRegisterVehicle={() => setIsVehicleModalOpen(true)}
          />
        )}

        {/* Tab 2: Catatan Pengisian BBM */}
        {activeTab === "log" && (
          <MileageLog
            vehicle={activeVehicle}
            records={activeVehicleRecords}
            fuelUnit={fuelUnit}
            onOpenManualAdd={() => {
              setEditingRecord(null);
              setIsManualModalOpen(true);
            }}
            onDeleteRecord={handleDeleteRecord}
            onEditRecord={(record) => {
              setEditingRecord(record);
              setIsManualModalOpen(true);
            }}
            onOpenRegisterVehicle={() => setIsVehicleModalOpen(true)}
          />
        )}

        {/* Tab 3: Riwayat Biaya Manual (Service, Top Up Etoll, Lainnya) */}
        {activeTab === "biaya" && (
          <BiayaPage
            vehicle={activeVehicle}
            serviceHistory={activeVehicleServiceHistory}
            onAddExpense={handleAddServiceHistory}
            onDeleteExpense={handleDeleteServiceHistory}
            onOpenRegisterVehicle={() => setIsVehicleModalOpen(true)}
          />
        )}

        {/* Tab 4: Laporan Page (with Date Range & Vehicle Filters + Exports) */}
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

        {/* Tab 5: Setting (Google Drive, Spreadsheet, Satuan Unit Ukur, Tema, Reset Data) */}
        {activeTab === "setting" && (
          <SettingsPage
            fuelUnit={fuelUnit}
            onChangeFuelUnit={handleChangeFuelUnit}
            vehicles={vehicles}
            records={records}
            serviceHistory={serviceHistory}
            onResetAllData={handleResetAllData}
            user={user}
            autoSync={autoSync}
            onToggleAutoSync={setAutoSync}
            isSyncing={isSyncing}
            lastSyncedAt={lastSyncedAt}
            onConnectGoogle={handleConnectGoogle}
            onDisconnectGoogle={handleDisconnectGoogle}
            onManualSync={handleManualSync}
            onRestoreFromDrive={handleRestoreFromDrive}
            spreadsheetInfo={spreadsheetInfo}
            isSyncingSpreadsheet={isSyncingSpreadsheet}
            onSyncSpreadsheet={handleSyncSpreadsheet}
            onOpenAuth={handleOpenAuth}
            onOpenProfile={handleOpenProfile}
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
