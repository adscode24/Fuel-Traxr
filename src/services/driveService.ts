import { getAccessToken, clearGoogleAccessToken } from "./firebaseAuth";

const BACKUP_FILENAME = "bbm_kendaraan_backup.json";
const CACHE_BACKUP_FILE_ID_KEY = "bbm_drive_backup_file_id";

export interface SyncPayload {
  version: number;
  exportedAt: string;
  app: string;
  vehicles: any[];
  fuelRecords: any[];
  services: any[];
  serviceHistory?: any[];
}

// Search for existing file in user's Google Drive
export async function findDriveBackupFile(token: string): Promise<{ id: string; modifiedTime: string } | null> {
  const cachedId = localStorage.getItem(CACHE_BACKUP_FILE_ID_KEY);
  if (cachedId) {
    try {
      const checkRes = await fetch(`https://www.googleapis.com/drive/v3/files/${cachedId}?fields=id,name,modifiedTime,trashed`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (checkRes.status === 401) {
        clearGoogleAccessToken();
        throw new Error("Sesi Google Drive telah kedaluwarsa. Silakan hubungkan kembali akun Google Anda di Pengaturan.");
      }
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (!checkData.trashed && checkData.name === BACKUP_FILENAME) {
          return { id: checkData.id, modifiedTime: checkData.modifiedTime };
        }
      }
      localStorage.removeItem(CACHE_BACKUP_FILE_ID_KEY);
    } catch (e: any) {
      if (e.message?.includes("kedaluwarsa")) throw e;
    }
  }

  const query = encodeURIComponent(`name = '${BACKUP_FILENAME}' and trashed = false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime)`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401) {
    clearGoogleAccessToken();
    throw new Error("Sesi Google Drive telah kedaluwarsa. Silakan hubungkan kembali akun Google Anda di Pengaturan.");
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gagal mencari file di Google Drive: ${err}`);
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    const file = data.files[0];
    localStorage.setItem(CACHE_BACKUP_FILE_ID_KEY, file.id);
    return file;
  }
  return null;
}

// Upload / Update backup to Google Drive
export async function syncDataToGoogleDrive(payload: SyncPayload): Promise<{ fileId: string; modifiedTime: string }> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Sesi Google Drive belum aktif atau kedaluwarsa. Silakan hubungkan akun Google terlebih dahulu.");
  }

  const existingFile = await findDriveBackupFile(token);
  const jsonContent = JSON.stringify(payload, null, 2);

  if (existingFile) {
    // Update existing file content
    const updateRes = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: jsonContent,
      }
    );

    if (updateRes.status === 401) {
      clearGoogleAccessToken();
      throw new Error("Sesi Google Drive telah kedaluwarsa. Silakan hubungkan kembali akun Google Anda di Pengaturan.");
    }

    if (!updateRes.ok) {
      const err = await updateRes.text();
      throw new Error(`Gagal memperbarui file di Google Drive: ${err}`);
    }

    const updated = await updateRes.json();
    localStorage.setItem(CACHE_BACKUP_FILE_ID_KEY, existingFile.id);
    return {
      fileId: existingFile.id,
      modifiedTime: updated.modifiedTime || new Date().toISOString(),
    };
  } else {
    // Create new file with multipart upload
    const metadata = {
      name: BACKUP_FILENAME,
      mimeType: "application/json",
      description: "Data backup catatan BBM & jadwal servis kendaraan",
    };

    const boundary = "-------314159265358979323846";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      "Content-Type: application/json\r\n\r\n" +
      jsonContent +
      closeDelimiter;

    const createRes = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      }
    );

    if (createRes.status === 401) {
      clearGoogleAccessToken();
      throw new Error("Sesi Google Drive telah kedaluwarsa. Silakan hubungkan kembali akun Google Anda di Pengaturan.");
    }

    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Gagal membuat file baru di Google Drive: ${err}`);
    }

    const created = await createRes.json();
    localStorage.setItem(CACHE_BACKUP_FILE_ID_KEY, created.id);
    return {
      fileId: created.id,
      modifiedTime: new Date().toISOString(),
    };
  }
}

// Download backup data from Google Drive
export async function downloadDataFromGoogleDrive(fileId?: string): Promise<SyncPayload> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Sesi Google Drive belum aktif atau kedaluwarsa. Silakan hubungkan akun Google terlebih dahulu.");
  }

  let targetId = fileId;
  if (!targetId) {
    const file = await findDriveBackupFile(token);
    if (!file) {
      throw new Error("File cadangan 'bbm_kendaraan_backup.json' tidak ditemukan di Google Drive Anda.");
    }
    targetId = file.id;
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${targetId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401) {
    clearGoogleAccessToken();
    throw new Error("Sesi Google Drive telah kedaluwarsa. Silakan hubungkan kembali akun Google Anda di Pengaturan.");
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gagal mengunduh file cadangan dari Google Drive: ${err}`);
  }

  return await res.json();
}
