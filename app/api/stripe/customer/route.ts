import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress;
    if (!email) {
      return NextResponse.json(
        { error: "Email not found" },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const customers = await stripe.customers.list({
      email,
      limit: 1,
    });

    let customer: Stripe.Customer;
    if (customers.data.length > 0) {
      customer = customers.data[0];
    } else {
      customer = await stripe.customers.create({
        email,
      });
    }

    return NextResponse.json({
      customerId: customer.id,
      email: customer.email,
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
