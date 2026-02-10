"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText, Users, PlusCircle, Loader2, Eye } from "lucide-react";
import { examService } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";

export default function ExamsListPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Fetch exams
  const { data: exams, isLoading } = useQuery({
    queryKey: ["exams", user?.uid],
    queryFn: () => examService.getExams(user!.uid),
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
    <AppShell pageTitle="Your Exams">
      <Button
        variant="ghost"
        onClick={() => router.push("/dashboard")}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {exams?.length || 0} exam{exams?.length !== 1 ? "s" : ""} created
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/new-exam")}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Exam
        </Button>
      </div>

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
                      router.push(`/exams/${exam.id}`);
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
    </AppShell>
  );
}
