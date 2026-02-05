/**
 * Unit = washer + dryer pair tied to a location.
 * assignedUserId = null → Warehouse; assignedUserId = customer id → Customer (house).
 * Washer and dryer info are embedded in the unit.
 */
export type MachineStatus = "available" | "needs_repair" | "no_longer_owned";

export type AdditionalCostEntry = {
  amount: number;
  description: string;
  date?: string; // ISO date string
};

export type NoteEntry = {
  text: string;
  date: string; // ISO date string
};

export type MachineInfo = {
  model?: string;
  brand?: string;
  purchaseCost: number;
  repairCosts: number;
  /** Multiple additional cost transactions (repair, parts, etc.). When present, repairCosts is ignored for total. */
  additionalCosts?: AdditionalCostEntry[];
  acquisitionSource?: string;
  acquisitionDate?: string; // ISO date string (YYYY-MM-DD)
  revenueGenerated: number;
  notes?: string;
  /** Feed of notes with dates. When present, used instead of notes for display. */
  notesFeed?: NoteEntry[];
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
