import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, type ReportPeriodSummary } from "@/lib/erp";

const metrics = [
  { key: "paidSales", label: "Paid sales", colorClass: "bg-emerald-500" },
  { key: "totalExpenses", label: "Expenses", colorClass: "bg-amber-500" },
  { key: "netCash", label: "Net cash", colorClass: "bg-sky-500" },
] as const;

interface ReportChartProps {
  title: string;
  description: string;
  periods: ReportPeriodSummary[];
}

export function ReportChart({ title, description, periods }: ReportChartProps) {
  const maxMagnitude = Math.max(
    1,
    ...periods.flatMap((period) => [Math.abs(period.paidSales), Math.abs(period.totalExpenses), Math.abs(period.netCash)]),
  );

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge variant="outline">{periods.length} periods</Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          {metrics.map((metric) => (
            <span
              key={metric.key}
              className="flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1 text-xs text-muted-foreground"
            >
              <span className={`h-2.5 w-2.5 rounded-full ${metric.colorClass}`} />
              {metric.label}
            </span>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-4">
          {periods.map((period) => (
            <div key={period.key} className="grid gap-3 xl:grid-cols-[220px_minmax(0,1fr)]">
              <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                <p className="font-medium">{period.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {period.reportCount} closed day{period.reportCount === 1 ? "" : "s"}
                </p>
              </div>

              <div className="space-y-3">
                {metrics.map((metric) => {
                  const value = period[metric.key];
                  const width = (Math.abs(value) / maxMagnitude) * 100;
                  const barClass = metric.key === "netCash" && value < 0 ? "bg-rose-500" : metric.colorClass;

                  return (
                    <div key={`${period.key}-${metric.key}`} className="grid grid-cols-[88px_minmax(0,1fr)_88px] items-center gap-3">
                      <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
                      <div className="h-3 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${barClass}`}
                          style={{ width: `${Math.min(100, Math.max(width, value === 0 ? 0 : 4))}%` }}
                        />
                      </div>
                      <p className={`text-right text-xs font-medium ${metric.key === "netCash" && value < 0 ? "text-rose-600" : ""}`}>
                        {formatMoney(value)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-lg border border-border/60">
          <table className="min-w-full divide-y divide-border/60 text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Period</th>
                <th className="px-4 py-3 text-left font-medium">Closed days</th>
                <th className="px-4 py-3 text-right font-medium">Paid sales</th>
                <th className="px-4 py-3 text-right font-medium">Expenses</th>
                <th className="px-4 py-3 text-right font-medium">Net cash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 bg-background">
              {periods.map((period) => (
                <tr key={period.key}>
                  <td className="px-4 py-3 font-medium">{period.label}</td>
                  <td className="px-4 py-3 text-muted-foreground">{period.reportCount}</td>
                  <td className="px-4 py-3 text-right">{formatMoney(period.paidSales)}</td>
                  <td className="px-4 py-3 text-right">{formatMoney(period.totalExpenses)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${period.netCash < 0 ? "text-rose-600" : ""}`}>
                    {formatMoney(period.netCash)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
