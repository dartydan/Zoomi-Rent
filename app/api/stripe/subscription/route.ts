import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

function applySubscriptionDiscount(
  baseAmount: number,
  currency: string,
  subscription: Stripe.Subscription
): number {
  const discounts = subscription.discounts ?? (subscription.discount ? [subscription.discount] : []);
  let amount = baseAmount;
  for (const d of discounts) {
    const coupon = typeof d === "object" && d && "coupon" in d ? d.coupon : null;
    if (!coupon || typeof coupon !== "object") continue;
    if (coupon.percent_off != null && coupon.percent_off > 0) {
      amount = amount * (1 - coupon.percent_off / 100);
    } else if (coupon.amount_off != null && coupon.amount_off > 0 && coupon.currency === currency) {
      amount = amount - coupon.amount_off;
    }
  }
  return Math.max(0, Math.round(amount));
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
    const expand = ["data.items.data.price", "data.discounts", "data.discounts.coupon"];
    const now = Math.floor(Date.now() / 1000);

    type NextPayment = {
      date: string;
      amount: number;
      currency: string;
      label: string | null;
      subscription?: Stripe.Subscription;
    };
    const candidates: NextPayment[] = [];

    const [activeList, trialingList, schedulesList] = await Promise.all([
      stripe.subscriptions.list({ customer: customerId, status: "active", limit: 10, expand }),
      stripe.subscriptions.list({ customer: customerId, status: "trialing", limit: 10, expand }),
      stripe.subscriptionSchedules.list({ customer: customerId, limit: 10 }),
    ]);

    const allSubs = [...activeList.data, ...trialingList.data];
    for (const subscription of allSubs) {
      const periodEnd = subscription.current_period_end;
      if (periodEnd < now) continue;
      let amount: number | null = null;
      let currency: string = "usd";
      try {
        const upcoming = await stripe.invoices.retrieveUpcoming({
          customer: customerId,
          subscription: subscription.id,
        });
        if (upcoming?.amount_due != null && upcoming.currency) {
          amount = upcoming.amount_due;
          currency = upcoming.currency;
        }
      } catch {
        // fall back to price (with discount applied if present)
      }
      if (amount == null) {
        const item = subscription.items?.data?.[0];
        const price = item?.price;
        const quantity = item?.quantity ?? 1;
        if (price?.unit_amount != null && price?.currency) {
          const baseAmount = price.unit_amount * quantity;
          currency = price.currency;
          amount = applySubscriptionDiscount(baseAmount, currency, subscription);
        }
      }
      if (amount == null) continue;
      const productId =
        typeof subscription.items?.data?.[0]?.price?.product === "string"
          ? subscription.items.data[0].price.product
          : (subscription.items?.data?.[0]?.price?.product as { id?: string })?.id;
      let label: string | null = null;
      if (productId) {
        try {
          const product = await stripe.products.retrieve(productId);
          label = product.name;
        } catch {
          //
        }
      }
      candidates.push({
        date: new Date(periodEnd * 1000).toISOString(),
        amount,
        currency,
        label: label || (subscription ? "Active" : null),
        subscription,
      });
    }

    const notStartedSchedules = schedulesList.data.filter((s) => s.status === "not_started");
    for (const schedule of notStartedSchedules) {
      const phases = schedule.phases ?? [];
      const nextPhase = phases.find((p) => p.start_date >= now) ?? phases[0];
      if (!nextPhase || nextPhase.start_date < now) continue;
      const item = nextPhase.items?.[0];
      const priceId = typeof item?.price === "string" ? item.price : undefined;
      if (!priceId) continue;
      let unitAmount: number | null = null;
      let currency = "usd";
      let productId: string | undefined;
      try {
        const price = await stripe.prices.retrieve(priceId);
        unitAmount = price.unit_amount;
        currency = price.currency ?? "usd";
        productId = typeof price.product === "string" ? price.product : (price.product as { id?: string })?.id;
      } catch {
        continue;
      }
      if (unitAmount == null) continue;
      let label: string | null = "Subscription";
      if (productId) {
        try {
          const product = await stripe.products.retrieve(productId);
          label = product.name;
        } catch {
          //
        }
      }
      candidates.push({
        date: new Date(nextPhase.start_date * 1000).toISOString(),
        amount: unitAmount,
        currency,
        label,
      });
    }

    candidates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const soonest = candidates[0];
    const nextPaymentDate = soonest?.date ?? null;
    const nextPaymentAmount =
      soonest != null ? { amount: soonest.amount, currency: soonest.currency } : null;
    const subscriptionLabel = soonest?.label ?? null;
    const hasActiveSubscription = allSubs.length > 0;

    return NextResponse.json({
      nextPaymentDate,
      nextPaymentAmount,
      hasActiveSubscription,
      subscriptionLabel,
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
