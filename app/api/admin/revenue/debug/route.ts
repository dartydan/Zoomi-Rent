import { NextResponse } from "next/server";
import Stripe from "stripe";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

/** Debug endpoint to inspect why subscriptions might not show in revenue. Disabled in production. */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const now = Math.floor(Date.now() / 1000);
  const d = new Date();
  const thisMonthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime() / 1000;
  const thisMonthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime() / 1000;
  const nextMonthStart = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime() / 1000;
  const nextMonthEnd = new Date(d.getFullYear(), d.getMonth() + 2, 0, 23, 59, 59).getTime() / 1000;

  const subs: Array<{
    id: string;
    status: string;
    current_period_end: number | null;
    latest_invoice: string | object | null;
    latest_invoice_status?: string;
    latest_invoice_due_date?: number | null;
    collection_method?: string;
    items_count: number;
  }> = [];

  for (const status of ["active", "trialing", "past_due", "incomplete"] as const) {
    const list = await stripe.subscriptions.list({
      status,
      limit: 20,
      expand: ["data.latest_invoice"],
    });
    for (const sub of list.data) {
      const li = sub.latest_invoice;
      const inv = typeof li === "object" && li && !("deleted" in li) ? (li as Stripe.Invoice) : null;
      subs.push({
        id: sub.id,
        status: sub.status,
        current_period_end: sub.current_period_end ?? null,
        latest_invoice: li ? (typeof li === "string" ? li : { id: (li as Stripe.Invoice).id }) : null,
        latest_invoice_status: inv?.status ?? undefined,
        latest_invoice_due_date: inv?.due_date ?? null,
        collection_method: (inv as Stripe.Invoice & { collection_method?: string })?.collection_method,
        items_count: sub.items?.data?.length ?? 0,
      });
    }
  }

  const openInvoices: Array<{
    id: string;
    subscription: string | null;
    due_date: number | null;
    amount_due: number;
    status: string;
  }> = [];
  for (const status of ["draft", "open"] as const) {
    const list = await stripe.invoices.list({ status, limit: 20 });
    for (const inv of list.data) {
      openInvoices.push({
        id: inv.id,
        subscription: typeof inv.subscription === "string" ? inv.subscription : inv.subscription?.id ?? null,
        due_date: inv.due_date ?? null,
        amount_due: (inv.amount_due ?? 0) / 100,
        status: inv.status ?? "unknown",
      });
    }
  }

  return NextResponse.json({
    now,
    thisMonth: { start: thisMonthStart, end: thisMonthEnd },
    nextMonth: { start: nextMonthStart, end: nextMonthEnd },
    subscriptions: subs,
    openInvoices,
  });
}
