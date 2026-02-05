/**
 * File-based store for units (washer/dryer pairs).
 * Use a database in production.
 */
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import type { Unit } from "./unit";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "units.json");

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

export async function readUnits(): Promise<Unit[]> {
  const units = await readUnitsFile();
  units.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return units;
}

export async function getUnitById(id: string): Promise<Unit | null> {
  const units = await readUnitsFile();
  return units.find((u) => u.id === id) ?? null;
}

export async function getUnitByUserId(userId: string): Promise<Unit | null> {
  const units = await readUnitsFile();
  return units.find((u) => u.assignedUserId === userId) ?? null;
}

export async function createUnit(u: Unit): Promise<void> {
  const units = await readUnitsFile();
  if (units.some((x) => x.id === u.id)) {
    throw new Error(`Unit with id ${u.id} already exists`);
  }
  units.push(u);
  await writeUnitsFile(units);
}

export async function updateUnit(u: Unit): Promise<void> {
  const units = await readUnitsFile();
  const idx = units.findIndex((x) => x.id === u.id);
  if (idx < 0) {
    throw new Error(`Unit ${u.id} not found`);
  }
  units[idx] = { ...u, updatedAt: new Date().toISOString() };
  await writeUnitsFile(units);
}
