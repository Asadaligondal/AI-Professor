"use client";

import React, { useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ArrowLeft,
  Users,
  Trophy,
  TrendingUp,
  AlertTriangle,
  Bot,
  UserCheck,
  BarChart3,
  Eye,
} from "lucide-react";
import { getSubmissionsForExam } from "@/lib/analytics/classroomPerformance";
import { percent, safeAvg, countNeedsReview } from "@/lib/analytics/scoreUtils";
import { listStudents } from "@/lib/firestore/students";
import { examService } from "@/lib/api";
import type { Submission } from "@/types/database";

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtDate(val: any): string {
  if (!val) return "-";
  const ms = val?.seconds
    ? val.seconds * 1000
    : typeof val === "string"
      ? Date.parse(val)
      : 0;
  if (!ms) return "-";
  return new Date(ms).toLocaleDateString();
}

function statusBadge(exam: any) {
  if (exam?.reviewed === true) {
    return (
      <Badge variant="default" className="text-xs inline-flex items-center">
        <UserCheck className="h-3 w-3 mr-1" /> Human Reviewed
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-xs inline-flex items-center">
      <Bot className="h-3 w-3 mr-1" /> AI Graded
    </Badge>
  );
}

/** Build per-question stats from all submissions' grade_json */
function questionStats(submissions: any[]): { qNum: number; avgPct: number; maxMarks: number; avgObtained: number }[] {
  const qs = new Map<number, { obtained: number[]; max: number }>();

  for (const sub of submissions) {
    const results: any[] = sub.grade_json?.results || [];
    for (const r of results) {
      const qn = r.q_num ?? r.question_number ?? 0;
      if (!qn) continue;
      if (!qs.has(qn)) qs.set(qn, { obtained: [], max: r.max_marks ?? 0 });
      const entry = qs.get(qn)!;
      entry.obtained.push(r.marks_obtained ?? 0);
      if (r.max_marks && r.max_marks > entry.max) entry.max = r.max_marks;
    }
  }

  return Array.from(qs.entries())
    .sort(([a], [b]) => a - b)
    .map(([qNum, { obtained, max }]) => ({
      qNum,
      avgObtained: safeAvg(obtained),
      maxMarks: max,
      avgPct: max > 0 ? percent(safeAvg(obtained), max) : 0,
    }));
}

/** Build score distribution buckets (0-20, 20-40, ..., 80-100) */
function scoreDistribution(submissions: any[]): { range: string; count: number }[] {
  const buckets = [
    { range: "0-20%", min: 0, max: 20, count: 0 },
    { range: "20-40%", min: 20, max: 40, count: 0 },
    { range: "40-60%", min: 40, max: 60, count: 0 },
    { range: "60-80%", min: 60, max: 80, count: 0 },
    { range: "80-100%", min: 80, max: 101, count: 0 },
  ];

  for (const sub of submissions) {
    const pct = sub.percentage ?? 0;
    for (const b of buckets) {
      if (pct >= b.min && pct < b.max) {
        b.count++;
        break;
      }
    }
  }

  return buckets.map(({ range, count }) => ({ range, count }));
}

// ─── page ───────────────────────────────────────────────────────────────────

export default function ExamPerformanceDetailPage() {
  const params = useParams();
  const classroomId = params?.classroomId as string | undefined;
  const examId = params?.examId as string | undefined;
  const router = useRouter();

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: exam, isLoading: examLoading } = useQuery({
    queryKey: ["exam", examId],
    queryFn: () => examService.getExam(examId!),
    enabled: !!examId,
  });

  const { data: submissions = [], isLoading: subsLoading } = useQuery({
    queryKey: ["examSubmissions", examId],
    queryFn: () => getSubmissionsForExam(examId!),
    enabled: !!examId,
  });

  const { data: roster } = useQuery({
    queryKey: ["students", classroomId],
    queryFn: () => listStudents(classroomId!),
    enabled: !!classroomId,
  });

  // ── Computed ──────────────────────────────────────────────────────────────

  const graded = useMemo(
    () =>
      submissions.filter(
        (s: Submission) => s.grade_status === "graded" || s.grade_status === "completed",
      ),
    [submissions],
  );

  const kpi = useMemo(() => {
    const maxMarks = (exam as any)?.max_marks ?? exam?.total_marks ?? 0;
    const scores = graded.map((s: Submission) => s.total_score ?? 0);
    const pcts = graded.map((s: Submission) => s.percentage ?? (maxMarks > 0 ? percent(s.total_score ?? 0, maxMarks) : 0));
    const avgPct = safeAvg(pcts);
    const highest = pcts.length ? Math.max(...pcts) : 0;
    const lowest = pcts.length ? Math.min(...pcts) : 0;
    const needsReview = countNeedsReview(submissions as any);
    return {
      totalStudents: submissions.length,
      gradedCount: graded.length,
      maxMarks,
      avgPct,
      highest,
      lowest,
      needsReview,
    };
  }, [exam, submissions, graded]);

  /** Build student leaderboard for this exam */
  const leaderboard = useMemo(() => {
    const maxMarks = (exam as any)?.max_marks ?? exam?.total_marks ?? 0;

    // Build roster lookup
    const rollMap = new Map<string, { name: string; rollNo: string }>();
    const nameMap = new Map<string, { name: string; rollNo: string }>();
    if (roster) {
      for (const s of roster) {
        if (s.rollNo) rollMap.set(s.rollNo.trim().toLowerCase(), { name: s.name, rollNo: s.rollNo });
        if (s.name) nameMap.set(s.name.trim().toLowerCase(), { name: s.name, rollNo: s.rollNo || "" });
      }
    }

    return graded
      .map((sub: any) => {
        const score = sub.total_score ?? 0;
        const pct = sub.percentage ?? (maxMarks > 0 ? percent(score, maxMarks) : 0);

        // Try to match to roster
        const rollKey = (sub.roll_number ?? "").trim().toLowerCase();
        const nameKey = (sub.student_name ?? "").trim().toLowerCase();
        let dispName = sub.student_name || "Unknown";
        let dispRoll = sub.roll_number || "-";

        if (rollKey && rollMap.has(rollKey)) {
          dispName = rollMap.get(rollKey)!.name;
          dispRoll = rollMap.get(rollKey)!.rollNo;
        } else if (nameKey && nameMap.has(nameKey)) {
          dispName = nameMap.get(nameKey)!.name;
          dispRoll = nameMap.get(nameKey)!.rollNo || dispRoll;
        }

        const statusTag =
          sub.grade_status === "completed" || sub.grade_status === "graded"
            ? sub.reviewed
              ? "reviewed"
              : "ai-graded"
            : "pending";

        return { id: sub.id, name: dispName, rollNo: dispRoll, score, maxMarks, pct, statusTag };
      })
      .sort((a: any, b: any) => b.pct - a.pct);
  }, [graded, exam, roster]);

  const qStats = useMemo(() => questionStats(graded), [graded]);
  const distribution = useMemo(() => scoreDistribution(graded.map((s: any) => ({ percentage: s.percentage ?? (kpi.maxMarks > 0 ? percent(s.total_score ?? 0, kpi.maxMarks) : 0) }))), [graded, kpi.maxMarks]);

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!classroomId || !examId) {
    return (
      <AppShell pageTitle="Exam Performance">
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-zinc-500">Invalid classroom or exam.</p>
        </div>
      </AppShell>
    );
  }

  const loading = examLoading || subsLoading;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AppShell pageTitle="Exam Performance">
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Back + Header */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2 text-zinc-500 hover:text-zinc-900"
            onClick={() =>
              router.push(`/dashboard/classrooms/${classroomId}/performance`)
            }
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Performance
          </Button>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {exam?.title || "Exam"} — Performance
              </h2>
              <p className="text-sm text-zinc-500 mt-0.5">
                Detailed analytics for this exam.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {exam && statusBadge(exam)}
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push(`/dashboard/results/${examId}`)}
              >
                <Eye className="h-4 w-4 mr-1" /> View Results
              </Button>
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        )}

        {!loading && (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard
                icon={<Users className="h-5 w-5" />}
                label="Students Graded"
                value={`${kpi.gradedCount}/${kpi.totalStudents}`}
              />
              <KpiCard
                icon={<TrendingUp className="h-5 w-5" />}
                label="Average"
                value={kpi.avgPct > 0 ? `${kpi.avgPct.toFixed(1)}%` : "-"}
              />
              <KpiCard
                icon={<Trophy className="h-5 w-5" />}
                label="Highest / Lowest"
                value={
                  kpi.gradedCount > 0
                    ? `${kpi.highest.toFixed(0)}% / ${kpi.lowest.toFixed(0)}%`
                    : "-"
                }
              />
              <KpiCard
                icon={<AlertTriangle className="h-5 w-5" />}
                label="Needs Review"
                value={kpi.needsReview}
              />
            </div>

            {/* ── Score Distribution ──────────────────────────────────── */}
            {distribution.some((b) => b.count > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" /> Score Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-3 h-32">
                    {distribution.map((bucket) => {
                      const maxCount = Math.max(...distribution.map((b) => b.count), 1);
                      const heightPct = (bucket.count / maxCount) * 100;
                      return (
                        <div key={bucket.range} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                            {bucket.count}
                          </span>
                          <div
                            className="w-full rounded-t bg-blue-500 dark:bg-blue-400 transition-all"
                            style={{ height: `${Math.max(heightPct, 4)}%` }}
                          />
                          <span className="text-[10px] text-zinc-500 whitespace-nowrap">
                            {bucket.range}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Student Leaderboard ──────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="h-5 w-5" /> Student Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                {leaderboard.length === 0 ? (
                  <p className="text-sm text-zinc-500">No graded submissions yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-zinc-500">
                          <th className="py-2 pr-4">#</th>
                          <th className="py-2 pr-4">Student</th>
                          <th className="py-2 pr-4">Roll No</th>
                          <th className="py-2 pr-4 text-right">Score</th>
                          <th className="py-2 pr-4 text-right">Percentage</th>
                          <th className="py-2 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.map((row: any, i: number) => (
                          <tr
                            key={row.id}
                            className="border-b last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                          >
                            <td className="py-2 pr-4 font-medium text-zinc-400">
                              {i + 1}
                            </td>
                            <td className="py-2 pr-4 font-medium text-zinc-900 dark:text-zinc-50">
                              {row.name}
                            </td>
                            <td className="py-2 pr-4 text-zinc-500">{row.rollNo}</td>
                            <td className="py-2 pr-4 text-right tabular-nums">
                              {row.score}/{row.maxMarks || "?"}
                            </td>
                            <td className="py-2 pr-4 text-right font-semibold tabular-nums">
                              {row.pct.toFixed(1)}%
                            </td>
                            <td className="py-2 text-right">
                              {row.statusTag === "reviewed" ? (
                                <Badge variant="default" className="text-[10px]">
                                  Reviewed
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px]">
                                  AI Graded
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Question-level Analytics ──────────────────────────────── */}
            {qStats.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" /> Question-level Analytics
                  </CardTitle>
                  <p className="text-sm text-zinc-500">
                    Average score per question across all students.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-zinc-500">
                          <th className="py-2 pr-4">Question</th>
                          <th className="py-2 pr-4 text-right">Max Marks</th>
                          <th className="py-2 pr-4 text-right">Avg Obtained</th>
                          <th className="py-2 pr-4 text-right">Avg %</th>
                          <th className="py-2">Difficulty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {qStats.map((q) => {
                          const difficulty =
                            q.avgPct >= 75
                              ? { label: "Easy", color: "text-green-600" }
                              : q.avgPct >= 45
                                ? { label: "Medium", color: "text-yellow-600" }
                                : { label: "Hard", color: "text-red-500" };

                          return (
                            <tr
                              key={q.qNum}
                              className="border-b last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                            >
                              <td className="py-2 pr-4 font-medium text-zinc-900 dark:text-zinc-50">
                                Q{q.qNum}
                              </td>
                              <td className="py-2 pr-4 text-right tabular-nums">
                                {q.maxMarks}
                              </td>
                              <td className="py-2 pr-4 text-right tabular-nums">
                                {q.avgObtained.toFixed(1)}
                              </td>
                              <td className="py-2 pr-4 text-right font-semibold tabular-nums">
                                {q.avgPct.toFixed(1)}%
                              </td>
                              <td className={`py-2 text-sm font-medium ${difficulty.color}`}>
                                {difficulty.label}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

// ─── KPI card sub-component ─────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className="rounded-md bg-zinc-100 dark:bg-zinc-800 p-2 text-zinc-600 dark:text-zinc-300">
          {icon}
        </div>
        <div>
          <p className="text-xs text-zinc-500">{label}</p>
          <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
