import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Banknote,
  ClipboardList,
  Package,
  ReceiptText,
  TrendingUp,
  Users,
} from "lucide-react";

import { MetricCard } from "@/components/erp/metric-card";
import { PageHeader } from "@/components/erp/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney, getBusinessSummary, getCurrentProfile } from "@/lib/erp";

export default async function BusinessOverviewPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const { supabase, profile } = await getCurrentProfile();

  if (!profile) {
    notFound();
  }

  const summary = await getBusinessSummary(supabase, businessId);

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Business overview"
        title={summary.business.name}
        description="Review today’s performance, staffing, stock pressure, and the most recent EOD closure at a glance."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={`/dashboard/${businessId}/pos`}>
                <ReceiptText className="h-4 w-4" />
                Open POS
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/dashboard/${businessId}/eod`}>
                <Banknote className="h-4 w-4" />
                Close EOD
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Gross sales today"
          value={formatMoney(summary.grossSalesToday)}
          detail="All POS activity for the business"
        />
        <MetricCard
          icon={<Banknote className="h-5 w-5" />}
          label="Wages today"
          value={formatMoney(summary.wagesToday)}
          detail="Attendance records locked in"
        />
        <MetricCard
          icon={<Users className="h-5 w-5" />}
          label="Attendance"
          value={`${summary.attendanceCountToday}`}
          detail="Staff checked in for the day"
        />
        <MetricCard
          icon={<Package className="h-5 w-5" />}
          label="Inventory health"
          value={`${summary.productCount}`}
          detail={`${summary.lowStockCount} low-stock items`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="h-5 w-5" />
              Today’s settlement snapshot
            </CardTitle>
            <CardDescription>
              This is the working set used by the end-of-day close for {summary.business.name}.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border/60 p-4">
              <p className="text-xs text-muted-foreground">Gross sales</p>
              <p className="mt-1 text-lg font-semibold">{formatMoney(summary.grossSalesToday)}</p>
            </div>
            <div className="rounded-lg border border-border/60 p-4">
              <p className="text-xs text-muted-foreground">Wages</p>
              <p className="mt-1 text-lg font-semibold">{formatMoney(summary.wagesToday)}</p>
            </div>
            <div className="rounded-lg border border-border/60 p-4">
              <p className="text-xs text-muted-foreground">Net cash</p>
              <p className="mt-1 text-lg font-semibold">
                {formatMoney(summary.grossSalesToday - summary.wagesToday)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>Most recent close</CardTitle>
            <CardDescription>
              If a report exists, it represents the latest closed register for this branch.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summary.latestReport ? (
              <div className="space-y-3 rounded-lg border border-border/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{formatDate(summary.latestReport.report_date)}</p>
                  <p className="text-sm text-muted-foreground">
                    Closed {formatDate(summary.latestReport.created_at)}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Gross</p>
                    <p className="font-semibold">{formatMoney(summary.latestReport.gross_sales)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Wages</p>
                    <p className="font-semibold">{formatMoney(summary.latestReport.total_wages_paid)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Net</p>
                    <p className="font-semibold">{formatMoney(summary.latestReport.net_cash)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
                No EOD report has been processed for this business yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
