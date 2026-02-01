import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const impersonateUserId = searchParams.get("userId");

    let targetUser = await currentUser();
    let targetUserId = userId;

    if (impersonateUserId && impersonateUserId.trim() !== "") {
      try {
        await requireAdmin();
      } catch {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const impersonated = await clerkClient.users.getUser(impersonateUserId);
      targetUser = impersonated;
      targetUserId = impersonated.id;
    }

    const stripeCustomerId = targetUser?.publicMetadata?.stripeCustomerId as string | undefined;
    if (stripeCustomerId?.trim()) {
      const stripe = getStripe();
      try {
        const customer = await stripe.customers.retrieve(stripeCustomerId);
        if (!customer.deleted) {
          return NextResponse.json({
            customerId: customer.id,
            email: (customer as Stripe.Customer).email ?? targetUser?.emailAddresses?.[0]?.emailAddress,
          });
        }
      } catch {
        // Fall through to email lookup
      }
    }

    const email = targetUser?.emailAddresses?.[0]?.emailAddress;
    if (!email) {
      return NextResponse.json(
        { error: "Email not found" },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const list = await stripe.customers.list({
      email,
      limit: 1,
    });

    let stripeCustomer: Stripe.Customer;
    if (list.data.length > 0) {
      stripeCustomer = list.data[0];
    } else {
      stripeCustomer = await stripe.customers.create({
        email,
      });
    }

    return NextResponse.json({
      customerId: stripeCustomer.id,
      email: stripeCustomer.email,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Stripe customer error:", message, error);
    return NextResponse.json(
      { error: "Failed to get or create customer" },
      { status: 500 }
    );
  }
}
