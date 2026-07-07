import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireCanEdit } from "@/lib/admin";
import { diagnoseUnitsStore, recoverUnits } from "@/lib/unit-store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorizedByRecoverySecret(req: NextRequest): boolean {
  const secret = process.env.UNITS_RECOVERY_SECRET?.trim();
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorizedByRecoverySecret(req)) {
    try {
      await requireAdmin();
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    const diagnosis = await diagnoseUnitsStore();
    return NextResponse.json(diagnosis);
  } catch (err) {
    console.error("Admin units diagnose error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to diagnose unit store" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!authorizedByRecoverySecret(req)) {
    try {
      await requireCanEdit();
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    const result = await recoverUnits();
    return NextResponse.json(result);
  } catch (err) {
    console.error("Admin units recover error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to recover units" },
      { status: 500 }
    );
  }
}
