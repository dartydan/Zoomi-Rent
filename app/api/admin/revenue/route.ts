import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  computeAdminRevenue,
  computeMRR,
  computeRevenuePast12Months,
} from "@/lib/admin-revenue";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [data, mrr, revenuePast12Months] = await Promise.all([
      computeAdminRevenue(),
      computeMRR(),
      computeRevenuePast12Months(),
    ]);
    return NextResponse.json({ ...data, mrr, revenuePast12Months }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err) {
    console.error("Admin revenue error:", err);
    return NextResponse.json(
      { error: "Failed to compute revenue" },
      { status: 500 }
    );
  }
}
