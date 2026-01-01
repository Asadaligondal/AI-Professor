"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, AlertCircle, PlusCircle, Download } from "lucide-react";
import { examService } from "@/lib/api";
import { SubmissionsTable } from "@/components/submissions-table";
import { SubmissionsTableSkeleton } from "@/components/submissions-table-skeleton";

interface ExamPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ExamPage({ params }: ExamPageProps) {
  const router = useRouter();
  const { id: examIdStr } = use(params);
  const examId = parseInt(examIdStr);

  // Fetch exam data
  const { data: exam, isLoading: examLoading, error: examError } = useQuery({
    queryKey: ["exam", examId],
    queryFn: () => examService.getExam(examId),
    retry: false,
  });

  // Fetch submissions
  const { data: submissions, isLoading: submissionsLoading } = useQuery({
    queryKey: ["submissions", examId],
    queryFn: () => examService.getExamSubmissions(examId),
    enabled: !!exam,
  });

  // Loading state
  if (examLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-zinc-500 mx-auto mb-4" />
          <p className="text-zinc-600 dark:text-zinc-400">Loading exam...</p>
        </div>
      </div>
    );
  }

  // Error state - Exam not found
  if (examError || !exam) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <CardTitle>Exam Not Found</CardTitle>
            </div>
            <CardDescription>
              The exam you're looking for doesn't exist or you don't have access to it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/dashboard")} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
      {/* Fixed Header */}
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard")}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {exam.title}
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {exam.description || "No description provided"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/results/${examId}`)}
              >
                <Download className="mr-2 h-4 w-4" />
                Export Results
              </Button>
              <Button onClick={() => router.push(`/dashboard/new-exam?examId=${examId}`)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Grade More Students
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Submissions</CardDescription>
              <CardTitle className="text-3xl">
                {submissions?.length ?? 0}
              </CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Average Score</CardDescription>
              <CardTitle className="text-3xl">
                {submissions && submissions.length > 0
                  ? (
                      submissions.reduce((sum, s) => sum + (s.total_score ?? 0), 0) /
                      submissions.length
                    ).toFixed(1)
                  : "0"}
              </CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Highest Score</CardDescription>
              <CardTitle className="text-3xl">
                {submissions && submissions.length > 0
                  ? Math.max(...submissions.map((s) => s.total_score ?? 0))
                  : "0"}
              </CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Marks</CardDescription>
              <CardTitle className="text-3xl">
                {exam.total_marks ?? 0}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Student Submissions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Student Submissions</CardTitle>
            <CardDescription>
              View and manage all student submissions for this exam
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submissionsLoading ? (
              <SubmissionsTableSkeleton />
            ) : submissions && submissions.length > 0 ? (
              <SubmissionsTable submissions={submissions} examId={examId} exam={exam} />
            ) : (
              <div className="text-center py-12">
                <p className="text-zinc-500 mb-4">No submissions yet</p>
                <Button onClick={() => router.push(`/dashboard/new-exam?examId=${examId}`)}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Grade First Student
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
