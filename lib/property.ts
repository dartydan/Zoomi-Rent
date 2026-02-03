/**
 * Manual status for property. "installed" (green) is derived from assigned + install date.
 */
export type PropertyStatus = "available" | "needs_repair" | "no_longer_owned";

/**
 * Property/asset tracked in admin. Stored in data/properties.json (or DB in production).
 */
export type PropertyUnitType = "Washer" | "Dryer";

export type Property = {
  id: string;
  model: string;
  /** Washer or Dryer. */
  unitType?: PropertyUnitType;
  purchaseCost: number;
  repairCosts: number;
  acquisitionSource?: string;
  revenueGenerated: number;
  notes?: string;
  /** Manual status. Location/assignment is via Unit. */
  status?: PropertyStatus;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type PropertyCreate = Omit<Property, "id" | "createdAt" | "updatedAt">;
export type PropertyUpdate = Partial<Omit<Property, "id" | "createdAt">>;
