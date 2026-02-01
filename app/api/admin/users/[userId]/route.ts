import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

const CUSTOMER_PROFILE_KEY = "customerProfile" as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireAdmin();
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
    const updates: { firstName?: string; lastName?: string } = {};
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (Object.keys(updates).length > 0) {
      await clerkClient.users.updateUser(userId, updates);
    }

    const customerProfile = (user.publicMetadata?.[CUSTOMER_PROFILE_KEY] ?? {}) as Record<string, unknown>;
    const merged = { ...customerProfile };
    if (firstName !== undefined) merged.firstName = firstName;
    if (lastName !== undefined) merged.lastName = lastName;
    if (email !== undefined) merged.email = email;
    if (phone !== undefined) merged.phone = phone;
    if (address !== undefined) merged.address = address;

    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...user.publicMetadata,
        [CUSTOMER_PROFILE_KEY]: merged,
      },
    });

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
