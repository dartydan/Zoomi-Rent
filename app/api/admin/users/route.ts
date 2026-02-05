import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { requireAdmin } from "@/lib/admin";
import { getActiveSubscriptionProductName } from "@/lib/stripe-subscription";

export const dynamic = "force-dynamic";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { data: users } = await clerkClient.users.getUserList({ limit: 100 });
    let stripe: Stripe | null = null;
    try {
      if (process.env.STRIPE_SECRET_KEY) stripe = getStripe();
    } catch {
      // Stripe not configured or invalid; continue without payment method check
    }

    const list = await Promise.all(
      users.map(async (u) => {
        const install = (u.publicMetadata?.install ?? {}) as {
          installDate?: string;
          installAddress?: string;
          installs?: Array<{ installDate: string; installAddress?: string }>;
        };
        const customerProfile = (u.publicMetadata?.customerProfile ?? {}) as Record<string, unknown>;
        let stripeCustomerId = (u.publicMetadata?.stripeCustomerId as string)?.trim() || null;

        if (stripe && !stripeCustomerId) {
          const email = u.emailAddresses?.[0]?.emailAddress;
          if (email) {
            const customerList = await stripe.customers.list({ email, limit: 1 });
            if (customerList.data.length > 0 && !customerList.data[0].deleted) {
              stripeCustomerId = customerList.data[0].id;
            }
          }
        }

        let hasDefaultPaymentMethod = false;
        let stripeCustomer: Stripe.Customer | null = null;
        let activePlanName: string | null = null;
        if (stripe && stripeCustomerId) {
          try {
            const timeoutMs = 2000;
            const customer = await Promise.race([
              stripe.customers.retrieve(stripeCustomerId),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("timeout")), timeoutMs)
              ),
            ]);
            if (!customer.deleted) {
              stripeCustomer = customer as Stripe.Customer;
              const pm = stripeCustomer.invoice_settings?.default_payment_method;
              const legacy = stripeCustomer.default_source;
              hasDefaultPaymentMethod = !!(pm ?? legacy);
            }
            activePlanName = await getActiveSubscriptionProductName(stripe, stripeCustomerId);
          } catch {
            // Timeout, deleted, or invalid; leave hasDefaultPaymentMethod false
          }
        }

        const fromStripe = stripeCustomer;
        const nameParts = fromStripe?.name?.trim().split(/\s+/) ?? [];
        const stripeFirstName = nameParts.length > 0 ? nameParts[0] : null;
        const stripeLastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;
        const addr = fromStripe?.address;
        const stripeAddress =
          addr?.line1 || addr?.city || addr?.state || addr?.postal_code
            ? [addr.line1, addr.city, addr.state, addr.postal_code].filter(Boolean).join(", ")
            : null;

        return {
          id: u.id,
          email: fromStripe?.email ?? u.emailAddresses[0]?.emailAddress ?? null,
          firstName: stripeFirstName ?? u.firstName,
          lastName: stripeLastName ?? u.lastName,
          createdAt: u.createdAt,
          stripeCustomerId,
          hasDefaultPaymentMethod,
          installDate:
            (Array.isArray(install.installs) && install.installs.length > 0
              ? install.installs[0].installDate
              : install.installDate) ?? null,
          installAddress:
            (Array.isArray(install.installs) && install.installs.length > 0
              ? install.installs[0].installAddress
              : install.installAddress) ?? null,
          phone: fromStripe?.phone ?? (customerProfile.phone as string) ?? null,
          address: stripeAddress ?? (customerProfile.address as string) ?? null,
          selectedPlan: activePlanName ?? (customerProfile.selectedPlan as string) ?? null,
        };
      })
    );

    return NextResponse.json({ users: list });
  } catch (err) {
    console.error("Admin users list error:", err);
    return NextResponse.json(
      { error: "Failed to list users" },
      { status: 500 }
    );
  }
}
