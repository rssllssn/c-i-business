import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertCircle,
  Banknote,
  ClipboardList,
  CheckCircle2,
  CalendarDays,
  ReceiptText,
  TrendingUp,
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
        description="Review today’s sales, unpaid balance, expenses, and the most recent EOD closure at a glance."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={`/dashboard/${businessId}/pos`}>
                <ReceiptText className="h-4 w-4" />
                Open POS
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/dashboard/${businessId}/history`}>
                <CalendarDays className="h-4 w-4" />
                History
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          icon={<ReceiptText className="h-5 w-5" />}
          label="Sales logged today"
          value={`${summary.saleCountToday}`}
          detail="Free-form sales captured on POS"
        />
        <MetricCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Gross sales today"
          value={formatMoney(summary.grossSalesToday)}
          detail="All recorded sales"
        />
        <MetricCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Paid sales"
          value={formatMoney(summary.paidSalesToday)}
          detail="Cash already collected"
        />
        <MetricCard
          icon={<AlertCircle className="h-5 w-5" />}
          label="Unpaid balance"
          value={formatMoney(summary.unpaidBalanceToday)}
          detail="Sales still awaiting payment"
        />
        <MetricCard
          icon={<Banknote className="h-5 w-5" />}
          label="Expenses"
          value={formatMoney(summary.expensesToday)}
          detail="Supplies, labor, and other costs"
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
          <CardContent className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-border/60 p-4">
              <p className="text-xs text-muted-foreground">Gross sales</p>
              <p className="mt-1 text-lg font-semibold">{formatMoney(summary.grossSalesToday)}</p>
            </div>
            <div className="rounded-lg border border-border/60 p-4">
              <p className="text-xs text-muted-foreground">Paid sales</p>
              <p className="mt-1 text-lg font-semibold">{formatMoney(summary.paidSalesToday)}</p>
            </div>
            <div className="rounded-lg border border-border/60 p-4">
              <p className="text-xs text-muted-foreground">Expenses</p>
              <p className="mt-1 text-lg font-semibold">{formatMoney(summary.expensesToday)}</p>
            </div>
            <div className="rounded-lg border border-border/60 p-4">
              <p className="text-xs text-muted-foreground">Net cash</p>
              <p className="mt-1 text-lg font-semibold">{formatMoney(summary.netCashToday)}</p>
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
                    <p className="text-xs text-muted-foreground">Paid</p>
                    <p className="font-semibold">{formatMoney(summary.latestReport.paid_sales)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Expenses</p>
                    <p className="font-semibold">{formatMoney(summary.latestReport.total_expenses)}</p>
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
