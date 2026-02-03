import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { requireAdmin } from "@/lib/admin";
import { readUnits } from "@/lib/unit-store";
import { computeRevenueForAssignedUser } from "@/lib/property-revenue";

export const dynamic = "force-dynamic";

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

/**
 * GET /api/admin/revenue
 * Returns current revenue (from units) and forecasted revenue (current + upcoming subscription payments).
 */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const units = await readUnits();

    let currentRevenue = 0;
    const assignedUserIds = new Set<string>();
    for (const u of units) {
      const stored = (u.washer.revenueGenerated ?? 0) + (u.dryer.revenueGenerated ?? 0);
      let live = 0;
      if (u.assignedUserId) {
        assignedUserIds.add(u.assignedUserId);
        try {
          live = await computeRevenueForAssignedUser(u.assignedUserId);
        } catch {
          // keep stored only on error
        }
      }
      currentRevenue += stored + live;
    }

    let forecastedRevenue = currentRevenue;
    const stripe = getStripe();
    if (stripe && assignedUserIds.size > 0) {
      const users = await Promise.all(
        Array.from(assignedUserIds).map((id) =>
          clerkClient.users.getUser(id).catch(() => null)
        )
      );
      const stripeCustomerIds = new Set<string>();
      for (const u of users) {
        if (!u) continue;
        let cid = (u.publicMetadata?.stripeCustomerId as string)?.trim();
        if (!cid && u.emailAddresses?.[0]?.emailAddress) {
          const list = await stripe.customers.list({
            email: u.emailAddresses[0].emailAddress,
            limit: 1,
          });
          if (list.data.length > 0 && !list.data[0].deleted) {
            cid = list.data[0].id;
          }
        }
        if (cid) stripeCustomerIds.add(cid);
      }

      const now = Math.floor(Date.now() / 1000);
      let upcomingCents = 0;
      for (const customerId of stripeCustomerIds) {
        try {
          const [activeList, trialingList] = await Promise.all([
            stripe.subscriptions.list({
              customer: customerId,
              status: "active",
              limit: 10,
              expand: ["data.items.data.price", "data.discounts", "data.discounts.coupon"],
            }),
            stripe.subscriptions.list({
              customer: customerId,
              status: "trialing",
              limit: 10,
              expand: ["data.items.data.price", "data.discounts", "data.discounts.coupon"],
            }),
          ]);
          const allSubs = [...activeList.data, ...trialingList.data];
          for (const sub of allSubs) {
            if (sub.current_period_end < now) continue;
            try {
              const upcoming = await stripe.invoices.retrieveUpcoming({
                customer: customerId,
                subscription: sub.id,
              });
              if (upcoming?.amount_due != null && upcoming.amount_due > 0) {
                upcomingCents += upcoming.amount_due;
              }
            } catch {
              const item = sub.items?.data?.[0];
              const price = item?.price;
              const quantity = item?.quantity ?? 1;
              if (price && typeof price === "object" && price.unit_amount != null) {
                let amount = price.unit_amount * quantity;
                if (sub.discount) {
                  const coupon = sub.discount.coupon;
                  if (coupon?.percent_off != null) {
                    amount = Math.round((amount * (100 - coupon.percent_off)) / 100);
                  } else if (coupon?.amount_off != null) {
                    amount = Math.max(0, amount - coupon.amount_off);
                  }
                }
                upcomingCents += amount;
              }
            }
          }
        } catch {
          // Skip this customer on error
        }
      }
      forecastedRevenue = currentRevenue + upcomingCents / 100;
    }

    return NextResponse.json({
      currentRevenue,
      forecastedRevenue,
    });
  } catch (err) {
    console.error("Admin revenue error:", err);
    return NextResponse.json(
      { error: "Failed to compute revenue" },
      { status: 500 }
    );
  }
}
