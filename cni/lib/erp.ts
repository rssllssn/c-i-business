import { type Database } from "@/lib/supabase/database.types";
import { type SupabaseClient as SupabaseJsClient } from "@supabase/supabase-js";

export type Business = Database["public"]["Tables"]["businesses"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Sale = Database["public"]["Tables"]["sales"]["Row"];
export type Expense = Database["public"]["Tables"]["expenses"]["Row"];
export type EodReport = Database["public"]["Tables"]["eod_reports"]["Row"];
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type SupabaseClient = SupabaseJsClient<Database>;

export interface BusinessSummary {
  business: Business;
  saleCountToday: number;
  grossSalesToday: number;
  paidSalesToday: number;
  unpaidBalanceToday: number;
  expensesToday: number;
  netCashToday: number;
  lowStockCount: number;
  latestReport: EodReport | null;
}

export interface DashboardOverview {
  businesses: BusinessSummary[];
  saleCountToday: number;
  grossSalesToday: number;
  paidSalesToday: number;
  unpaidBalanceToday: number;
  expensesToday: number;
  netCashToday: number;
}

export interface ReportPeriodSummary {
  key: string;
  label: string;
  startDate: string;
  endDate: string;
  reportCount: number;
  paidSales: number;
  totalExpenses: number;
  netCash: number;
}

export interface BusinessReportData {
  weekly: ReportPeriodSummary[];
  monthly: ReportPeriodSummary[];
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

function parseManilaDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addUtcMonths(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function startOfUtcWeek(date: Date) {
  const start = new Date(date);
  const day = start.getUTCDay();
  const offset = (day + 6) % 7;
  start.setUTCDate(start.getUTCDate() - offset);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

function startOfUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

const reportWeekFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeZone: "Asia/Manila",
});

const reportMonthFormatter = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  year: "numeric",
  timeZone: "Asia/Manila",
});

function formatReportWeekLabel(start: Date, end: Date) {
  return `${reportWeekFormatter.format(start)} – ${reportWeekFormatter.format(end)}`;
}

function formatReportMonthLabel(date: Date) {
  return reportMonthFormatter.format(date);
}

function buildReportPeriods(
  reports: Array<Pick<EodReport, "report_date" | "paid_sales" | "total_expenses" | "net_cash">>,
  periods: Array<{ key: string; label: string; startDate: string; endDate: string }>,
  periodKeyForReport: (reportDate: Date) => string,
) {
  const aggregates = new Map<
    string,
    {
      paidSales: number;
      totalExpenses: number;
      netCash: number;
      reportCount: number;
    }
  >();

  for (const report of reports) {
    const key = periodKeyForReport(parseManilaDateKey(report.report_date));
    const current = aggregates.get(key) ?? {
      paidSales: 0,
      totalExpenses: 0,
      netCash: 0,
      reportCount: 0,
    };

    current.paidSales += Number(report.paid_sales);
    current.totalExpenses += Number(report.total_expenses);
    current.netCash += Number(report.net_cash);
    current.reportCount += 1;
    aggregates.set(key, current);
  }

  return periods.map((period) => {
    const totals = aggregates.get(period.key) ?? {
      paidSales: 0,
      totalExpenses: 0,
      netCash: 0,
      reportCount: 0,
    };

    return {
      ...period,
      ...totals,
    } satisfies ReportPeriodSummary;
  }).filter((period) => period.reportCount > 0);
}

function buildWeeklyReportPeriods(
  reports: Array<Pick<EodReport, "report_date" | "paid_sales" | "total_expenses" | "net_cash">>,
  referenceDate: Date,
) {
  const currentWeekStart = startOfUtcWeek(referenceDate);
  const periods = Array.from({ length: 8 }, (_, index) => {
    const start = addUtcDays(currentWeekStart, -(7 - index) * 7);
    const end = addUtcDays(start, 6);

    return {
      key: formatDateKey(startOfUtcWeek(start)),
      label: formatReportWeekLabel(start, end),
      startDate: formatDateKey(start),
      endDate: formatDateKey(end),
    };
  });

  return buildReportPeriods(reports, periods, (reportDate) => formatDateKey(startOfUtcWeek(reportDate)));
}

