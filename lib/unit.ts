/**
 * Unit = washer + dryer pair tied to a location.
 * assignedUserId = null → Warehouse; assignedUserId = customer id → Customer (house).
 * Washer and dryer info are embedded in the unit.
 */
export type MachineStatus = "available" | "needs_repair" | "no_longer_owned";

export type MachineInfo = {
  model?: string;
  brand?: string;
  purchaseCost: number;
  repairCosts: number;
  acquisitionSource?: string;
  revenueGenerated: number;
  notes?: string;
  status?: MachineStatus;
};

export type Unit = {
  id: string;
  assignedUserId: string | null;
  washer: MachineInfo;
  dryer: MachineInfo;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type UnitCreate = Omit<Unit, "id" | "createdAt" | "updatedAt">;
export type UnitUpdate = Partial<Omit<Unit, "id" | "createdAt">>;
