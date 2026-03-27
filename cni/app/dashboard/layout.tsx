import Link from "next/link";
import { redirect } from "next/navigation";
import { type ReactNode } from "react";

import { LogoutButton } from "@/components/logout-button";
import { Badge } from "@/components/ui/badge";
import { getCurrentProfile } from "@/lib/erp";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { profile, user } = await getCurrentProfile();

  if (!user || !profile) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen bg-muted/30 text-foreground">
      <header className="border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
                C&I Business
              </Link>
              <p className="text-sm text-muted-foreground">
                Sales, expenses, and end-of-day tracking in one place
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="capitalize">
                {profile.role}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {profile.full_name || "Signed in"}
              </span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
