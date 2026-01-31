"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

type MarketingHeaderProps = {
  variant?: "default" | "checklist";
};

export function MarketingHeader({ variant = "default" }: MarketingHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      const headerOffset = 80; // Height of sticky header
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
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center gap-2 text-lg font-bold text-foreground transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md"
        >
          <Image src="/logo.png" alt="Zoomi Rentals Logo" width={32} height={32} className="h-8 w-8" />
          <span>Zoomi Rentals</span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3" aria-label="Main">
          {variant === "checklist" ? (
            <Button variant="ghost" size="default" asChild>
              <Link href="/">Back</Link>
            </Button>
          ) : (
            <>
              <a
                href="#benefits"
                onClick={(e) => scrollToSection(e, "benefits")}
                className="hidden md:inline-flex items-center justify-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-md hover:bg-accent"
              >
                Benefits
              </a>
              <a
                href="#how-it-works"
                onClick={(e) => scrollToSection(e, "how-it-works")}
                className="hidden md:inline-flex items-center justify-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-md hover:bg-accent"
              >
                How It Works
              </a>
              <a
                href="#pricing"
                onClick={(e) => scrollToSection(e, "pricing")}
                className="hidden md:inline-flex items-center justify-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-md hover:bg-accent"
              >
                Pricing
              </a>
              <a
                href="#testimonials"
                onClick={(e) => scrollToSection(e, "testimonials")}
                className="hidden md:inline-flex items-center justify-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-md hover:bg-accent"
              >
                Reviews
              </a>
              <Button variant="default" size="default" className="hover:scale-105 transition-transform" asChild>
                <Link href="/checklist">Get Started</Link>
              </Button>
            </>
          )}
          <Button variant="default" size="default" className="bg-foreground text-background hover:bg-foreground/90" asChild>
            <Link href="/login">Login</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
