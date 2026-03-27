import { redirect } from "next/navigation";
import { AlertCircle, Banknote, CalendarDays, CheckCircle2, History, Lock } from "lucide-react";

import { MetricCard } from "@/components/erp/metric-card";
import { PageHeader } from "@/components/erp/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney, getBusinessSummary, getCurrentProfile } from "@/lib/erp";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function closeRegisterAction(formData: FormData) {
  "use server";

  const businessId = String(formData.get("businessId") ?? "");
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    redirect(`/dashboard/${businessId}/eod?error=admin-only`);
  }

  const { error } = await supabase.rpc("process_end_of_day", {
    p_business_id: businessId,
  });

  if (error) {
    redirect(`/dashboard/${businessId}/eod?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${businessId}`);
  revalidatePath(`/dashboard/${businessId}/attendance`);
  revalidatePath(`/dashboard/${businessId}/eod`);
  redirect(`/dashboard/${businessId}/eod?success=1`);
}

export default async function EodPage({
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
    redirect("/auth/login");
  }

  const [summary, recentReportsResult] = await Promise.all([
    getBusinessSummary(supabase, businessId),
    supabase
      .from("eod_reports")
      .select("id, business_id, report_date, gross_sales, total_wages_paid, net_cash, closed_by, created_at")
      .eq("business_id", businessId)
      .order("report_date", { ascending: false })
      .limit(10),
  ]);

  if (recentReportsResult.error) {
    throw recentReportsResult.error;
  }

  const recentReports = recentReportsResult.data ?? [];
  const isAdmin = profile.role === "admin";
  const reportAlreadyClosed = Boolean(summary.latestReport);

  return (
    <div className="space-y-8">
      <PageHeader
        badge="End of day"
        title={`${summary.business.name} settlement`}
        description="Close the register once sales and attendance are finalized. The RPC posts ledger entries and marks wages as paid in a single transaction."
      />

      {query.success ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-sm">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            End-of-day processed successfully.
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

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          icon={<Banknote className="h-5 w-5" />}
          label="Gross sales"
          value={formatMoney(summary.grossSalesToday)}
          detail="Today’s live sales"
        />
        <MetricCard
          icon={<CalendarDays className="h-5 w-5" />}
          label="Attendance wages"
          value={formatMoney(summary.wagesToday)}
          detail="Locked attendance records"
        />
        <MetricCard
          icon={<Banknote className="h-5 w-5" />}
          label="Net cash"
          value={formatMoney(summary.grossSalesToday - summary.wagesToday)}
          detail="Sales minus wages"
        />
        <MetricCard
          icon={<History className="h-5 w-5" />}
          label="Reports"
          value={`${recentReports.length}`}
          detail="Stored settlements"
        />
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5" />
            Close register
          </CardTitle>
          <CardDescription>
            Only admins can process the settlement. This will insert ledger rows, mark attendance paid, and save the final report snapshot.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">Current report state</p>
            <p className="text-sm text-muted-foreground">
              {summary.latestReport
                ? `Last processed for ${formatDate(summary.latestReport.report_date)}`
                : "Not processed yet today"}
            </p>
          </div>
          <form action={closeRegisterAction}>
            <input type="hidden" name="businessId" value={businessId} />
            <Button type="submit" disabled={!isAdmin || reportAlreadyClosed}>
              {isAdmin ? (reportAlreadyClosed ? "Already closed today" : "Close register") : "Admin only"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Recent EOD reports</CardTitle>
          <CardDescription>Latest settlements for this business.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentReports.length > 0 ? (
            recentReports.map((report) => (
              <div
                key={report.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 p-4"
              >
                <div>
                  <p className="font-medium">{formatDate(report.report_date)}</p>
                  <p className="text-sm text-muted-foreground">
                    Closed {formatDate(report.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <Badge variant="outline">Gross {formatMoney(report.gross_sales)}</Badge>
                  <Badge variant="outline">Wages {formatMoney(report.total_wages_paid)}</Badge>
                  <Badge variant="secondary">Net {formatMoney(report.net_cash)}</Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
              No end-of-day reports have been processed yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
