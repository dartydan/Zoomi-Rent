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
const REDIS_KEY = "zoomi:units";

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
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

export async function readUnits(): Promise<Unit[]> {
  const units = await readUnitsFromStore();
  units.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return units;
}

export async function getUnitById(id: string): Promise<Unit | null> {
  const units = await readUnitsFromStore();
  return units.find((u) => u.id === id) ?? null;
}

export async function getUnitByUserId(userId: string): Promise<Unit | null> {
  const units = await readUnitsFromStore();
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
