"use client";

import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/layout/AppShell";
import { PlusCircle, FileText, GraduationCap, TrendingUp, Loader2, ArrowRight, Upload, BarChart3, Download } from "lucide-react";
import { dashboardService } from "@/lib/api";

/* ── Gradient KPI Card ──────────────────────────────────────────────────── */
function GradientKpiCard({
  icon, label, value, subtitle, gradient, isLoading,
}: {
  icon: React.ReactNode; label: string; value: string | number; subtitle?: string; gradient: string; isLoading?: boolean;
}) {
  return (
    <Card className="border-0 shadow-md overflow-hidden relative bg-white dark:bg-zinc-900">
      <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${gradient}`} />
      <CardContent className="flex items-center gap-3 py-5 pt-6">
        <div className={`rounded-lg p-2.5 bg-gradient-to-br ${gradient} text-white shadow-sm`}>
          {icon}
        </div>
        <div>
          <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">{label}</p>
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400 mt-1" />
          ) : (
            <>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tabular-nums">{value}</p>
              {subtitle && <p className="text-[11px] text-zinc-400">{subtitle}</p>}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["dashboard-stats", user?.uid],
    queryFn: () => dashboardService.getStats(user!.uid),
    enabled: !!user,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <AppShell pageTitle="Dashboard">
      {/* Welcome Section */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
          Welcome back!
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Grade exams with AI-powered handwriting recognition
        </p>
      </div>

      {/* Quick Stats — Gradient KPI */}
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <GradientKpiCard
          icon={<FileText className="h-5 w-5" />}
          label="Total Exams"
          value={stats?.total_exams || 0}
          subtitle={stats?.total_exams === 0 ? "No exams created yet" : "Exams created"}
          gradient="from-blue-500 to-indigo-600"
          isLoading={isLoadingStats}
        />
        <GradientKpiCard
          icon={<GraduationCap className="h-5 w-5" />}
          label="Papers Graded"
          value={stats?.total_submissions || 0}
          subtitle={stats?.total_submissions === 0 ? "Start grading to see stats" : `From ${stats?.total_students || 0} students`}
          gradient="from-emerald-500 to-teal-600"
          isLoading={isLoadingStats}
        />
        <GradientKpiCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Average Score"
          value={stats?.average_grade ? `${stats.average_grade.toFixed(1)}%` : "--"}
          subtitle={stats?.average_grade ? "Across all submissions" : "No data available"}
          gradient="from-violet-500 to-purple-600"
          isLoading={isLoadingStats}
        />
      </div>

      {/* Main Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Create New Exam Card */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 hover:shadow-lg transition-all group">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <div className="rounded-lg p-2 bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
                <PlusCircle className="h-5 w-5" />
              </div>
              Create New Exam
            </CardTitle>
            <CardDescription>
              Upload answer key and student papers to start grading
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push("/dashboard/new-exam")}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm"
              size="lg"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              New Exam
              <ArrowRight className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
          </CardContent>
        </Card>

        {/* View Exams Card */}
        <Card className="border-0 shadow-md bg-white dark:bg-zinc-900 hover:shadow-lg transition-all group">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="rounded-lg p-2 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
                <FileText className="h-5 w-5" />
              </div>
              Your Exams
            </CardTitle>
            <CardDescription>
              View and manage your existing exams
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push("/dashboard/results")}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <FileText className="mr-2 h-4 w-4" />
              Go to Results
              <ArrowRight className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started Guide */}
      <Card className="mt-8 border-0 shadow-md bg-white dark:bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Getting Started</CardTitle>
          <CardDescription>
            Follow these steps to grade your first exam
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {[
            { step: 1, title: "Upload Professor's Answer Key", desc: "Upload a clear PDF of the professor's handwritten or typed answer key", gradient: "from-blue-500 to-indigo-600", icon: <Upload className="h-4 w-4" /> },
            { step: 2, title: "Upload Student Papers", desc: "Upload student exam papers (can be a batch of multiple students)", gradient: "from-emerald-500 to-teal-600", icon: <FileText className="h-4 w-4" /> },
            { step: 3, title: "AI Grades Automatically", desc: "Our AI analyzes handwriting, compares answers, and provides detailed feedback", gradient: "from-violet-500 to-purple-600", icon: <BarChart3 className="h-4 w-4" /> },
            { step: 4, title: "Review and Export Results", desc: "Review grades, edit if needed, and export to Excel or PDF", gradient: "from-amber-500 to-orange-600", icon: <Download className="h-4 w-4" /> },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${item.gradient} text-sm font-bold text-white shadow-sm shrink-0`}>
                {item.step}
              </div>
              <div>
                <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">{item.title}</h4>
                <p className="text-sm text-zinc-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </AppShell>
  );
}
