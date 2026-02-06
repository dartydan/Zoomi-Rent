import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Zoomi Rentals <noreply@rent.zoomi.co>";

function sanitize(s: string): string {
  return s.replace(/\r?\n/g, " ").trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      type: "maintenance" | "end-service" | "return-property";
      description?: string;
      notes?: string;
      unitsOutBy?: string;
      propertyLocation?: string;
      contactInfo?: string;
    };
    const type = body.type;
    if (!type || !["maintenance", "end-service", "return-property"].includes(type)) {
      return NextResponse.json({ error: "Invalid request type" }, { status: 400 });
    }

    const origin = req.headers.get("origin") ?? req.nextUrl.origin;

    if (type === "return-property") {
      const propertyLocation = typeof body.propertyLocation === "string" ? sanitize(body.propertyLocation) : "";
      const contactInfo = typeof body.contactInfo === "string" ? sanitize(body.contactInfo) : "";
      if (!propertyLocation || !contactInfo) {
        return NextResponse.json(
          { error: "Please provide both the property location and contact information" },
          { status: 400 }
        );
      }

      if (resend) {
        const emailBody = [
          "Return Property Request (non-customer)",
          "---",
          `Where did you find our property: ${propertyLocation}`,
          `Who to contact: ${contactInfo}`,
        ].join("\n");

        const { error } = await resend.emails.send({
          from: FROM_EMAIL,
          to: "business@zoomi.co",
          subject: "Return Property Request",
          text: emailBody,
        });
        if (error) {
          console.error("Help request email failed:", error);
          return NextResponse.json(
            { error: "Failed to send request. Please try again." },
            { status: 500 }
          );
        }
      } else {
        console.warn("RESEND_API_KEY not set; help request not sent");
      }

      return NextResponse.json({ success: true });
    }

    // maintenance and end-service require auth
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const userName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Unknown";
    const userEmail = user?.primaryEmailAddress?.emailAddress ?? "Unknown";
    const profileUrl = `${origin}/admin/users/${userId}`;

    if (type === "maintenance") {
      const description = typeof body.description === "string" ? sanitize(body.description) : "";
      if (!description) {
        return NextResponse.json(
          { error: "Please describe the maintenance issue" },
          { status: 400 }
        );
      }

      if (resend) {
        const emailBody = [
          "Maintenance Request",
          "---",
          `Customer: ${userName}`,
          `Email: ${userEmail}`,
          `Customer profile: ${profileUrl}`,
          "---",
          `Description: ${description}`,
        ].join("\n");

        const { error } = await resend.emails.send({
          from: FROM_EMAIL,
          to: "business@zoomi.co",
          subject: `Maintenance Request from ${userName}`,
          text: emailBody,
        });
        if (error) {
          console.error("Help request email failed:", error);
          return NextResponse.json(
            { error: "Failed to send request. Please try again." },
            { status: 500 }
          );
        }
      } else {
        console.warn("RESEND_API_KEY not set; help request not sent");
      }

      return NextResponse.json({ success: true });
    }

    // end-service
    const unitsOutBy = typeof body.unitsOutBy === "string" ? sanitize(body.unitsOutBy) : "";
    if (!unitsOutBy) {
      return NextResponse.json(
        { error: "Please enter when the units need to be removed by" },
        { status: 400 }
      );
    }
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 6);
    const minStr = `${minDate.getFullYear()}-${String(minDate.getMonth() + 1).padStart(2, "0")}-${String(minDate.getDate()).padStart(2, "0")}`;
    if (unitsOutBy < minStr) {
      return NextResponse.json(
        { error: "Please select a date at least 6 days from today" },
        { status: 400 }
      );
    }
    const notes = typeof body.notes === "string" ? sanitize(body.notes) : "";

    if (resend) {
      const emailBody = [
        "End Service Request",
        "---",
        `Customer: ${userName}`,
        `Email: ${userEmail}`,
        `Customer profile: ${profileUrl}`,
        `Units need to be removed by: ${unitsOutBy}`,
        notes ? `---\nAdditional details: ${notes}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: "business@zoomi.co",
        subject: `End Service Request from ${userName}`,
        text: emailBody,
      });
      if (error) {
        console.error("Help request email failed:", error);
        return NextResponse.json(
          { error: "Failed to send request. Please try again." },
          { status: 500 }
        );
      }
    } else {
      console.warn("RESEND_API_KEY not set; help request not sent");
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Help request API error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
