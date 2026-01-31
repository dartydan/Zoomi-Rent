import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function FinancesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Finances</h1>
        <p className="text-sm text-muted-foreground">
          View revenue, payments, and financial reports
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Financial management features are under development
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This section will include revenue tracking, payment history, invoicing, and financial reports.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
