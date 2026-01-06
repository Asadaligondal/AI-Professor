"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GraduationCap, Crown } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/lib/api";

interface NavbarProps {
  // No props needed - fetch credits internally
}

export function Navbar({}: NavbarProps = {}) {
  const { user, signOut } = useAuth();
  const router = useRouter();

  // Fetch user stats to get credits
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", user?.uid],
    queryFn: () => dashboardService.getStats(user!.uid),
    enabled: !!user,
    staleTime: 30000, // Cache for 30 seconds
  });

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity">
          <GraduationCap className="h-7 w-7 text-blue-600" />
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              AI Exam Grader
            </h1>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-3">
          {user ? (
            // Logged In Navigation
            <>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-xs">
                  Dashboard
                </Button>
              </Link>
              
              {/* Always show credits and plan for logged-in users */}
              <div className="hidden md:flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                    Credits:
                  </span>
                  <span className="text-xs font-bold text-blue-900 dark:text-blue-100">
                    {stats?.credits || 0}
                  </span>
                </div>
                <div className="px-2.5 py-1 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950 dark:to-yellow-950 rounded border border-amber-200 dark:border-amber-800">
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                    {stats?.current_plan || "Free"} Plan
                  </span>
                </div>
              </div>

              <Button
                onClick={() => router.push("/pricing")}
                className="hidden md:flex h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700"
                size="sm"
              >
                <Crown className="mr-1.5 h-3.5 w-3.5" />
                Upgrade
              </Button>

              <span className="hidden lg:flex items-center gap-2 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded">
                {user?.email}
              </span>

              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="h-8 text-xs"
              >
                Sign Out
              </Button>
            </>
          ) : (
            // Logged Out Navigation
            <>
              <Link href="/#features">
                <Button variant="ghost" size="sm" className="text-xs hidden md:flex">
                  Features
                </Button>
              </Link>
              
              <Link href="/pricing">
                <Button variant="ghost" size="sm" className="text-xs">
                  Pricing
                </Button>
              </Link>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/login")}
                className="h-8 text-xs"
              >
                Sign In
              </Button>

              <Button
                onClick={() => router.push("/signup")}
                className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700"
                size="sm"
              >
                Get Started
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
