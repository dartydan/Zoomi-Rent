import { NextRequest, NextResponse } from "next/server";
import { findPendingByEmail } from "@/lib/pending-customers-store";

export const dynamic = "force-dynamic";

/**
 * Look up pending customer by email for pre-fill on sign-up.
 * Returns firstName, lastName, address if a pending customer exists.
 */
export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get("email");
    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json({ found: false });
    }

    const pending = await findPendingByEmail(email);
    if (!pending) {
      return NextResponse.json({ found: false });
    }

    const address =
      pending.street || pending.city || pending.state || pending.zip
        ? [pending.street, pending.city, pending.state, pending.zip].filter(Boolean).join(", ")
        : pending.address;
    return NextResponse.json({
      found: true,
      firstName: pending.firstName,
      lastName: pending.lastName,
      address,
      street: pending.street ?? undefined,
      city: pending.city ?? undefined,
      state: pending.state ?? undefined,
      zip: pending.zip ?? undefined,
    });
  } catch (err) {
    console.error("Customer lookup error:", err);
    return NextResponse.json({ found: false });
  }
}
