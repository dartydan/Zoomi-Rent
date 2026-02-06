import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { requireAdmin, requireCanEdit } from "@/lib/admin";
import { removePendingById } from "@/lib/pending-customers-store";

export const dynamic = "force-dynamic";

const CUSTOMER_PROFILE_KEY = "customerProfile" as const;

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireCanEdit();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { userId } = await params;
    const body = (await req.json()) as {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      address?: string;
    };
    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : undefined;
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : undefined;
    const email = typeof body.email === "string" ? body.email.trim() : undefined;
    const phone = typeof body.phone === "string" ? body.phone.trim() : undefined;
    const address = typeof body.address === "string" ? body.address.trim() : undefined;

    const user = await clerkClient.users.getUser(userId);
    let stripeCustomerId = (user.publicMetadata?.stripeCustomerId as string)?.trim();
    const stripe = getStripe();

    const customerProfile = (user.publicMetadata?.[CUSTOMER_PROFILE_KEY] ?? {}) as Record<string, unknown>;
    const merged = { ...customerProfile };
    if (firstName !== undefined) merged.firstName = firstName;
    if (lastName !== undefined) merged.lastName = lastName;
    if (email !== undefined) merged.email = email;
    if (phone !== undefined) merged.phone = phone;
    if (address !== undefined) merged.address = address;

    if (stripe && !stripeCustomerId && (merged.email || email)) {
      const lookupEmail = (merged.email as string) || email || user.emailAddresses?.[0]?.emailAddress;
      if (lookupEmail) {
        const list = await stripe.customers.list({ email: lookupEmail, limit: 1 });
        if (list.data.length > 0 && !list.data[0].deleted) {
          stripeCustomerId = list.data[0].id;
        } else {
          const created = await stripe.customers.create({
            email: lookupEmail,
            name: `${merged.firstName ?? ""} ${merged.lastName ?? ""}`.trim() || undefined,
            phone: (merged.phone as string) || undefined,
            address: (merged.address as string) ? { line1: merged.address as string } : undefined,
            metadata: { clerk_user_id: userId },
          });
          stripeCustomerId = created.id;
        }
        await clerkClient.users.updateUserMetadata(userId, {
          publicMetadata: {
            ...user.publicMetadata,
            stripeCustomerId,
          },
        });
      }
    }

    if (stripe && stripeCustomerId) {
      try {
        const stripeUpdates: { name?: string; email?: string; phone?: string; address?: { line1: string } } = {};
        if (email !== undefined) stripeUpdates.email = email;
        if (phone !== undefined) stripeUpdates.phone = phone || undefined;
        if (address !== undefined) stripeUpdates.address = { line1: address };
        if (firstName !== undefined || lastName !== undefined) {
          let f = firstName;
          let l = lastName;
          if (f === undefined || l === undefined) {
            const current = await stripe.customers.retrieve(stripeCustomerId);
            if (!current.deleted) {
              const parts = ((current as Stripe.Customer).name ?? "").trim().split(/\s+/);
              if (f === undefined) f = parts.length > 0 ? parts[0] : "";
              if (l === undefined) l = parts.length > 1 ? parts.slice(1).join(" ") : "";
            }
          }
          stripeUpdates.name = `${f ?? ""} ${l ?? ""}`.trim() || undefined;
        }
        if (Object.keys(stripeUpdates).length > 0) {
          await stripe.customers.update(stripeCustomerId, stripeUpdates);
        }
      } catch (e) {
        console.error("Admin update Stripe customer:", e);
      }
    } else {
      await clerkClient.users.updateUserMetadata(userId, {
        publicMetadata: {
          ...user.publicMetadata,
          [CUSTOMER_PROFILE_KEY]: merged,
        },
      });
    }

    return NextResponse.json({
      firstName: merged.firstName ?? user.firstName,
      lastName: merged.lastName ?? user.lastName,
      email: merged.email ?? user.emailAddresses?.[0]?.emailAddress,
      phone: merged.phone ?? undefined,
      address: merged.address ?? undefined,
    });
  } catch (err) {
    console.error("Admin update user error:", err);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireCanEdit();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { userId } = await params;

    if (userId.startsWith("pending_")) {
      const pendingId = userId.slice("pending_".length);
      const removed = await removePendingById(pendingId);
      if (!removed) {
        return NextResponse.json({ error: "Pending customer not found" }, { status: 404 });
      }
      return NextResponse.json({ deleted: true });
    }

    const { getUnitByUserId, updateUnit } = await import("@/lib/unit-store");
    const unit = await getUnitByUserId(userId);
    if (unit) {
      await updateUnit({ ...unit, assignedUserId: null });
    }

    await clerkClient.users.deleteUser(userId);

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("Admin delete user error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete user" },
      { status: 500 }
    );
  }
}
