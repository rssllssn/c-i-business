"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentProfile, getManilaDateKey } from "@/lib/erp";

function getBusinessId(formData: FormData) {
  return String(formData.get("businessId") ?? "").trim();
}

function getSaleId(formData: FormData) {
  return String(formData.get("saleId") ?? "").trim();
}

function getSelectedDate(formData: FormData) {
  return String(formData.get("selectedDate") ?? "").trim();
}

function getReturnPath(formData: FormData) {
  return String(formData.get("returnPath") ?? "").trim();
}

function getExpenseId(formData: FormData) {
  return String(formData.get("expenseId") ?? "").trim();
}

function appendQuery(path: string, key: string, value: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${key}=${encodeURIComponent(value)}`;
}

function getTargetPath(formData: FormData, businessId: string) {
  const selectedDate = getSelectedDate(formData);
  const returnPath = getReturnPath(formData);

  if (returnPath) {
    return returnPath;
  }

  return `/dashboard/${businessId}/history${selectedDate ? `?date=${encodeURIComponent(selectedDate)}` : ""}`;
}

async function getAdminClient() {
  const { supabase, profile } = await getCurrentProfile();

  if (!profile) {
    redirect("/auth/login");
  }

  if (profile.role !== "admin") {
    redirect("/dashboard?error=admin-only");
  }

  return { supabase, isAdmin: profile.role === "admin" };
}

async function ensureEditableToday(
  supabase: Awaited<ReturnType<typeof getCurrentProfile>>["supabase"],
  businessId: string,
  createdAt: string,
  targetPath: string,
  isAdmin = false,
) {
  if (isAdmin) {
    return;
  }

  const today = getManilaDateKey();

  if (getManilaDateKey(new Date(createdAt)) !== today) {
    redirect(appendQuery(targetPath, "error", "You can only edit or delete today's open transactions."));
  }

  const { data: report, error } = await supabase
    .from("eod_reports")
    .select("id")
    .eq("business_id", businessId)
    .eq("report_date", today)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (report) {
    redirect(appendQuery(targetPath, "error", "This day is already closed. Corrections are locked until the next open day."));
  }
}

async function loadSaleForEdit(
  supabase: Awaited<ReturnType<typeof getCurrentProfile>>["supabase"],
  businessId: string,
  saleId: string,
  targetPath: string,
  isAdmin = false,
) {
  const { data: sale, error } = await supabase
    .from("sales")
    .select("id, business_id, created_at")
    .eq("business_id", businessId)
    .eq("id", saleId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!sale) {
    redirect(appendQuery(targetPath, "error", "Sale not found."));
  }

  await ensureEditableToday(supabase, businessId, sale.created_at, targetPath, isAdmin);

  return sale;
}

async function loadExpenseForEdit(
  supabase: Awaited<ReturnType<typeof getCurrentProfile>>["supabase"],
  businessId: string,
  expenseId: string,
  targetPath: string,
  isAdmin = false,
) {
  const { data: expense, error } = await supabase
    .from("expenses")
    .select("id, business_id, created_at")
    .eq("business_id", businessId)
    .eq("id", expenseId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!expense) {
    redirect(appendQuery(targetPath, "error", "Expense not found."));
  }

  await ensureEditableToday(supabase, businessId, expense.created_at, targetPath, isAdmin);

  return expense;
}

function revalidateHistoryState(businessId: string) {
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${businessId}`);
  revalidatePath(`/dashboard/${businessId}/pos`);
  revalidatePath(`/dashboard/${businessId}/history`);
  revalidatePath(`/dashboard/${businessId}/eod`);
}

export async function markSalePaidAction(formData: FormData) {
  const businessId = getBusinessId(formData);
  const saleId = getSaleId(formData);
  const selectedDate = getSelectedDate(formData);
  const returnPath = getReturnPath(formData);

  if (!businessId || !saleId) {
    redirect("/dashboard?error=missing-sale");
  }

  const fallbackPath = `/dashboard/${businessId}/history${selectedDate ? `?date=${encodeURIComponent(selectedDate)}` : ""}`;
  const targetPath = returnPath || fallbackPath;

  const { supabase, profile } = await getCurrentProfile();

  if (!profile) {
    redirect("/auth/login");
  }

  if (profile.role !== "admin") {
    await loadSaleForEdit(supabase, businessId, saleId, targetPath);
  }

  const { error } = await supabase.rpc("mark_sale_paid", {
    p_business_id: businessId,
    p_sale_id: saleId,
  });

  if (error) {
    redirect(appendQuery(targetPath, "error", error.message));
  }

  revalidateHistoryState(businessId);
  redirect(appendQuery(targetPath, "success", "paid"));
}

