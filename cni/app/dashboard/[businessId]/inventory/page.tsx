import { redirect } from "next/navigation";
import { PencilLine, PackagePlus } from "lucide-react";

import { PageHeader } from "@/components/erp/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, formatMoney, getBusinessSummary, getCurrentProfile } from "@/lib/erp";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function saveProductAction(formData: FormData) {
  "use server";

  const businessId = String(formData.get("businessId") ?? "");
  const productId = String(formData.get("productId") ?? "");
  const sku = String(formData.get("sku") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const retailPrice = Number(formData.get("retailPrice") ?? 0);
  const stockLevel = Number(formData.get("stockLevel") ?? 0);

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    redirect(`/dashboard/${businessId}/inventory?error=admin-only`);
  }

  if (!businessId || !sku || !name || Number.isNaN(retailPrice) || Number.isNaN(stockLevel)) {
    redirect(`/dashboard/${businessId}/inventory?error=invalid-input`);
  }

  const payload = {
    business_id: businessId,
    sku,
    name,
    retail_price: retailPrice,
    stock_level: stockLevel,
  };

  const mutation = productId
    ? await supabase.from("products").update(payload).eq("id", productId)
    : await supabase.from("products").insert(payload);

  if (mutation.error) {
    redirect(`/dashboard/${businessId}/inventory?error=${encodeURIComponent(mutation.error.message)}`);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${businessId}`);
  revalidatePath(`/dashboard/${businessId}/inventory`);
  redirect(`/dashboard/${businessId}/inventory?success=1`);
}

export default async function InventoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams?: Promise<{ success?: string; error?: string }>;
}) {
  const { businessId } = await params;
  const query = (await searchParams) ?? {};
  const { supabase, profile } = await getCurrentProfile();

  if (!profile) {
    redirect("/auth/login");
  }

  const [summary, productsResult] = await Promise.all([
    getBusinessSummary(supabase, businessId),
    supabase
      .from("products")
      .select("id, business_id, sku, name, retail_price, stock_level, created_at")
      .eq("business_id", businessId)
      .order("name", { ascending: true }),
  ]);

  if (productsResult.error) {
    throw productsResult.error;
  }

  const products = productsResult.data ?? [];
  const isAdmin = profile.role === "admin";

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Inventory"
        title={`${summary.business.name} inventory`}
        description="Track products, stock levels, and retail pricing for each business independently."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Active SKUs</p>
            <p className="mt-1 text-xl font-semibold">{products.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Low stock items</p>
            <p className="mt-1 text-xl font-semibold">{summary.lowStockCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Today’s sales</p>
            <p className="mt-1 text-xl font-semibold">{formatMoney(summary.grossSalesToday)}</p>
          </CardContent>
        </Card>
      </div>

      {query.success ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-sm">
          <CardContent className="p-4 text-sm text-emerald-700 dark:text-emerald-300">
            Inventory updated successfully.
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
          <CardTitle className="flex items-center gap-2 text-lg">
            <PackagePlus className="h-5 w-5" />
            Add product
          </CardTitle>
          <CardDescription>
            Create a new product record for this business. {isAdmin ? "" : "Only admins can save changes."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isAdmin ? (
            <form action={saveProductAction} className="grid gap-4 md:grid-cols-5">
              <input type="hidden" name="businessId" value={businessId} />
              <input type="hidden" name="productId" value="" />
              <div className="grid gap-2 md:col-span-1">
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" name="sku" placeholder="SKU-001" required />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="name">Product name</Label>
                <Input id="name" name="name" placeholder="Laundry detergent" required />
              </div>
              <div className="grid gap-2 md:col-span-1">
                <Label htmlFor="retailPrice">Retail price</Label>
                <Input id="retailPrice" name="retailPrice" type="number" min="0" step="0.01" required />
              </div>
              <div className="grid gap-2 md:col-span-1">
                <Label htmlFor="stockLevel">Stock</Label>
                <div className="flex gap-2">
                  <Input id="stockLevel" name="stockLevel" type="number" min="0" step="1" defaultValue={0} required />
                  <Button type="submit" className="shrink-0">
                    Save
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            <div className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
              Inventory editing is restricted to admins.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <PencilLine className="h-5 w-5" />
            Product list
          </CardTitle>
          <CardDescription>
            Update pricing and stock for {summary.business.name}. Stock level changes will affect the POS immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {products.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {products.map((product) =>
                isAdmin ? (
                  <form
                    key={product.id}
                    action={saveProductAction}
                    className="space-y-4 rounded-xl border border-border/60 bg-background p-4 shadow-sm"
                  >
                    <input type="hidden" name="businessId" value={businessId} />
                    <input type="hidden" name="productId" value={product.id} />
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Created {formatDate(product.created_at)}
                        </p>
                      </div>
                      <Badge variant={product.stock_level <= 5 ? "destructive" : "secondary"}>
                        {product.stock_level <= 5 ? "Low stock" : "Healthy"}
                      </Badge>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor={`sku-${product.id}`}>SKU</Label>
                        <Input id={`sku-${product.id}`} name="sku" defaultValue={product.sku} required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`name-${product.id}`}>Name</Label>
                        <Input id={`name-${product.id}`} name="name" defaultValue={product.name} required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`retail-${product.id}`}>Retail price</Label>
                        <Input
                          id={`retail-${product.id}`}
                          name="retailPrice"
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={product.retail_price}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`stock-${product.id}`}>Stock level</Label>
                        <Input
                          id={`stock-${product.id}`}
                          name="stockLevel"
                          type="number"
                          min="0"
                          step="1"
                          defaultValue={product.stock_level}
                          required
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">{formatMoney(product.retail_price)} per item</p>
                      <Button type="submit" size="sm">
                        Save changes
                      </Button>
                    </div>
                  </form>
                ) : (
                  <Card key={product.id} className="border-border/60 shadow-sm">
                    <CardHeader className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-lg">{product.name}</CardTitle>
                          <CardDescription>{product.sku}</CardDescription>
                        </div>
                        <Badge variant={product.stock_level <= 5 ? "destructive" : "secondary"}>
                          {product.stock_level <= 5 ? "Low stock" : "Healthy"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Retail price</p>
                        <p className="font-semibold">{formatMoney(product.retail_price)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Stock</p>
                        <p className="font-semibold">{product.stock_level}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Created</p>
                        <p className="font-semibold">{formatDate(product.created_at)}</p>
                      </div>
                    </CardContent>
                  </Card>
                ),
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
              No products added for this business yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
