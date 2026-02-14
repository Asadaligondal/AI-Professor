"use client";

import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
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
  const queryClient = useQueryClient();

  const allReviewed = Array.isArray(submissions) && submissions.length > 0 && submissions.every((s: any) => s.grade_status === 'reviewed');

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
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Review Submissions</h1>
            <p className="text-sm text-zinc-600">Click a student to edit marks and feedback.</p>
          </div>
          <div>
            <Button
              onClick={async () => {
                if (!examId) return;
                try {
                  await examService.patchExam(examId, { status: 'completed', reviewed: true });
                  await queryClient.invalidateQueries({ queryKey: ['exams'] });
                  await queryClient.invalidateQueries({ queryKey: ['submissions', examId] });
                  toast.success('Exam pushed to Results');
                } catch (err) {
                  console.error('Push to results failed', err);
                  toast.error('Failed to push exam to results');
                }
              }}
              disabled={!allReviewed}
            >
              Push to Results
            </Button>
          </div>
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
          <div className="overflow-x-auto border border-zinc-100 rounded-md">
            <table className="w-full min-w-[640px] text-left">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-4 py-3 text-sm font-medium text-zinc-700">Student</th>
                  <th className="px-4 py-3 text-sm font-medium text-zinc-700">Roll</th>
                  <th className="px-4 py-3 text-sm font-medium text-zinc-700">Status</th>
                  <th className="px-4 py-3 text-sm font-medium text-zinc-700">Review State</th>
                  <th className="px-4 py-3 text-sm font-medium text-zinc-700">Score</th>
                  <th className="px-4 py-3 text-sm font-medium text-zinc-700 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-zinc-100">
                {submissions.map((s: any) => (
                  <tr key={s.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-zinc-900">{s.student_name || 'Unknown Student'}</div>
                      <div className="text-xs text-zinc-500">{s.student_email || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">{s.roll_number || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600">{s.grade_status || 'pending'}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600">{s.grade_status === 'reviewed' ? 'Reviewed' : 'In Progress'}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600">{s.grade_json?.score_total ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/exams/${examId}/review/${s.id}`);
                        }}
                      >
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
