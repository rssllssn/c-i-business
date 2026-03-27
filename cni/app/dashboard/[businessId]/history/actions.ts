"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

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

function appendQuery(path: string, key: string, value: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${key}=${encodeURIComponent(value)}`;
}

async function getAuthedClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/auth/login");
  }

  return supabase;
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

  const supabase = await getAuthedClient();
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
