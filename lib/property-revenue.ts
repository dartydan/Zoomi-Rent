/**
 * Compute revenue for a property assigned to a user: sum of Stripe charges (succeeded)
 * between the user's install date and install/subscription end.
 * Uses charges as the source of truth for amount actually received (net of refunds).
 * Only use in API routes (Node runtime); uses Clerk and Stripe.
 */
import { clerkClient } from "@clerk/nextjs/server";
import Stripe from "stripe";
import type { InstallInfo } from "./install";
import { INSTALL_METADATA_KEY } from "./install";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

/**
 * Returns revenue in dollars (sum of succeeded charges in [installDate, installEnd], net of refunds).
 * Returns 0 if user has no stripeCustomerId, no installDate, or Stripe fails.
 */
export async function computeRevenueForAssignedUser(userId: string): Promise<number> {
  try {
    const user = await clerkClient.users.getUser(userId);
    let stripeCustomerId = (user.publicMetadata?.stripeCustomerId as string | undefined)?.trim() || null;
    const install = (user.publicMetadata?.[INSTALL_METADATA_KEY] ?? {}) as InstallInfo;
    const installDateStr =
      Array.isArray(install.installs) && install.installs.length > 0
        ? install.installs[0].installDate
        : install.installDate;

    if (!installDateStr) return 0;

    const stripe = getStripe();
    if (!stripeCustomerId) {
      const email = user.emailAddresses?.[0]?.emailAddress;
      if (email) {
        const list = await stripe.customers.list({ email, limit: 1 });
        if (list.data.length > 0 && !list.data[0].deleted) {
          stripeCustomerId = list.data[0].id;
        }
      }
    }
    if (!stripeCustomerId) return 0;

    const installStart = new Date(installDateStr);
    installStart.setUTCHours(0, 0, 0, 0);
    const installStartTs = Math.floor(installStart.getTime() / 1000);

    // Install end: if any subscription is active → now; else use latest cancelled subscription's current_period_end
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: "all",
      limit: 10,
    });
    let installEndTs: number = Math.floor(Date.now() / 1000);
    const active = subscriptions.data.find((s) => s.status === "active");
    if (!active) {
      const cancelled = subscriptions.data
        .filter((s) => s.status === "canceled")
        .sort((a, b) => (b.current_period_end ?? 0) - (a.current_period_end ?? 0));
      if (cancelled.length > 0 && cancelled[0].current_period_end)
        installEndTs = cancelled[0].current_period_end;
    }

    let totalCents = 0;
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const charges = await stripe.charges.list({
        customer: stripeCustomerId,
        limit: 100,
        ...(startingAfter && { starting_after: startingAfter }),
      });

      for (const c of charges.data) {
        if (c.status !== "succeeded") continue;
        const created = c.created;
        if (created >= installStartTs && created <= installEndTs) {
          const netCents = c.amount - (c.amount_refunded ?? 0);
          totalCents += netCents;
        }
      }

      hasMore = charges.has_more;
      if (charges.data.length > 0) {
        startingAfter = charges.data[charges.data.length - 1].id;
      } else {
        hasMore = false;
      }
    }

    return totalCents / 100;
  } catch {
    return 0;
  }
}
