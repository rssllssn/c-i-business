import { notFound } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { PageHeader } from "@/components/erp/page-header";
import { PosTerminal } from "@/components/erp/pos-terminal";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatMoney, getBusinessSummary, getCurrentProfile } from "@/lib/erp";
import { createExpenseAction, createSaleAction } from "./actions";

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

  const summary = await getBusinessSummary(supabase, businessId);

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Point of sale"
        title={`${summary.business.name} POS`}
        description="Record free-form sales and daily expenses directly, without a product catalog."
      />

      {query.success ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-sm">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            Entry recorded successfully.
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

      <PosTerminal
        businessId={businessId}
        submitSaleAction={createSaleAction}
        submitExpenseAction={createExpenseAction}
      />
    </div>
  );
}
