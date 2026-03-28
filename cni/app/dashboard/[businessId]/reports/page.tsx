import { notFound, redirect } from "next/navigation";
import { Banknote, CheckCircle2, Clock3, TrendingUp } from "lucide-react";

import { MetricCard } from "@/components/erp/metric-card";
import { PageHeader } from "@/components/erp/page-header";
import { ReportChart } from "@/components/erp/report-chart";
import { getBusinessReportData, getBusinessSummary, getCurrentProfile, formatMoney } from "@/lib/erp";

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const { supabase, profile } = await getCurrentProfile();

  if (!profile) {
    notFound();
  }

  if (profile.role !== "admin") {
    redirect(`/dashboard/${businessId}/pos`);
  }

  const [summary, reportData] = await Promise.all([
    getBusinessSummary(supabase, businessId),
    getBusinessReportData(supabase, businessId),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Reports"
        title={`${summary.business.name} reports`}
        description="Review weekly and monthly settlement trends using closed-day EOD data."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Today’s gross sales"
          value={formatMoney(summary.grossSalesToday)}
          detail="Current open-day total"
        />
        <MetricCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Today’s paid sales"
          value={formatMoney(summary.paidSalesToday)}
          detail="Collected so far today"
        />
        <MetricCard
          icon={<Banknote className="h-5 w-5" />}
          label="Today’s expenses"
          value={formatMoney(summary.expensesToday)}
          detail="Costs logged on POS"
        />
        <MetricCard
          icon={<Clock3 className="h-5 w-5" />}
          label="Today’s net cash"
          value={formatMoney(summary.netCashToday)}
          detail="Paid sales minus expenses"
        />
      </div>

      <ReportChart
        title="Weekly report"
        description="Last 8 weeks of closed-day totals aggregated from EOD reports."
        periods={reportData.weekly}
      />

      <ReportChart
        title="Monthly report"
        description="Last 6 months of closed-day totals aggregated from EOD reports."
        periods={reportData.monthly}
      />
    </div>
  );
}
