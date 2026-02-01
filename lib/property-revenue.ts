/**
 * Compute revenue for a property assigned to a user: sum of Stripe paid invoices
 * between the user's install date and install/subscription end.
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
 * Returns revenue in dollars (sum of paid invoices in [installDate, installEnd]).
 * Returns 0 if user has no stripeCustomerId, no installDate, or Stripe fails.
 */
export async function computeRevenueForAssignedUser(userId: string): Promise<number> {
  try {
    const user = await clerkClient.users.getUser(userId);
    const stripeCustomerId = user.publicMetadata?.stripeCustomerId as string | undefined;
    const install = (user.publicMetadata?.[INSTALL_METADATA_KEY] ?? {}) as InstallInfo;
    const installDateStr = install.installDate;

    if (!stripeCustomerId || !installDateStr) return 0;

    const installStart = new Date(installDateStr);
    installStart.setUTCHours(0, 0, 0, 0);
    const installStartTs = Math.floor(installStart.getTime() / 1000);

    const stripe = getStripe();

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

    const invoices = await stripe.invoices.list({
      customer: stripeCustomerId,
      status: "paid",
      limit: 100,
    });

    let totalCents = 0;
    for (const inv of invoices.data) {
      const created = inv.created;
      if (created >= installStartTs && created <= installEndTs) {
        totalCents += inv.amount_paid ?? 0;
      }
    }

    return totalCents / 100;
  } catch {
    return 0;
  }
}
