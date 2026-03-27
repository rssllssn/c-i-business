import { type Database } from "@/lib/supabase/database.types";
import { type SupabaseClient as SupabaseJsClient } from "@supabase/supabase-js";

export type Business = Database["public"]["Tables"]["businesses"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type Sale = Database["public"]["Tables"]["sales"]["Row"];
export type SaleItem = Database["public"]["Tables"]["sale_items"]["Row"];
export type Attendance = Database["public"]["Tables"]["daily_attendance"]["Row"];
export type EodReport = Database["public"]["Tables"]["eod_reports"]["Row"];
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type SupabaseClient = SupabaseJsClient<Database>;

export interface BusinessSummary {
  business: Business;
  grossSalesToday: number;
  wagesToday: number;
  attendanceCountToday: number;
  productCount: number;
  lowStockCount: number;
  latestReport: EodReport | null;
}

export interface DashboardOverview {
  businesses: BusinessSummary[];
  totalStaffCount: number;
  grossSalesToday: number;
  wagesToday: number;
  netCashToday: number;
}

export const moneyFormatter = new Intl.NumberFormat("en-PH", {
  currency: "PHP",
  style: "currency",
  maximumFractionDigits: 2,
});

export const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
});

export function formatMoney(value: number) {
  return moneyFormatter.format(value);
}

export function formatDate(value: string | Date) {
  return dateFormatter.format(typeof value === "string" ? new Date(value) : value);
}

export function getManilaDateKey(date: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
  }).format(date);
}

export async function getAuthedClient() {
  const { createClient } = await import("@/lib/supabase/server");

  return createClient();
}

export async function getBusinesses(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("businesses")
    .select("id, name, created_at")
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getDashboardOverview(
  supabase: SupabaseClient,
): Promise<DashboardOverview> {
  const businesses = await getBusinesses(supabase);
  const summaries = await Promise.all(
    businesses.map((business) => getBusinessSummary(supabase, business.id)),
  );

  const { count: totalStaffCount, error: staffCountError } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "staff");

  if (staffCountError) {
    throw staffCountError;
  }

  const grossSalesToday = summaries.reduce((sum, summary) => sum + summary.grossSalesToday, 0);
  const wagesToday = summaries.reduce((sum, summary) => sum + summary.wagesToday, 0);

  return {
    businesses: summaries,
    totalStaffCount: totalStaffCount ?? 0,
    grossSalesToday,
    wagesToday,
    netCashToday: grossSalesToday - wagesToday,
  };
}

export async function getBusinessSummary(
  supabase: SupabaseClient,
  businessId: string,
): Promise<BusinessSummary> {
  const today = getManilaDateKey();

  const [businessResult, salesResult, attendanceResult, productResult, lowStockResult, reportResult] =
    await Promise.all([
      supabase
        .from("businesses")
        .select("id, name, created_at")
        .eq("id", businessId)
        .maybeSingle(),
      supabase
        .from("sales")
        .select("total_amount")
        .eq("business_id", businessId)
        .gte("created_at", `${today}T00:00:00+08:00`)
        .lt("created_at", `${today}T23:59:59.999+08:00`),
      supabase
        .from("daily_attendance")
        .select("id, wage_due")
        .eq("business_id", businessId)
        .eq("work_date", today),
      supabase
        .from("products")
        .select("id")
        .eq("business_id", businessId),
      supabase
        .from("products")
        .select("id")
        .eq("business_id", businessId)
        .lte("stock_level", 5),
      supabase
        .from("eod_reports")
        .select("id, business_id, report_date, gross_sales, total_wages_paid, net_cash, closed_by, created_at")
        .eq("business_id", businessId)
        .eq("report_date", today)
        .maybeSingle(),
    ]);

  if (businessResult.error) {
    throw businessResult.error;
  }

  if (!businessResult.data) {
    throw new Error("Business not found");
  }

  if (salesResult.error) {
    throw salesResult.error;
  }

  if (attendanceResult.error) {
    throw attendanceResult.error;
  }

  if (productResult.error) {
    throw productResult.error;
  }

  if (lowStockResult.error) {
    throw lowStockResult.error;
  }

  if (reportResult.error) {
    throw reportResult.error;
  }

  const grossSalesToday = (salesResult.data ?? []).reduce(
    (sum, sale) => sum + Number(sale.total_amount),
    0,
  );
  const wagesToday = (attendanceResult.data ?? []).reduce(
    (sum, attendance) => sum + Number(attendance.wage_due),
    0,
  );

  return {
    business: businessResult.data,
    grossSalesToday,
    wagesToday,
    attendanceCountToday: attendanceResult.data?.length ?? 0,
    productCount: productResult.data?.length ?? 0,
    lowStockCount: lowStockResult.data?.length ?? 0,
    latestReport: reportResult.data ?? null,
  };
}

export async function getCurrentProfile() {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return { supabase, profile: null, user: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, daily_rate, created_at")
    .eq("id", userData.user.id)
    .maybeSingle();

  return { supabase, profile, user: userData.user };
}

export async function getBusinessById(businessId: string) {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: business, error } = await supabase
    .from("businesses")
    .select("id, name, created_at")
    .eq("id", businessId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return { supabase, business };
}
