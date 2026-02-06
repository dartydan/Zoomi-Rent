"use client";

import { useTheme } from "next-themes";
import { useUser } from "@clerk/nextjs";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/app-sidebar";
import { UserButton } from "@clerk/nextjs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { canEdit } from "@/lib/staff-role";
import { AdminCanEditProvider } from "./can-edit-context";

export function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser();
  const { setTheme, resolvedTheme } = useTheme();
  const canEditAdmin = canEdit(user?.publicMetadata?.role as string | undefined);
  const isDark = resolvedTheme === "dark";

  return (
    <AdminCanEditProvider canEdit={canEditAdmin}>
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-12 shrink-0 items-center gap-4 border-b border-border px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex flex-1 items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {canEditAdmin ? "Admin" : "Employee"}
              </Badge>
            </div>
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
              aria-label="Toggle theme"
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
    </AdminCanEditProvider>
  );
}
