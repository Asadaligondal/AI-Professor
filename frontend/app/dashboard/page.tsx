"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, FileText, GraduationCap, TrendingUp } from "lucide-react";

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-zinc-900 dark:text-zinc-50" />
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                AI Exam Grader
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Dashboard
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Welcome, {user?.firstName || "User"}
            </span>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Welcome back, {user?.firstName}!
          </h2>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Grade exams with AI-powered handwriting recognition
          </p>
        </div>

        {/* Quick Stats */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Exams</CardTitle>
              <FileText className="h-4 w-4 text-zinc-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                No exams created yet
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Papers Graded
              </CardTitle>
              <GraduationCap className="h-4 w-4 text-zinc-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Start grading to see stats
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Average Score
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-zinc-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                No data available
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Actions */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Create New Exam Card */}
          <Card className="border-2 border-dashed border-zinc-300 hover:border-zinc-400 transition-colors dark:border-zinc-700 dark:hover:border-zinc-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5" />
                Create New Exam
              </CardTitle>
              <CardDescription>
                Upload answer key and student papers to start grading
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => router.push("/dashboard/new-exam")}
                className="w-full"
                size="lg"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                New Exam
              </Button>
            </CardContent>
          </Card>

          {/* View Exams Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Your Exams
              </CardTitle>
              <CardDescription>
                View and manage your existing exams
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => router.push("/dashboard/exams")}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <FileText className="mr-2 h-4 w-4" />
                View Exams
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Getting Started Guide */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Follow these steps to grade your first exam
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-white dark:bg-zinc-50 dark:text-zinc-900">
                1
              </div>
              <div>
                <h4 className="font-semibold">Upload Professor's Answer Key</h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Upload a clear PDF of the professor's handwritten or typed answer key
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-white dark:bg-zinc-50 dark:text-zinc-900">
                2
              </div>
              <div>
                <h4 className="font-semibold">Upload Student Papers</h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Upload student exam papers (can be a batch of multiple students)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-white dark:bg-zinc-50 dark:text-zinc-900">
                3
              </div>
              <div>
                <h4 className="font-semibold">AI Grades Automatically</h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Our AI analyzes handwriting, compares answers, and provides detailed feedback
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-white dark:bg-zinc-50 dark:text-zinc-900">
                4
              </div>
              <div>
                <h4 className="font-semibold">Review and Export Results</h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Review grades, edit if needed, and export to Excel or PDF
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
