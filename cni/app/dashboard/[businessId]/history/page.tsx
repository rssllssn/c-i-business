import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  History,
  ReceiptText,
  TrendingUp,
} from "lucide-react";

import { PageHeader } from "@/components/erp/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatDate,
  formatMoney,
  getCurrentProfile,
  getManilaDateKey,
  type Expense,
  type Sale,
} from "@/lib/erp";
import {
  deleteExpenseAction,
  deleteSaleAction,
  markSalePaidAction,
  updateExpenseAction,
  updateSaleAction,
} from "./actions";

const dateTimeFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Manila",
});

function isDateKey(value?: string): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function getManilaDateBounds(dateKey: string) {
  return {
    end: `${dateKey}T23:59:59.999+08:00`,
    start: `${dateKey}T00:00:00+08:00`,
  };
}

function addManilaDays(dateKey: string, deltaDays: number) {
  const date = new Date(`${dateKey}T12:00:00+08:00`);
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}

function formatDateTime(value: string | Date) {
  return dateTimeFormatter.format(typeof value === "string" ? new Date(value) : value);
}

function formatDateLabel(dateKey: string) {
  return formatDate(new Date(`${dateKey}T12:00:00+08:00`));
}

function sumSales(rows: Pick<Sale, "total_amount">[]) {
  return rows.reduce((sum, row) => sum + Number(row.total_amount), 0);
}

function sumExpenses(rows: Pick<Expense, "amount">[]) {
  return rows.reduce((sum, row) => sum + Number(row.amount), 0);
}

function salePaidByDayEnd(sale: Pick<Sale, "paid_at">, selectedDayEndMs: number) {
  if (!sale.paid_at) {
    return false;
  }

  return new Date(sale.paid_at).getTime() <= selectedDayEndMs;
}

