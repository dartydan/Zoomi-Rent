/**
 * Install info stored per user in Clerk publicMetadata.install
 */
export type InstallInfo = {
  installDate?: string; // ISO date string
  installAddress?: string;
  notes?: string;
  photoUrls?: string[]; // Google Drive view URLs
  contractUrls?: string[]; // Google Drive view URLs
  driveFolderId?: string; // Customer's folder ID in Drive
};

export const INSTALL_METADATA_KEY = "install" as const;
