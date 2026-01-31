import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PropertyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Property Management</h1>
        <p className="text-sm text-muted-foreground">
          Manage rental units, inventory, and maintenance schedules
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Property management features are under development
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This section will include inventory tracking, unit status, maintenance logs, and more.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
