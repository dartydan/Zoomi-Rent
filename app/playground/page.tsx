import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LayoutDashboard, Shield } from "lucide-react";
import { redirect } from "next/navigation";

export default function PlaygroundPage() {
  // Only allow access in development mode
  if (process.env.NODE_ENV !== 'development') {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Development Playground</h1>
          <p className="text-muted-foreground">
            Test customer and admin portal features in development
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Customer Portal */}
          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <LayoutDashboard className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">Customer Portal</CardTitle>
              </div>
              <CardDescription className="text-base">
                Access the customer dashboard to manage your rental, view payment history, and track service requests.
              </CardDescription>
              <Button className="w-full" asChild>
                <Link href="/dashboard">View Customer Portal</Link>
              </Button>
            </CardHeader>
          </Card>

          {/* Admin Portal */}
          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">Admin Portal</CardTitle>
              </div>
              <CardDescription className="text-base">
                Access the admin dashboard to manage users, view analytics, and configure system settings.
              </CardDescription>
              <Button className="w-full" asChild>
                <Link href="/admin">View Admin Portal</Link>
              </Button>
            </CardHeader>
          </Card>
        </div>

        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">Development Notes</CardTitle>
            <CardDescription>
              <ul className="list-disc list-inside space-y-2 mt-2">
                <li>This page is only available in development mode</li>
                <li>Customer portal requires authentication</li>
                <li>Admin portal requires admin role</li>
              </ul>
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="flex justify-center">
          <Button variant="outline" asChild>
            <Link href="/">← Back to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