export async function updateSaleAction(formData: FormData) {
  const businessId = getBusinessId(formData);
  const saleId = getSaleId(formData);
  const targetPath = getTargetPath(formData, businessId);
  const customerName = String(formData.get("customerName") ?? "").trim();
  const itemDescription = String(formData.get("itemDescription") ?? "").trim();
  const totalAmount = Number(String(formData.get("totalAmount") ?? 0));

  if (!businessId || !saleId) {
    redirect("/dashboard?error=missing-sale");
  }

  if (!customerName || !itemDescription || !Number.isFinite(totalAmount) || totalAmount <= 0) {
    redirect(appendQuery(targetPath, "error", "Please enter a customer name, description, and valid amount."));
  }

  const { supabase, isAdmin } = await getAdminClient();
  await loadSaleForEdit(supabase, businessId, saleId, targetPath, isAdmin);

  const { error } = await supabase
    .from("sales")
    .update({
      customer_name: customerName,
      item_description: itemDescription,
      total_amount: totalAmount,
    })
    .eq("business_id", businessId)
    .eq("id", saleId);

  if (error) {
    redirect(appendQuery(targetPath, "error", error.message));
  }

  revalidateHistoryState(businessId);
  redirect(appendQuery(targetPath, "success", "sale-updated"));
}

export async function deleteSaleAction(formData: FormData) {
  const businessId = getBusinessId(formData);
  const saleId = getSaleId(formData);
  const targetPath = getTargetPath(formData, businessId);

  if (!businessId || !saleId) {
    redirect("/dashboard?error=missing-sale");
  }

  const { supabase, isAdmin } = await getAdminClient();
  await loadSaleForEdit(supabase, businessId, saleId, targetPath, isAdmin);

  const { error } = await supabase.from("sales").delete().eq("business_id", businessId).eq("id", saleId);

  if (error) {
    redirect(appendQuery(targetPath, "error", error.message));
  }

  revalidateHistoryState(businessId);
  redirect(appendQuery(targetPath, "success", "sale-deleted"));
}

export async function updateExpenseAction(formData: FormData) {
  const businessId = getBusinessId(formData);
  const expenseId = getExpenseId(formData);
  const targetPath = getTargetPath(formData, businessId);
  const description = String(formData.get("description") ?? "").trim();
  const amount = Number(String(formData.get("amount") ?? 0));

  if (!businessId || !expenseId) {
    redirect("/dashboard?error=missing-expense");
  }

  if (!description || !Number.isFinite(amount) || amount <= 0) {
    redirect(appendQuery(targetPath, "error", "Please enter a valid expense description and amount."));
  }

  const { supabase, isAdmin } = await getAdminClient();
  await loadExpenseForEdit(supabase, businessId, expenseId, targetPath, isAdmin);

  const { error } = await supabase
    .from("expenses")
    .update({
      description,
      amount,
    })
    .eq("business_id", businessId)
    .eq("id", expenseId);

  if (error) {
    redirect(appendQuery(targetPath, "error", error.message));
  }

  revalidateHistoryState(businessId);
  redirect(appendQuery(targetPath, "success", "expense-updated"));
}

export async function deleteExpenseAction(formData: FormData) {
  const businessId = getBusinessId(formData);
  const expenseId = getExpenseId(formData);
  const targetPath = getTargetPath(formData, businessId);

  if (!businessId || !expenseId) {
    redirect("/dashboard?error=missing-expense");
  }

  const { supabase, isAdmin } = await getAdminClient();
  await loadExpenseForEdit(supabase, businessId, expenseId, targetPath, isAdmin);

  const { error } = await supabase.from("expenses").delete().eq("business_id", businessId).eq("id", expenseId);

  if (error) {
    redirect(appendQuery(targetPath, "error", error.message));
  }

  revalidateHistoryState(businessId);
  redirect(appendQuery(targetPath, "success", "expense-deleted"));
}
