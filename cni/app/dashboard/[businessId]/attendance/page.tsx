import { redirect } from "next/navigation";
import { CheckCircle2, Clock3, DollarSign, Users } from "lucide-react";

import { MetricCard } from "@/components/erp/metric-card";
import { PageHeader } from "@/components/erp/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney, getBusinessSummary, getCurrentProfile, getManilaDateKey } from "@/lib/erp";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function clockInAction(formData: FormData) {
  "use server";

  const businessId = String(formData.get("businessId") ?? "");
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect("/auth/login");
  }

  const today = getManilaDateKey();
  const { data: existing, error: existingError } = await supabase
    .from("daily_attendance")
    .select("id")
    .eq("business_id", businessId)
    .eq("user_id", authData.user.id)
    .eq("work_date", today)
    .maybeSingle();

  if (existingError) {
    redirect(`/dashboard/${businessId}/attendance?error=${encodeURIComponent(existingError.message)}`);
  }

  if (existing) {
    redirect(`/dashboard/${businessId}/attendance?error=already-clocked-in`);
  }

  const { error } = await supabase.from("daily_attendance").insert({
    business_id: businessId,
    user_id: authData.user.id,
    work_date: today,
  });

  if (error) {
    redirect(`/dashboard/${businessId}/attendance?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${businessId}`);
  revalidatePath(`/dashboard/${businessId}/attendance`);
  revalidatePath(`/dashboard/${businessId}/eod`);
  redirect(`/dashboard/${businessId}/attendance?success=1`);
}

export default async function AttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams?: Promise<{ success?: string; error?: string }>;
}) {
  const { businessId } = await params;
  const query = (await searchParams) ?? {};
  const { supabase, profile, user } = await getCurrentProfile();

  if (!profile || !user) {
    redirect("/auth/login");
  }

  const today = getManilaDateKey();
  const [summary, attendanceResult, profilesResult] = await Promise.all([
    getBusinessSummary(supabase, businessId),
    supabase
      .from("daily_attendance")
      .select("id, business_id, user_id, work_date, wage_due, is_paid, clocked_in_at, created_at")
      .eq("business_id", businessId)
      .eq("work_date", today)
      .order("clocked_in_at", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, full_name, role, daily_rate, created_at")
      .order("full_name", { ascending: true }),
  ]);

  if (attendanceResult.error) {
    throw attendanceResult.error;
  }

  if (profilesResult.error) {
    throw profilesResult.error;
  }

  const profiles = profilesResult.data ?? [];
  const attendance = attendanceResult.data ?? [];
  const profileMap = new Map(profiles.map((entry) => [entry.id, entry]));
  const alreadyClockedIn = attendance.some((entry) => entry.user_id === user.id);
  const totalWages = attendance.reduce((sum, entry) => sum + Number(entry.wage_due), 0);

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Attendance"
        title={`${summary.business.name} attendance`}
        description="Record shift attendance and lock each employee’s daily wage before settlement."
      />

      {query.success ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-sm">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            Attendance recorded successfully.
          </CardContent>
        </Card>
      ) : null}

      {query.error ? (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardContent className="p-4 text-sm text-destructive">{query.error}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          icon={<Users className="h-5 w-5" />}
          label="Staff checked in"
          value={`${attendance.length}`}
          detail="This business only"
        />
        <MetricCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Total wages"
          value={formatMoney(totalWages)}
          detail="Locked for today"
        />
        <MetricCard
          icon={<Clock3 className="h-5 w-5" />}
          label="Business day"
          value={formatDate(today)}
          detail="Manila time"
        />
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Clock in</CardTitle>
          <CardDescription>
            Tap once to record your attendance for the current business day. Your daily rate will be locked into the record.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">{profile.full_name || user.email}</p>
            <p className="text-sm text-muted-foreground">
              Rate: {formatMoney(profile.daily_rate)} · Role: {profile.role}
            </p>
          </div>
          <form action={clockInAction}>
            <input type="hidden" name="businessId" value={businessId} />
            <Button type="submit" disabled={alreadyClockedIn}>
              {alreadyClockedIn ? "Already clocked in" : "Clock me in"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Today’s staff list</CardTitle>
          <CardDescription>
            Every attendance row is tied to the current business and will be marked paid by the EOD process.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {attendance.length > 0 ? (
            attendance.map((entry) => {
              const employee = profileMap.get(entry.user_id);

              return (
                <div
                  key={entry.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 p-4"
                >
                  <div>
                    <p className="font-medium">{employee?.full_name || "Unknown employee"}</p>
                    <p className="text-sm text-muted-foreground">
                      {employee?.role ?? "staff"} · {formatDate(entry.clocked_in_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant={entry.is_paid ? "secondary" : "outline"}>
                      {entry.is_paid ? "Paid" : "Unpaid"}
                    </Badge>
                    <span className="font-semibold">{formatMoney(entry.wage_due)}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
              No attendance has been recorded for this business today.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
