import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { requireAdmin } from "@/lib/admin";
import { getUnitById, updateUnit } from "@/lib/unit-store";
import type { Unit } from "@/lib/unit";
import type { InstallInfo, InstallRecord } from "@/lib/install";
import { INSTALL_METADATA_KEY } from "@/lib/install";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const unit = await getUnitById(id);
    if (!unit) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }
    const assignedUserId = unit.assignedUserId;
    if (!assignedUserId) {
      return NextResponse.json(
        { error: "Unit is not assigned to a customer" },
        { status: 400 }
      );
    }

    const uninstallDate = new Date().toISOString().slice(0, 10);

    const user = await clerkClient.users.getUser(assignedUserId);
    const existing = (user.publicMetadata?.[INSTALL_METADATA_KEY] ?? {}) as InstallInfo;
    const existingInstalls: InstallRecord[] =
      Array.isArray(existing.installs) && existing.installs.length > 0
        ? existing.installs
        : existing.installDate
          ? [{
              id: "legacy",
              installDate: existing.installDate,
              uninstallDate: undefined,
              installAddress: existing.installAddress,
              notes: existing.notes,
              photoUrls: existing.photoUrls,
              contractUrls: existing.contractUrls,
            }]
          : [];

    if (existingInstalls.length > 0) {
      const first = existingInstalls[0];
      const updatedRecord: InstallRecord = {
        ...first,
        uninstallDate,
      };
      const installs = [updatedRecord, ...existingInstalls.slice(1)];
      const install: InstallInfo = {
        installs,
        driveFolderId: existing.driveFolderId,
        propertyId: existing.propertyId,
      };
      await clerkClient.users.updateUserMetadata(assignedUserId, {
        publicMetadata: {
          ...user.publicMetadata,
          [INSTALL_METADATA_KEY]: install,
        },
      });
    }

    const updated: Unit = {
      ...unit,
      assignedUserId: null,
      updatedAt: new Date().toISOString(),
    };
    await updateUnit(updated);

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Send to warehouse error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send to warehouse" },
      { status: 500 }
    );
  }
}
