"use client";

import { use, useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { ArrowLeft, Download, Save, Loader2, CheckCircle2, Eye, FileText, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { examService } from "@/lib/api";
import { Submission } from "@/types";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { QuestionDetailView } from "@/components/question-detail-view";
import { AppShell } from "@/components/layout/AppShell";

interface ResultsPageProps {
  params: Promise<{
    examId: string;
  }>;
}

export default function ResultsPage({ params }: ResultsPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const { examId } = use(params);
  const studentId = searchParams.get("studentId"); // Get studentId from query params
  
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [openQuestionValue, setOpenQuestionValue] = useState<string | undefined>(undefined);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'needs'>('all');

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
          (sub) => sub.id === studentId
        );
        setSubmissions(filtered);
      } else {
        setSubmissions(fetchedSubmissions);
      }
    }
  }, [fetchedSubmissions, studentId]);

  useEffect(() => {
    console.log("Results Scan Mode v1 mounted");
  }, []);

  useEffect(() => {
    console.log("Results Summary v1 mounted");
  }, []);
  const filteredSubmissions = useMemo(() => {
    if (!searchQuery) return submissions;
    const q = searchQuery.toLowerCase().trim();
    return submissions.filter((s) => {
      return (
        (s.student_name || "").toLowerCase().includes(q) ||
        (s.roll_number || "").toLowerCase().includes(q)
      );
    });
  }, [submissions, searchQuery]);

  // Default selection: pick the first submission (or keep studentId if provided)
  useEffect(() => {
    if (submissions && submissions.length > 0) {
      if (studentId) {
        setSelectedStudentId(String(studentId));
      } else if (!selectedStudentId) {
        setSelectedStudentId(String(submissions[0].id));
      }
    }
  }, [submissions, studentId, selectedStudentId]);

  const selectedSubmission = useMemo(() => {
    if (!selectedStudentId) return null;
    return submissions.find((s) => String(s.id) === String(selectedStudentId)) || null;
  }, [submissions, selectedStudentId]);

  const getSubmissionScore = (sub: Submission) => {
    const questions = sub.grade_json?.results || [];
    const maxScore = questions.reduce((sum: number, q: any) => sum + (q.max_marks || 0), 0);
    const obtained = sub.total_score || questions.reduce((sum: number, q: any) => sum + (q.marks_obtained || 0), 0);
    const pct = maxScore > 0 ? (obtained / maxScore) * 100 : 0;
    return { obtained, maxScore, pct };
  };

  // Safe percent helper: returns number in 0-100 or null when denominator is zero/invalid
  const safePercent = (numerator: number | null | undefined, denominator: number | null | undefined): number | null => {
    if (!denominator || denominator === 0) return null;
    const n = Number(numerator) || 0;
    const d = Number(denominator) || 0;
    if (d === 0) return null;
    const pct = (n / d) * 100;
    if (!Number.isFinite(pct)) return null;
    return Math.round(pct * 10) / 10; // 1 decimal place
  };

  const alignmentToPct = (raw: any) => {
    if (raw === null || raw === undefined) return null;
    const num = Number(raw);
    if (!Number.isFinite(num)) return null;
    if (num > 0 && num <= 1) return safePercent(num, 1);
    if (num >= 0 && num <= 100) return safePercent(num, 100);
    return null;
  };

  // Parse earned/max from question object. Supports marks fields or score text like "0.5 / 1".
  const parseScore = (question: any) => {
    let earned: number | null = null;
    let max: number | null = null;
    if (question.marks_obtained !== undefined && question.marks_obtained !== null) {
      earned = Number(question.marks_obtained) || 0;
    }
    if (question.max_marks !== undefined && question.max_marks !== null) {
      max = Number(question.max_marks) || 0;
    }
    // fallback: parse score_text or score
    const scoreText = question.score_text || question.score || question.scoreText || null;
    if ((earned === null || max === null) && scoreText && typeof scoreText === 'string') {
      const m = scoreText.match(/([0-9]*\.?[0-9]+)\s*\/\s*([0-9]*\.?[0-9]+)/);
      if (m) {
        if (earned === null) earned = Number(m[1]) || 0;
        if (max === null) max = Number(m[2]) || 0;
      }
    }
    return { earned, max };
  };

  const needsReview = (earned: number | null, max: number | null) => {
    const pct = safePercent(earned ?? null, max ?? null);
    if (pct !== null && pct < 50) return true;
    if ((earned ?? 0) === 0) return true;
    return false;
  };

  // KPI calculations
  const studentsGraded = submissions.length;
  const scores = submissions.map((sub) => {
    const questions = sub.grade_json?.results || [];
    const maxScore = questions.reduce((sum: number, q: any) => sum + (q.max_marks || 0), 0);
    const obtained = sub.total_score || questions.reduce((sum: number, q: any) => sum + (q.marks_obtained || 0), 0);
    const pct = maxScore > 0 ? (obtained / maxScore) * 100 : 0;
    return { pct, obtained, maxScore };
  });
  const averageScore = scores.length > 0 ? (scores.reduce((s, x) => s + x.pct, 0) / scores.length) : null;
  const highestScore = scores.length > 0 ? Math.max(...scores.map((s) => s.pct)) : null;
  const flaggedCount = 0;

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
      if (user?.uid) {
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats", user.uid] });
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
      if (user?.uid) {
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats", user.uid] });
      }
    },
    onError: () => {
      toast.error("Failed to auto-save changes.");
    },
  });

  // Update individual field
  const updateField = (
    submissionId: string | number,
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
    submissionId: string | number,
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
    submissionId: string | number,
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

  useEffect(() => {
    console.log("UX Clarity Pass v1");
  }, []);

  if (examLoading || submissionsLoading) {
    return (
      <AppShell pageTitle="Exam Results">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell pageTitle={`Exam Results`}>
      <div className="mb-4">
        <Button
          variant="ghost"
          onClick={() => studentId ? router.push(`/exams/${examId}`) : router.push("/dashboard")}
          className="mb-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {studentId ? "Back to All Students" : "Back to Dashboard"}
        </Button>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Exam Results</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Manage submissions for this exam. Use Paper for scan comparison and Grading Report for detailed marking.
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{studentId ? `Detailed analysis for ${submissions[0]?.student_name || "student"}` : `${submissions.length} student${submissions.length !== 1 ? "s" : ""} graded`}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={exportToExcel}
              disabled={submissions.length === 0}
              size="sm"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Excel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!hasChanges || saveMutation.isPending}
              size="sm"
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

      {submissions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-zinc-500">No submissions found for this exam.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-[320px_1fr]">
          {/* Left: Students list (sticky) */}
          <Card className="max-h-[70vh] overflow-auto">
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm">Students</CardTitle>
                <Badge variant="secondary">Scan Mode v1</Badge>
              </div>
              <div className="text-sm text-zinc-500">{submissions.length}</div>
            </CardHeader>
            <CardContent className="p-2">
              <div className="space-y-2 sticky top-20">
                {submissions.map((s) => {
                  const { obtained, maxScore, pct } = getSubmissionScore(s);
                  const low = pct < 50;
                  const isSelected = String(s.id) === String(selectedStudentId);
                  return (
                    <div
                      key={s.id}
                      className={`w-full rounded-md px-3 py-2 flex items-center justify-between gap-3 ${isSelected ? 'bg-zinc-100 dark:bg-zinc-900' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
                    >
                      <div className="flex-1 cursor-pointer" onClick={() => setSelectedStudentId(String(s.id))}>
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{s.student_name}</div>
                        <div className="text-xs text-zinc-500">{s.roll_number || ""}</div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-semibold">{obtained} / {maxScore}</div>
                          <div className="text-xs text-zinc-500">{pct.toFixed(1)}%</div>
                        </div>

                        <div className="flex items-center gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" aria-label="More">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => { console.log("Open paper", s.id); router.push(`/dashboard/results/${examId}/students/${s.id}?tab=paper`); }}>
                                Paper (Side-by-Side)
                                <div className="text-xs text-zinc-500 mt-1">Student scan vs answer key</div>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => { console.log("Open report", s.id); router.push(`/dashboard/results/${examId}/students/${s.id}?tab=report`); }}>
                                Grading Report
                                <div className="text-xs text-zinc-500 mt-1">Per-question scores + rationale</div>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Right: Selected student details */}
          <Card className="p-4">
            <CardHeader className="p-0 mb-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{selectedSubmission?.student_name || 'Select a student'}</h2>
                  <div className="text-sm text-zinc-500">{selectedSubmission?.roll_number || ''}</div>
                </div>
                <div className="text-right">
                  {selectedSubmission && (
                    (() => {
                      const sc = getSubmissionScore(selectedSubmission);
                      return (
                        <>
                          <div className="text-lg font-bold">{sc.obtained} / {sc.maxScore}</div>
                          <div className="text-sm text-zinc-500">{sc.pct.toFixed(1)}%</div>
                        </>
                      );
                    })()
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {selectedSubmission ? (
                <div className="space-y-4">
                  {/* Prepare computed questions and filtering */}
                  {
                    (() => {
                      const allQs = selectedSubmission.grade_json?.results || [];
                      const computed = allQs.map((question: any, idx: number) => {
                        const { earned, max } = parseScore(question);
                        const pct = safePercent(earned ?? null, max ?? null);
                        const needs = needsReview(earned ?? null, max ?? null);
                        return { question, idx, earned, max, pct, needs };
                      });

                      const filtered = reviewFilter === 'needs' ? computed.filter((c: { needs: boolean }) => c.needs) : computed;

                      // Review Controls row
                      return (
                        <>
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-medium">Review Controls</div>
                              <div className="flex items-center gap-1">
                                <Button size="sm" variant={reviewFilter === 'all' ? 'default' : 'outline'} onClick={() => setReviewFilter('all')}>All</Button>
                                <Button size="sm" variant={reviewFilter === 'needs' ? 'default' : 'outline'} onClick={() => setReviewFilter('needs')}>Needs Review</Button>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="ghost" onClick={() => { setOpenQuestionValue(undefined); console.log('Collapse all'); }}>Collapse all</Button>
                              <Button size="sm" variant="ghost" onClick={() => {
                                const first = computed.find((c) => c.needs);
                                if (first) {
                                  const val = `q-${first.idx}`;
                                  setOpenQuestionValue(val);
                                  setTimeout(() => document.getElementById(val)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
                                }
                              }}>Open first Needs Review</Button>
                            </div>
                          </div>

                          <Accordion type="single" collapsible value={openQuestionValue} onValueChange={(v) => setOpenQuestionValue(v)}>
                            {/* Question Summary strip */}
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                              <div className="text-sm font-medium mr-2">Question Summary</div>
                              {computed.map((c) => {
                                const value = `q-${c.idx}`;
                                const status = c.pct === null ? 'N/A' : c.pct < 50 ? 'Needs Review' : 'OK';
                                return (
                                  <Button
                                    key={value}
                                    size="sm"
                                    variant="ghost"
                                    className="rounded-full px-3 py-1 border text-xs flex items-center gap-2"
                                    onClick={() => {
                                      setOpenQuestionValue(value);
                                      setTimeout(() => document.getElementById(value)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
                                    }}
                                  >
                                    <span className="font-medium">Q{c.idx + 1}</span>
                                    <span className="text-xs text-zinc-500">· {c.pct === null ? '—' : `${c.pct}%`}</span>
                                    <Badge variant="secondary" className="ml-2">{status}</Badge>
                                  </Button>
                                );
                              })}
                            </div>

                            {filtered.length === 0 ? (
                              <div className="py-8 text-center text-zinc-500">No questions need review 🎉</div>
                            ) : (
                              filtered.map((c) => {
                                const question = c.question;
                                const qIdx = c.idx;
                                const hasRationale = question.rationale || (question.processed_answer && question.expected_answer);
                                const marks = question.marks_obtained || 0;
                                const max = question.max_marks || 0;
                                const alignmentRaw = question.concept_alignment || question.concept_score || null;
                                const alignmentPct = alignmentToPct(alignmentRaw);
                                const value = `q-${qIdx}`;

                                return (
                                  <AccordionItem id={value} value={value} key={qIdx}>
                                    <AccordionTrigger className="px-3 py-2.5">
                                      <div className="flex items-center justify-between w-full">
                                        <div className="text-sm font-medium">Question {qIdx + 1}</div>
                                        <div className="flex items-center gap-3" style={{ minWidth: 110 }}>
                                          <div className="text-sm">{c.earned ?? '—'} / {c.max ?? '—'}</div>
                                          <Badge variant="outline">{c.pct === null ? '—' : `${c.pct}%`}</Badge>
                                        </div>
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-3">
                                      {hasRationale ? (
                                        <div className="pb-2">
                                          <QuestionDetailView question={question} questionIndex={qIdx} />
                                        </div>
                                      ) : (
                                        <div className="space-y-3 pb-2">
                                          {question.student_answer && (
                                            <div className="text-sm">
                                              <p className="text-zinc-500 mb-1">Student Answer:</p>
                                              <p className="text-zinc-700 dark:text-zinc-300">{question.student_answer}</p>
                                            </div>
                                          )}

                                          <div>
                                            <label className="text-sm text-zinc-500 mb-1 block">Feedback:</label>
                                            <Textarea
                                              value={question.feedback || ""}
                                              onChange={(e) => updateFeedback(selectedSubmission.id, qIdx, e.target.value)}
                                              placeholder="Add feedback for this question..."
                                              rows={2}
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </AccordionContent>
                                  </AccordionItem>
                                );
                              })
                            )}
                          </Accordion>
                        </>
                      );
                    })()
                  }
                </div>
              ) : (
                <div className="py-8 text-center text-zinc-500">Select a student to view details</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
