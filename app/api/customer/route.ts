import { auth, currentUser } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { removePendingByEmail } from "@/lib/pending-customers-store";
import { sendNewCustomerEmail } from "@/lib/send-new-customer-email";

export const dynamic = "force-dynamic";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

const CUSTOMER_PROFILE_KEY = "customerProfile" as const;
const INSTALL_METADATA_KEY = "install" as const;

function combineAddress(parts: { street?: string; city?: string; state?: string; zip?: string }): string {
  const { street = "", city = "", state = "", zip = "" } = parts;
  const arr = [street.trim(), city.trim(), state.trim(), zip.trim()].filter(Boolean);
  if (arr.length === 0) return "";
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]}, ${arr[1]}`;
  if (arr.length === 3) return `${arr[0]}, ${arr[1]}, ${arr[2]}`;
  return `${arr[0]}, ${arr[1]}, ${arr[2]} ${arr[3]}`;
}

type CustomerProfile = {
  firstName: string;
  lastName: string;
  address: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone: string;
  email: string;
  desiredInstallTime: string;
  housingType: "rent" | "own";
  selectedPlan?: string;
};

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as Partial<CustomerProfile> & { street?: string; city?: string; state?: string; zip?: string };
    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
    const street = typeof body.street === "string" ? body.street.trim() : "";
    const city = typeof body.city === "string" ? body.city.trim() : "";
    const state = typeof body.state === "string" ? body.state.trim() : "";
    const zip = typeof body.zip === "string" ? body.zip.trim() : "";
    const addressLegacy = typeof body.address === "string" ? body.address.trim() : "";
    const address = combineAddress({ street, city, state, zip }) || addressLegacy;
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const desiredInstallTime = typeof body.desiredInstallTime === "string" ? body.desiredInstallTime.trim() : "";
    const housingType = body.housingType === "rent" || body.housingType === "own" ? body.housingType : "rent";
    const selectedPlan = typeof body.selectedPlan === "string" ? body.selectedPlan.trim() : undefined;

    if (!firstName || !lastName || !phone || !email) {
      return NextResponse.json(
        { error: "Missing required fields: firstName, lastName, phone, email" },
        { status: 400 }
      );
    }
    if (!address) {
      return NextResponse.json(
        { error: "Missing required fields: street, city, state, or zip (address)" },
        { status: 400 }
      );
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const stripe = getStripe();
    const customers = await stripe.customers.list({
      email,
      limit: 1,
    });

    let customer: Stripe.Customer;
    if (customers.data.length > 0) {
      customer = customers.data[0];
      customer = await stripe.customers.update(customer.id, {
        name: `${firstName} ${lastName}`,
        address: { line1: address },
        phone: phone || undefined,
        metadata: {
          desired_install_time: desiredInstallTime,
          housing_type: housingType,
          clerk_user_id: userId,
        },
      });
    } else {
      customer = await stripe.customers.create({
        email,
        name: `${firstName} ${lastName}`,
        address: { line1: address },
        phone: phone || undefined,
        metadata: {
          desired_install_time: desiredInstallTime,
          housing_type: housingType,
          clerk_user_id: userId,
        },
      });
    }

    const customerProfile: CustomerProfile = {
      firstName,
      lastName,
      address,
      street: street || undefined,
      city: city || undefined,
      state: state || undefined,
      zip: zip || undefined,
      phone,
      email,
      desiredInstallTime,
      housingType,
      selectedPlan: selectedPlan || undefined,
    };

    const existingInstall = (user.publicMetadata?.[INSTALL_METADATA_KEY] ?? {}) as Record<string, unknown>;
    const install = { ...existingInstall, installAddress: address };

    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...user.publicMetadata,
        [CUSTOMER_PROFILE_KEY]: customerProfile,
        [INSTALL_METADATA_KEY]: install,
        stripeCustomerId: customer.id,
      },
    });

    await removePendingByEmail(email).catch(() => {});

    sendNewCustomerEmail({
      firstName,
      lastName,
      email,
      phone,
      address,
      street: street || undefined,
      city: city || undefined,
      state: state || undefined,
      zip: zip || undefined,
      desiredInstallTime: desiredInstallTime || undefined,
      housingType,
      selectedPlan,
    }).catch((err) => console.error("New customer email failed:", err));

    return NextResponse.json({
      success: true,
      customerId: customer.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Customer API error:", message, error);
    return NextResponse.json(
      { error: message || "Failed to save customer" },
      { status: 500 }
    );
  }
}
