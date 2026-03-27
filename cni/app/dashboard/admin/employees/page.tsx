import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/erp/page-header";
import { formatMoney, getCurrentProfile } from "@/lib/erp";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function saveEmployeeAction(formData: FormData) {
  "use server";

  const profileId = String(formData.get("profileId") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const role = String(formData.get("role") ?? "staff");
  const dailyRate = Number(formData.get("dailyRate") ?? 0);

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect("/auth/login");
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (currentProfile?.role !== "admin") {
    redirect("/dashboard");
  }

  if (!profileId || !fullName || Number.isNaN(dailyRate)) {
    redirect("/dashboard/admin/employees?error=invalid-input");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      role: role === "admin" ? "admin" : "staff",
      daily_rate: dailyRate,
    })
    .eq("id", profileId);

  if (error) {
    redirect(`/dashboard/admin/employees?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/admin/employees");
  redirect("/dashboard/admin/employees?success=1");
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string; error?: string }>;
}) {
  const query = (await searchParams) ?? {};
  const { supabase, profile } = await getCurrentProfile();

  if (!profile) {
    redirect("/auth/login");
  }

  if (profile.role !== "admin") {
    redirect("/dashboard");
  }

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, daily_rate, created_at")
    .order("full_name", { ascending: true });

  if (error) {
    throw error;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Admin"
        title="Employee management"
        description="Maintain staff identities, roles, and daily rates. Profiles are created automatically when users sign up."
      />

      {query.success ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-sm">
          <CardContent className="p-4 text-sm text-emerald-700 dark:text-emerald-300">
            Employee profile updated.
          </CardContent>
        </Card>
      ) : null}

      {query.error ? (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardContent className="p-4 text-sm text-destructive">{query.error}</CardContent>
        </Card>
      ) : null}

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>All profiles</CardTitle>
          <CardDescription>
            Admins can promote users, rename employees, and adjust daily wages used by attendance and EOD.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profiles?.map((employee) => (
            <form
              key={employee.id}
              action={saveEmployeeAction}
              className="space-y-4 rounded-xl border border-border/60 bg-background p-4 shadow-sm"
            >
              <input type="hidden" name="profileId" value={employee.id} />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{employee.full_name || "Unnamed employee"}</p>
                  <p className="text-sm text-muted-foreground">{employee.id}</p>
                </div>
                <Badge variant={employee.role === "admin" ? "default" : "outline"}>
                  {employee.role}
                </Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-2 md:col-span-1">
                  <Label htmlFor={`fullName-${employee.id}`}>Full name</Label>
                  <Input id={`fullName-${employee.id}`} name="fullName" defaultValue={employee.full_name} required />
                </div>
                <div className="grid gap-2 md:col-span-1">
                  <Label htmlFor={`role-${employee.id}`}>Role</Label>
                  <select
                    id={`role-${employee.id}`}
                    name="role"
                    defaultValue={employee.role}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                  >
                    <option value="staff">staff</option>
                    <option value="admin">admin</option>
                  </select>
                </div>
                <div className="grid gap-2 md:col-span-1">
                  <Label htmlFor={`dailyRate-${employee.id}`}>Daily rate</Label>
                  <Input
                    id={`dailyRate-${employee.id}`}
                    name="dailyRate"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={employee.daily_rate}
                    required
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">Daily wage: {formatMoney(employee.daily_rate)}</p>
                <Button type="submit" size="sm">
                  Save employee
                </Button>
              </div>
            </form>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
