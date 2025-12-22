"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Loader2, Zap, Crown, Building2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  icon: React.ReactNode;
  features: string[];
  popular?: boolean;
}

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    currency: "PKR",
    icon: <Zap className="h-6 w-6" />,
    features: [
      "5 exams per month",
      "50 submissions",
      "Basic AI grading",
      "Email support",
      "PDF export"
    ]
  },
  {
    id: "pro",
    name: "Pro",
    price: 2500,
    currency: "PKR",
    icon: <Crown className="h-6 w-6" />,
    popular: true,
    features: [
      "50 exams per month",
      "500 submissions",
      "Advanced AI grading",
      "Priority support",
      "Excel export",
      "Custom grading criteria",
      "500 credits included"
    ]
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 7500,
    currency: "PKR",
    icon: <Building2 className="h-6 w-6" />,
    features: [
      "Unlimited exams",
      "Unlimited submissions",
      "Premium AI grading",
      "24/7 support",
      "Custom features",
      "API access",
      "Dedicated account manager"
    ]
  }
];

export default function PricingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleUpgrade = async (planId: string) => {
    if (!isLoaded || !user) {
      toast.error("Please sign in to upgrade");
      router.push("/sign-in");
      return;
    }

    if (planId === "free") {
      toast.info("You're already on the free plan!");
      return;
    }

    setLoadingPlan(planId);

    try {
      // Call backend to create checkout session
      const response = await apiClient.post("/api/v1/payments/create", {
        plan_type: planId,
        gateway_choice: "safepay",
        user_id: user.id
      });

      const { checkout_url } = response.data;

      // Redirect to Safepay checkout
      toast.success("Redirecting to payment gateway...");
      window.location.href = checkout_url;
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(
        error.response?.data?.detail || "Failed to initiate payment. Please try again."
      );
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              AI Exam Grader
            </h1>
            <Button variant="ghost" onClick={() => router.push("/dashboard")}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
            Choose Your Plan
          </h2>
          <p className="text-xl text-zinc-600 dark:text-zinc-400">
            Upgrade to unlock more exams and advanced features
          </p>
          <p className="text-sm text-zinc-500 mt-2">
            Pricing in Pakistani Rupees (PKR) • Secure payment via Safepay
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative ${
                plan.popular
                  ? "border-2 border-blue-500 shadow-lg"
                  : "border-zinc-200 dark:border-zinc-800"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <CardHeader>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                    {plan.icon}
                  </div>
                  {plan.popular && (
                    <Crown className="h-5 w-5 text-yellow-500" />
                  )}
                </div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mt-4">
                  {plan.price === 0 ? (
                    "Free"
                  ) : (
                    <>
                      {plan.currency} {plan.price.toLocaleString()}
                      <span className="text-sm font-normal text-zinc-500">/month</span>
                    </>
                  )}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={loadingPlan !== null}
                >
                  {loadingPlan === plan.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : plan.id === "free" ? (
                    "Current Plan"
                  ) : (
                    "Upgrade Now"
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Payment Info */}
        <div className="mt-16 text-center max-w-3xl mx-auto">
          <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
            Secure Payment with Safepay
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            We use Safepay, Pakistan's leading payment gateway, to ensure your transactions are safe and secure. 
            Pay with your debit/credit card or bank account.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-zinc-500">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>SSL Encrypted</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>PCI Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>Money Back Guarantee</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
