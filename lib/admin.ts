import { auth, currentUser } from "@clerk/nextjs/server";
import { isStaffRole } from "@/lib/staff-role";

export async function isAdmin(): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) {
    return false;
  }
  const user = await currentUser();
  return isStaffRole(user?.publicMetadata?.role as string | undefined);
}

/**
 * Use in Server Components / API routes. For client, use isStaffRole from @/lib/staff-role instead.
 */
export async function requireAdmin(): Promise<{ userId: string }> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  const user = await currentUser();
  if (!isStaffRole(user?.publicMetadata?.role as string | undefined)) throw new Error("Forbidden");
  return { userId };
}
