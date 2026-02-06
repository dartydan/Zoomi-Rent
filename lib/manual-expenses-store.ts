/**
 * Store for manual expense entries.
 * Uses Upstash Redis in production; falls back to file for local dev.
 */
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { Redis } from "@upstash/redis";

export type ManualExpense = {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  description: string;
  createdAt: string; // ISO
};

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "manual-expenses.json");
const REDIS_KEY = "zoomi:manual-expenses";

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

async function readFileStore(): Promise<ManualExpense[]> {
  try {
    await ensureDir();
    const raw = await readFile(FILE_PATH, "utf-8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeFileStore(expenses: ManualExpense[]): Promise<void> {
  await ensureDir();
  await writeFile(FILE_PATH, JSON.stringify(expenses, null, 2), "utf-8");
}

async function readFromStore(): Promise<ManualExpense[]> {
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
  return readFileStore();
}

async function writeToStore(expenses: ManualExpense[]): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(REDIS_KEY, JSON.stringify(expenses));
    return;
  }
  await writeFileStore(expenses);
}

function generateId(): string {
  return `me_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function readManualExpenses(): Promise<ManualExpense[]> {
  const expenses = await readFromStore();
  return expenses.sort((a, b) => a.date.localeCompare(b.date));
}

export async function createManualExpense(
  data: Omit<ManualExpense, "id" | "createdAt">
): Promise<ManualExpense> {
  const expense: ManualExpense = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  const expenses = await readFromStore();
  expenses.push(expense);
  await writeToStore(expenses);
  return expense;
}
