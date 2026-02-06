import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { requireCanEdit } from "@/lib/admin";
import type { InstallInfo, InstallRecord } from "@/lib/install";
import { INSTALL_METADATA_KEY } from "@/lib/install";

export const dynamic = "force-dynamic";

function normalizeDateTime(s: string): string {
  const t = s?.trim();
  if (!t) return t;
  if (t.includes("T")) {
    if (t.endsWith("Z") || (t.includes("-") && t.lastIndexOf("-") > 10)) return t;
    if (t.length >= 19) return t.slice(0, 19);
    if (t.length >= 16) return t.slice(0, 16) + ":00";
  }
  return t.slice(0, 10) + "T12:00:00.000Z";
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
    const body = (await req.json()) as { installDate?: string };
    const installDate = typeof body.installDate === "string" ? body.installDate.trim() : "";
    if (!installDate) {
      return NextResponse.json({ error: "installDate is required" }, { status: 400 });
    }

    const user = await clerkClient.users.getUser(userId);
    const existing = (user.publicMetadata?.[INSTALL_METADATA_KEY] ?? {}) as InstallInfo;
    const existingInstalls: InstallRecord[] =
      Array.isArray(existing.installs) && existing.installs.length > 0
        ? existing.installs
        : existing.installDate
          ? [{ id: "legacy", installDate: existing.installDate, uninstallDate: undefined, installAddress: existing.installAddress, notes: existing.notes, photoUrls: existing.photoUrls, contractUrls: existing.contractUrls }]
          : [];

    if (existingInstalls.length === 0) {
      const record: InstallRecord = {
        id: crypto.randomUUID(),
        installDate: normalizeDateTime(installDate),
      };
      const install: InstallInfo = {
        installs: [record],
        driveFolderId: existing.driveFolderId,
        propertyId: existing.propertyId,
      };
      await clerkClient.users.updateUserMetadata(userId, {
        publicMetadata: {
          ...user.publicMetadata,
          [INSTALL_METADATA_KEY]: install,
        },
      });
      return NextResponse.json({ installs: install.installs });
    }

    const first = existingInstalls[0];
    const updated: InstallRecord = {
      ...first,
      installDate: normalizeDateTime(installDate),
    };
    const installs = [updated, ...existingInstalls.slice(1)];
    const install: InstallInfo = {
      installs,
      driveFolderId: existing.driveFolderId,
      propertyId: existing.propertyId,
    };

    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...user.publicMetadata,
        [INSTALL_METADATA_KEY]: install,
      },
    });

    return NextResponse.json({ installs });
  } catch (err) {
    console.error("Admin update install date error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update" },
      { status: 500 }
    );
  }
}
