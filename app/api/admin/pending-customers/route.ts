import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireCanEdit } from "@/lib/admin";
import {
  readPendingCustomers,
  addPendingCustomer,
} from "@/lib/pending-customers-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const list = await readPendingCustomers();
    return NextResponse.json({ pendingCustomers: list });
  } catch (err) {
    console.error("Admin pending customers list error:", err);
    return NextResponse.json(
      { error: "Failed to list pending customers" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireCanEdit();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await req.json()) as {
      firstName?: string;
      lastName?: string;
      email?: string;
      address?: string;
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
    };
    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const street = typeof body.street === "string" ? body.street.trim() : "";
    const city = typeof body.city === "string" ? body.city.trim() : "";
    const state = typeof body.state === "string" ? body.state.trim() : "";
    const zip = typeof body.zip === "string" ? body.zip.trim() : "";
    const address = typeof body.address === "string" ? body.address.trim() : "";
    const hasAddress = !!(street || city || state || zip || address);

    if (!firstName && !lastName && !email && !hasAddress) {
      return NextResponse.json(
        { error: "Enter at least one field (name, email, or address)." },
        { status: 400 }
      );
    }

    const item = await addPendingCustomer({
      firstName: firstName || "",
      lastName: lastName || "",
      email: email || "",
      address: address || "",
      street: street || undefined,
      city: city || undefined,
      state: state || undefined,
      zip: zip || undefined,
    });
    return NextResponse.json({ pendingCustomer: item });
  } catch (err) {
    console.error("Admin add pending customer error:", err);
    const msg = err instanceof Error ? err.message : "";
    const userMessage =
      msg.includes("EACCES") || msg.includes("EROFS") || msg.includes("ENOENT")
        ? "Storage unavailable. Configure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for production."
        : "Failed to add customer";
    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}
