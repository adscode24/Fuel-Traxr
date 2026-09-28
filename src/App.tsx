import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { User } from "firebase/auth";
import { Loader2 } from "lucide-react";
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
import { isCloudCapableUid } from "./services/firebase";
import {
  ensureUserVault,
  pushVault,
  subscribeVault,
  CloudSyncError,
} from "./services/cloudSync";
import { useOnlineStatus } from "./hooks/useOnlineStatus";

import { AndroidHeader } from "./components/AndroidHeader";
import { AppLogo } from "./components/AppLogo";
import { BottomNav, NavTab } from "./components/BottomNav";
import { MileageLog } from "./components/MileageLog";
import { StatsDashboard } from "./components/StatsDashboard";
import { BiayaPage } from "./components/BiayaPage";
import { ReportPage } from "./components/ReportPage";
import { SettingsPage } from "./components/SettingsPage";
import { ManualEntryModal } from "./components/ManualEntryModal";
import { ExpenseEntryModal } from "./components/ExpenseEntryModal";
import { QuickAddFab } from "./components/QuickAddFab";
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
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FuelRecord | null>(null);

  // Auth & Profile State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">("login");
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Cloud Vault Sync State (online multi-device)
  const [vaultCode, setVaultCode] = useState<string>("");
  const [cloudStatus, setCloudStatus] = useState<
    "local" | "connecting" | "synced" | "syncing" | "error" | "offline"
  >("local");
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const isOnline = useOnlineStatus();
  const applyingCloudRef = useRef(false);
  const justAppliedRef = useRef(false);
  const lastCloudUpdatedAtRef = useRef<string>("");
  const lastPushedAtRef = useRef<string>("");
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Cloud Vault: setup + realtime subscription per akun Firebase asli.
  // Akun lokal/sintetis (usr_...) tetap offline-only dan tidak menyentuh cloud.
  useEffect(() => {
    // Reset penanda antar akun
    lastCloudUpdatedAtRef.current = "";
    lastPushedAtRef.current = "";
    justAppliedRef.current = false;
    applyingCloudRef.current = false;
    if (pushTimerRef.current) {
      clearTimeout(pushTimerRef.current);
      pushTimerRef.current = null;
    }

    if (!user || !isCloudCapableUid(user.uid)) {
      setVaultCode("");
      setCloudStatus("local");
      setCloudError(null);
      setLastSyncedAt(null);
      setIsSyncing(false);
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    setCloudStatus(isOnline ? "connecting" : "offline");
    setCloudError(null);

    (async () => {
      try {
        // Data lokal HP ini sebagai modal awal jika vault belum ada di cloud.
        // Jika akun Firebase baru login di perangkat ini (storage uid masih kosong)
        // tapi ada data Tamu offline, migrasikan data Tamu agar tidak hilang.
        const scopedSnapshot = {
          vehicles: getStoredVehicles(user.uid),
          fuelRecords: getStoredFuelRecords(user.uid),
          services: getStoredServices(user.uid),
          serviceHistory: getStoredServiceHistory(user.uid),
        };
        const scopedEmpty =
          scopedSnapshot.vehicles.length === 0 &&
          scopedSnapshot.fuelRecords.length === 0 &&
          scopedSnapshot.services.length === 0 &&
          scopedSnapshot.serviceHistory.length === 0;
        const guestSnapshot = {
          vehicles: getStoredVehicles(null),
          fuelRecords: getStoredFuelRecords(null),
          services: getStoredServices(null),
          serviceHistory: getStoredServiceHistory(null),
        };
        const guestHasData =
          guestSnapshot.vehicles.length > 0 ||
          guestSnapshot.fuelRecords.length > 0 ||
          guestSnapshot.services.length > 0 ||
          guestSnapshot.serviceHistory.length > 0;
        const localSnapshot = scopedEmpty && guestHasData ? guestSnapshot : scopedSnapshot;
        const vault = await ensureUserVault(user, localSnapshot);
        if (cancelled) return;
        setVaultCode(vault.vaultCode || "");
        lastCloudUpdatedAtRef.current = vault.updatedAt || "";
        setLastSyncedAt(vault.updatedAt || null);

        // Jika cloud punya data lebih baru/lengkap daripada lokal, pakai cloud.
        const localEmpty =
          localSnapshot.vehicles.length === 0 &&
          localSnapshot.fuelRecords.length === 0 &&
          localSnapshot.serviceHistory.length === 0;
        const cloudHasData =
          vault.vehicles.length > 0 ||
          vault.fuelRecords.length > 0 ||
          vault.serviceHistory.length > 0;
        if (localEmpty && cloudHasData) {
          applyingCloudRef.current = true;
          justAppliedRef.current = true;
          setVehicles(vault.vehicles);
          saveStoredVehicles(vault.vehicles, user.uid);
          setActiveVehicleId(vault.vehicles[0]?.id || "");
          const calc = recalculateRecords(vault.fuelRecords);
          setRecords(calc);
          saveStoredFuelRecords(calc, user.uid);
          setServices(vault.services);
          saveStoredServices(vault.services, user.uid);
          setServiceHistory(vault.serviceHistory);
          saveStoredServiceHistory(vault.serviceHistory, user.uid);
          setTimeout(() => {
            applyingCloudRef.current = false;
          }, 0);
        } else if (!localEmpty && !cloudHasData) {
          // HP pertama: vault baru saja dibuat dari localSnapshot di ensureUserVault
          lastPushedAtRef.current = vault.updatedAt || "";
        }

        setCloudStatus(navigator.onLine ? "synced" : "offline");

        unsubscribe = subscribeVault(
          user,
          (remote) => {
            if (cancelled) return;
            if (!remote) return;
            if (remote.vaultCode) setVaultCode(remote.vaultCode);
            // Echo dari push kita sendiri -> jangan timpa balik
            if (remote.updatedAt && remote.updatedAt === lastPushedAtRef.current) {
              lastCloudUpdatedAtRef.current = remote.updatedAt;
              setLastSyncedAt(remote.updatedAt);
              setCloudStatus(navigator.onLine ? "synced" : "offline");
              return;
            }
            if (remote.updatedAt && remote.updatedAt === lastCloudUpdatedAtRef.current) return;
            // Ada edit lokal yang belum terkirim -> menangkan lokal, push akan jalan
            if (pushTimerRef.current) return;
            applyingCloudRef.current = true;
            justAppliedRef.current = true;
            lastCloudUpdatedAtRef.current = remote.updatedAt || "";
            setVehicles(remote.vehicles);
            saveStoredVehicles(remote.vehicles, user.uid);
            setActiveVehicleId((prev) => {
              if (prev && remote.vehicles.some((v) => v.id === prev)) return prev;
              return remote.vehicles[0]?.id || "";
            });
            const calcRemote = recalculateRecords(remote.fuelRecords);
            setRecords(calcRemote);
            saveStoredFuelRecords(calcRemote, user.uid);
            setServices(remote.services);
            saveStoredServices(remote.services, user.uid);
            setServiceHistory(remote.serviceHistory);
            saveStoredServiceHistory(remote.serviceHistory, user.uid);
            setLastSyncedAt(remote.updatedAt || null);
            setCloudStatus(navigator.onLine ? "synced" : "offline");
            setCloudError(null);
            setTimeout(() => {
              applyingCloudRef.current = false;
            }, 0);
          },
          (err: CloudSyncError) => {
            if (cancelled) return;
            if (!navigator.onLine) {
              setCloudStatus("offline");
              setCloudError(null);
            } else {
              setCloudStatus("error");
              setCloudError(err.message);
            }
          }
        );
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = (err as Error)?.message || "Gagal menghubungkan cloud.";
        if (!navigator.onLine) {
          setCloudStatus("offline");
          setCloudError(null);
        } else {
          setCloudStatus("error");
          setCloudError(msg);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
      if (pushTimerRef.current) {
        clearTimeout(pushTimerRef.current);
        pushTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Cloud Vault: dorong setiap perubahan lokal (debounced) agar semua perangkat sinkron.
  useEffect(() => {
    if (!user || !isCloudCapableUid(user.uid)) return;
    if (!vaultCode) return;
    if (applyingCloudRef.current || justAppliedRef.current) {
      justAppliedRef.current = false;
      return;
    }
    if (!navigator.onLine) {
      setCloudStatus("offline");
      return;
    }
    setCloudStatus("syncing");
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(async () => {
      pushTimerRef.current = null;
      if (!navigator.onLine) {
        setCloudStatus("offline");
        return;
      }
      setIsSyncing(true);
      try {
        const updatedAt = await pushVault(user, vaultCode, {
          vehicles,
          fuelRecords: records,
          services,
          serviceHistory,
        });
        lastPushedAtRef.current = updatedAt;
        lastCloudUpdatedAtRef.current = updatedAt;
        setLastSyncedAt(updatedAt);
        setCloudStatus("synced");
        setCloudError(null);
      } catch (err: unknown) {
        const msg = (err as Error)?.message || "Gagal sinkron ke cloud.";
        if (!navigator.onLine) {
          setCloudStatus("offline");
          setCloudError(null);
        } else {
          setCloudStatus("error");
          setCloudError(msg);
        }
      } finally {
        setIsSyncing(false);
      }
    }, 900);
    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, [vehicles, records, services, serviceHistory, user, vaultCode]);

  // Sinkron manual (tombol di Settings)
  const handleSyncNow = useCallback(async () => {
    if (!user || !isCloudCapableUid(user.uid) || !vaultCode) return;
    if (pushTimerRef.current) {
      clearTimeout(pushTimerRef.current);
      pushTimerRef.current = null;
    }
    if (!navigator.onLine) {
      setCloudStatus("offline");
      showToast("Offline — data aman di perangkat, akan tersinkron saat online.");
      return;
    }
    setIsSyncing(true);
    setCloudStatus("syncing");
    try {
      const updatedAt = await pushVault(user, vaultCode, {
        vehicles,
        fuelRecords: records,
        services,
        serviceHistory,
      });
      lastPushedAtRef.current = updatedAt;
      lastCloudUpdatedAtRef.current = updatedAt;
      setLastSyncedAt(updatedAt);
      setCloudStatus("synced");
      setCloudError(null);
      showToast("Cloud tersinkron — semua perangkat kini sama.");
    } catch (err: unknown) {
      setCloudStatus("error");
      setCloudError((err as Error)?.message || "Gagal sinkron.");
      showToast("Gagal sinkron cloud. Coba lagi saat online.");
    } finally {
      setIsSyncing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, vaultCode, vehicles, records, services, serviceHistory]);

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

  // Reset all data (lokal + cloud jika login cloud)
  const handleResetAllData = () => {
    const uid = user?.uid ?? null;
    resetAllAppData(uid);
    setVehicles([]);
    saveStoredVehicles([], uid);
    setRecords([]);
    saveStoredFuelRecords([], uid);
    setServices([]);
    saveStoredServices([], uid);
    setServiceHistory([]);
    saveStoredServiceHistory([], uid);
    setActiveVehicleId("");
    // Push kosong ke cloud otomatis via efek sync; kosongkan penanda echo agar tidak dianggap pantulan
    lastPushedAtRef.current = "";
    showToast(
      user && isCloudCapableUid(user.uid)
        ? "Semua data dihapus di perangkat & cloud."
        : "Semua data lokal telah dibersihkan."
    );
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

  // Refleksikan perubahan online/offline pada badge status cloud
  useEffect(() => {
    if (!user || !isCloudCapableUid(user.uid)) return;
    if (!isOnline) {
      setCloudStatus("offline");
    } else {
      setCloudStatus((prev) => (prev === "offline" ? (vaultCode ? "synced" : "connecting") : prev));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="flex items-center gap-3 mb-3">
          <AppLogo size={56} rounded="rounded-3xl" className="animate-bounce" />
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
        <div className="text-white font-bold text-sm tracking-wide">
          Memuat DigiFuel...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0c1017] text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-[max(0.75rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[60] px-4 py-2 bg-slate-900/90 dark:bg-slate-800/95 text-white text-xs font-semibold rounded-full shadow-lg border border-slate-700/60 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200 flex items-center gap-2 max-w-[92vw] text-center pointer-events-none">
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* Offline + Cloud Status Indicator */}
      <OfflineIndicator
        cloudStatus={cloudStatus}
        cloudError={cloudError}
        isSyncing={isSyncing}
        lastSyncedAt={lastSyncedAt}
      />

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

        {/* Tab 5: Setting (Cloud Vault, Device Storage, Satuan Unit Ukur, Tema, Reset Data) */}
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
            vaultCode={vaultCode}
            cloudStatus={cloudStatus}
            cloudError={cloudError}
            lastSyncedAt={lastSyncedAt}
            isSyncing={isSyncing}
            onSyncNow={handleSyncNow}
          />
        )}
      </main>

      {/* Floating Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
      />

      {/* Floating + : pilihan cepat Catat Bensin / Catat Biaya (khusus Home) */}
      {activeTab === "home" && (
        <QuickAddFab
          onAddFuel={() => {
            setEditingRecord(null);
            setIsManualModalOpen(true);
          }}
          onAddExpense={() => setIsExpenseModalOpen(true)}
        />
      )}

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

      {/* Expense Record Entry (dari FAB Home / halaman Biaya) */}
      <ExpenseEntryModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        vehicle={activeVehicle}
        editingItem={null}
        onSaveExpense={handleSaveServiceHistory}
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
          vaultCode={vaultCode}
          cloudStatus={cloudStatus}
          lastSyncedAt={lastSyncedAt}
        />
      )}
    </div>
  );
}

export default App;
