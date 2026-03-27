import { redirect } from "next/navigation";

export default async function InventoryPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  redirect(`/dashboard/${businessId}/history`);
}
