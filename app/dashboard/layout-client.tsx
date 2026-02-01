"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/app-sidebar";
import { UserButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { ArrowLeft, User } from "lucide-react";
import Link from "next/link";

type AdminUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
};

function ViewAsSelect() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const isAdmin = (user?.publicMetadata?.role as string | undefined) === "admin";
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);

  const viewAs = searchParams.get("viewAs") ?? "";
  const isDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  useEffect(() => {
    if (!isDashboard || !isAdmin) return;
    let cancelled = false;
    fetch("/api/admin/users")
      .then((res) => (res.ok ? res.json() : Promise.resolve({ users: [] })))
      .then((body: { users?: AdminUser[] }) => {
        if (!cancelled && body.users?.length) setAdminUsers(body.users);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isDashboard, isAdmin]);

  if (!isDashboard || !isAdmin) return null;

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("viewAs", value);
    } else {
      params.delete("viewAs");
    }
    const qs = params.toString();
    router.replace(pathname + (qs ? `?${qs}` : ""));
  };

  return (
    <div className="flex items-center gap-2 min-w-0 max-w-[220px] sm:max-w-[280px]">
      <span className="text-xs font-medium text-muted-foreground shrink-0 hidden sm:inline">View as:</span>
      <CustomSelect
        value={viewAs}
        onChange={handleChange}
        placeholder="Select customer"
        icon={<User className="h-4 w-4" />}
        className="h-9 text-sm"
        options={[
          { value: "", label: "Myself" },
          ...adminUsers.map((u) => ({
            value: u.id,
            label: [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.email || u.id,
          })),
        ]}
      />
    </div>
  );
}

export function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-12 shrink-0 items-center gap-4 border-b border-border px-4">
            <SidebarTrigger className="-ml-1" />
            <ViewAsSelect />
            <div className="flex flex-1 items-center gap-2 min-w-0" />
            <Button variant="ghost" size="sm" asChild>
              <Link href="/" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to rent.zoomi.co</span>
              </Link>
            </Button>
            <UserButton afterSignOutUrl="/" />
          </header>
          <div className="flex-1 overflow-auto p-4 sm:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
