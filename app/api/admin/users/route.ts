import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { data: users } = await clerkClient.users.getUserList({ limit: 100 });
    const list = users.map((u) => ({
      id: u.id,
      email: u.emailAddresses[0]?.emailAddress ?? null,
      firstName: u.firstName,
      lastName: u.lastName,
      createdAt: u.createdAt,
    }));
    return NextResponse.json({ users: list });
  } catch (err) {
    console.error("Admin users list error:", err);
    return NextResponse.json(
      { error: "Failed to list users" },
      { status: 500 }
    );
  }
}
