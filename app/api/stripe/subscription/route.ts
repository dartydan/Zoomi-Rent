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
    const expand = ["data.items.data.price"];
    const [activeList, trialingList] = await Promise.all([
      stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1, expand }),
      stripe.subscriptions.list({ customer: customerId, status: "trialing", limit: 1, expand }),
    ]);
    const subscription = activeList.data[0] ?? trialingList.data[0];
    const nextPaymentDate = subscription?.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null;
    const item = subscription?.items?.data?.[0];
    const price = item?.price;
    const nextPaymentAmount =
      price?.unit_amount != null && price?.currency
        ? { amount: price.unit_amount, currency: price.currency }
        : null;
    const productId =
      typeof price?.product === "string" ? price.product : (price?.product as { id?: string })?.id;
    const product = productId ? await stripe.products.retrieve(productId) : null;
    const subscriptionLabel =
      product?.name ||
      (price as { nickname?: string } | null)?.nickname ||
      (subscription ? "Active" : null);

    return NextResponse.json({
      nextPaymentDate,
      nextPaymentAmount,
      hasActiveSubscription: !!subscription,
      subscriptionLabel: subscriptionLabel ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Stripe subscription error:", message, error);
    return NextResponse.json(
      { error: "Failed to fetch subscription", details: message },
      { status: 500 }
    );
  }
}
