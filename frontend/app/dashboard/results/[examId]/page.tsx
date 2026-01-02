"use client";

import { use, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Download, Save, Loader2, CheckCircle2, Eye } from "lucide-react";
import { examService } from "@/lib/api";
import { Submission } from "@/types";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { QuestionDetailView } from "@/components/question-detail-view";

interface ResultsPageProps {
  params: Promise<{
    examId: string;
  }>;
}

export default function ResultsPage({ params }: ResultsPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const searchParams = useSearchParams();
  const { examId: examIdStr } = use(params);
  const examId = parseInt(examIdStr);
  const studentId = searchParams.get("studentId"); // Get studentId from query params
  
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch exam details
  const { data: exam, isLoading: examLoading } = useQuery({
    queryKey: ["exam", examId],
    queryFn: () => examService.getExam(examId),
  });

  // Fetch submissions
  const { data: fetchedSubmissions, isLoading: submissionsLoading } = useQuery({
    queryKey: ["submissions", examId],
    queryFn: () => examService.getExamSubmissions(examId),
  });

  // Initialize submissions when data is fetched, filter by studentId if provided
  useEffect(() => {
    if (fetchedSubmissions) {
      if (studentId) {
        // Filter to show only specific student
        const filtered = fetchedSubmissions.filter(
          (sub) => sub.id === parseInt(studentId)
        );
        setSubmissions(filtered);
      } else {
        setSubmissions(fetchedSubmissions);
      }
    }
  }, [fetchedSubmissions, studentId]);

  // Save mutation for batch updates
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Update all submissions
      const promises = submissions.map((sub) =>
        examService.updateSubmission(sub.id, {
          total_score: sub.total_score,
          ai_feedback: sub.ai_feedback,
          grade_json: sub.grade_json,
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      toast.success("All changes saved successfully!");
      setHasChanges(false);
      // Invalidate submissions query
      queryClient.invalidateQueries({ queryKey: ["submissions", examId] });
      // Invalidate dashboard stats to update average grade in real-time
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats", user.id] });
        toast.success("Dashboard stats updated!", { duration: 2000 });
      }
    },
    onError: () => {
      toast.error("Failed to save changes. Please try again.");
    },
  });

  // Individual submission update mutation for auto-save
  const updateSingleSubmissionMutation = useMutation({
    mutationFn: async (submission: Submission) => {
      return examService.updateSubmission(submission.id, {
        total_score: submission.total_score,
        ai_feedback: submission.ai_feedback,
        grade_json: submission.grade_json,
      });
    },
    onSuccess: () => {
      // Invalidate queries silently in background
      queryClient.invalidateQueries({ queryKey: ["submissions", examId] });
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats", user.id] });
      }
    },
    onError: () => {
      toast.error("Failed to auto-save changes.");
    },
  });

  // Update individual field
  const updateField = (
    submissionId: number,
    field: keyof Submission,
    value: any
  ) => {
    setSubmissions((prev) =>
      prev.map((sub) =>
        sub.id === submissionId ? { ...sub, [field]: value } : sub
      )
    );
    setHasChanges(true);
  };

  // Update question marks and recalculate total with auto-save
  const updateQuestionMarks = (
    submissionId: number,
    questionIndex: number,
    newMarks: number
  ) => {
    setSubmissions((prev) => {
      const updated = prev.map((sub) => {
        if (sub.id === submissionId && sub.grade_json) {
          const updatedJson = { ...sub.grade_json };
          if (updatedJson.results && updatedJson.results[questionIndex]) {
            updatedJson.results[questionIndex].marks_obtained = newMarks;
            
            // Recalculate total score
            const newTotal = updatedJson.results.reduce(
              (sum: number, q: any) => sum + (q.marks_obtained || 0),
              0
            );
            
            const updatedSub = {
              ...sub,
              grade_json: updatedJson,
              total_score: newTotal,
            };
            
            // Auto-save this submission after update
            updateSingleSubmissionMutation.mutate(updatedSub);
            
            return updatedSub;
          }
        }
        return sub;
      });
      return updated;
    });
    setHasChanges(true);
  };

  // Update feedback
  const updateFeedback = (
    submissionId: number,
    questionIndex: number,
    newFeedback: string
  ) => {
    setSubmissions((prev) =>
      prev.map((sub) => {
        if (sub.id === submissionId && sub.grade_json) {
          const updatedJson = { ...sub.grade_json };
          if (updatedJson.results && updatedJson.results[questionIndex]) {
            updatedJson.results[questionIndex].feedback = newFeedback;
            return { ...sub, grade_json: updatedJson };
          }
        }
        return sub;
      })
    );
    setHasChanges(true);
  };

  // Export to Excel
  const exportToExcel = () => {
    const exportData = submissions.flatMap((sub) => {
      const questions = sub.grade_json?.results || [];
      return questions.map((q: any, idx: number) => ({
        "Student Name": sub.student_name,
        "Roll Number": sub.roll_number,
        "Question": `Q${idx + 1}`,
        "Marks Obtained": q.marks_obtained || 0,
        "Max Marks": q.max_marks || 0,
        "Feedback": q.feedback || "",
      }));
    });

    // Add summary sheet
    const summaryData = submissions.map((sub) => ({
      "Student Name": sub.student_name,
      "Roll Number": sub.roll_number,
      "Total Score": sub.total_score || 0,
      "Status": sub.grade_status,
      "Graded At": sub.graded_at
        ? new Date(sub.graded_at).toLocaleString()
        : "Not graded",
    }));

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(summaryData);
    const ws2 = XLSX.utils.json_to_sheet(exportData);
    
    XLSX.utils.book_append_sheet(wb, ws1, "Summary");
    XLSX.utils.book_append_sheet(wb, ws2, "Detailed Results");
    
    XLSX.writeFile(wb, `${exam?.title || "Exam"}_Results.xlsx`);
    toast.success("Excel file downloaded!");
  };

  if (examLoading || submissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
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
            onClick={() => studentId ? router.push(`/exams/${examId}`) : router.push("/dashboard")}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {studentId ? "Back to All Students" : "Back to Dashboard"}
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {exam?.title || "Exam Results"}
                {studentId && submissions[0] && (
                  <span className="text-lg font-normal text-zinc-600 dark:text-zinc-400 ml-2">
                    - {submissions[0].student_name}
                  </span>
                )}
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {studentId 
                  ? `Detailed analysis for ${submissions[0]?.student_name || "student"}`
                  : `${submissions.length} student${submissions.length !== 1 ? "s" : ""} graded`
                }
              </p>
            </div>
            <div className="flex gap-2">
              {studentId && (
                <Button
                  variant="outline"
                  onClick={() => router.push(`/dashboard/exams/${examId}/review/${studentId}`)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Paper
                </Button>
              )}
              <Button
                variant="outline"
                onClick={exportToExcel}
                disabled={submissions.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Download Excel
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={!hasChanges || saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {hasChanges ? "Save Changes" : "No Changes"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {submissions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-zinc-500">No submissions found for this exam.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {submissions.map((submission) => {
              const questions = submission.grade_json?.results || [];
              const maxScore = questions.reduce(
                (sum: number, q: any) => sum + (q.max_marks || 0),
                0
              );
              const percentage = maxScore > 0
                ? ((submission.total_score || 0) / maxScore) * 100
                : 0;

              return (
                <Card key={submission.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{submission.student_name}</CardTitle>
                        <CardDescription>
                          Roll No: {submission.roll_number}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                          {submission.total_score || 0} / {maxScore}
                        </div>
                        <div className="text-sm text-zinc-500">
                          {percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {questions.map((question: any, qIdx: number) => {
                        // Check if this question has the new explainable reasoning structure
                        const hasRationale = question.rationale || 
                          (question.processed_answer && question.expected_answer);

                        if (hasRationale) {
                          // Render the detailed explainable reasoning view
                          return (
                            <div key={qIdx} className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
                              <QuestionDetailView 
                                question={question} 
                                questionIndex={qIdx}
                              />
                            </div>
                          );
                        }

                        // Fallback to the old simple view for questions without rationale
                        return (
                          <div
                            key={qIdx}
                            className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-zinc-900 dark:text-zinc-50">
                                Question {qIdx + 1}
                              </h4>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-zinc-500">Marks:</span>
                                <Input
                                  type="number"
                                  min="0"
                                  max={question.max_marks || 100}
                                  step="0.5"
                                  value={question.marks_obtained || 0}
                                  onChange={(e) =>
                                    updateQuestionMarks(
                                      submission.id,
                                      qIdx,
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="w-20 text-center"
                                />
                                <span className="text-sm text-zinc-500">
                                  / {question.max_marks || 0}
                                </span>
                              </div>
                            </div>

                            {question.student_answer && (
                              <div className="text-sm">
                                <p className="text-zinc-500 mb-1">Student Answer:</p>
                                <p className="text-zinc-700 dark:text-zinc-300">
                                  {question.student_answer}
                                </p>
                              </div>
                            )}

                            <div>
                              <label className="text-sm text-zinc-500 mb-1 block">
                                Feedback:
                              </label>
                              <Textarea
                                value={question.feedback || ""}
                                onChange={(e) =>
                                  updateFeedback(submission.id, qIdx, e.target.value)
                                }
                                placeholder="Add feedback for this question..."
                                rows={2}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
