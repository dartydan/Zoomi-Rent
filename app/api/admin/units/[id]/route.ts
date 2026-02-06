import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getUnitById, updateUnit, deleteUnit } from "@/lib/unit-store";
import { computeRevenueForAssignedUser } from "@/lib/property-revenue";
import type { Unit } from "@/lib/unit";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const unit = await getUnitById(id);
    if (!unit) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (unit.assignedUserId) {
      const revenue = await computeRevenueForAssignedUser(unit.assignedUserId);
      const half = revenue / 2;
      return NextResponse.json({
        ...unit,
        washer: { ...unit.washer, revenueGenerated: (unit.washer.revenueGenerated ?? 0) + half },
        dryer: { ...unit.dryer, revenueGenerated: (unit.dryer.revenueGenerated ?? 0) + half },
      });
    }
    return NextResponse.json(unit);
  } catch (err) {
    console.error("Admin unit get error:", err);
    return NextResponse.json(
      { error: "Failed to get unit" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = (await req.json()) as {
      assignedUserId?: string | null;
      washer?: Partial<Unit["washer"]>;
      dryer?: Partial<Unit["dryer"]>;
    };

    const unit = await getUnitById(id);
    if (!unit) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated: Unit = {
      ...unit,
      assignedUserId: body.assignedUserId !== undefined
        ? (typeof body.assignedUserId === "string" && body.assignedUserId.trim() ? body.assignedUserId.trim() : null)
        : unit.assignedUserId,
      washer: body.washer ? { ...unit.washer, ...body.washer } : unit.washer,
      dryer: body.dryer ? { ...unit.dryer, ...body.dryer } : unit.dryer,
      updatedAt: new Date().toISOString(),
    };

    await updateUnit(updated);
    return NextResponse.json(updated);
  } catch (err) {
    console.error("Admin unit update error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update unit" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const unit = await getUnitById(id);
    if (!unit) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await deleteUnit(id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("Admin unit delete error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete unit" },
      { status: 500 }
    );
  }
}
