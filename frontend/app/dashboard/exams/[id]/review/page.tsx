"use client";

import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileText } from "lucide-react";
import { examService } from "@/lib/api";

export default function ExamReviewIndexPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params?.id as string;
  const { user } = useAuth();

  const { data: submissions, isLoading } = useQuery({
    queryKey: ["submissions", examId],
    queryFn: () => examService.getExamSubmissions(examId),
    enabled: !!examId && !!user,
  });

  if (isLoading) {
    return (
      <AppShell pageTitle="Review Exam">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell pageTitle="Review Exam">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Review Submissions</h1>
          <p className="text-sm text-zinc-600">Click a student to edit marks and feedback.</p>
        </div>

        {!submissions || submissions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-16 w-16 text-zinc-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">No submissions yet</h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-6">Wait for grading to complete or check the upload logs.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {submissions.map((s: any) => (
              <Card key={s.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push(`/dashboard/exams/${examId}/review/${s.id}`)}>
                <CardHeader>
                  <CardTitle className="text-lg">{s.student_name || 'Unknown Student'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-zinc-600">Roll: {s.roll_number || 'N/A'}</div>
                  <div className="text-sm text-zinc-600 mt-2">Status: {s.grade_status || 'pending'}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
