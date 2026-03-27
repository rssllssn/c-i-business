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

  if (!businessId || !saleId) {
    redirect("/dashboard?error=missing-sale");
  }

  const supabase = await getAuthedClient();
  const { error } = await supabase.rpc("mark_sale_paid", {
    p_business_id: businessId,
    p_sale_id: saleId,
  });

  if (error) {
    redirect(`/dashboard/${businessId}/history?date=${encodeURIComponent(selectedDate || "")}&error=${encodeURIComponent(error.message)}`);
  }

  revalidateHistoryState(businessId);
  redirect(`/dashboard/${businessId}/history?date=${encodeURIComponent(selectedDate || "")}&success=paid`);
}
