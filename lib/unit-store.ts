/**
 * Store for units (washer/dryer pairs).
 * Uses Upstash Redis in production (serverless); falls back to file for local dev.
 */
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { Redis } from "@upstash/redis";
import type { Unit } from "./unit";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "units.json");
const LEGACY_PROPERTIES_FILE_PATH = path.join(DATA_DIR, "properties.json");
const REDIS_KEY = "zoomi:units";

type LegacyProperty = {
  id: string;
  model?: string;
  unitType?: "Washer" | "Dryer";
  purchaseCost?: number;
  repairCosts?: number;
  acquisitionSource?: string;
  revenueGenerated?: number;
  notes?: string;
  status?: "available" | "needs_repair" | "no_longer_owned";
  createdAt?: string;
  updatedAt?: string;
  assignedUserId?: string | null;
};

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function isRedisBackedStore(): boolean {
  return getRedis() !== null;
}

async function ensureDir() {
  try {
    await mkdir(DATA_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

async function readUnitsFile(): Promise<Unit[]> {
  try {
    await ensureDir();
    const raw = await readFile(FILE_PATH, "utf-8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function readLegacyPropertiesFile(): Promise<LegacyProperty[]> {
  try {
    await ensureDir();
    const raw = await readFile(LEGACY_PROPERTIES_FILE_PATH, "utf-8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeUnitsFile(units: Unit[]): Promise<void> {
  await ensureDir();
  await writeFile(FILE_PATH, JSON.stringify(units, null, 2), "utf-8");
}

async function readUnitsFromStore(): Promise<Unit[]> {
  const redis = getRedis();
  if (redis) {
    try {
      const raw = await redis.get(REDIS_KEY);
      if (raw == null) return [];
      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }
  return readUnitsFile();
}

async function writeUnitsToStore(units: Unit[]): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(REDIS_KEY, JSON.stringify(units));
    return;
  }
  await writeUnitsFile(units);
}

function emptyMachine() {
  return {
    model: undefined,
    purchaseCost: 0,
    repairCosts: 0,
    acquisitionSource: undefined,
    revenueGenerated: 0,
    notes: undefined,
    status: undefined,
  };
}

function normalizeLegacyType(value: LegacyProperty["unitType"]): "Washer" | "Dryer" | null {
  return value === "Washer" || value === "Dryer" ? value : null;
}

function buildMachineFromLegacy(property: LegacyProperty) {
  return {
    model: property.model,
    purchaseCost: property.purchaseCost ?? 0,
    repairCosts: property.repairCosts ?? 0,
    acquisitionSource: property.acquisitionSource,
    revenueGenerated: property.revenueGenerated ?? 0,
    notes: property.notes,
    status: property.status,
  };
}

function mergeLegacyPropertiesIntoUnits(units: Unit[], legacyProperties: LegacyProperty[]): Unit[] {
  if (legacyProperties.length === 0) return units;

  const importedIds = new Set(
    units.flatMap((unit) => unit.legacyPropertyIds ?? [])
  );
  const pending = legacyProperties.filter((property) => property.id && !importedIds.has(property.id));
  if (pending.length === 0) return units;

  const nextUnits = [...units];
  const grouped = new Map<string, LegacyProperty[]>();

  for (const property of pending) {
    const groupKey = property.assignedUserId?.trim() || `legacy-unassigned:${property.id}`;
    const items = grouped.get(groupKey);
    if (items) items.push(property);
    else grouped.set(groupKey, [property]);
  }

  for (const [, group] of grouped) {
    let washer = group.find((item) => normalizeLegacyType(item.unitType) === "Washer") ?? null;
    let dryer = group.find((item) => normalizeLegacyType(item.unitType) === "Dryer") ?? null;
    const unknown = group.filter((item) => normalizeLegacyType(item.unitType) === null);

    for (const property of unknown) {
      if (!washer) washer = property;
      else if (!dryer) dryer = property;
      else {
        nextUnits.push({
          id: crypto.randomUUID(),
          assignedUserId: property.assignedUserId?.trim() || null,
          legacyPropertyIds: [property.id],
          washer: buildMachineFromLegacy(property),
          dryer: emptyMachine(),
          createdAt: property.createdAt ?? new Date().toISOString(),
          updatedAt: property.updatedAt ?? property.createdAt ?? new Date().toISOString(),
        });
      }
    }

    if (!washer && !dryer) continue;

    const createdAtCandidates = [washer?.createdAt, dryer?.createdAt].filter(Boolean) as string[];
    const updatedAtCandidates = [washer?.updatedAt, dryer?.updatedAt].filter(Boolean) as string[];

    nextUnits.push({
      id: crypto.randomUUID(),
      assignedUserId: washer?.assignedUserId?.trim() || dryer?.assignedUserId?.trim() || null,
      legacyPropertyIds: [washer?.id, dryer?.id].filter(Boolean) as string[],
      washer: washer ? buildMachineFromLegacy(washer) : emptyMachine(),
      dryer: dryer ? buildMachineFromLegacy(dryer) : emptyMachine(),
      createdAt: createdAtCandidates.sort()[0] ?? new Date().toISOString(),
      updatedAt: updatedAtCandidates.sort().slice(-1)[0] ?? createdAtCandidates.sort()[0] ?? new Date().toISOString(),
    });
  }

  return nextUnits;
}

async function readUnitsWithLegacyRecovery(): Promise<Unit[]> {
  const units = await readUnitsFromStore();
  if (isRedisBackedStore()) {
    return units;
  }
  const legacyProperties = await readLegacyPropertiesFile();
  const recoveredUnits = mergeLegacyPropertiesIntoUnits(units, legacyProperties);

  if (recoveredUnits.length !== units.length) {
    await writeUnitsToStore(recoveredUnits);
  }

  return recoveredUnits;
}

export async function readUnits(): Promise<Unit[]> {
  const units = await readUnitsWithLegacyRecovery();
  units.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return units;
}

export async function getUnitById(id: string): Promise<Unit | null> {
  const units = await readUnitsWithLegacyRecovery();
  return units.find((u) => u.id === id) ?? null;
}

export async function getUnitByUserId(userId: string): Promise<Unit | null> {
  const units = await readUnitsWithLegacyRecovery();
  return units.find((u) => u.assignedUserId === userId) ?? null;
}

export async function createUnit(u: Unit): Promise<void> {
  const units = await readUnitsFromStore();
  if (units.some((x) => x.id === u.id)) {
    throw new Error(`Unit with id ${u.id} already exists`);
  }
  units.push(u);
  await writeUnitsToStore(units);
}

export async function updateUnit(u: Unit): Promise<void> {
  const units = await readUnitsFromStore();
  const idx = units.findIndex((x) => x.id === u.id);
  if (idx < 0) {
    throw new Error(`Unit ${u.id} not found`);
  }
  units[idx] = { ...u, updatedAt: new Date().toISOString() };
  await writeUnitsToStore(units);
}

export async function deleteUnit(id: string): Promise<void> {
  const units = await readUnitsFromStore();
  const filtered = units.filter((x) => x.id !== id);
  if (filtered.length === units.length) {
    throw new Error(`Unit ${id} not found`);
  }
  await writeUnitsToStore(filtered);
}
