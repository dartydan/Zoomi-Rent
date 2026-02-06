import { auth, currentUser } from "@clerk/nextjs/server";
import { canEdit, isStaffRole } from "@/lib/staff-role";

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

/** Use for write operations. Employees are view-only. */
export async function requireCanEdit(): Promise<{ userId: string }> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  const user = await currentUser();
  if (!canEdit(user?.publicMetadata?.role as string | undefined)) throw new Error("Forbidden");
  return { userId };
}

/** Returns auth info including whether user can edit. Use when you need both read access and edit check. */
export async function getAuthWithEdit(): Promise<{ userId: string; canEdit: boolean }> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const user = await currentUser();
  if (!isStaffRole(user?.publicMetadata?.role as string | undefined)) throw new Error("Forbidden");
  return {
    userId,
    canEdit: canEdit(user?.publicMetadata?.role as string | undefined),
  };
}
