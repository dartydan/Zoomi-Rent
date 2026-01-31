import { google } from "googleapis";
import type { drive_v3 } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/drive"];
const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

function getAuth() {
  if (!SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY) {
    throw new Error("Google Drive: missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY");
  }
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: SERVICE_ACCOUNT_EMAIL,
      private_key: PRIVATE_KEY,
    },
    scopes: SCOPES,
  });
}

function getDrive(): drive_v3.Drive {
  if (!ROOT_FOLDER_ID) {
    throw new Error("Google Drive: missing GOOGLE_DRIVE_ROOT_FOLDER_ID");
  }
  const auth = getAuth();
  return google.drive({ version: "v3", auth });
}

/**
 * Get or create the per-customer folder under the root.
 * Folder name: "{customerId} - {customerName}"
 */
export async function createCustomerFolder(
  customerId: string,
  customerName: string
): Promise<string> {
  const drive = getDrive();
  const folderName = `${customerId} - ${customerName}`.replace(/[/\\?%*:|"<>]/g, "-");

  const existing = await drive.files.list({
    q: `name = '${folderName.replace(/'/g, "''")}' and '${ROOT_FOLDER_ID}' in parents and trashed = false`,
    fields: "files(id)",
    spaces: "drive",
  });

  if (existing.data.files?.length) {
    const id = existing.data.files[0].id;
    if (id) return id;
  }

  const created = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [ROOT_FOLDER_ID!],
    },
    fields: "id",
  });

  const id = created.data.id;
  if (!id) throw new Error("Google Drive: failed to create customer folder");
  return id;
}

/**
 * Get or create a subfolder (e.g. "photos" or "contracts") under the customer folder.
 */
async function getOrCreateSubfolder(parentFolderId: string, subfolderName: string): Promise<string> {
  const drive = getDrive();

  const existing = await drive.files.list({
    q: `name = '${subfolderName}' and '${parentFolderId}' in parents and trashed = false`,
    fields: "files(id)",
    spaces: "drive",
  });

  if (existing.data.files?.length) {
    const id = existing.data.files[0].id;
    if (id) return id;
  }

  const created = await drive.files.create({
    requestBody: {
      name: subfolderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    },
    fields: "id",
  });

  const id = created.data.id;
  if (!id) throw new Error(`Google Drive: failed to create subfolder ${subfolderName}`);
  return id;
}

/**
 * Make a file viewable by anyone with the link and return that URL.
 */
async function setViewableAndGetUrl(drive: drive_v3.Drive, fileId: string): Promise<string> {
  try {
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });
  } catch (e) {
    // Permission may already exist
  }
  return `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
}

/**
 * Upload a file to a folder and return a viewable URL.
 */
export async function uploadFile(
  buffer: Buffer,
  folderId: string,
  fileName: string,
  mimeType: string
): Promise<string> {
  const drive = getDrive();

  const created = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: buffer,
    },
    fields: "id",
  });

  const fileId = created.data.id;
  if (!fileId) throw new Error("Google Drive: failed to upload file");

  return setViewableAndGetUrl(drive, fileId);
}

/**
 * Upload installation photo to customer's photos subfolder. Returns viewable URL.
 */
export async function uploadPhoto(
  buffer: Buffer,
  customerFolderId: string,
  fileName: string,
  mimeType: string
): Promise<string> {
  const photosFolderId = await getOrCreateSubfolder(customerFolderId, "photos");
  return uploadFile(buffer, photosFolderId, fileName, mimeType);
}

/**
 * Upload signed contract to customer's contracts subfolder. Returns viewable URL.
 */
export async function uploadContract(
  buffer: Buffer,
  customerFolderId: string,
  fileName: string
): Promise<string> {
  const contractsFolderId = await getOrCreateSubfolder(customerFolderId, "contracts");
  return uploadFile(buffer, contractsFolderId, fileName, "application/pdf");
}

/**
 * List files in a folder.
 */
export async function listFiles(folderId: string): Promise<drive_v3.Schema$File[]> {
  const drive = getDrive();
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, mimeType, webViewLink)",
    spaces: "drive",
  });
  return res.data.files ?? [];
}

/**
 * Delete a file by ID.
 */
export async function deleteFile(fileId: string): Promise<void> {
  const drive = getDrive();
  await drive.files.delete({ fileId });
}

/**
 * Return viewable URL for a file ID (e.g. from stored InstallInfo).
 */
export function getFileUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
}

/**
 * Check if Google Drive is configured (env vars set).
 */
export function isGoogleDriveConfigured(): boolean {
  return Boolean(ROOT_FOLDER_ID && SERVICE_ACCOUNT_EMAIL && PRIVATE_KEY);
}
