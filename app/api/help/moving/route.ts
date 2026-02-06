import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Zoomi Rentals <noreply@rent.zoomi.co>";

// Muncie, IN 47304 coordinates (approximate)
const MUNCIE_LAT = 40.1934;
const MUNCIE_LON = -85.3864;
const MILES_THRESHOLD = 55; // ~1 hour drive

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function getZipCoordinates(zip: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip.trim()}`, {
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      places?: Array<{ latitude: string; longitude: string }>;
    };
    const place = data.places?.[0];
    if (!place?.latitude || !place?.longitude) return null;
    return {
      lat: parseFloat(place.latitude),
      lon: parseFloat(place.longitude),
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { zip: string; moveOutDate?: string; confirmMoving?: boolean };
    const zip = typeof body.zip === "string" ? body.zip.trim() : "";
    const moveOutDate = typeof body.moveOutDate === "string" ? body.moveOutDate.trim() : undefined;
    const confirmMoving = body.confirmMoving === true;

    if (!zip || zip.length < 5) {
      return NextResponse.json(
        { error: "Please enter a valid 5-digit ZIP code" },
        { status: 400 }
      );
    }

    const coords = await getZipCoordinates(zip);
    if (!coords) {
      return NextResponse.json(
        { error: "Could not find that ZIP code. Please check and try again." },
        { status: 400 }
      );
    }

    const distance = haversineDistance(MUNCIE_LAT, MUNCIE_LON, coords.lat, coords.lon);
    const inRange = distance <= MILES_THRESHOLD;

    const user = await currentUser();
    const userName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Unknown";
    const userEmail = user?.primaryEmailAddress?.emailAddress ?? "Unknown";
    const origin = req.headers.get("origin") ?? req.nextUrl.origin;
    const profileUrl = `${origin}/admin/users/${userId}`;

    // Send email when: (a) in-range and user confirmed moving, or (b) user provided move-out date (return flow)
    const shouldSendEmail = (inRange && confirmMoving) || moveOutDate;
    if (shouldSendEmail && resend) {
      const outcome = moveOutDate
        ? inRange
          ? "Customer chose to return despite being in service area"
          : "Outside service area - return required"
        : "Washer and dryer can move with customer";
      const emailBody = [
        "Move Request",
        "---",
        `Customer: ${userName}`,
        `Email: ${userEmail}`,
        `Customer profile: ${profileUrl}`,
        "---",
        `Moving to ZIP: ${zip}`,
        `Distance from Muncie (47304): ${distance.toFixed(1)} miles`,
        `Outcome: ${outcome}`,
        moveOutDate ? `Move out date: ${moveOutDate}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: "business@zoomi.co",
        subject: `Move Request: ${userName} - ${moveOutDate ? "Return required" : "Moving with units"}`,
        text: emailBody,
      });
      if (error) {
        console.error("Move notification email failed:", error);
      }
    } else if (shouldSendEmail && !resend) {
      console.warn("RESEND_API_KEY not set; move notification not sent");
    }

    return NextResponse.json({ inRange });
  } catch (err) {
    console.error("Move API error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
