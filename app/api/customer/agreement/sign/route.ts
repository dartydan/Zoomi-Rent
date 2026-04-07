import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import {
  AGREEMENT_VERSION,
  AGREEMENT_SIGNED_AT_KEY,
  AGREEMENT_VERSION_KEY,
  AGREEMENT_EQUIPMENT_KEY,
  type AgreementEquipment,
} from "@/lib/agreement";

export const dynamic = "force-dynamic";

function getClientIp(request: NextRequest): string | undefined {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip")?.trim() ??
    undefined
  );
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const existingSignedAt = user.publicMetadata?.[
      AGREEMENT_SIGNED_AT_KEY
    ] as string | undefined;
    if (
      typeof existingSignedAt === "string" &&
      existingSignedAt.trim() !== ""
    ) {
      return NextResponse.json(
        { error: "Rental agreement already signed" },
        { status: 409 }
      );
    }

    let body: {
      agreedVersion?: string;
      fullName?: string;
      equipmentSelection?: string;
    } = {};
    try {
      body = (await request.json()) as typeof body;
    } catch {
      // optional body
    }

    const agreedVersion =
      typeof body.agreedVersion === "string" ? body.agreedVersion.trim() : "";
    if (agreedVersion !== AGREEMENT_VERSION) {
      return NextResponse.json(
        { error: "Agreement version mismatch. Please refresh and try again." },
        { status: 400 }
      );
    }

    const equipmentSelection = body.equipmentSelection as AgreementEquipment | undefined;
    const validEquipment: AgreementEquipment[] = ["standard", "premium"];
    if (
      !equipmentSelection ||
      !validEquipment.includes(equipmentSelection)
    ) {
      return NextResponse.json(
        { error: "Please select Standard or Premium equipment." },
        { status: 400 }
      );
    }

    const signedAt = new Date().toISOString();
    const ip = getClientIp(request);

    // Clerk deep-merges; send only new keys to avoid re-serializing large existing metadata
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        [AGREEMENT_SIGNED_AT_KEY]: signedAt,
        [AGREEMENT_VERSION_KEY]: AGREEMENT_VERSION,
        [AGREEMENT_EQUIPMENT_KEY]: equipmentSelection,
        ...(ip ? { rentalAgreementIp: ip } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      signedAt,
      version: AGREEMENT_VERSION,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("Agreement sign error:", msg, stack || err);
    return NextResponse.json(
      { error: "Failed to record signature. Please try again or contact support." },
      { status: 500 }
    );
  }
}
