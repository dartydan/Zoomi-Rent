"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function EndServicesButton() {
  return (
    <Button
      variant="outline"
      size="lg"
      asChild
      className="hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
    >
      <Link href="/help?action=end-service">End Services</Link>
    </Button>
  );
}
