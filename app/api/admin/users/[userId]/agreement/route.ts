import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { requireCanEdit } from "@/lib/admin";
import {
  AGREEMENT_SIGNED_AT_KEY,
  AGREEMENT_VERSION_KEY,
  AGREEMENT_VERSION_PAPER,
} from "@/lib/agreement";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireCanEdit();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { userId } = await params;
    let body: { paperSigned?: boolean; signedAt?: string; clearSignature?: boolean } = {};
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const user = await clerkClient.users.getUser(userId);

    if (body.clearSignature) {
      const version = user.publicMetadata?.[AGREEMENT_VERSION_KEY] as string | undefined;
      if (version !== AGREEMENT_VERSION_PAPER) {
        return NextResponse.json(
          { error: "Only paper-signed agreements can be cleared." },
          { status: 400 }
        );
      }
      await clerkClient.users.updateUserMetadata(userId, {
        publicMetadata: {
          ...user.publicMetadata,
          [AGREEMENT_SIGNED_AT_KEY]: null,
          [AGREEMENT_VERSION_KEY]: null,
        },
      });
      return NextResponse.json({ success: true, cleared: true });
    }

    if (!body.paperSigned) {
      return NextResponse.json(
        { error: "paperSigned must be true or clearSignature must be true" },
        { status: 400 }
      );
    }

    const signedAt =
      typeof body.signedAt === "string" && body.signedAt.trim()
        ? new Date(body.signedAt.trim()).toISOString()
        : new Date().toISOString();

    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...user.publicMetadata,
        [AGREEMENT_SIGNED_AT_KEY]: signedAt,
        [AGREEMENT_VERSION_KEY]: AGREEMENT_VERSION_PAPER,
      },
    });

    return NextResponse.json({
      success: true,
      signedAt,
      version: AGREEMENT_VERSION_PAPER,
    });
  } catch (err) {
    console.error("Admin agreement PATCH error:", err);
    return NextResponse.json(
      { error: "Failed to update agreement status" },
      { status: 500 }
    );
  }
}
