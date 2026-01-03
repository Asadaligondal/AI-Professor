"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";

export const dynamic = 'force-dynamic';

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  useEffect(() => {
    // Trigger confetti animation
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    // Get payment details from URL params
    const tracker = searchParams.get("tracker");
    const token = searchParams.get("token");
    
    setPaymentDetails({
      tracker,
      token
    });

    // Setup WebSocket connection for real-time updates
    if (user) {
      const ws = new WebSocket(`ws://localhost:8000/ws/notifications/${user.id}`);
      
      ws.onopen = () => {
        console.log("WebSocket connected");
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("WebSocket message:", data);
        
        if (data.type === "payment_success") {
          console.log("Payment confirmed via WebSocket!");
          setLoading(false);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setLoading(false);
      };

      // Fallback: Stop loading after 10 seconds
      const timeout = setTimeout(() => {
        setLoading(false);
      }, 10000);

      return () => {
        ws.close();
        clearTimeout(timeout);
      };
    } else {
      setLoading(false);
    }
  }, [user, searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-zinc-900 dark:to-black flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
            {loading ? (
              <Loader2 className="h-8 w-8 text-green-600 animate-spin" />
            ) : (
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            )}
          </div>
          <CardTitle className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            {loading ? "Processing Payment..." : "Payment Successful!"}
          </CardTitle>
          <CardDescription className="text-lg">
            {loading 
              ? "Please wait while we confirm your payment with Safepay"
              : "Your account has been upgraded successfully"
            }
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {!loading && (
            <>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-6 w-6 text-green-600 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                      Welcome to Pro!
                    </h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Your account has been upgraded to Pro with 500 credits. You now have access to:
                    </p>
                    <ul className="mt-3 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                      <li>• 50 exams per month</li>
                      <li>• 500 submissions</li>
                      <li>• Advanced AI grading</li>
                      <li>• Priority support</li>
                      <li>• Excel export</li>
                    </ul>
                  </div>
                </div>
              </div>

              {paymentDetails?.tracker && (
                <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4">
                  <p className="text-xs text-zinc-500 mb-1">Transaction Reference</p>
                  <p className="font-mono text-sm text-zinc-700 dark:text-zinc-300">
                    {paymentDetails.tracker}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  onClick={() => router.push("/dashboard")}
                >
                  Go to Dashboard
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.push("/dashboard/new-exam")}
                >
                  Create New Exam
                </Button>
              </div>

              <p className="text-xs text-center text-zinc-500">
                A confirmation email has been sent to your registered email address.
              </p>
            </>
          )}

          {loading && (
            <div className="text-center py-8">
              <p className="text-sm text-zinc-500">
                This may take a few moments...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 dark:from-zinc-900 dark:to-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
