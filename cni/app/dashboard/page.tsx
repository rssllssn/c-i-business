import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Banknote,
  ClipboardList,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";

import { MetricCard } from "@/components/erp/metric-card";
import { PageHeader } from "@/components/erp/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatDate,
  formatMoney,
  getCurrentProfile,
  getDashboardOverview,
  type BusinessSummary,
} from "@/lib/erp";

function BusinessSummaryCard({ summary }: { summary: BusinessSummary }) {
  const reportClosed = Boolean(summary.latestReport);

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-xl">{summary.business.name}</CardTitle>
            <CardDescription>
              {summary.attendanceCountToday} staff checked in today
            </CardDescription>
          </div>
          <Badge variant={reportClosed ? "secondary" : "outline"}>
            {reportClosed ? "Closed" : "Open"}
          </Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border/60 bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Gross sales</p>
            <p className="mt-1 text-lg font-semibold">
              {formatMoney(summary.grossSalesToday)}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Wages</p>
            <p className="mt-1 text-lg font-semibold">
              {formatMoney(summary.wagesToday)}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Net cash</p>
            <p className="mt-1 text-lg font-semibold">
              {formatMoney(summary.grossSalesToday - summary.wagesToday)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-xs text-muted-foreground">Products</p>
            <p className="mt-1 text-base font-medium">{summary.productCount} active SKUs</p>
          </div>
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-xs text-muted-foreground">Low stock</p>
            <p className="mt-1 text-base font-medium">{summary.lowStockCount} items need restock</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href={`/dashboard/${summary.business.id}`}>Open business</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/${summary.business.id}/pos`}>Open POS</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/${summary.business.id}/inventory`}>Inventory</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/${summary.business.id}/attendance`}>Attendance</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/${summary.business.id}/eod`}>EOD</Link>
          </Button>
        </div>
        {summary.latestReport ? (
          <p className="text-xs text-muted-foreground">
            Last closed on {formatDate(summary.latestReport.created_at)}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const { supabase, profile } = await getCurrentProfile();

  if (!profile) {
    redirect("/auth/login");
  }

  const overview = await getDashboardOverview(supabase);

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Overview"
        title="Multi-business operations dashboard"
        description="Monitor sales, wages, staffing, stock, and end-of-day settlement across both businesses from one control panel."
        actions={
          <Button asChild variant="outline">
            <Link href="/dashboard/admin/employees">
              Employee admin
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<Store className="h-5 w-5" />}
          label="Businesses"
          value={`${overview.businesses.length}`}
          detail="Managed under one dashboard"
        />
        <MetricCard
          icon={<Banknote className="h-5 w-5" />}
          label="Gross sales today"
          value={formatMoney(overview.grossSalesToday)}
          detail="All locations combined"
        />
        <MetricCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Net cash today"
          value={formatMoney(overview.netCashToday)}
          detail="Gross sales minus wages"
        />
        <MetricCard
          icon={<Users className="h-5 w-5" />}
          label="Staff profiles"
          value={`${overview.totalStaffCount}`}
          detail="Employees available for assignment"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {overview.businesses.map((summary) => (
          <BusinessSummaryCard key={summary.business.id} summary={summary} />
        ))}
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5" />
            Recommended daily flow
          </CardTitle>
          <CardDescription>
            Use the same tablet to sell items, check staff in, and then close the register at the end of the day.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {[
            {
              title: "1. Run POS",
              text: "Capture every sale for the selected business and reduce stock automatically.",
            },
            {
              title: "2. Track attendance",
              text: "Lock in each staff member’s daily rate when they are logged for the shift.",
            },
            {
              title: "3. Close EOD",
              text: "Process one business at a time to post sales, wages, and settlement records.",
            },
          ].map((step) => (
            <div key={step.title} className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <p className="font-medium">{step.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
