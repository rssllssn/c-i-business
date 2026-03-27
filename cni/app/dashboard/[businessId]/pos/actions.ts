"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function getBusinessId(formData: FormData) {
  return String(formData.get("businessId") ?? "").trim();
}

function getAuthedAmount(rawValue: FormDataEntryValue | null) {
  return Number(String(rawValue ?? 0));
}

async function getAuthedUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/auth/login");
  }

  return { supabase, userId: data.user.id };
}

function revalidatePosState(businessId: string) {
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${businessId}`);
  revalidatePath(`/dashboard/${businessId}/pos`);
  revalidatePath(`/dashboard/${businessId}/eod`);
}

export async function createSaleAction(formData: FormData) {
  const businessId = getBusinessId(formData);
  const customerName = String(formData.get("customerName") ?? "").trim();
  const itemDescription = String(formData.get("itemDescription") ?? "").trim();
  const totalAmount = getAuthedAmount(formData.get("totalAmount"));
  const isPaid = String(formData.get("isPaid") ?? "") === "on";
  const paidAt = isPaid ? new Date().toISOString() : null;

  if (!businessId) {
    redirect("/dashboard?error=missing-business");
  }

  if (!customerName || !itemDescription || !Number.isFinite(totalAmount) || totalAmount <= 0) {
    redirect(`/dashboard/${businessId}/pos?error=invalid-sale`);
  }

  const { supabase, userId } = await getAuthedUser();
  const { error } = await supabase.from("sales").insert({
    business_id: businessId,
    user_id: userId,
    customer_name: customerName,
    item_description: itemDescription,
    total_amount: totalAmount,
    is_paid: isPaid,
    paid_at: paidAt,
  });

  if (error) {
    redirect(`/dashboard/${businessId}/pos?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePosState(businessId);
  redirect(`/dashboard/${businessId}/pos?success=sale`);
}

export async function createExpenseAction(formData: FormData) {
  const businessId = getBusinessId(formData);
  const description = String(formData.get("description") ?? "").trim();
  const amount = getAuthedAmount(formData.get("amount"));

  if (!businessId) {
    redirect("/dashboard?error=missing-business");
  }

  if (!description || !Number.isFinite(amount) || amount <= 0) {
    redirect(`/dashboard/${businessId}/pos?error=invalid-expense`);
  }

  const { supabase, userId } = await getAuthedUser();
  const { error } = await supabase.from("expenses").insert({
    business_id: businessId,
    user_id: userId,
    description,
    amount,
  });

  if (error) {
    redirect(`/dashboard/${businessId}/pos?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePosState(businessId);
  redirect(`/dashboard/${businessId}/pos?success=expense`);
}
