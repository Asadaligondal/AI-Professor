"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { examService } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { QuestionDetailView } from "@/components/question-detail-view";

interface Props {
  examId: string;
  submissionId: string;
}

export default function StudentGradingReport({ examId, submissionId }: Props) {
  const { data: fetchedSubmissions } = useQuery({
    queryKey: ["submissions", examId],
    queryFn: () => examService.getExamSubmissions(examId),
  });

  const [reviewFilter, setReviewFilter] = useState<'all'|'needs'>('all');
  const [openQuestionValue, setOpenQuestionValue] = useState<string|undefined>(undefined);

  useEffect(() => {
    console.log('StudentGradingReport mounted');
  }, []);

  const submissions = fetchedSubmissions || [];
  const selected = submissions.find((s: any) => String(s.id) === String(submissionId)) || null;

  const safePercent = (numerator: number | null | undefined, denominator: number | null | undefined): number | null => {
    if (!denominator || denominator === 0) return null;
    const n = Number(numerator) || 0;
    const d = Number(denominator) || 0;
    if (d === 0) return null;
    const pct = (n / d) * 100;
    if (!Number.isFinite(pct)) return null;
    return Math.round(pct * 10) / 10;
  };

  const parseScore = (question: any) => {
    let earned: number | null = null;
    let max: number | null = null;
    if (question.marks_obtained !== undefined && question.marks_obtained !== null) {
      earned = Number(question.marks_obtained) || 0;
    }
    if (question.max_marks !== undefined && question.max_marks !== null) {
      max = Number(question.max_marks) || 0;
    }
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

  const getSubmissionScore = (sub: any) => {
    const questions = sub.grade_json?.results || [];
    const maxScore = questions.reduce((sum: number, q: any) => sum + (q.max_marks || 0), 0);
    const obtained = sub.total_score || questions.reduce((sum: number, q: any) => sum + (q.marks_obtained || 0), 0);
    const pct = maxScore > 0 ? (obtained / maxScore) * 100 : 0;
    return { obtained, maxScore, pct };
  };

  if (!selected) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="text-zinc-500">Student not found</div>
        </CardContent>
      </Card>
    );
  }

  const allQs = selected.grade_json?.results || [];
  const computed = allQs.map((question: any, idx: number) => {
    const { earned, max } = parseScore(question);
    const pct = safePercent(earned ?? null, max ?? null);
    const needs = needsReview(earned ?? null, max ?? null);
    return { question, idx, earned, max, pct, needs };
  });

  const filtered = reviewFilter === 'needs' ? computed.filter((c: { needs: boolean }) => c.needs) : computed;

  return (
    <div className="grid gap-6 md:grid-cols-[320px_1fr]">
      <Card className="max-h-[70vh] overflow-auto">
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="text-sm">Students</CardTitle>
          <div className="text-sm text-zinc-500">1</div>
        </CardHeader>
        <CardContent className="p-2">
          <div className="space-y-2 sticky top-20">
            <div className="w-full text-left rounded-md px-3 py-2 bg-zinc-100 dark:bg-zinc-900">
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{selected.student_name}</div>
              <div className="text-xs text-zinc-500">{selected.roll_number || ''}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="p-4">
        <CardHeader className="p-0 mb-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{selected.student_name}</h2>
              <div className="text-sm text-zinc-500">{selected.roll_number || ''}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold">{getSubmissionScore(selected).obtained} / {getSubmissionScore(selected).maxScore}</div>
              <div className="text-sm text-zinc-500">{getSubmissionScore(selected).pct.toFixed(1)}%</div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="space-y-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium">Review Controls</div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant={reviewFilter === 'all' ? 'default' : 'outline'} onClick={() => setReviewFilter('all')}>All</Button>
                  <Button size="sm" variant={reviewFilter === 'needs' ? 'default' : 'outline'} onClick={() => setReviewFilter('needs')}>Needs Review</Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setOpenQuestionValue(undefined); }}>Collapse all</Button>
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
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="text-sm font-medium mr-2">Question Summary</div>
                {computed.map((c: { idx: number; pct: number | null; needs: boolean; question: any; earned: number | null; max: number | null }) => {
                  const value = `q-${c.idx}`;
                  const status = c.pct === null ? 'N/A' : c.pct < 50 ? 'Needs Review' : 'OK';
                  return (
                    <Button key={value} size="sm" variant="ghost" className="rounded-full px-3 py-1 border text-xs" onClick={() => { setOpenQuestionValue(value); setTimeout(() => document.getElementById(value)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120); }}>Q{c.idx + 1} · {c.pct === null ? '—' : `${c.pct}%`} <Badge variant="secondary" className="ml-2">{status}</Badge></Button>
                  );
                })}
              </div>

              {filtered.length === 0 ? (
                <div className="py-8 text-center text-zinc-500">No questions need review 🎉</div>
              ) : (
                filtered.map((c: { idx: number; pct: number | null; needs: boolean; question: any; earned: number | null; max: number | null }) => {
                  const question = c.question;
                  const qIdx = c.idx;
                  const hasRationale = question.rationale || (question.processed_answer && question.expected_answer);
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
                          <div className="pb-2"><QuestionDetailView question={question} questionIndex={qIdx} /></div>
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
                              <div className="text-sm text-zinc-600">{question.feedback || 'No feedback'}</div>
                            </div>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })
              )}
            </Accordion>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
