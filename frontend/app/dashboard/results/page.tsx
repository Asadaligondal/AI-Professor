"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Eye, FileText, PlusCircle, Loader2 } from "lucide-react";
import { examService } from "@/lib/api";

export default function ResultsIndexPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Fetch all exams (filter to only show completed/pushed exams)
  const { data: exams, isLoading } = useQuery({
    queryKey: ["exams", user?.uid],
    queryFn: () => examService.getExams(user!.uid),
    enabled: !!user,
  });

  const visibleExams = (exams || []).filter((e: any) => {
    const status = (e.status || "").toString().toLowerCase();
    return status === "completed" || e.reviewed === true;
  });

  if (isLoading) {
    return (
      <AppShell pageTitle="Results">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell pageTitle="Results">
      <div className="mb-4">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard")}
          className="mb-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Exam Results</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {visibleExams?.length || 0} exam{visibleExams?.length !== 1 ? "s" : ""} with results
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Select an exam to view submissions, paper scans, and grading reports.</p>
        </div>
        <Button onClick={() => router.push("/dashboard/new-exam")}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Exam
        </Button>
      </div>

      {!visibleExams || visibleExams.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-16 w-16 text-zinc-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              No exams yet
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              Create your first exam to start seeing results
            </p>
            <Button onClick={() => router.push("/dashboard/new-exam")}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New Exam
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleExams.map((exam: any) => (
            <Card
              key={exam.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/dashboard/results/${exam.id}`)}
            >
              <CardHeader>
                <CardTitle className="text-lg">{exam.title}</CardTitle>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {exam.description || "No description provided"}
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">Status:</span>
                    <Badge variant="secondary">{exam.status ? exam.status : (exam.reviewed ? 'Completed' : 'Unknown')}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">Total:</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                      {exam.total_marks || 0} marks
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
    </AppShell>
  );
}