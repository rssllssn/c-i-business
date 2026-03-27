import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";

interface PageHeaderProps {
  badge?: string;
  description: string;
  title: string;
  actions?: ReactNode;
}

export function PageHeader({ badge, description, title, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-border/60 pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-2">
        {badge ? <Badge variant="outline">{badge}</Badge> : null}
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
