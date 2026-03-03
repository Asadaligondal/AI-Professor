"use client";

import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileText, ArrowRight } from "lucide-react";
import { examService } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";

export default function ReviewIndexPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [pushing, setPushing] = useState<string | null>(null);
  const [allReviewedMap, setAllReviewedMap] = useState<Record<string, boolean>>({});

  const { data: exams, isLoading } = useQuery({
    queryKey: ["exams", user?.uid],
    queryFn: () => examService.getExams(user!.uid),
    enabled: !!user,
  });

  // Determine whether all submissions for each exam have been reviewed.
  useEffect(() => {
    let mounted = true;
    const checkAllReviewed = async () => {
      if (!exams || exams.length === 0) return;
      const map: Record<string, boolean> = {};
      await Promise.all(
        exams.map(async (exam: any) => {
          try {
            const subs = await examService.getExamSubmissions(exam.id);
            if (!subs || subs.length === 0) {
              map[exam.id] = false;
              return;
            }
            const allReviewed = subs.every((s: any) => {
              // Consider a submission reviewed if any of these indicators are present
              if (s.reviewed === true) return true;
              if (s.published === true) return true;
              if (s.status && (s.status === 'reviewed' || s.status === 'completed' || s.status === 'published')) return true;
              if (s.grade_json && Array.isArray(s.grade_json.results) && s.grade_json.results.length > 0) return true;
              return false;
            });
            map[exam.id] = !!allReviewed;
          } catch (err) {
            console.error('Failed to fetch submissions for exam', exam.id, err);
            map[exam.id] = false;
          }
        })
      );
      if (mounted) setAllReviewedMap(map);
    };

    checkAllReviewed();
    return () => { mounted = false; };
  }, [exams]);

  if (isLoading) {
    return (
      <AppShell pageTitle="Review">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        </div>
      </AppShell>
    );
  }

  // Try to filter exams that are explicitly marked in-progress / needs review
  // Exclude exams that have already been pushed to Results (reviewed/published/completed)
  const reviewable = (exams || []).filter((e: any) => {
    const s = (e.status || "").toString().toLowerCase();
    const isReviewStatus = s === "in_progress" || s === "in-progress" || s === "needs_review" || s === "in-review";
    const isPushed = e.reviewed === true || e.pushed_to_results === true || s === "completed" || s === "published" || e.published === true;
    return isReviewStatus && !isPushed;
  });

  console.log("UX Clarity Pass v1");

  return (
    <AppShell pageTitle="In Review">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">In Review</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Exams that are still grading or need attention</p>
        </div>

        {reviewable.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reviewable.map((exam: any) => (
              <Card key={exam.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push(`/dashboard/exams/${exam.id}/review`)}>
                <CardHeader>
                  <CardTitle className="line-clamp-2">{exam.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-zinc-600">{exam.total_submissions || 0} submissions</div>
                    <div className="space-x-2">
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/results/${exam.id}`); }}>Open Results</Button>
                      <Button
                        size="sm"
                        variant="default"
                        disabled={pushing === exam.id || !allReviewedMap[exam.id]}
                        onClick={async (ev) => {
                          ev.stopPropagation();
                          try {
                            setPushing(exam.id);
                            // Mark exam as reviewed and completed on backend
                            await examService.patchExam(exam.id, { reviewed: true, status: 'completed' });
                            // After pushing, navigate to Results
                            router.push(`/dashboard/results/${exam.id}`);
                          } catch (err) {
                            console.error('Push to Results failed:', err);
                          } finally {
                            setPushing(null);
                          }
                        }}
                      >
                        {pushing === exam.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Push to Results"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-12 text-center">
              <FileText className="h-16 w-16 text-zinc-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">No exams in review right now</h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-6">There are no exams currently marked as in-progress or needing review. You can go to Results to see all exams and their grading status.</p>
              <Button onClick={() => router.push('/dashboard/results')}>Go to Results <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
