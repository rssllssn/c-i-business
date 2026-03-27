import { notFound } from "next/navigation";
import { AlertCircle, CreditCard } from "lucide-react";

import { PageHeader } from "@/components/erp/page-header";
import { PosTerminal } from "@/components/erp/pos-terminal";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney, formatDate, getBusinessSummary, getCurrentProfile } from "@/lib/erp";
import { createSaleAction } from "./actions";

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

  const [summary, productsResult] = await Promise.all([
    getBusinessSummary(supabase, businessId),
    supabase
      .from("products")
      .select("id, sku, name, retail_price, stock_level, created_at")
      .eq("business_id", businessId)
      .order("name", { ascending: true }),
  ]);

  if (productsResult.error) {
    throw productsResult.error;
  }

  const products = productsResult.data ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Point of sale"
        title={`${summary.business.name} POS`}
        description="Build a cart, submit a sale, and let the database RPC handle stock reduction and sales posting atomically."
      />

      {query.success ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-sm">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-emerald-700 dark:text-emerald-300">
            <CreditCard className="h-4 w-4" />
            Sale recorded successfully.
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

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Today&apos;s sales</p>
            <p className="mt-1 text-xl font-semibold">{formatMoney(summary.grossSalesToday)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Open stock items</p>
            <p className="mt-1 text-xl font-semibold">{products.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Last settlement date</p>
            <p className="mt-1 text-xl font-semibold">
              {summary.latestReport ? formatDate(summary.latestReport.report_date) : "Not yet closed"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="outline">{summary.attendanceCountToday} staff on shift</Badge>
        <Badge variant="outline">{products.filter((product) => product.stock_level > 0).length} sellable SKUs</Badge>
      </div>

      <PosTerminal businessId={businessId} products={products} submitSaleAction={createSaleAction} />
    </div>
  );
}
