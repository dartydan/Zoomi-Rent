/**
 * Client-safe role check. Use in Client Components with useUser().publicMetadata?.role.
 * Server-side: use requireAdmin() or isAdmin() from @/lib/admin.
 */
const STAFF_ROLES = ["admin", "employee"] as const;

export function isStaffRole(role: string | undefined): boolean {
  return role !== undefined && STAFF_ROLES.includes(role as (typeof STAFF_ROLES)[number]);
}
