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
    const installDate =
      (Array.isArray(install.installs) && install.installs.length > 0
        ? install.installs[0].installDate
        : install.installDate) ?? null;

    const logins: { date: string }[] = [];
    try {
      const sessionList = await clerkClient.sessions.getSessionList({ userId, limit: 100 });
      sessionList.data.forEach((session) => {
        const createdAt = session.createdAt;
        if (createdAt != null) logins.push({ date: new Date(createdAt).toISOString() });
      });
      logins.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (e) {
      console.warn("Timeline: could not fetch session list:", e);
    }

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
    const paymentMethodChanges: { date: string; type: "payment_method_added" | "payment_method_removed" | "payment_settings_updated" }[] = [];
    let nextPaymentDate: string | null = null;
    let nextPaymentAmount: number | null = null;
    let nextPaymentCurrency = "usd";

    if (stripe && stripeCustomerId) {
      // Use charges only: they are the source of truth for amount actually charged (net of coupons/discounts).
      // amount - amount_refunded = net amount customer paid.
      const chargesList: Stripe.Charge[] = [];
      let hasMore = true;
      let startingAfter: string | undefined;
      while (hasMore) {
        const chargesRes = await stripe.charges.list({
          customer: stripeCustomerId,
          limit: 100,
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        });
        chargesList.push(...chargesRes.data);
        hasMore = chargesRes.has_more;
        if (chargesRes.data.length > 0) {
          startingAfter = chargesRes.data[chargesRes.data.length - 1].id;
        } else {
          hasMore = false;
        }
      }
      const paymentEntries = chargesList
        .filter((c) => c.status === "succeeded")
        .map((c) => {
          const netCents = c.amount - (c.amount_refunded ?? 0);
          return {
            date: new Date(c.created * 1000).toISOString(),
            amount: netCents / 100,
            currency: (c.currency ?? "usd").toUpperCase(),
          };
        })
        .filter((p) => p.amount > 0);
      paymentEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      payments.push(...paymentEntries);

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

      try {
        const [attachedRes, detachedRes, customerUpdatedRes] = await Promise.all([
          stripe.events.list({ type: "payment_method.attached", limit: 50 }),
          stripe.events.list({ type: "payment_method.detached", limit: 50 }),
          stripe.events.list({ type: "customer.updated", limit: 50 }),
        ]);
        type StripeEventWithObject = { created?: number; data?: { object?: { customer?: string; id?: string } } };
        const addIfForCustomer = (
          events: StripeEventWithObject[],
          type: "payment_method_added" | "payment_method_removed" | "payment_settings_updated",
          matchCustomer: (obj: { customer?: string; id?: string }) => boolean
        ) => {
          events.forEach((ev) => {
            const obj = ev.data?.object;
            if (obj && ev.created != null && matchCustomer(obj)) {
              paymentMethodChanges.push({
                date: new Date(ev.created * 1000).toISOString(),
                type,
              });
            }
          });
        };
        addIfForCustomer(
          attachedRes.data as StripeEventWithObject[],
          "payment_method_added",
          (obj) => obj.customer === stripeCustomerId
        );
        addIfForCustomer(
          detachedRes.data as StripeEventWithObject[],
          "payment_method_removed",
          (obj) => obj.customer === stripeCustomerId
        );
        addIfForCustomer(
          customerUpdatedRes.data as StripeEventWithObject[],
          "payment_settings_updated",
          (obj) => obj.id === stripeCustomerId
        );
        paymentMethodChanges.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      } catch (e) {
        console.warn("Timeline: could not fetch payment method events:", e);
      }
    }

    return NextResponse.json({
      installDate,
      payments,
      nextPaymentDate,
      nextPaymentAmount,
      nextPaymentCurrency,
      logins,
      paymentMethodChanges,
    });
  } catch (err) {
    console.error("Admin timeline error:", err);
    return NextResponse.json(
      { error: "Failed to load timeline" },
      { status: 500 }
    );
  }
}
