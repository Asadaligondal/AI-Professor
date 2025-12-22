"use client";

import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText, Users, PlusCircle, Loader2, Eye } from "lucide-react";
import { examService } from "@/lib/api";

export default function ExamsListPage() {
  const router = useRouter();
  const { user } = useUser();

  // Fetch exams
  const { data: exams, isLoading } = useQuery({
    queryKey: ["exams", user?.id],
    queryFn: () => examService.getExams(user!.id),
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-zinc-500 mx-auto mb-4" />
          <p className="text-zinc-600 dark:text-zinc-400">Loading exams...</p>
        </div>
      </div>
    );
  }

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
                Your Exams
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {exams?.length || 0} exam{exams?.length !== 1 ? "s" : ""} created
              </p>
            </div>
            <Button onClick={() => router.push("/dashboard/new-exam")}>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Exam
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {!exams || exams.length === 0 ? (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-12 text-center">
              <FileText className="h-16 w-16 text-zinc-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                No exams yet
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                Create your first exam to start grading with AI
              </p>
              <Button onClick={() => router.push("/dashboard/new-exam")}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create New Exam
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {exams.map((exam) => (
              <Card
                key={exam.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/exams/${exam.id}`)}
              >
                <CardHeader>
                  <CardTitle className="line-clamp-2">{exam.title}</CardTitle>
                  <CardDescription>
                    {new Date(exam.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Submissions
                      </span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                        {exam.total_submissions || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Total Marks
                      </span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                        {exam.total_marks || 0}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/dashboard/results/${exam.id}`);
                    }}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View Results
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
