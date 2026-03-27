"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney, type Product } from "@/lib/erp-client";

type PosProduct = Pick<Product, "id" | "sku" | "name" | "retail_price" | "stock_level">;

interface CartItem extends PosProduct {
  quantity: number;
}

interface PosTerminalProps {
  businessId: string;
  products: PosProduct[];
  submitSaleAction: (formData: FormData) => Promise<void>;
}

export function PosTerminal({ businessId, products, submitSaleAction }: PosTerminalProps) {
  const [cart, setCart] = useState<CartItem[]>([]);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.retail_price * item.quantity, 0),
    [cart],
  );

  const payload = useMemo(
    () =>
      JSON.stringify(
        cart.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
        })),
      ),
    [cart],
  );

  const addProduct = (product: PosProduct) => {
    if (product.stock_level <= 0) {
      return;
    }

    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);

      if (existing) {
        return current.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: Math.min(item.quantity + 1, product.stock_level),
              }
            : item,
        );
      }

      return [...current, { ...product, quantity: 1 }];
    });
  };

  const changeQuantity = (productId: string, delta: number) => {
    setCart((current) =>
      current
        .map((item) =>
          item.id === productId
            ? {
                ...item,
                quantity: item.quantity + delta,
              }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const clearCart = () => setCart([]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShoppingCart className="h-5 w-5" />
            Product catalog
          </CardTitle>
          <CardDescription>
            Tap a product to add it to the current sale. Stock is enforced by the database RPC.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <Card key={product.id} className="border-border/60 bg-background shadow-sm">
                <CardHeader className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{product.name}</CardTitle>
                      <CardDescription>{product.sku}</CardDescription>
                    </div>
                    <Badge variant={product.stock_level > 0 ? "secondary" : "destructive"}>
                      {product.stock_level} stock
                    </Badge>
                  </div>
                  <p className="text-lg font-semibold">{formatMoney(product.retail_price)}</p>
                </CardHeader>
                <CardContent className="flex items-center justify-between p-4 pt-0">
                  <p className="text-sm text-muted-foreground">
                    {product.stock_level <= 0 ? "Out of stock" : "Ready for sale"}
                  </p>
                  <Button size="sm" onClick={() => addProduct(product)} disabled={product.stock_level <= 0}>
                    Add
                    <Plus className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="sticky top-6 h-fit border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShoppingCart className="h-5 w-5" />
            Current sale
          </CardTitle>
          <CardDescription>{cart.length} line items ready to post</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={submitSaleAction} className="space-y-4">
            <input type="hidden" name="businessId" value={businessId} />
            <input type="hidden" name="items" value={payload} />

            <div className="space-y-3">
              {cart.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
                  Add products from the catalog to build a sale.
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3"
                  >
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatMoney(item.retail_price)} each · {item.quantity} pcs
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => changeQuantity(item.id, -1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => changeQuantity(item.id, 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setCart((current) => current.filter((entry) => entry.id !== item.id))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold">{formatMoney(total)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={cart.length === 0}>
                Submit sale
              </Button>
              <Button type="button" variant="outline" onClick={clearCart} disabled={cart.length === 0}>
                Clear
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
