import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { sendNewCustomerEmail } from "@/lib/send-new-customer-email";

export const dynamic = "force-dynamic";

/** Sends a test "New Customer" email to verify Resend is configured. Admin only. */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await sendNewCustomerEmail({
      firstName: "Test",
      lastName: "Customer",
      email: "test@example.com",
      phone: "(555) 123-4567",
      address: "123 Test St, Test City, TS 12345",
      street: "123 Test St",
      city: "Test City",
      state: "TS",
      zip: "12345",
      desiredInstallTime: "Morning",
      housingType: "rent",
      selectedPlan: "Basic",
    });
    return NextResponse.json({ success: true, message: "Test email sent to business@zoomi.co" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Test email error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
