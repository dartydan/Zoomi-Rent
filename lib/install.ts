/**
 * Single install/uninstall record (one lifecycle per location/unit).
 */
export type InstallRecord = {
  id: string;
  installDate: string; // ISO date string
  uninstallDate?: string; // ISO date string
  installAddress?: string;
  notes?: string;
  photoUrls?: string[];
  contractUrls?: string[];
};

/**
 * Install info stored per user in Clerk publicMetadata.install
 */
export type InstallInfo = {
  /** @deprecated Use installs[].installDate. Kept for backward compat. */
  installDate?: string;
  installAddress?: string;
  notes?: string;
  photoUrls?: string[];
  contractUrls?: string[];
  driveFolderId?: string;
  propertyId?: string;
  /** Multiple install/uninstall records. Takes precedence over installDate when present. */
  installs?: InstallRecord[];
};

export const INSTALL_METADATA_KEY = "install" as const;
