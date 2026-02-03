/**
 * Airtable REST API client for Units table.
 * Set AIRTABLE_API_KEY, AIRTABLE_BASE_ID, and optionally AIRTABLE_TABLE (default: "Units").
 * Base ID: from URL airtable.com/appXXXXXXXX/... use appXXXXXXXX
 * Table: exact name "Units" or table ID tblXXXXXXXX
 */
const BASE = "https://api.airtable.com/v0";

function getConfig() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID?.trim();
  const table = (process.env.AIRTABLE_TABLE ?? "Units").trim();
  if (!apiKey || !baseId) {
    throw new Error("AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set");
  }
  return { apiKey, baseId, table };
}

async function airtableFetch(
  path: string,
  options: { method?: string; jsonBody?: Record<string, unknown> } = {}
) {
  const { apiKey, baseId, table } = getConfig();
  const { method, jsonBody } = options;
  const tablePart = encodeURIComponent(table);
  const url = `${BASE}/${baseId}/${tablePart}${path}`;
  const res = await fetch(url, {
    method: method ?? "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    ...(jsonBody && { body: JSON.stringify(jsonBody) }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    const msg = err.error?.message ?? `Airtable API error: ${res.status}`;
    if (res.status === 404) {
      throw new Error(
        `${msg}. Check AIRTABLE_BASE_ID (from URL appXXX) and AIRTABLE_TABLE (exact name or tblXXX).`
      );
    }
    throw new Error(msg);
  }
  return res.json();
}

export type AirtableRecord = { id: string; createdTime?: string; fields: Record<string, unknown> };

export async function listRecords(): Promise<AirtableRecord[]> {
  const records: AirtableRecord[] = [];
  let offset: string | undefined;
  do {
    const url = offset ? `?offset=${encodeURIComponent(offset)}` : "";
    const data = (await airtableFetch(url)) as {
      records: AirtableRecord[];
      offset?: string;
    };
    records.push(...data.records);
    offset = data.offset;
  } while (offset);
  return records;
}

export async function getRecordById(id: string): Promise<{ id: string; fields: Record<string, unknown> } | null> {
  try {
    const data = (await airtableFetch(`/${id}`)) as AirtableRecord;
    return data;
  } catch {
    return null;
  }
}

export async function createRecord(fields: Record<string, unknown>): Promise<{ id: string }> {
  const data = (await airtableFetch("", {
    method: "POST",
    jsonBody: { records: [{ fields }] },
  })) as { records: { id: string }[] };
  return { id: data.records[0].id };
}

export async function updateRecord(id: string, fields: Record<string, unknown>): Promise<void> {
  await airtableFetch(`/${id}`, {
    method: "PATCH",
    jsonBody: { fields },
  });
}

export async function findRecordByFormula(formula: string): Promise<AirtableRecord | null> {
  const url = `?filterByFormula=${encodeURIComponent(formula)}&maxRecords=1`;
  const data = (await airtableFetch(url)) as { records: AirtableRecord[] };
  const rec = data.records?.[0];
  return rec ?? null;
}
