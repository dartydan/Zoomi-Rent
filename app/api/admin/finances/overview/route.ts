import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { computeAdminRevenue } from "@/lib/admin-revenue";
import { computeMoneyOut } from "@/lib/finances";
import { readUnits } from "@/lib/unit-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [moneyIn, units] = await Promise.all([
      computeAdminRevenue(),
      readUnits(),
    ]);
    const moneyOut = computeMoneyOut(units);
    return NextResponse.json(
      { moneyIn, moneyOut },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err) {
    console.error("Admin finances overview error:", err);
    return NextResponse.json(
      { error: "Failed to compute finances overview" },
      { status: 500 }
    );
  }
}
