import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { readUnits, createUnit, getUnitByUserId } from "@/lib/unit-store";
import { computeRevenueForAssignedUser } from "@/lib/property-revenue";
import type { Unit } from "@/lib/unit";

export const dynamic = "force-dynamic";

const emptyMachine = (): Unit["washer"] => ({
  model: undefined,
  purchaseCost: 0,
  repairCosts: 0,
  acquisitionSource: undefined,
  revenueGenerated: 0,
  notes: undefined,
  status: undefined,
});

function enrichWithRevenue(units: Unit[]): Promise<Unit[]> {
  return Promise.all(
    units.map(async (u) => {
      if (!u.assignedUserId) return u;
      const revenue = await computeRevenueForAssignedUser(u.assignedUserId);
      const half = revenue / 2;
      return {
        ...u,
        washer: { ...u.washer, revenueGenerated: (u.washer.revenueGenerated ?? 0) + half },
        dryer: { ...u.dryer, revenueGenerated: (u.dryer.revenueGenerated ?? 0) + half },
      };
    })
  ).then((r) => r as Unit[]);
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (userId) {
      const unit = await getUnitByUserId(userId);
      if (!unit) return NextResponse.json(null);
      const [enriched] = await enrichWithRevenue([unit]);
      return NextResponse.json(enriched);
    }
    const units = await readUnits();
    const enriched = await enrichWithRevenue(units);
    return NextResponse.json({ units: enriched });
  } catch (err) {
    console.error("Admin units list error:", err);
    const msg = err instanceof Error ? err.message : "Failed to list units";
    return NextResponse.json(
      { error: msg },
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
      assignedUserId?: string | null;
    };
    const assignedUserId = typeof body.assignedUserId === "string" && body.assignedUserId.trim() ? body.assignedUserId.trim() : null;

    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const newUnit: Unit = {
      id,
      assignedUserId,
      washer: emptyMachine(),
      dryer: emptyMachine(),
      createdAt: now,
      updatedAt: now,
    };
    await createUnit(newUnit);

    return NextResponse.json(newUnit, { status: 201 });
  } catch (err) {
    console.error("Admin unit create error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create unit" },
      { status: 500 }
    );
  }
}
