"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, CreditCard, Clock } from "lucide-react";

export default function BillingPage() {
  return (
    <AppShell pageTitle="Billing & Plans">
      <div className="max-w-4xl space-y-6">
        {/* Coming Soon Card */}
        <Card className="text-center py-12">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Billing & Plans</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
              Our billing and subscription management features are coming soon. 
              Stay tuned for flexible pricing plans and payment options.
            </p>
            
            <div className="flex items-center justify-center gap-4 pt-4">
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Crown className="h-4 w-4" />
                Premium Features
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <CreditCard className="h-4 w-4" />
                Flexible Billing
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Current Status */}
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Free Plan</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Basic exam grading with AI insights
                </p>
              </div>
              <Button disabled variant="outline">
                Manage Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}