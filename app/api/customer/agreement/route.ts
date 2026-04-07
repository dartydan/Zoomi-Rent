import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import {
  AGREEMENT_SIGNED_AT_KEY,
  AGREEMENT_VERSION_KEY,
  AGREEMENT_EQUIPMENT_KEY,
  AGREEMENT_EQUIPMENT_OPTIONS,
  isPaperAgreement,
} from "@/lib/agreement";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

function agreementFromMetadata(metadata: Record<string, unknown> | undefined) {
  const signedAt = metadata?.[AGREEMENT_SIGNED_AT_KEY] as string | undefined;
  const version = metadata?.[AGREEMENT_VERSION_KEY] as string | undefined;
  const equipment = metadata?.[AGREEMENT_EQUIPMENT_KEY] as string | undefined;

  const signed = !!(
    typeof signedAt === "string" &&
    signedAt.trim() &&
    typeof version === "string" &&
    version.trim()
  );

  const method =
    signed && isPaperAgreement(version) ? "paper" : signed ? "digital" : undefined;

  const equipmentLabel =
    signed &&
    method === "digital" &&
    typeof equipment === "string" &&
    equipment in AGREEMENT_EQUIPMENT_OPTIONS
      ? `${AGREEMENT_EQUIPMENT_OPTIONS[equipment as keyof typeof AGREEMENT_EQUIPMENT_OPTIONS].label} (${AGREEMENT_EQUIPMENT_OPTIONS[equipment as keyof typeof AGREEMENT_EQUIPMENT_OPTIONS].price})`
      : undefined;

  return NextResponse.json({
    signed,
    ...(signedAt ? { signedAt: signedAt.trim() } : {}),
    ...(version ? { version: version.trim() } : {}),
    ...(method ? { method } : {}),
    ...(equipmentLabel ? { equipment: equipment?.trim(), equipmentLabel } : {}),
  });
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const targetUserId = request.nextUrl.searchParams.get("userId");
    if (targetUserId && targetUserId.trim() !== "") {
      const ok = await isAdmin();
      if (!ok) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const targetUser = await clerkClient.users.getUser(targetUserId.trim());
      if (!targetUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      return agreementFromMetadata(targetUser.publicMetadata as Record<string, unknown>);
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    return agreementFromMetadata(user.publicMetadata as Record<string, unknown>);
  } catch (err) {
    console.error("Agreement GET error:", err);
    return NextResponse.json(
      { error: "Failed to load agreement status" },
      { status: 500 }
    );
  }
}
