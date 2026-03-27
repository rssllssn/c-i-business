import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";

interface MetricCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  detail?: string;
}

export function MetricCard({ icon, label, value, detail }: MetricCardProps) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="flex items-start gap-4 p-5">
        <div className="rounded-lg bg-muted p-3 text-muted-foreground">{icon}</div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
