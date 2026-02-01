/**
 * File-based store for pending customers (added by admin before sign-up).
 * Use a database in production.
 */
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export type PendingCustomer = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  /** Combined for list display; built from street, city, state, zip when present. */
  address: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  createdAt: string;
};

function combineAddress(parts: { street?: string; city?: string; state?: string; zip?: string }): string {
  const { street = "", city = "", state = "", zip = "" } = parts;
  const arr = [street.trim(), city.trim(), state.trim(), zip.trim()].filter(Boolean);
  if (arr.length === 0) return "";
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]}, ${arr[1]}`;
  if (arr.length === 3) return `${arr[0]}, ${arr[1]}, ${arr[2]}`;
  return `${arr[0]}, ${arr[1]}, ${arr[2]} ${arr[3]}`;
}

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "pending-customers.json");

async function ensureDir() {
  try {
    await mkdir(DATA_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

export async function readPendingCustomers(): Promise<PendingCustomer[]> {
  try {
    await ensureDir();
    const raw = await readFile(FILE_PATH, "utf-8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function writePendingCustomers(items: PendingCustomer[]): Promise<void> {
  await ensureDir();
  await writeFile(FILE_PATH, JSON.stringify(items, null, 2), "utf-8");
}

export type PendingCustomerInput = {
  email: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
};

export async function addPendingCustomer(
  data: PendingCustomerInput
): Promise<PendingCustomer> {
  const list = await readPendingCustomers();
  const street = (data.street ?? "").trim();
  const city = (data.city ?? "").trim();
  const state = (data.state ?? "").trim();
  const zip = (data.zip ?? "").trim();
  const combined =
    street || city || state || zip
      ? combineAddress({ street, city, state, zip })
      : (data.address ?? "").trim();

  const existing =
    data.email.trim() !== ""
      ? list.find((p) => p.email.toLowerCase() === data.email.trim().toLowerCase())
      : null;
  if (existing) {
    const updated: PendingCustomer = {
      ...existing,
      firstName: (data.firstName ?? existing.firstName)?.trim() || existing.firstName,
      lastName: (data.lastName ?? existing.lastName)?.trim() || existing.lastName,
      street: street || existing.street,
      city: city || existing.city,
      state: state || existing.state,
      zip: zip || existing.zip,
      address: combined || existing.address,
    };
    const next = list.map((p) => (p.id === existing.id ? updated : p));
    await writePendingCustomers(next);
    return updated;
  }
  const item: PendingCustomer = {
    id: randomUUID(),
    email: data.email?.trim() ?? "",
    firstName: (data.firstName ?? "").trim(),
    lastName: (data.lastName ?? "").trim(),
    street: street || undefined,
    city: city || undefined,
    state: state || undefined,
    zip: zip || undefined,
    address: combined,
    createdAt: new Date().toISOString(),
  };
  list.push(item);
  await writePendingCustomers(list);
  return item;
}

export async function findPendingByEmail(email: string): Promise<PendingCustomer | null> {
  const list = await readPendingCustomers();
  const normalized = email.trim().toLowerCase();
  return list.find((p) => p.email.toLowerCase() === normalized) ?? null;
}

export async function removePendingByEmail(email: string): Promise<void> {
  const list = await readPendingCustomers();
  const normalized = email.trim().toLowerCase();
  const next = list.filter((p) => p.email.toLowerCase() !== normalized);
  if (next.length < list.length) await writePendingCustomers(next);
}
