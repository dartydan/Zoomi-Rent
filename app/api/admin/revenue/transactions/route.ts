import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { computeRevenueTransactions } from "@/lib/admin-revenue";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  if (!month || !["last", "this", "next"].includes(month)) {
    return NextResponse.json(
      { error: "Invalid month. Use last, this, or next." },
      { status: 400 }
    );
  }

  try {
    const transactions = await computeRevenueTransactions(month as "last" | "this" | "next");
    return NextResponse.json(
      { transactions },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err) {
    console.error("Admin revenue transactions error:", err);
    return NextResponse.json(
      { error: "Failed to load transactions" },
      { status: 500 }
    );
  }
}