export default async function DailyHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams?: Promise<{ date?: string; success?: string; error?: string }>;
}) {
  const { businessId } = await params;
  const query = (await searchParams) ?? {};
  const { supabase, profile } = await getCurrentProfile();

  if (!profile) {
    redirect("/auth/login");
  }

  if (profile.role !== "admin") {
    redirect(`/dashboard/${businessId}/pos`);
  }

  const todayDateKey = getManilaDateKey();
  const selectedDate = isDateKey(query.date) ? query.date : todayDateKey;
  const selectedDateLabel = formatDateLabel(selectedDate);
  const selectedDateBounds = getManilaDateBounds(selectedDate);
  const selectedDayEndMs = new Date(selectedDateBounds.end).getTime();

  const [
    businessResult,
    salesEnteredResult,
    paymentsReceivedResult,
    expensesResult,
    reportResult,
    openSalesResult,
    recentReportsResult,
  ] =
    await Promise.all([
      supabase
        .from("businesses")
        .select("id, name, created_at")
        .eq("id", businessId)
        .maybeSingle(),
      supabase
        .from("sales")
        .select("id, customer_name, item_description, total_amount, is_paid, paid_at, created_at")
        .eq("business_id", businessId)
        .gte("created_at", selectedDateBounds.start)
        .lt("created_at", selectedDateBounds.end)
        .order("created_at", { ascending: false }),
      supabase
        .from("sales")
        .select("id, customer_name, item_description, total_amount, is_paid, paid_at, created_at")
        .eq("business_id", businessId)
        .eq("is_paid", true)
        .gte("paid_at", selectedDateBounds.start)
        .lt("paid_at", selectedDateBounds.end)
        .order("paid_at", { ascending: false }),
      supabase
        .from("expenses")
        .select("id, description, amount, created_at")
        .eq("business_id", businessId)
        .gte("created_at", selectedDateBounds.start)
        .lt("created_at", selectedDateBounds.end)
        .order("created_at", { ascending: false }),
      supabase
        .from("eod_reports")
        .select("id, business_id, report_date, gross_sales, paid_sales, total_expenses, net_cash, closed_by, created_at")
        .eq("business_id", businessId)
        .eq("report_date", selectedDate)
        .maybeSingle(),
      supabase
        .from("sales")
        .select("id, customer_name, item_description, total_amount, created_at")
        .eq("business_id", businessId)
        .eq("is_paid", false)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("eod_reports")
        .select("id, business_id, report_date, gross_sales, paid_sales, total_expenses, net_cash, closed_by, created_at")
        .eq("business_id", businessId)
        .order("report_date", { ascending: false })
        .limit(10),
    ]);

  if (businessResult.error) {
    throw businessResult.error;
  }

  if (!businessResult.data) {
    notFound();
  }

  if (salesEnteredResult.error) {
    throw salesEnteredResult.error;
  }

  if (paymentsReceivedResult.error) {
    throw paymentsReceivedResult.error;
  }

  if (expensesResult.error) {
    throw expensesResult.error;
  }

  if (reportResult.error) {
    throw reportResult.error;
  }

  if (openSalesResult.error) {
    throw openSalesResult.error;
  }

  if (recentReportsResult.error) {
    throw recentReportsResult.error;
  }

  const business = businessResult.data;
  const salesEntered = salesEnteredResult.data ?? [];
  const paymentsReceived = paymentsReceivedResult.data ?? [];
  const expenses = expensesResult.data ?? [];
  const report = reportResult.data ?? null;
  const openSales = openSalesResult.data ?? [];
  const recentReports = recentReportsResult.data ?? [];

  const salesEnteredTotal = sumSales(salesEntered);
  const salesReceivedTotal = sumSales(paymentsReceived);
  const expensesTotal = sumExpenses(expenses);
  const unpaidFromDayTotal = sumSales(
    salesEntered.filter((sale) => !salePaidByDayEnd(sale, selectedDayEndMs)),
  );
  const netCashTotal = salesReceivedTotal - expensesTotal;
  const isAdmin = profile.role === "admin";
  const canEditOpenTransactions = isAdmin && selectedDate === todayDateKey && !report;
  const successMessage =
    query.success === "paid"
      ? "Sale marked as paid."
      : query.success === "sale-updated"
        ? "Sale updated."
        : query.success === "sale-deleted"
          ? "Sale deleted."
          : query.success === "expense-updated"
            ? "Expense updated."
            : query.success === "expense-deleted"
              ? "Expense deleted."
              : null;

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Daily history"
        title={`${business.name} daily history`}
        description={`Review sales entered, payments received, and expenses for ${selectedDateLabel}. Paid sales count on the day they are paid.`}
      />

      {successMessage ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-sm">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            {successMessage}
          </CardContent>
        </Card>
      ) : null}

      {query.error ? (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {query.error}
          </CardContent>
        </Card>
      ) : null}

      {canEditOpenTransactions ? (
        <Card className="border-amber-500/30 bg-amber-500/5 shadow-sm">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-amber-700 dark:text-amber-300">
            <Clock3 className="h-4 w-4" />
            Admin correction mode is enabled for today’s open transactions.
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border/60 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              Choose a day
            </div>
            <p className="text-sm text-muted-foreground">
              Jump to any day to review what was sold, what was paid, and what went out as expenses.
            </p>
          </div>

          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" name="date" type="date" defaultValue={selectedDate} max={getManilaDateKey()} />
            </div>
            <Button type="submit" className="min-w-28">
              View day
            </Button>
            <Button asChild variant="outline">
              <Link href={`/dashboard/${businessId}/history`}>Today</Link>
            </Button>
          </form>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href={`/dashboard/${businessId}/history?date=${addManilaDays(selectedDate, -1)}`}>
                Previous day
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/dashboard/${businessId}/history?date=${addManilaDays(selectedDate, 1)}`}>
                Next day
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Sales entered</p>
            <p className="mt-1 text-xl font-semibold">{formatMoney(salesEnteredTotal)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{salesEntered.length} sales created on this day</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Payments received</p>
            <p className="mt-1 text-xl font-semibold">{formatMoney(salesReceivedTotal)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{paymentsReceived.length} payments counted today</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Expenses</p>
            <p className="mt-1 text-xl font-semibold">{formatMoney(expensesTotal)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{expenses.length} expense entries</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Net cash</p>
            <p className="mt-1 text-xl font-semibold">{formatMoney(netCashTotal)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Payments received minus expenses</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Unpaid by day end</p>
            <p className="mt-1 text-xl font-semibold">{formatMoney(unpaidFromDayTotal)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Sales created on this day that were still open</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ReceiptText className="h-5 w-5" />
                Sales entered on this day
              </CardTitle>
              <CardDescription>
                These are the sales created on the selected date. The badge shows whether each sale had been paid by the end of that day.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {salesEntered.length > 0 ? (
                salesEntered.map((sale) => {
                  const paidByDayEnd = salePaidByDayEnd(sale, selectedDayEndMs);

                  return (
                    <div key={sale.id} className="space-y-3 rounded-lg border border-border/60 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
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
                          <Badge variant={paidByDayEnd ? "secondary" : "outline"}>
                            {paidByDayEnd ? "Paid by day end" : "Unpaid by day end"}
                          </Badge>
                        </div>
                      </div>

                      {canEditOpenTransactions ? (
                        <div className="space-y-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                            Admin correction
                          </p>
                          <form action={updateSaleAction} className="grid gap-3 md:grid-cols-3">
                            <input type="hidden" name="businessId" value={businessId} />
                            <input type="hidden" name="saleId" value={sale.id} />
                            <input type="hidden" name="selectedDate" value={selectedDate} />
                            <div className="grid gap-2 md:col-span-1">
                              <Label htmlFor={`sale-customer-${sale.id}`}>Customer</Label>
                              <Input
                                id={`sale-customer-${sale.id}`}
                                name="customerName"
                                defaultValue={sale.customer_name}
                              />
                            </div>
                            <div className="grid gap-2 md:col-span-1">
                              <Label htmlFor={`sale-item-${sale.id}`}>Description</Label>
                              <Input
                                id={`sale-item-${sale.id}`}
                                name="itemDescription"
                                defaultValue={sale.item_description}
                              />
                            </div>
                            <div className="grid gap-2 md:col-span-1">
                              <Label htmlFor={`sale-amount-${sale.id}`}>Amount</Label>
                              <Input
                                id={`sale-amount-${sale.id}`}
                                name="totalAmount"
                                type="number"
                                step="0.01"
                                min="0"
                                defaultValue={sale.total_amount}
                              />
                            </div>
                            <div className="md:col-span-3">
                              <Button type="submit" size="sm">
                                Save changes
                              </Button>
                            </div>
                          </form>
                          <form action={deleteSaleAction} className="flex justify-end">
                            <input type="hidden" name="businessId" value={businessId} />
                            <input type="hidden" name="saleId" value={sale.id} />
                            <input type="hidden" name="selectedDate" value={selectedDate} />
                            <Button type="submit" size="sm" variant="destructive">
                              Delete sale
                            </Button>
                          </form>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <div className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
                  No sales were entered on this date.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle2 className="h-5 w-5" />
                Payments received on this day
              </CardTitle>
              <CardDescription>
                These are the sales that counted toward cash on the selected date, including sales paid later than the day they were entered.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {paymentsReceived.length > 0 ? (
                paymentsReceived.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border/60 p-4"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{sale.customer_name || "Walk-in customer"}</p>
                      <p className="text-sm text-muted-foreground">{sale.item_description}</p>
                      <p className="text-xs text-muted-foreground">
                        Created {formatDateTime(sale.created_at)} · Paid {formatDateTime(sale.paid_at || sale.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-right">
                      <p className="font-semibold">{formatMoney(sale.total_amount)}</p>
                      <Badge variant="secondary">Counted in cash for this day</Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
                  No payments were recorded on this date.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertCircle className="h-5 w-5" />
                Expenses on this day
              </CardTitle>
              <CardDescription>
                Expenses reduce the cash you close with for the selected date.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {expenses.length > 0 ? (
                expenses.map((expense) => (
                  <div key={expense.id} className="space-y-3 rounded-lg border border-border/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-medium">{expense.description}</p>
                        <p className="text-xs text-muted-foreground">Logged {formatDateTime(expense.created_at)}</p>
                      </div>
                      <p className="font-semibold">{formatMoney(expense.amount)}</p>
                    </div>

                    {canEditOpenTransactions ? (
                      <div className="space-y-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                          Admin correction
                        </p>
                        <form action={updateExpenseAction} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_auto]">
                          <input type="hidden" name="businessId" value={businessId} />
                          <input type="hidden" name="expenseId" value={expense.id} />
                          <input type="hidden" name="selectedDate" value={selectedDate} />
                          <div className="grid gap-2">
                            <Label htmlFor={`expense-description-${expense.id}`}>Description</Label>
                            <Input
                              id={`expense-description-${expense.id}`}
                              name="description"
                              defaultValue={expense.description}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor={`expense-amount-${expense.id}`}>Amount</Label>
                            <Input
                              id={`expense-amount-${expense.id}`}
                              name="amount"
                              type="number"
                              step="0.01"
                              min="0"
                              defaultValue={expense.amount}
                            />
                          </div>
                          <div className="flex items-end">
                            <Button type="submit" size="sm">
                              Save changes
                            </Button>
                          </div>
                        </form>
                        <form action={deleteExpenseAction} className="flex justify-end">
                          <input type="hidden" name="businessId" value={businessId} />
                          <input type="hidden" name="expenseId" value={expense.id} />
                          <input type="hidden" name="selectedDate" value={selectedDate} />
                          <Button type="submit" size="sm" variant="destructive">
                            Delete expense
                          </Button>
                        </form>
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
                  No expenses were recorded on this date.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock3 className="h-5 w-5" />
                Outstanding balances
              </CardTitle>
              <CardDescription>
                Mark a sale as paid when the customer settles later. It will count toward the day it is paid.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {openSales.length > 0 ? (
                openSales.map((sale) => (
                  <form
                    key={sale.id}
                    action={markSalePaidAction}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 p-4"
                  >
                    <input type="hidden" name="businessId" value={businessId} />
                    <input type="hidden" name="saleId" value={sale.id} />
                    <input type="hidden" name="selectedDate" value={selectedDate} />
                    <div className="space-y-1">
                      <p className="font-medium">{sale.customer_name || "Walk-in customer"}</p>
                      <p className="text-sm text-muted-foreground">{sale.item_description}</p>
                      <p className="text-xs text-muted-foreground">Created {formatDateTime(sale.created_at)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-right">
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
                <TrendingUp className="h-5 w-5" />
                Daily report snapshot
              </CardTitle>
              <CardDescription>
                {report ? "The saved EOD record for this day." : "This date has not been closed yet."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {report ? (
                <>
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Closed on</p>
                      <p className="font-medium">{formatDateTime(report.created_at)}</p>
                    </div>
                    <Badge variant="secondary">Closed</Badge>
                  </div>
                  <div className="grid gap-3">
                    <div className="rounded-lg border border-border/60 p-4">
                      <p className="text-xs text-muted-foreground">Sales received</p>
                      <p className="mt-1 text-lg font-semibold">{formatMoney(report.paid_sales)}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 p-4">
                      <p className="text-xs text-muted-foreground">Expenses</p>
                      <p className="mt-1 text-lg font-semibold">{formatMoney(report.total_expenses)}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 p-4">
                      <p className="text-xs text-muted-foreground">Net cash</p>
                      <p className="mt-1 text-lg font-semibold">{formatMoney(report.net_cash)}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
                  No EOD snapshot was saved for this date yet.
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
              <CardDescription>Jump to a recently closed day.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentReports.length > 0 ? (
                recentReports.map((entry) => {
                  const isSelected = entry.report_date === selectedDate;

                  return (
                    <Button
                      key={entry.id}
                      asChild
                      variant={isSelected ? "default" : "ghost"}
                      className="h-auto w-full justify-between py-3"
                    >
                      <Link href={`/dashboard/${businessId}/history?date=${entry.report_date}`}>
                        <span className="text-left">
                          <span className="block font-medium">{formatDateLabel(entry.report_date)}</span>
                          <span className="block text-xs text-muted-foreground">
                            Closed {formatDateTime(entry.created_at)}
                          </span>
                        </span>
                        <span className="text-right text-sm font-semibold">{formatMoney(entry.net_cash)}</span>
                      </Link>
                    </Button>
                  );
                })
              ) : (
                <div className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
                  No closed days yet.
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
