import { type Database } from "@/lib/supabase/database.types";

export type Product = Database["public"]["Tables"]["products"]["Row"];

const moneyFormatter = new Intl.NumberFormat("en-PH", {
  currency: "PHP",
  style: "currency",
  maximumFractionDigits: 2,
});

export function formatMoney(value: number) {
  return moneyFormatter.format(value);
}
