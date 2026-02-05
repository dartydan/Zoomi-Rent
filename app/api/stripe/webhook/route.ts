import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { clerkClient } from "@clerk/nextjs/server";
import { addPendingCustomer } from "@/lib/pending-customers-store";

export const dynamic = "force-dynamic";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    console.error("Stripe webhook: STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    const signature = (await headers()).get("stripe-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing Stripe-Signature header" }, { status: 400 });
    }
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Stripe webhook signature verification failed:", message);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  if (event.type !== "customer.created") {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const customer = event.data.object as Stripe.Customer;

  if (customer.metadata?.clerk_user_id) {
    return NextResponse.json({ received: true, skipped: "already linked to Clerk" }, { status: 200 });
  }

  const email = (customer.email ?? "").trim();
  const name = (customer.name ?? "").trim();
  const addr = customer.address;
  const street = (addr?.line1 ?? "").trim();
  const city = (addr?.city ?? "").trim();
  const state = (addr?.state ?? "").trim();
  const zip = (addr?.postal_code ?? "").trim();
  const hasAddress = !!(street || city || state || zip);

  if (!email && !name && !hasAddress) {
    return NextResponse.json({ received: true, skipped: "no email, name, or address" }, { status: 200 });
  }

  const [firstName, ...lastParts] = name.split(/\s+/);
  const lastName = lastParts.join(" ") || "";

  // If customer has email, create Clerk user and link to Stripe
  if (email) {
    try {
      const existing = await clerkClient.users.getUserList({ emailAddress: [email], limit: 1 });
      if (existing.data.length > 0) {
        const user = existing.data[0];
        await clerkClient.users.updateUserMetadata(user.id, {
          publicMetadata: {
            ...user.publicMetadata,
            stripeCustomerId: customer.id,
          },
        });
        return NextResponse.json({ received: true, linked: "existing Clerk user" }, { status: 200 });
      }

      const user = await clerkClient.users.createUser({
        emailAddress: [email],
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        publicMetadata: {
          stripeCustomerId: customer.id,
          customerProfile: {
            address: street || city || state || zip
              ? [street, city, state, zip].filter(Boolean).join(", ")
              : undefined,
            street: street || undefined,
            city: city || undefined,
            state: state || undefined,
            zip: zip || undefined,
          },
        },
      });

      await stripe.customers.update(customer.id, {
        metadata: { ...customer.metadata, clerk_user_id: user.id },
      });

      return NextResponse.json({ received: true, created: user.id }, { status: 200 });
    } catch (err) {
      console.error("Stripe webhook: failed to create Clerk user:", err);
      return NextResponse.json(
        { error: "Failed to create Clerk user" },
        { status: 500 }
      );
    }
  }

  // No email: add to pending customers (admin-added flow)
  try {
    await addPendingCustomer({
      email: "",
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      street: street || undefined,
      city: city || undefined,
      state: state || undefined,
      zip: zip || undefined,
    });
  } catch (err) {
    console.error("Stripe webhook: failed to add pending customer:", err);
    return NextResponse.json(
      { error: "Failed to add pending customer" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
