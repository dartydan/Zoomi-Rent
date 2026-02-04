import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Wrench, XCircle, Home, Phone } from "lucide-react";

const REQUEST_MAINTENANCE_MAILTO =
  "mailto:help@zoomi.co?subject=Maintenance%20Request&body=Please%20describe%20the%20maintenance%20issue%20you%20are%20experiencing.";
const END_SERVICE_MAILTO =
  "mailto:help@zoomi.co?subject=End%20Rental%20Request&body=I%20would%20like%20to%20end%20my%20washer%2Fdryer%20rental.";
const RETURN_PROPERTY_MAILTO =
  "mailto:help@zoomi.co?subject=Return%20Property%20Request&body=I%20would%20like%20to%20return%20the%20washer%2Fdryer%20to%20the%20property.";
const PHONE_NUMBER = "tel:765-280-0057";

export default function HelpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Help</CardTitle>
          <CardDescription>Quick actions for your rental</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button asChild variant="outline" className="w-full justify-start gap-2 h-11">
            <a href={PHONE_NUMBER}>
              <Phone className="h-4 w-4" />
              Call 765-280-0057
            </a>
          </Button>
          <Button asChild variant="outline" className="w-full justify-start gap-2 h-11">
            <Link href="/dashboard">
              <CreditCard className="h-4 w-4" />
              View Billing
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full justify-start gap-2 h-11">
            <a href={REQUEST_MAINTENANCE_MAILTO}>
              <Wrench className="h-4 w-4" />
              Request Maintenance
            </a>
          </Button>
          <Button asChild variant="outline" className="w-full justify-start gap-2 h-11">
            <a href={END_SERVICE_MAILTO}>
              <XCircle className="h-4 w-4" />
              End Service
            </a>
          </Button>
          <Button asChild variant="outline" className="w-full justify-start gap-2 h-11">
            <a href={RETURN_PROPERTY_MAILTO}>
              <Home className="h-4 w-4" />
              Return Property
            </a>
          </Button>
        </CardContent>
      </Card>
      <p className="mt-4 text-sm text-muted-foreground">
        765-280-0057 · help@zoomi.co
      </p>
    </div>
  );
}