function buildMonthlyReportPeriods(
  reports: Array<Pick<EodReport, "report_date" | "paid_sales" | "total_expenses" | "net_cash">>,
  referenceDate: Date,
) {
  const currentMonthStart = startOfUtcMonth(referenceDate);
  const periods = Array.from({ length: 6 }, (_, index) => {
    const start = addUtcMonths(currentMonthStart, -(5 - index));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));

    return {
      key: formatDateKey(startOfUtcMonth(start)),
      label: formatReportMonthLabel(start),
      startDate: formatDateKey(start),
      endDate: formatDateKey(end),
    };
  });

  return buildReportPeriods(reports, periods, (reportDate) => formatDateKey(startOfUtcMonth(reportDate)));
}

export async function getBusinessReportData(supabase: SupabaseClient, businessId: string): Promise<BusinessReportData> {
  const todayKey = getManilaDateKey();
  const referenceDate = parseManilaDateKey(todayKey);
  const oldestMonthStart = addUtcMonths(startOfUtcMonth(referenceDate), -5);

  const { data, error } = await supabase
    .from("eod_reports")
    .select("report_date, paid_sales, total_expenses, net_cash")
    .eq("business_id", businessId)
    .gte("report_date", formatDateKey(oldestMonthStart))
    .lte("report_date", todayKey)
    .order("report_date", { ascending: true });

  if (error) {
    throw error;
  }

  const reports = data ?? [];

  return {
    weekly: buildWeeklyReportPeriods(reports, referenceDate),
    monthly: buildMonthlyReportPeriods(reports, referenceDate),
  };
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

  const saleCountToday = summaries.reduce((sum, summary) => sum + summary.saleCountToday, 0);
  const grossSalesToday = summaries.reduce((sum, summary) => sum + summary.grossSalesToday, 0);
  const paidSalesToday = summaries.reduce((sum, summary) => sum + summary.paidSalesToday, 0);
  const unpaidBalanceToday = summaries.reduce((sum, summary) => sum + summary.unpaidBalanceToday, 0);
  const expensesToday = summaries.reduce((sum, summary) => sum + summary.expensesToday, 0);

  return {
    businesses: summaries,
    saleCountToday,
    grossSalesToday,
    paidSalesToday,
    unpaidBalanceToday,
    expensesToday,
    netCashToday: paidSalesToday - expensesToday,
  };
}

export async function getBusinessSummary(
  supabase: SupabaseClient,
  businessId: string,
): Promise<BusinessSummary> {
  const today = getManilaDateKey();

  const [businessResult, createdSalesResult, paidSalesResult, unpaidSalesResult, expensesResult, reportResult] = await Promise.all([
    supabase
      .from("businesses")
      .select("id, name, created_at")
      .eq("id", businessId)
      .maybeSingle(),
    supabase
      .from("sales")
      .select("total_amount, is_paid")
      .eq("business_id", businessId)
      .gte("created_at", `${today}T00:00:00+08:00`)
      .lt("created_at", `${today}T23:59:59.999+08:00`),
    supabase
      .from("sales")
      .select("total_amount")
      .eq("business_id", businessId)
      .eq("is_paid", true)
      .gte("paid_at", `${today}T00:00:00+08:00`)
      .lt("paid_at", `${today}T23:59:59.999+08:00`),
    supabase
      .from("sales")
      .select("total_amount")
      .eq("business_id", businessId)
      .eq("is_paid", false),
    supabase
      .from("expenses")
      .select("amount")
      .eq("business_id", businessId)
      .gte("created_at", `${today}T00:00:00+08:00`)
      .lt("created_at", `${today}T23:59:59.999+08:00`),
    supabase
      .from("eod_reports")
      .select("id, business_id, report_date, gross_sales, paid_sales, total_expenses, net_cash, closed_by, created_at")
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

  if (createdSalesResult.error) {
    throw createdSalesResult.error;
  }

  if (paidSalesResult.error) {
    throw paidSalesResult.error;
  }

  if (unpaidSalesResult.error) {
    throw unpaidSalesResult.error;
  }

  if (expensesResult.error) {
    throw expensesResult.error;
  }

  if (reportResult.error) {
    throw reportResult.error;
  }

  const sales = createdSalesResult.data ?? [];
  const paidSales = paidSalesResult.data ?? [];
  const unpaidSales = unpaidSalesResult.data ?? [];
  const expenses = expensesResult.data ?? [];
  const saleCountToday = sales.length;
  const grossSalesToday = sales.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
  const paidSalesToday = paidSales.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
  const unpaidBalanceToday = unpaidSales.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
  const expensesToday = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const netCashToday = paidSalesToday - expensesToday;

  return {
    business: businessResult.data,
    saleCountToday,
    grossSalesToday,
    paidSalesToday,
    unpaidBalanceToday,
    expensesToday,
    netCashToday,
    lowStockCount: 0,
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
