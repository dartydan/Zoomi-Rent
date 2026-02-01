import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { requireAdmin } from "@/lib/admin";
import { readProperties, writeProperties } from "@/lib/property-store";
import { computeRevenueForAssignedUser } from "@/lib/property-revenue";
import type { Property } from "@/lib/property";
import type { InstallInfo } from "@/lib/install";
import { INSTALL_METADATA_KEY } from "@/lib/install";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const items = await readProperties();
    const item = items.find((p) => p.id === id);
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const stored = item.revenueGenerated ?? 0;
    const current =
      item.assignedUserId != null ? await computeRevenueForAssignedUser(item.assignedUserId) : 0;
    return NextResponse.json({ ...item, revenueGenerated: stored + current });
  } catch (err) {
    console.error("Admin property get error:", err);
    return NextResponse.json(
      { error: "Failed to get property" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = (await req.json()) as {
      model?: string;
      purchaseCost?: number;
      notes?: string;
      assignedUserId?: string | null;
      status?: "available" | "needs_repair" | "no_longer_owned";
    };

    const items = await readProperties();
    const index = items.findIndex((p) => p.id === id);
    if (index === -1) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const current = items[index];
    const newAssignedUserId = body.assignedUserId === undefined ? current.assignedUserId : (body.assignedUserId ?? undefined);

    // When unassigning: lock in revenue from this assignment (add to stored cumulative)
    if (current.assignedUserId && !newAssignedUserId) {
      try {
        const fromAssignment = await computeRevenueForAssignedUser(current.assignedUserId);
        current.revenueGenerated = (current.revenueGenerated ?? 0) + fromAssignment;
      } catch (e) {
        console.warn("Could not compute revenue on unassign:", e);
      }
    }

    // If unassigning or reassigning: clear previous user's install.propertyId
    if (current.assignedUserId && current.assignedUserId !== newAssignedUserId) {
      try {
        const prevUser = await clerkClient.users.getUser(current.assignedUserId);
        const prevInstall = (prevUser.publicMetadata?.[INSTALL_METADATA_KEY] ?? {}) as InstallInfo;
        if (prevInstall.propertyId === id) {
          const { propertyId: _removed, ...rest } = prevInstall;
          await clerkClient.users.updateUserMetadata(current.assignedUserId, {
            publicMetadata: {
              ...prevUser.publicMetadata,
              [INSTALL_METADATA_KEY]: rest,
            },
          });
        }
      } catch (e) {
        console.warn("Could not clear previous user install.propertyId:", e);
      }
    }

    // If assigning: set target user's install.propertyId
    if (newAssignedUserId) {
      try {
        await clerkClient.users.getUser(newAssignedUserId);
      } catch {
        return NextResponse.json({ error: "User not found" }, { status: 400 });
      }
      const targetUser = await clerkClient.users.getUser(newAssignedUserId);
      const targetInstall = (targetUser.publicMetadata?.[INSTALL_METADATA_KEY] ?? {}) as InstallInfo;
      await clerkClient.users.updateUserMetadata(newAssignedUserId, {
        publicMetadata: {
          ...targetUser.publicMetadata,
          [INSTALL_METADATA_KEY]: { ...targetInstall, propertyId: id },
        },
      });
    }

    const updated: Property = {
      ...current,
      assignedUserId: newAssignedUserId,
      updatedAt: new Date().toISOString(),
    };
    if (typeof body.model === "string") updated.model = body.model.trim();
    if (typeof body.purchaseCost === "number") updated.purchaseCost = body.purchaseCost;
    if (body.notes !== undefined) updated.notes = typeof body.notes === "string" ? body.notes.trim() : undefined;
    if (body.status !== undefined && ["available", "needs_repair", "no_longer_owned"].includes(body.status))
      updated.status = body.status;

    items[index] = updated;
    await writeProperties(items);

    const stored = updated.revenueGenerated ?? 0;
    const currentRevenue =
      updated.assignedUserId != null ? await computeRevenueForAssignedUser(updated.assignedUserId) : 0;
    return NextResponse.json({ ...updated, revenueGenerated: stored + currentRevenue });
  } catch (err) {
    console.error("Admin property update error:", err);
    return NextResponse.json(
      { error: "Failed to update property" },
      { status: 500 }
    );
  }
}
