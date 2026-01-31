"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import { Home, LogIn, LogOut, Users, Building, DollarSign, BarChart3 } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const { user } = useUser();
  const isDevelopment = process.env.NODE_ENV === "development";
  const isAdminUser = (user?.publicMetadata?.role as string | undefined) === "admin" || (isDevelopment && pathname.startsWith("/admin"));
  const isAdminSection = pathname.startsWith("/admin");

  // If in admin section, show admin-specific nav
  if (isAdminSection && isAdminUser) {
    const adminNavItems = [
      { title: "Overview", href: "/admin", icon: Home },
      { title: "Customers", href: "/admin/users", icon: Users },
      { title: "Property", href: "/admin/property", icon: Building },
      { title: "Finances", href: "/admin/finances", icon: DollarSign },
      { title: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    ];

    return (
      <Sidebar>
        <SidebarHeader>
          <SidebarMenuButton asChild size="lg">
            <Link href="/admin">
              <span className="font-semibold text-sidebar-foreground">Zoomi Rentals</span>
            </Link>
          </SidebarMenuButton>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Admin Portal</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavItems.map((item) => (
                  <SidebarMenuItem key={item.href + item.title}>
                    <SidebarMenuButton asChild isActive={pathname === item.href}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => {
                      if (isDevelopment) {
                        window.location.href = "/";
                      } else {
                        signOut({ redirectUrl: "/" });
                      }
                    }}
                    aria-label="Log out"
                  >
                    <LogOut />
                    <span>Log out</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <p className="px-2 text-xs text-muted-foreground">Admin Dashboard</p>
        </SidebarFooter>
      </Sidebar>
    );
  }

  // Customer/default navigation
  const navItems = isSignedIn
    ? [
        { title: "Home", href: "/dashboard", icon: Home },
      ]
    : [
        { title: "Home", href: "/", icon: Home },
        { title: "Customer Login", href: "/login", icon: LogIn },
      ];

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenuButton asChild size="lg">
          <Link href={isSignedIn ? "/dashboard" : "/"}>
            <span className="font-semibold text-sidebar-foreground">Zoomi Rentals</span>
          </Link>
        </SidebarMenuButton>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href + item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {isSignedIn && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => signOut({ redirectUrl: "/" })}
                    aria-label="Sign out"
                  >
                    <LogOut />
                    <span>Logout</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <p className="px-2 text-xs text-muted-foreground">Washer &amp; dryer rental</p>
      </SidebarFooter>
    </Sidebar>
  );
}
