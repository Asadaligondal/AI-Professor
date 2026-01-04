"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function Home() {
  const [backendStatus, setBackendStatus] = useState<string>("Checking...");
  const [backendData, setBackendData] = useState<any>(null);
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect if already logged in
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  useEffect(() => {
    // Test backend connection
    const testBackend = async () => {
      try {
        const response = await fetch(
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
        );
        const data = await response.json();
        setBackendStatus("Connected ✓");
        setBackendData(data);
      } catch (error) {
        setBackendStatus("Disconnected ✗");
        console.error("Backend connection error:", error);
      }
    };

    testBackend();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 p-8 dark:from-zinc-900 dark:to-black">
      <main className="flex w-full max-w-4xl flex-col items-center gap-8 rounded-2xl bg-white p-12 shadow-xl dark:bg-zinc-950">
        <div className="text-center">
          <h1 className="text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            AI Professor
          </h1>
          <p className="mt-4 text-xl text-zinc-600 dark:text-zinc-400">
            AI-Powered Exam Grading System
          </p>
        </div>

        <div className="flex gap-4">
          <Button size="lg" onClick={() => router.push("/login")}>
            Sign In
          </Button>
          <Button size="lg" variant="outline" onClick={() => router.push("/signup")}>
            Get Started
          </Button>
        </div>

        <div className="w-full space-y-6">
          {/* Backend Connection Status */}
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Backend Status
            </h2>
            <p className="text-zinc-700 dark:text-zinc-300">{backendStatus}</p>
            {backendData && (
              <pre className="mt-4 overflow-x-auto rounded bg-zinc-100 p-4 text-sm dark:bg-zinc-800">
                {JSON.stringify(backendData, null, 2)}
              </pre>
            )}
          </div>

          {/* Stack Information */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <h3 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-50">
                Frontend
              </h3>
              <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                <li>✓ Next.js 15</li>
                <li>✓ TypeScript</li>
                <li>✓ Tailwind CSS</li>
                <li>✓ Firebase Auth</li>
              </ul>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <h3 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-50">
                Backend
              </h3>
              <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                <li>✓ FastAPI</li>
                <li>✓ Python 3.11</li>
                <li>✓ Firebase Firestore</li>
                <li>✓ OpenAI GPT-4</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="text-center text-sm text-zinc-500 dark:text-zinc-500">
          <p>Ready to start building your AI SaaS application</p>
        </div>
      </main>
    </div>
  );
}
