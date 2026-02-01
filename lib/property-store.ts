/**
 * File-based store for properties. Use a database in production.
 * Uses Node fs - only use in API routes (Node runtime).
 */
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import type { Property } from "./property";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "properties.json");

async function ensureDir() {
  try {
    await mkdir(DATA_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

export async function readProperties(): Promise<Property[]> {
  try {
    await ensureDir();
    const raw = await readFile(FILE_PATH, "utf-8");
    const data = JSON.parse(raw) as (Property & { name?: string })[];
    if (!Array.isArray(data)) return [];
    return data.map((p) => {
      if ("model" in p) return p as Property;
      if ("name" in p) {
        const q = p as Record<string, unknown> & { name: string };
        const { name, ...rest } = q;
        return { ...rest, model: name } as Property;
      }
      return p as Property;
    });
  } catch {
    return [];
  }
}

export async function writeProperties(items: Property[]): Promise<void> {
  await ensureDir();
  await writeFile(FILE_PATH, JSON.stringify(items, null, 2), "utf-8");
}
