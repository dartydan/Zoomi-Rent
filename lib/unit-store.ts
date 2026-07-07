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
const LEGACY_REDIS_KEYS = [
  "units",
  "zoomi:properties",
  "properties",
  "zoomi:property",
  "property",
];

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

export type UnitStoreDiagnosis = {
  backend: "redis" | "file";
  canonicalCount: number;
  legacyKeyCounts: Record<string, number>;
  fileUnitCount: number;
  fileLegacyPropertyCount: number;
};

export type UnitRecoveryResult = {
  previousTotal: number;
  recovered: number;
  total: number;
  sources: string[];
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

async function readSeedUnitsFromFiles(): Promise<Unit[]> {
  const units = await readUnitsFile();
  const legacyProperties = await readLegacyPropertiesFile();
  return mergeLegacyPropertiesIntoUnits(units, legacyProperties);
}

function parseStoredArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function looksLikeUnit(value: unknown): value is Unit {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Unit>;
  return typeof item.id === "string" && Boolean(item.washer) && Boolean(item.dryer);
}

function looksLikeLegacyProperty(value: unknown): value is LegacyProperty {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<LegacyProperty>;
  return typeof item.id === "string" && (
    typeof item.model === "string" ||
    item.unitType === "Washer" ||
    item.unitType === "Dryer" ||
    typeof item.assignedUserId === "string"
  );
}

function dedupeUnitsById(units: Unit[]): Unit[] {
  return units.filter((unit, index, all) => all.findIndex((u) => u.id === unit.id) === index);
}

function mergeUnitLists(existing: Unit[], incoming: Unit[]): { merged: Unit[]; added: number } {
  const byId = new Map(existing.map((unit) => [unit.id, unit]));
  let added = 0;
  for (const unit of incoming) {
    if (!byId.has(unit.id)) {
      byId.set(unit.id, unit);
      added++;
    }
  }
  return { merged: Array.from(byId.values()), added };
}

type RecoveryScanResult = {
  units: Unit[];
  sources: string[];
  legacyKeyCounts: Record<string, number>;
};

async function readRecoveryUnitsFromRedis(
  redis: Redis,
  options: { scanAllKeys?: boolean } = {}
): Promise<RecoveryScanResult> {
  const candidateKeys = new Set<string>(LEGACY_REDIS_KEYS);
  const legacyKeyCounts: Record<string, number> = {};
  const sources: string[] = [];

  if (options.scanAllKeys) {
    try {
      const keys = await redis.keys("*");
      for (const key of keys) {
        if (/unit|propert/i.test(key)) candidateKeys.add(key);
      }
    } catch {
      // Some Redis-compatible providers disable KEYS. Known legacy keys above are enough for fallback.
    }
  }

  const recoveredUnits: Unit[] = [];
  const legacyProperties: LegacyProperty[] = [];
  const seenUnitIds = new Set<string>();
  const seenPropertyIds = new Set<string>();

  for (const key of candidateKeys) {
    if (key === REDIS_KEY) continue;
    try {
      const values = parseStoredArray(await redis.get(key));
      if (values.length === 0) continue;

      legacyKeyCounts[key] = values.length;
      let contributed = false;

      for (const value of values) {
        if (looksLikeUnit(value) && !seenUnitIds.has(value.id)) {
          recoveredUnits.push(value);
          seenUnitIds.add(value.id);
          contributed = true;
        } else if (looksLikeLegacyProperty(value) && !seenPropertyIds.has(value.id)) {
          legacyProperties.push(value);
          seenPropertyIds.add(value.id);
          contributed = true;
        }
      }

      if (contributed) sources.push(key);
    } catch {
      // Ignore malformed/non-inventory keys.
    }
  }

  const units = mergeLegacyPropertiesIntoUnits(recoveredUnits, legacyProperties);
  if (legacyProperties.length > 0 && units.length > recoveredUnits.length) {
    sources.push("legacy-properties-merge");
  }

  return { units, sources, legacyKeyCounts };
}

async function collectRecoveryUnits(redis: Redis | null, scanAllKeys: boolean): Promise<RecoveryScanResult> {
  const fileUnits = await readSeedUnitsFromFiles();
  const sources: string[] = fileUnits.length > 0 ? ["files"] : [];
  const legacyKeyCounts: Record<string, number> = {};

  if (!redis) {
    return { units: fileUnits, sources, legacyKeyCounts };
  }

  const redisRecovery = await readRecoveryUnitsFromRedis(redis, { scanAllKeys });
  const merged = dedupeUnitsById([...redisRecovery.units, ...fileUnits]);

  return {
    units: merged,
    sources: [...redisRecovery.sources, ...sources],
    legacyKeyCounts: redisRecovery.legacyKeyCounts,
  };
}

async function readUnitsFromStore(): Promise<Unit[]> {
  const redis = getRedis();
  if (redis) {
    try {
      const raw = await redis.get(REDIS_KEY);
      const storedUnits = parseStoredArray(raw).filter(looksLikeUnit);
      const scanAllKeys = storedUnits.length === 0;
      const recovery = await collectRecoveryUnits(redis, scanAllKeys);
      const { merged, added } = mergeUnitLists(storedUnits, recovery.units);

      if (added > 0) {
        console.warn(
          `[unit-store] Recovered ${added} missing unit(s) from [${recovery.sources.join(", ")}]; ` +
            `writing ${merged.length} total to ${REDIS_KEY} (was ${storedUnits.length})`
        );
        await redis.set(REDIS_KEY, JSON.stringify(merged));
      } else if (storedUnits.length === 0 && merged.length > 0) {
        console.warn(
          `[unit-store] Seeded ${merged.length} unit(s) to ${REDIS_KEY} from [${recovery.sources.join(", ")}]`
        );
        await redis.set(REDIS_KEY, JSON.stringify(merged));
      }

      return merged;
    } catch (err) {
      console.error("[unit-store] Failed to read units from Redis:", err);
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
  const legacyProperties = await readLegacyPropertiesFile();
  const withLegacy = mergeLegacyPropertiesIntoUnits(units, legacyProperties);

  if (withLegacy.length !== units.length) {
    console.warn(
      `[unit-store] Merged ${withLegacy.length - units.length} unit(s) from legacy properties file`
    );
    await writeUnitsToStore(withLegacy);
    return withLegacy;
  }

  if (!isRedisBackedStore()) {
    const recoveredUnits = await readSeedUnitsFromFiles();
    if (recoveredUnits.length !== units.length) {
      await writeUnitsToStore(recoveredUnits);
      return recoveredUnits;
    }
  }

  return units;
}

export async function diagnoseUnitsStore(): Promise<UnitStoreDiagnosis> {
  const redis = getRedis();
  const fileUnits = await readUnitsFile();
  const fileLegacyProperties = await readLegacyPropertiesFile();

  if (redis) {
    try {
      const raw = await redis.get(REDIS_KEY);
      const canonicalCount = parseStoredArray(raw).filter(looksLikeUnit).length;
      const recovery = await readRecoveryUnitsFromRedis(redis, { scanAllKeys: true });
      return {
        backend: "redis",
        canonicalCount,
        legacyKeyCounts: recovery.legacyKeyCounts,
        fileUnitCount: fileUnits.length,
        fileLegacyPropertyCount: fileLegacyProperties.length,
      };
    } catch {
      return {
        backend: "redis",
        canonicalCount: 0,
        legacyKeyCounts: {},
        fileUnitCount: fileUnits.length,
        fileLegacyPropertyCount: fileLegacyProperties.length,
      };
    }
  }

  return {
    backend: "file",
    canonicalCount: fileUnits.length,
    legacyKeyCounts: {},
    fileUnitCount: fileUnits.length,
    fileLegacyPropertyCount: fileLegacyProperties.length,
  };
}

export async function recoverUnits(): Promise<UnitRecoveryResult> {
  const redis = getRedis();
  const previousUnits = await readUnitsFromStore();
  const previousTotal = previousUnits.length;

  if (redis) {
    const recovery = await collectRecoveryUnits(redis, true);
    const { merged, added } = mergeUnitLists(previousUnits, recovery.units);

    if (added > 0 || (previousTotal === 0 && merged.length > 0)) {
      console.warn(
        `[unit-store] Manual recovery: ${added} unit(s) added from [${recovery.sources.join(", ")}]; ` +
          `total ${merged.length} (was ${previousTotal})`
      );
      await redis.set(REDIS_KEY, JSON.stringify(merged));
    }

    const withLegacy = mergeLegacyPropertiesIntoUnits(merged, await readLegacyPropertiesFile());
    if (withLegacy.length !== merged.length) {
      await redis.set(REDIS_KEY, JSON.stringify(withLegacy));
    }

    return {
      previousTotal,
      recovered: withLegacy.length - previousTotal,
      total: withLegacy.length,
      sources: recovery.sources,
    };
  }

  const recoveredUnits = await readSeedUnitsFromFiles();
  if (recoveredUnits.length !== previousTotal) {
    await writeUnitsToStore(recoveredUnits);
  }

  return {
    previousTotal,
    recovered: recoveredUnits.length - previousTotal,
    total: recoveredUnits.length,
    sources: recoveredUnits.length > 0 ? ["files"] : [],
  };
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
