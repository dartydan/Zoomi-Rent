import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { readProperties, writeProperties } from "@/lib/property-store";
import { computeRevenueForAssignedUser } from "@/lib/property-revenue";
import type { Property } from "@/lib/property";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    let items: Property[];
    try {
      items = await readProperties();
    } catch (storeErr) {
      console.warn("Property store read failed, returning empty list:", storeErr);
      items = [];
    }
    const withRevenue = await Promise.all(
      items.map(async (p) => {
        const stored = p.revenueGenerated ?? 0;
        let current = 0;
        if (p.assignedUserId != null) {
          try {
            current = await computeRevenueForAssignedUser(p.assignedUserId);
          } catch {
            // keep stored only on error
          }
        }
        return { ...p, revenueGenerated: stored + current };
      })
    );
    return NextResponse.json({ properties: withRevenue });
  } catch (err) {
    console.error("Admin property list error:", err);
    return NextResponse.json(
      { error: "Failed to list properties" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await req.json()) as {
      model?: string;
      purchaseCost?: number;
      notes?: string;
    };
    const model = typeof body.model === "string" ? body.model.trim() : "";
    const purchaseCost = typeof body.purchaseCost === "number" ? body.purchaseCost : 0;
    const notes = typeof body.notes === "string" ? body.notes.trim() : undefined;

    if (!model) {
      return NextResponse.json(
        { error: "Model is required" },
        { status: 400 }
      );
    }

    const items = await readProperties();
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const newItem: Property = {
      id,
      model,
      purchaseCost,
      revenueGenerated: 0,
      notes,
      createdAt: now,
      updatedAt: now,
    };
    items.push(newItem);
    await writeProperties(items);

    return NextResponse.json(newItem, { status: 201 });
  } catch (err) {
    console.error("Admin property create error:", err);
    return NextResponse.json(
      { error: "Failed to create property" },
      { status: 500 }
    );
  }
}
