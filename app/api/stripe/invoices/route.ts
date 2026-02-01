import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
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
      if (list.data.length > 0) {
        startingAfter = list.data[list.data.length - 1].id;
      } else {
        hasMore = false;
      }
    }
    charges.sort((a, b) => b.created - a.created);

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

    return NextResponse.json({ invoices: formattedInvoices });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Stripe invoices error:", message, error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}
