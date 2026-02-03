/**
 * Unit store backed by Airtable.
 * Maps to user's schema: assigned_user_id, current_location, unit_revenue,
 * washer_brand, washer_model, dryer_brand, dryer_model,
 * unit_acquisition_cost, acquisition_location, additional_costs
 */
import { listRecords, getRecordById, createRecord, updateRecord, findRecordByFormula } from "./airtable";
import type { Unit, MachineInfo } from "./unit";

function fieldsToUnit(rec: { id: string; fields: Record<string, unknown>; createdTime?: string }): Unit {
  const f = rec.fields;
  const createdTime = rec.createdTime ?? null;
  const unitRevenue = Number(f.unit_revenue ?? 0);
  const unitCost = Number(f.unit_acquisition_cost ?? 0);
  const additionalCosts = Number(f.additional_costs ?? 0);
  const acquisitionLocation = f.acquisition_location != null ? String(f.acquisition_location) : undefined;

  return {
    id: rec.id,
    assignedUserId: f.assigned_user_id != null ? String(f.assigned_user_id) : null,
    washer: {
      model: f.washer_model != null ? String(f.washer_model) : undefined,
      brand: f.washer_brand != null ? String(f.washer_brand) : undefined,
      purchaseCost: unitCost,
      repairCosts: additionalCosts,
      acquisitionSource: acquisitionLocation,
      revenueGenerated: unitRevenue / 2,
      notes: undefined,
      status: undefined,
    },
    dryer: {
      model: f.dryer_model != null ? String(f.dryer_model) : undefined,
      brand: f.dryer_brand != null ? String(f.dryer_brand) : undefined,
      purchaseCost: 0,
      repairCosts: 0,
      acquisitionSource: acquisitionLocation,
      revenueGenerated: unitRevenue / 2,
      notes: undefined,
      status: undefined,
    },
    createdAt: createdTime ?? new Date().toISOString(),
    updatedAt: f.updated_at != null ? String(f.updated_at) : createdTime ?? new Date().toISOString(),
  };
}

function unitToFields(u: Unit): Record<string, unknown> {
  const w = u.washer;
  const d = u.dryer;
  const unitCost = w.purchaseCost ?? 0;
  const additionalCosts = w.repairCosts ?? 0;
  const unitRevenue = (w.revenueGenerated ?? 0) + (d.revenueGenerated ?? 0);
  const acquisitionLocation = w.acquisitionSource ?? d.acquisitionSource ?? null;

  return {
    assigned_user_id: u.assignedUserId ?? null,
    current_location: u.assignedUserId ? "" : "Warehouse",
    unit_revenue: unitRevenue,
    washer_brand: w.brand ?? null,
    washer_model: w.model ?? null,
    dryer_brand: d.brand ?? null,
    dryer_model: d.model ?? null,
    unit_acquisition_cost: unitCost,
    acquisition_location: acquisitionLocation,
    additional_costs: additionalCosts,
  };
}

export async function readUnits(): Promise<Unit[]> {
  const records = await listRecords();
  const units = records.map((r) => fieldsToUnit(r));
  units.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return units;
}

export async function getUnitById(id: string): Promise<Unit | null> {
  const rec = await getRecordById(id);
  return rec ? fieldsToUnit(rec) : null;
}

export async function getUnitByUserId(userId: string): Promise<Unit | null> {
  const rec = await findRecordByFormula(`{assigned_user_id} = '${userId.replace(/'/g, "\\'")}'`);
  return rec ? fieldsToUnit(rec) : null;
}

export async function createUnit(u: Unit): Promise<void> {
  const fields = unitToFields(u);
  const { id } = await createRecord(fields);
  u.id = id;
}

export async function updateUnit(u: Unit): Promise<void> {
  const fields = unitToFields({ ...u, updatedAt: new Date().toISOString() });
  await updateRecord(u.id, fields);
}
