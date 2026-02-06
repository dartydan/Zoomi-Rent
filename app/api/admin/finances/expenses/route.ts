import { NextRequest, NextResponse } from "next/server";
import { requireCanEdit } from "@/lib/admin";
import { createManualExpense } from "@/lib/manual-expenses-store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await requireCanEdit();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const date = typeof body.date === "string" ? body.date.trim() : "";
    const amount = typeof body.amount === "number" ? body.amount : Number(body.amount);
    const description = typeof body.description === "string" ? body.description.trim() : "";

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Invalid date. Use YYYY-MM-DD." },
        { status: 400 }
      );
    }
    if (typeof amount !== "number" || amount <= 0 || !Number.isFinite(amount)) {
      return NextResponse.json(
        { error: "Invalid amount. Must be a positive number." },
        { status: 400 }
      );
    }
    if (!description) {
      return NextResponse.json(
        { error: "Description is required." },
        { status: 400 }
      );
    }

    const expense = await createManualExpense({ date, amount, description });
    return NextResponse.json(expense, { status: 201 });
  } catch (err) {
    console.error("Create manual expense error:", err);
    return NextResponse.json(
      { error: "Failed to create expense" },
      { status: 500 }
    );
  }
}
