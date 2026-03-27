"use client";

import { useState } from "react";
import { Banknote, ReceiptText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PosTerminalProps {
  businessId: string;
  submitSaleAction: (formData: FormData) => Promise<void>;
  submitExpenseAction: (formData: FormData) => Promise<void>;
}

type PosTab = "sales" | "expenses";

export function PosTerminal({ businessId, submitSaleAction, submitExpenseAction }: PosTerminalProps) {
  const [activeTab, setActiveTab] = useState<PosTab>("sales");

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              {activeTab === "sales" ? <ReceiptText className="h-5 w-5" /> : <Banknote className="h-5 w-5" />}
              {activeTab === "sales" ? "Sales entry" : "Expense entry"}
            </CardTitle>
            <CardDescription>
              {activeTab === "sales"
                ? "Record customer name, item description, amount, and paid status."
                : "Log wages, supplies, utilities, and other daily costs as expenses."}
            </CardDescription>
          </div>

          <div className="flex items-center rounded-lg border border-border/60 bg-muted/40 p-1">
            <Button
              type="button"
              variant={activeTab === "sales" ? "default" : "ghost"}
              size="sm"
              className="min-w-24"
              onClick={() => setActiveTab("sales")}
            >
              Sales
            </Button>
            <Button
              type="button"
              variant={activeTab === "expenses" ? "default" : "ghost"}
              size="sm"
              className="min-w-24"
              onClick={() => setActiveTab("expenses")}
            >
              Expenses
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <section hidden={activeTab !== "sales"} aria-hidden={activeTab !== "sales"}>
          <form action={submitSaleAction} className="space-y-4">
            <input type="hidden" name="businessId" value={businessId} />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="sale-customer-name">Customer name</Label>
                <Input id="sale-customer-name" name="customerName" placeholder="Walk-in customer" required />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sale-total-amount">Amount</Label>
                <Input
                  id="sale-total-amount"
                  name="totalAmount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="sale-item-description">Item or service description</Label>
                <textarea
                  id="sale-item-description"
                  name="itemDescription"
                  rows={4}
                  placeholder="Laundry service, water refill, and so on"
                  className="min-h-28 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  required
                />
              </div>

              <div className="flex items-center gap-2 md:col-span-2">
                <input
                  id="sale-is-paid"
                  name="isPaid"
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded border-input text-primary"
                />
                <Label htmlFor="sale-is-paid" className="text-sm font-normal">
                  Mark as paid now
                </Label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                Save sale
              </Button>
              <Button type="reset" variant="outline">
                Reset
              </Button>
            </div>
          </form>
        </section>

        <section hidden={activeTab !== "expenses"} aria-hidden={activeTab !== "expenses"}>
          <form action={submitExpenseAction} className="space-y-4">
            <input type="hidden" name="businessId" value={businessId} />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="expense-description">Expense description</Label>
                <textarea
                  id="expense-description"
                  name="description"
                  rows={4}
                  placeholder="Wages, supplies, utilities, petty cash..."
                  className="min-h-28 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="expense-amount">Amount</Label>
                <Input
                  id="expense-amount"
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                If you want to treat wages as a cost of doing business, record them here as an expense.
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                Save expense
              </Button>
              <Button type="reset" variant="outline">
                Reset
              </Button>
            </div>
          </form>
        </section>
      </CardContent>
    </Card>
  );
}
