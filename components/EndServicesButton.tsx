"use client";

import { Button } from "@/components/ui/button";

const END_SERVICES_MAILTO =
  "mailto:help@zoomi.co?subject=End%20Rental%20Request&body=I%20would%20like%20to%20end%20my%20washer%2Fdryer%20rental.";

export function EndServicesButton() {
  return (
    <Button variant="outline" size="lg" asChild>
      <a href={END_SERVICES_MAILTO}>End Services</a>
    </Button>
  );
}
