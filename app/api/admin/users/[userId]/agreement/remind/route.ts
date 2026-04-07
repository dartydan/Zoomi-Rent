import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { requireCanEdit } from "@/lib/admin";
import {
  AGREEMENT_SIGNED_AT_KEY,
  AGREEMENT_VERSION_KEY,
} from "@/lib/agreement";

export const dynamic = "force-dynamic";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Zoomi Rentals <noreply@rent.zoomi.co>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://rent.zoomi.co";

export async function POST(
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
    const user = await clerkClient.users.getUser(userId);
    const signedAt = user.publicMetadata?.[AGREEMENT_SIGNED_AT_KEY] as string | undefined;
    const version = user.publicMetadata?.[AGREEMENT_VERSION_KEY] as string | undefined;
    if (signedAt?.trim() && version?.trim()) {
      return NextResponse.json(
        { error: "Customer has already signed the agreement." },
        { status: 400 }
      );
    }

    const primary = user.emailAddresses?.find((e) => e.id === user.primaryEmailAddressId);
    const email = primary?.emailAddress ?? user.emailAddresses?.[0]?.emailAddress;
    if (!email?.trim()) {
      return NextResponse.json(
        { error: "No email address for this customer." },
        { status: 400 }
      );
    }

    const firstName = (user.firstName ?? "").trim() || "Customer";
    const signUrl = `${APP_URL.replace(/\/$/, "")}/dashboard/agreement`;

    if (!resend) {
      console.warn("RESEND_API_KEY not set; agreement reminder not sent");
      return NextResponse.json(
        { error: "Reminder emails are not set up on this server. Add RESEND_API_KEY to your environment (e.g. .env.local or Vercel)." },
        { status: 503 }
      );
    }

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email.trim(),
      subject: "Sign your Zoomi Rentals agreement",
      text: `Hi ${firstName},\n\nYou still need to sign your rental agreement online. Sign in to your account and complete the agreement in the portal:\n\n${signUrl}\n\nIf you have any questions, reply to this email or contact us at help@zoomi.co or 765-280-0057.\n\n— Zoomi Rentals`,
    });

    if (error) {
      console.error("Agreement reminder send error:", error);
      return NextResponse.json(
        { error: error.message ?? "Failed to send email." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Agreement remind error:", err);
    return NextResponse.json(
      { error: "Failed to send reminder." },
      { status: 500 }
    );
  }
}
