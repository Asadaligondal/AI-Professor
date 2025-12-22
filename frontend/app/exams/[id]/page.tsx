"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText, Users, Calendar, Loader2, AlertCircle, Eye } from "lucide-react";
import { examService } from "@/lib/api";

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
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
        <header className="border-b border-zinc-200 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
          <div className="container mx-auto px-4 py-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/dashboard")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </header>

        <main className="container mx-auto px-4 py-16">
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl">Exam Not Found</CardTitle>
              <CardDescription>
                The exam you're looking for doesn't exist or has been deleted.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button onClick={() => router.push("/dashboard")}>
                Go to Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/new-exam")}
              >
                Create New Exam
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const totalSubmissions = submissions?.length || 0;
  const avgScore = submissions && submissions.length > 0
    ? submissions.reduce((sum, s) => sum + (s.total_score || 0), 0) / submissions.length
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
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
                Created {new Date(exam.created_at).toLocaleDateString()}
              </p>
            </div>
            <Button onClick={() => router.push(`/dashboard/results/${examId}`)}>
              <Eye className="mr-2 h-4 w-4" />
              View Results
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
              <Users className="h-4 w-4 text-zinc-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSubmissions}</div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Students graded
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <FileText className="h-4 w-4 text-zinc-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalSubmissions > 0 ? avgScore.toFixed(1) : "--"}
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Out of {exam.total_marks || 100}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Marks</CardTitle>
              <Calendar className="h-4 w-4 text-zinc-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{exam.total_marks || 0}</div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Maximum marks
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Submissions List */}
        <Card>
          <CardHeader>
            <CardTitle>Submissions</CardTitle>
            <CardDescription>
              {totalSubmissions === 0
                ? "No submissions yet"
                : `${totalSubmissions} student${totalSubmissions !== 1 ? "s" : ""} graded`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submissionsLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-500 mx-auto mb-2" />
                <p className="text-sm text-zinc-600">Loading submissions...</p>
              </div>
            ) : totalSubmissions === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  No submissions for this exam yet
                </p>
                <Button onClick={() => router.push("/dashboard/new-exam")}>
                  Grade More Papers
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {submissions?.map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-center justify-between p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                  >
                    <div>
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                        {submission.student_name}
                      </h3>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Roll No: {submission.roll_number}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                        {submission.total_score || 0} / {exam.total_marks || 0}
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        {submission.grade_status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
