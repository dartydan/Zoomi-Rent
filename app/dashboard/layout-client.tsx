"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/app-sidebar";
import { UserButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { ArrowLeft, Moon, Sun, User } from "lucide-react";
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
    <div className="flex items-center gap-2 min-w-[180px] w-full max-w-[min(100%,360px)]">
      <span className="text-xs font-medium text-muted-foreground shrink-0 hidden sm:inline">View as:</span>
      <CustomSelect
        value={viewAs}
        onChange={handleChange}
        placeholder="Select customer"
        icon={<User className="h-4 w-4" />}
        className="h-9 text-sm min-w-0 flex-1"
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
  const { setTheme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-12 shrink-0 items-center gap-4 border-b border-border px-4">
            <ViewAsSelect />
            <div className="flex flex-1 items-center gap-2 min-w-0" />
            <Button variant="ghost" size="sm" asChild>
              <Link href="/" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to rent.zoomi.co</span>
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 shrink-0 border border-transparent hover:border-border rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              <Sun className="h-4 w-4 scale-0 transition-all dark:scale-100" />
              <Moon className="absolute h-4 w-4 scale-100 transition-all dark:scale-0" />
            </Button>
            <UserButton afterSignOutUrl="/" />
          </header>
          <div className="flex-1 overflow-auto p-4 sm:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
