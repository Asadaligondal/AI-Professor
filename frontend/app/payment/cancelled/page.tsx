"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle, ArrowLeft, Mail } from "lucide-react";

export const dynamic = 'force-dynamic';

function PaymentCancelledContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason") || "Payment was cancelled";

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-zinc-900 dark:to-black flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Payment Cancelled
          </CardTitle>
          <CardDescription className="text-lg">
            Your payment was not completed
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              What happened?
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {reason}. No charges have been made to your account.
            </p>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-6">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
              Common reasons for cancelled payments:
            </h3>
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <li className="flex items-start gap-2">
                <span className="text-zinc-400">•</span>
                <span>Payment was manually cancelled by the user</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-zinc-400">•</span>
                <span>Browser window was closed during payment</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-zinc-400">•</span>
                <span>Payment timeout or session expired</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-zinc-400">•</span>
                <span>Insufficient funds or card declined</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              className="w-full"
              onClick={() => router.push("/pricing")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push("/dashboard")}
            >
              Back to Dashboard
            </Button>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-50 mb-1">
                  Need help?
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  If you're experiencing issues with payment, please contact our support team at{" "}
                  <a href="mailto:support@example.com" className="text-blue-600 hover:underline">
                    support@example.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentCancelledPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-zinc-900 dark:to-black flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    }>
      <PaymentCancelledContent />
    </Suspense>
  );
}
