import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, CalendarDays, CheckCircle2, Clock3, History } from "lucide-react";

import { PageHeader } from "@/components/erp/page-header";
import { PosTerminal } from "@/components/erp/pos-terminal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney, getBusinessSummary, getCurrentProfile, getManilaDateKey, type Sale } from "@/lib/erp";
import { markSalePaidAction } from "../history/actions";
import { createExpenseAction, createSaleAction } from "./actions";

const dateTimeFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Manila",
});

type PosSale = Pick<Sale, "id" | "customer_name" | "item_description" | "total_amount" | "is_paid" | "paid_at" | "created_at">;

function formatDateTime(value: string | Date) {
  return dateTimeFormatter.format(typeof value === "string" ? new Date(value) : value);
}

export default async function PosPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams?: Promise<{ success?: string; error?: string }>;
}) {
  const { businessId } = await params;
  const query = (await searchParams) ?? {};
  const { supabase, profile } = await getCurrentProfile();

  if (!profile) {
    notFound();
  }

  const today = getManilaDateKey();
  const todayBounds = {
    end: `${today}T23:59:59.999+08:00`,
    start: `${today}T00:00:00+08:00`,
  };

  const [summary, todaySalesResult, openSalesResult, recentReportsResult] = await Promise.all([
    getBusinessSummary(supabase, businessId),
    supabase
      .from("sales")
      .select("id, customer_name, item_description, total_amount, is_paid, paid_at, created_at")
      .eq("business_id", businessId)
      .gte("created_at", todayBounds.start)
      .lt("created_at", todayBounds.end)
      .order("created_at", { ascending: false }),
    supabase
      .from("sales")
      .select("id, customer_name, item_description, total_amount, is_paid, paid_at, created_at")
      .eq("business_id", businessId)
      .eq("is_paid", false)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("eod_reports")
      .select("id, business_id, report_date, gross_sales, paid_sales, total_expenses, net_cash, closed_by, created_at")
      .eq("business_id", businessId)
      .order("report_date", { ascending: false })
      .limit(6),
  ]);

  if (todaySalesResult.error) {
    throw todaySalesResult.error;
  }

  if (openSalesResult.error) {
    throw openSalesResult.error;
  }

  if (recentReportsResult.error) {
    throw recentReportsResult.error;
  }

  const todaySales = (todaySalesResult.data ?? []) as PosSale[];
  const openSales = (openSalesResult.data ?? []) as PosSale[];
  const recentReports = recentReportsResult.data ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Point of sale"
        title={`${summary.business.name} POS`}
        description="Record free-form sales and daily expenses directly, without a product catalog."
      />

      {query.error ? (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {query.error}
          </CardContent>
        </Card>
      ) : null}

      {query.success === "sale" ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-sm">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            Sale saved.
          </CardContent>
        </Card>
      ) : null}

      {query.success === "expense" ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-sm">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            Expense saved.
          </CardContent>
        </Card>
      ) : null}

      {query.success === "paid" ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-sm">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            Sale marked as paid.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Sales logged</p>
            <p className="mt-1 text-xl font-semibold">{summary.saleCountToday}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Gross sales</p>
            <p className="mt-1 text-xl font-semibold">{formatMoney(summary.grossSalesToday)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Paid sales</p>
            <p className="mt-1 text-xl font-semibold">{formatMoney(summary.paidSalesToday)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Expenses</p>
            <p className="mt-1 text-xl font-semibold">{formatMoney(summary.expensesToday)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Net cash</p>
            <p className="mt-1 text-xl font-semibold">{formatMoney(summary.netCashToday)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">Unpaid {formatMoney(summary.unpaidBalanceToday)}</Badge>
        <Badge variant="outline">
          {summary.latestReport ? `Last closed ${formatDate(summary.latestReport.report_date)}` : "Not yet closed"}
        </Badge>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <PosTerminal
          businessId={businessId}
          submitSaleAction={createSaleAction}
          submitExpenseAction={createExpenseAction}
        />

        <div className="space-y-6">
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarDays className="h-5 w-5" />
                Today’s transactions
              </CardTitle>
              <CardDescription>
                See every sale entered today without closing EOD.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {todaySales.length > 0 ? (
                todaySales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border/60 p-4"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{sale.customer_name || "Walk-in customer"}</p>
                      <p className="text-sm text-muted-foreground">{sale.item_description}</p>
                      <p className="text-xs text-muted-foreground">
                        Created {formatDateTime(sale.created_at)}
                        {sale.paid_at ? ` · Paid ${formatDateTime(sale.paid_at)}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-right">
                      <p className="font-semibold">{formatMoney(sale.total_amount)}</p>
                      <Badge variant={sale.is_paid ? "secondary" : "outline"}>
                        {sale.is_paid ? "Paid" : "Unpaid"}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
                  No sales have been entered yet today.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock3 className="h-5 w-5" />
                Outstanding balances
              </CardTitle>
              <CardDescription>
                Mark sales as paid when customers settle later, even on a different day.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {openSales.length > 0 ? (
                openSales.map((sale) => (
                  <form
                    key={sale.id}
                    action={markSalePaidAction}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border/60 p-4"
                  >
                    <input type="hidden" name="businessId" value={businessId} />
                    <input type="hidden" name="saleId" value={sale.id} />
                    <input type="hidden" name="returnPath" value={`/dashboard/${businessId}/pos`} />
                    <div className="space-y-1">
                      <p className="font-medium">{sale.customer_name || "Walk-in customer"}</p>
                      <p className="text-sm text-muted-foreground">{sale.item_description}</p>
                      <p className="text-xs text-muted-foreground">Created {formatDateTime(sale.created_at)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-right">
                      <p className="font-semibold">{formatMoney(sale.total_amount)}</p>
                      <Button type="submit" size="sm">
                        Mark as paid now
                      </Button>
                    </div>
                  </form>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
                  No unpaid sales right now.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="h-5 w-5" />
                Recent closed days
              </CardTitle>
              <CardDescription>
                Jump to previous days if you need the full history view.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentReports.length > 0 ? (
                recentReports.map((report) => (
                  <Button key={report.id} asChild variant="ghost" className="h-auto w-full justify-between py-3">
                    <Link href={`/dashboard/${businessId}/history?date=${report.report_date}`}>
                      <span className="text-left">
                        <span className="block font-medium">{formatDate(report.report_date)}</span>
                        <span className="block text-xs text-muted-foreground">
                          Closed {formatDateTime(report.created_at)}
                        </span>
                      </span>
                      <span className="text-right text-sm font-semibold">{formatMoney(report.net_cash)}</span>
                    </Link>
                  </Button>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
                  No closed days yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
