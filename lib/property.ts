/**
 * Manual status for property. "installed" (green) is derived from assigned + install date.
 */
export type PropertyStatus = "available" | "needs_repair" | "no_longer_owned";

/**
 * Property/asset tracked in admin. Stored in data/properties.json (or DB in production).
 */
export type Property = {
  id: string;
  model: string;
  purchaseCost: number; // cost to purchase the asset
  revenueGenerated: number; // stored cumulative; + current assignment when assigned
  notes?: string;
  assignedUserId?: string; // Clerk user id; when set, revenue is computed from Stripe
  /** Manual status. Green (installed) is automatic when assigned + customer has install date. */
  status?: PropertyStatus;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type PropertyCreate = Omit<Property, "id" | "createdAt" | "updatedAt">;
export type PropertyUpdate = Partial<Omit<Property, "id" | "createdAt">>;
