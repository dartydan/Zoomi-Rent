import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { requireAdmin } from "@/lib/admin";

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
        const install = (u.publicMetadata?.install ?? {}) as { installDate?: string; installAddress?: string };
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
              const pm = (customer as Stripe.Customer).invoice_settings?.default_payment_method;
              const legacy = (customer as Stripe.Customer).default_source;
              hasDefaultPaymentMethod = !!(pm ?? legacy);
            }
          } catch {
            // Timeout, deleted, or invalid; leave hasDefaultPaymentMethod false
          }
        }

        return {
          id: u.id,
          email: u.emailAddresses[0]?.emailAddress ?? null,
          firstName: u.firstName,
          lastName: u.lastName,
          createdAt: u.createdAt,
          stripeCustomerId,
          hasDefaultPaymentMethod,
          installDate: install.installDate ?? null,
          installAddress: install.installAddress ?? null,
          phone: (customerProfile.phone as string) ?? null,
          address: (customerProfile.address as string) ?? null,
          selectedPlan: (customerProfile.selectedPlan as string) ?? null,
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
