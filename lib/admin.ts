import { auth, currentUser } from "@clerk/nextjs/server";

const ADMIN_ROLE = "admin";

function getRole(publicMetadata: Record<string, unknown> | null): string | undefined {
  return publicMetadata?.role as string | undefined;
}

export async function isAdmin(): Promise<boolean> {
  // In development mode, allow access without authentication
  if (process.env.NODE_ENV === "development") {
    return true;
  }
  
  const { userId } = await auth();
  if (!userId) {
    return false;
  }
  const user = await currentUser();
  return getRole(user?.publicMetadata ?? null) === ADMIN_ROLE;
}

/**
 * Use in Server Components / API routes. For client, use useUser().publicMetadata?.role === "admin"
 */
export async function requireAdmin(): Promise<{ userId: string }> {
  // In development mode, allow access without authentication
  if (process.env.NODE_ENV === "development") {
    return { userId: "demo_admin" };
  }
  
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  const user = await currentUser();
  if (getRole(user?.publicMetadata ?? null) !== ADMIN_ROLE) throw new Error("Forbidden");
  return { userId };
}
