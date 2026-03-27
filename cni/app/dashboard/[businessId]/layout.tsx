import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { type ReactNode } from "react";
import {
  Banknote,
  LayoutDashboard,
  ReceiptText,
  Store,
} from "lucide-react";

import { PageHeader } from "@/components/erp/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney, getBusinessSummary, getBusinesses, getCurrentProfile } from "@/lib/erp";

export const dynamic = "force-dynamic";

const moduleLinks = [
  {
    href: (businessId: string) => `/dashboard/${businessId}`,
    icon: LayoutDashboard,
    label: "Business overview",
    description: "Sales, expenses, and settlement",
  },
  {
    href: (businessId: string) => `/dashboard/${businessId}/pos`,
    icon: ReceiptText,
    label: "POS",
    description: "Create sales and log expenses",
  },
  {
    href: (businessId: string) => `/dashboard/${businessId}/eod`,
    icon: Banknote,
    label: "End of day",
    description: "Close the register",
  },
];

export default async function BusinessLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const { supabase, profile, user } = await getCurrentProfile();

  if (!profile || !user) {
    redirect("/auth/login");
  }

  const [businessSummary, businesses] = await Promise.all([
    getBusinessSummary(supabase, businessId).catch(() => null),
    getBusinesses(supabase),
  ]);

  if (!businessSummary) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Business context"
        title={businessSummary.business.name}
        description="Switch between locations and drill into one business at a time while keeping the ERP data unified."
        actions={
          <div className="flex flex-wrap gap-2">
            {businesses.map((business) => (
              <Button
                key={business.id}
                asChild
                variant={business.id === businessId ? "default" : "outline"}
                size="sm"
              >
                <Link href={`/dashboard/${business.id}`}>{business.name}</Link>
              </Button>
            ))}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <Card className="border-border/60 shadow-sm">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current branch</p>
                  <p className="font-medium">{businessSummary.business.name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="text-xs text-muted-foreground">Gross sales</p>
                  <p className="mt-1 font-semibold">{formatMoney(businessSummary.grossSalesToday)}</p>
                </div>
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="text-xs text-muted-foreground">Paid sales</p>
                  <p className="mt-1 font-semibold">{formatMoney(businessSummary.paidSalesToday)}</p>
                </div>
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="text-xs text-muted-foreground">Expenses</p>
                  <p className="mt-1 font-semibold">{formatMoney(businessSummary.expensesToday)}</p>
                </div>
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="text-xs text-muted-foreground">Net cash</p>
                  <p className="mt-1 font-semibold">{formatMoney(businessSummary.netCashToday)}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{businessSummary.saleCountToday} sales today</Badge>
                <Badge variant="outline">Unpaid {formatMoney(businessSummary.unpaidBalanceToday)}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardContent className="space-y-2 p-4">
              <p className="text-sm font-medium">Modules</p>
              <div className="space-y-2">
                {moduleLinks.map((module) => {
                  const Icon = module.icon;
                  return (
                    <Button key={module.label} asChild variant="ghost" className="w-full justify-start">
                      <Link href={module.href(businessId)} className="h-auto py-3">
                        <div className="flex items-start gap-3 text-left">
                          <Icon className="mt-0.5 h-4 w-4" />
                          <div>
                            <p className="font-medium">{module.label}</p>
                            <p className="text-xs text-muted-foreground">{module.description}</p>
                          </div>
                        </div>
                      </Link>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </aside>

        <section className="space-y-6">{children}</section>
      </div>
    </div>
  );
}
