"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Copy, CheckCircle2, CreditCard, MessageCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

function PaymentInstructionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [copiedEasyPaisa, setCopiedEasyPaisa] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  const planName = searchParams.get("plan") || "Pro";
  const planPrice = searchParams.get("price") || "2500";

  const easyPaisaNumber = "03114574752";
  const whatsAppNumber = "+923182729053";

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const copyToClipboard = (text: string, type: "easypaisa" | "whatsapp") => {
    navigator.clipboard.writeText(text);
    if (type === "easypaisa") {
      setCopiedEasyPaisa(true);
      setTimeout(() => setCopiedEasyPaisa(false), 2000);
    } else {
      setCopiedWhatsApp(true);
      setTimeout(() => setCopiedWhatsApp(false), 2000);
    }
    toast.success("Copied to clipboard!");
  };

  const openWhatsApp = () => {
    const message = encodeURIComponent(
      `Hi! I want to subscribe to the ${planName} plan (${planPrice} PKR). I have sent the payment to your EasyPaisa account. Please find the screenshot attached.`
    );
    window.open(`https://wa.me/${whatsAppNumber.replace("+", "")}?text=${message}`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/billing")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Pricing
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Plan Summary */}
        <Card className="mb-6 border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
              Payment Instructions
            </CardTitle>
            <CardDescription>
              You selected the <span className="font-semibold text-zinc-900 dark:text-zinc-50">{planName}</span> plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              PKR {planPrice}
              <span className="text-sm font-normal text-zinc-500 ml-2">/month</span>
            </div>
          </CardContent>
        </Card>

        {/* Payment Instructions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Step 1: Send Payment via EasyPaisa
            </CardTitle>
            <CardDescription>
              Transfer the amount to the following EasyPaisa account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">EasyPaisa Account Number</p>
                  <p className="text-2xl font-mono font-bold text-zinc-900 dark:text-zinc-50">
                    {easyPaisaNumber}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(easyPaisaNumber, "easypaisa")}
                  className="gap-2"
                >
                  {copiedEasyPaisa ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 dark:border-amber-900 p-4 bg-amber-50 dark:bg-amber-950/20">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900 dark:text-amber-100">
                  <p className="font-semibold mb-1">Important:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Make sure to transfer exactly PKR {planPrice}</li>
                    <li>Take a clear screenshot of the payment confirmation</li>
                    <li>Include the transaction ID in the screenshot</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Instructions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Step 2: Send Screenshot via WhatsApp
            </CardTitle>
            <CardDescription>
              After making the payment, send the screenshot to our WhatsApp for verification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">WhatsApp Number</p>
                  <p className="text-2xl font-mono font-bold text-zinc-900 dark:text-zinc-50">
                    {whatsAppNumber}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(whatsAppNumber, "whatsapp")}
                  className="gap-2"
                >
                  {copiedWhatsApp ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>

              <Button
                onClick={openWhatsApp}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                <MessageCircle className="mr-2 h-5 w-5" />
                Open WhatsApp & Send Screenshot
              </Button>
            </div>

            <div className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2">
              <p className="font-semibold text-zinc-900 dark:text-zinc-50">What to include in your message:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Payment screenshot with transaction ID</li>
                <li>Your registered email: <span className="font-mono text-xs">{user?.email}</span></li>
                <li>Selected plan: {planName}</li>
                <li>Amount paid: PKR {planPrice}</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Verification Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Step 3: Wait for Verification</CardTitle>
            <CardDescription>
              We'll verify your payment and activate your subscription
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white shrink-0">
                  1
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Send Screenshot</p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">Via WhatsApp with payment details</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white shrink-0">
                  2
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Manual Verification</p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">Our team will verify within 1-2 hours</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white shrink-0">
                  3
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Subscription Activated</p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">You'll receive a confirmation and credits will be added</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard")}
          >
            Return to Dashboard
          </Button>
        </div>
      </main>
    </div>
  );
}

export default function PaymentInstructionsPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <PaymentInstructionsContent />
    </Suspense>
  );
}
