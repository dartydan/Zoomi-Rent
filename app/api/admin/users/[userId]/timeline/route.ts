import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { requireAdmin } from "@/lib/admin";
import { INSTALL_METADATA_KEY } from "@/lib/install";
import type { InstallInfo } from "@/lib/install";

export const dynamic = "force-dynamic";

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { userId } = await params;
    const user = await clerkClient.users.getUser(userId);
    const install = (user.publicMetadata?.[INSTALL_METADATA_KEY] ?? {}) as InstallInfo;
    const installDate = install.installDate ?? null;
    let stripeCustomerId = (user.publicMetadata?.stripeCustomerId as string | undefined)?.trim() || null;

    const stripe = getStripe();
    if (stripe && !stripeCustomerId) {
      const email = user.emailAddresses?.[0]?.emailAddress;
      if (email) {
        const list = await stripe.customers.list({ email, limit: 1 });
        if (list.data.length > 0 && !list.data[0].deleted) {
          stripeCustomerId = list.data[0].id;
        }
      }
    }

    const payments: { date: string; amount: number; currency: string }[] = [];
    let nextPaymentDate: string | null = null;
    let nextPaymentAmount: number | null = null;
    let nextPaymentCurrency = "usd";

    if (stripe && stripeCustomerId) {
      const [chargesRes, invoicesRes] = await Promise.all([
        stripe.charges.list({ customer: stripeCustomerId, limit: 100 }),
        stripe.invoices.list({ customer: stripeCustomerId, status: "paid", limit: 100 }),
      ]);
      const byKey = new Map<string, { date: string; amount: number; currency: string }>();
      const add = (date: string, amount: number, currency: string) => {
        const key = `${date}-${amount}-${currency}`;
        if (!byKey.has(key)) byKey.set(key, { date, amount, currency });
      };
      chargesRes.data
        .filter((c) => c.status === "succeeded" && !c.refunded)
        .forEach((c) => {
          add(
            new Date(c.created * 1000).toISOString(),
            (c.amount - (c.amount_refunded ?? 0)) / 100,
            (c.currency ?? "usd").toUpperCase()
          );
        });
      invoicesRes.data.forEach((inv) => {
        const paidAt = inv.status_transitions?.paid_at ?? inv.created;
        const amount = (inv.amount_paid ?? 0) / 100;
        const currency = (inv.currency ?? "usd").toUpperCase();
        if (amount > 0) add(new Date((paidAt as number) * 1000).toISOString(), amount, currency);
      });
      const merged = Array.from(byKey.values()).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      payments.push(...merged);

      const expand = ["data.items.data.price", "data.discounts", "data.discounts.coupon"];
      const now = Math.floor(Date.now() / 1000);
      const [activeList, trialingList] = await Promise.all([
        stripe.subscriptions.list({ customer: stripeCustomerId, status: "active", limit: 10, expand }),
        stripe.subscriptions.list({ customer: stripeCustomerId, status: "trialing", limit: 10, expand }),
      ]);
      const allSubs = [...activeList.data, ...trialingList.data];
      let soonest: { date: string; amount: number; currency: string } | null = null;
      for (const sub of allSubs) {
        if (sub.current_period_end < now) continue;
        try {
          const upcoming = await stripe.invoices.retrieveUpcoming({
            customer: stripeCustomerId,
            subscription: sub.id,
          });
          if (upcoming?.amount_due != null && upcoming.currency) {
            const date = new Date((sub.current_period_end as number) * 1000).toISOString();
            const amount = upcoming.amount_due / 100;
            const currency = (upcoming.currency ?? "usd").toUpperCase();
            if (!soonest || new Date(date).getTime() < new Date(soonest.date).getTime()) {
              soonest = { date, amount, currency };
            }
          }
        } catch {
          const item = sub.items?.data?.[0];
          const price = item?.price;
          const quantity = item?.quantity ?? 1;
          if (price && typeof price === "object" && price.unit_amount != null) {
            const date = new Date((sub.current_period_end as number) * 1000).toISOString();
            const amount = (price.unit_amount * quantity) / 100;
            const currency = ((price.currency as string) ?? "usd").toUpperCase();
            if (!soonest || new Date(date).getTime() < new Date(soonest.date).getTime()) {
              soonest = { date, amount, currency };
            }
          }
        }
      }
      if (soonest) {
        nextPaymentDate = soonest.date;
        nextPaymentAmount = soonest.amount;
        nextPaymentCurrency = soonest.currency;
      }
    }

    return NextResponse.json({
      installDate,
      payments,
      nextPaymentDate,
      nextPaymentAmount,
      nextPaymentCurrency,
    });
  } catch (err) {
    console.error("Admin timeline error:", err);
    return NextResponse.json(
      { error: "Failed to load timeline" },
      { status: 500 }
    );
  }
}
