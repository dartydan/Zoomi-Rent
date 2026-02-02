"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useAuth } from "@clerk/nextjs";
import { LogOut, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetStarted } from "@/components/GetStartedContext";

const SECTION_IDS = ["pricing", "how-it-works", "benefits", "testimonials"] as const;
const NAV_ITEMS: { id: (typeof SECTION_IDS)[number]; label: string }[] = [
  { id: "pricing", label: "Pricing" },
  { id: "how-it-works", label: "How It Works" },
  { id: "benefits", label: "Benefits" },
  { id: "testimonials", label: "Reviews" },
];

type MarketingHeaderProps = {
  variant?: "default" | "checklist";
};

export function MarketingHeader({ variant = "default" }: MarketingHeaderProps) {
  const { isSignedIn, signOut } = useAuth();
  const { openGetStarted } = useGetStarted();
  const { setTheme, resolvedTheme } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<(typeof SECTION_IDS)[number] | null>("pricing");
  const [sliderStyle, setSliderStyle] = useState<{ left: number; width: number } | null>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const isDark = resolvedTheme === "dark";

  const updateSlider = () => {
    const activeIndex = activeSection ? SECTION_IDS.indexOf(activeSection) : -1;
    if (activeIndex < 0 || !pillRef.current) return;
    const link = linkRefs.current[activeIndex];
    if (!link) return;
    setSliderStyle({ left: link.offsetLeft, width: link.offsetWidth });
  };

  useEffect(() => {
    const raf = requestAnimationFrame(() => updateSlider());
    return () => cancelAnimationFrame(raf);
  }, [activeSection]);

  useEffect(() => {
    if (!pillRef.current) return;
    const ro = new ResizeObserver(() => requestAnimationFrame(updateSlider));
    ro.observe(pillRef.current);
    return () => ro.disconnect();
  }, [activeSection]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = entry.target.id as (typeof SECTION_IDS)[number];
          if (SECTION_IDS.includes(id)) setActiveSection(id);
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    );

    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  return (
    <header
      className={`sticky top-0 z-50 border-b border-border transition-all duration-300 ${
        isScrolled
          ? "bg-background/80 backdrop-blur-lg shadow-sm"
          : "bg-background"
      }`}
    >
      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center gap-2 text-lg font-bold text-foreground transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md"
          >
            <Image src="/logo.png" alt="Zoomi Rentals Logo" width={32} height={32} className="h-8 w-8" />
            <span>Zoomi Rentals</span>
          </Link>
        </div>
        {variant !== "checklist" && (
          <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:block">
            <div
              ref={pillRef}
              className="relative inline-flex rounded-full border border-border bg-muted/30 p-1"
            >
                {sliderStyle && (
                  <span
                    className="absolute top-1 bottom-1 rounded-full bg-background/70 backdrop-blur-sm border border-border/50 transition-[left,width] duration-200 ease-out"
                    style={{ left: sliderStyle.left, width: sliderStyle.width }}
                    aria-hidden
                  />
                )}
                {NAV_ITEMS.map((item, i) => (
                  <a
                    key={item.id}
                    ref={(el) => { linkRefs.current[i] = el; }}
                    href={`#${item.id}`}
                    onClick={(e) => scrollToSection(e, item.id)}
                    className={`relative z-10 rounded-full px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                      activeSection === item.id
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </a>
                ))}
            </div>
          </div>
        )}
        <nav className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3" aria-label="Main">
          {variant === "checklist" ? (
            <Button variant="ghost" size="default" asChild>
              <Link href="/">Back</Link>
            </Button>
          ) : (
            <>
              {!isSignedIn && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-9 w-9 shrink-0"
                  onClick={() => setTheme(isDark ? "light" : "dark")}
                  aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                >
                  <Sun className="h-4 w-4 scale-0 transition-all dark:scale-100" />
                  <Moon className="absolute h-4 w-4 scale-100 transition-all dark:scale-0" />
                </Button>
              )}
              {!isSignedIn && (
                <Button variant="default" size="default" className="hidden sm:inline-flex min-w-[110px] hover:scale-105 transition-transform" onClick={() => openGetStarted()}>
                  Get Started
                </Button>
              )}
              {isSignedIn && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-9 w-9 shrink-0"
                  onClick={() => setTheme(isDark ? "light" : "dark")}
                  aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                >
                  <Sun className="h-4 w-4 scale-0 transition-all dark:scale-100" />
                  <Moon className="absolute h-4 w-4 scale-100 transition-all dark:scale-0" />
                </Button>
              )}
              {isSignedIn ? (
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => signOut({ redirectUrl: "/" })} aria-label="Log out">
              <LogOut className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="default" size="default" className="min-w-[110px] bg-foreground text-background hover:bg-foreground/90" asChild>
              <Link href="/login">Login</Link>
            </Button>
          )}
          {isSignedIn && (
            <Button variant="default" size="lg" className="min-w-[140px] sm:min-w-[160px] hover:scale-105 transition-transform" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
