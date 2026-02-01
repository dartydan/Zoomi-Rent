"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import { Home, LogIn, LogOut, Users, Building, DollarSign, BarChart3, LayoutDashboard, XCircle, Lock } from "lucide-react";
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

const CUSTOMER_PORTAL_VIEW_COOKIE = "customer_portal_view";
const END_SERVICES_MAILTO =
  "mailto:help@zoomi.co?subject=End%20Rental%20Request&body=I%20would%20like%20to%20end%20my%20washer%2Fdryer%20rental.";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const { user } = useUser();
  const isDevelopment = process.env.NODE_ENV === "development";
  const isAdminUser = (user?.publicMetadata?.role as string | undefined) === "admin" || (isDevelopment && pathname.startsWith("/admin"));
  const isAdminSection = pathname.startsWith("/admin");

  function openCustomerPortal() {
    document.cookie = `${CUSTOMER_PORTAL_VIEW_COOKIE}=true; path=/; max-age=60`;
    window.location.href = "/dashboard";
  }

  function goToAdmin() {
    document.cookie = `${CUSTOMER_PORTAL_VIEW_COOKIE}=; path=/; max-age=0`;
    router.push("/admin");
  }

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
            <Link href="/admin" className="flex items-center gap-2">
              <Image src="/logo.png" alt="" width={28} height={28} className="shrink-0 rounded object-contain" />
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
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={openCustomerPortal} className="gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>View customer portal</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <p className="px-2 pt-2 text-xs text-muted-foreground">Admin Dashboard</p>
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
          <Link href={isSignedIn ? "/dashboard" : "/"} className="flex items-center gap-2">
            <Image src="/logo.png" alt="" width={28} height={28} className="shrink-0 rounded object-contain" />
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
              {isSignedIn && user?.passwordEnabled === false && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/user-profile")}>
                    <Link href="/dashboard/user-profile/security">
                      <Lock />
                      <span>Set password</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
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
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {isSignedIn && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="gap-2 text-muted-foreground hover:text-destructive">
                    <a href={END_SERVICES_MAILTO}>
                      <XCircle className="h-4 w-4" />
                      <span>End Services</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {isSignedIn && isAdminUser && (
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={goToAdmin} className="gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Admin dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  );
}
