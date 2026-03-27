"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { type Json } from "@/lib/supabase/database.types";

interface CartItemPayload {
  product_id: string;
  quantity: number;
}

export async function createSaleAction(formData: FormData) {
  const businessId = String(formData.get("businessId") ?? "");
  const itemsRaw = String(formData.get("items") ?? "");

  if (!businessId) {
    redirect("/dashboard?error=missing-business");
  }

  if (!itemsRaw) {
    redirect(`/dashboard/${businessId}/pos?error=empty-cart`);
  }

  let items: CartItemPayload[];

  try {
    items = JSON.parse(itemsRaw) as CartItemPayload[];
  } catch {
    redirect(`/dashboard/${businessId}/pos?error=invalid-cart`);
  }

  if (!Array.isArray(items) || items.length === 0) {
    redirect(`/dashboard/${businessId}/pos?error=empty-cart`);
  }

  const rpcItems: Json = JSON.parse(JSON.stringify(items));

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_sale", {
    p_business_id: businessId,
    p_items: rpcItems,
  });

  if (error) {
    redirect(`/dashboard/${businessId}/pos?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${businessId}`);
  revalidatePath(`/dashboard/${businessId}/pos`);
  redirect(`/dashboard/${businessId}/pos?success=1`);
}
