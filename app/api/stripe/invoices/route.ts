import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

async function listCustomerCharges(stripe: Stripe, customerId: string) {
  const charges: Stripe.Charge[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const list = await stripe.charges.list({
      customer: customerId,
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    charges.push(...list.data);
    hasMore = list.has_more;
    startingAfter = list.data.at(-1)?.id;
    if (!startingAfter) hasMore = false;
  }

  return charges;
}

async function listCustomerInvoices(stripe: Stripe, customerId: string) {
  const invoices: Stripe.Invoice[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const list = await stripe.invoices.list({
      customer: customerId,
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    invoices.push(...list.data);
    hasMore = list.has_more;
    startingAfter = list.data.at(-1)?.id;
    if (!startingAfter) hasMore = false;
  }

  return invoices;
}

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");
    if (!customerId) {
      return NextResponse.json(
        { error: "Customer ID required" },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    const [charges, stripeInvoices] = await Promise.all([
      listCustomerCharges(stripe, customerId),
      listCustomerInvoices(stripe, customerId),
    ]);

    charges.sort((a, b) => b.created - a.created);
    stripeInvoices.sort((a, b) => b.created - a.created);

    const formattedInvoices = charges.map((ch) => {
      const amountRefunded = ch.amount_refunded ?? 0;
      const netAmount = ch.amount - amountRefunded;
      return {
        id: ch.id,
        number: ch.receipt_number ?? ch.id,
        amountPaid: netAmount,
        currency: ch.currency,
        created: ch.created,
        status: ch.status,
        refunded: ch.refunded,
        invoicePdf: ch.receipt_url ?? null,
        hostedInvoiceUrl: ch.receipt_url ?? null,
      };
    });

    const openInvoices = stripeInvoices
      .filter((invoice) => invoice.status === "open" && invoice.amount_remaining > 0)
      .map((invoice) => ({
        id: invoice.id,
        number: invoice.number ?? invoice.id,
        amountRemaining: invoice.amount_remaining,
        currency: invoice.currency,
        created: invoice.created,
        dueDate: invoice.due_date,
        status: invoice.status,
        invoicePdf: invoice.invoice_pdf ?? null,
        hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
      }));

    const openBalance = openInvoices.reduce(
      (total, invoice) => total + invoice.amountRemaining,
      0
    );

    return NextResponse.json({ invoices: formattedInvoices, openInvoices, openBalance });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Stripe invoices error:", message, error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}
