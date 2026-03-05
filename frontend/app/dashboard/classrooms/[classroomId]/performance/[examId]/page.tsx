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

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Helpers
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/** Interpolate two RGB triples */
function lerpColor(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
) {
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(
    a[1] + (b[1] - a[1]) * t,
  )},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
}

/** Red → Yellow → Green text colour (0-100) */
function heatColor(pct: number): string {
  const p = Math.max(0, Math.min(100, pct));
  return p <= 50
    ? lerpColor([220, 38, 38], [180, 140, 8], p / 50)
    : lerpColor([180, 140, 8], [22, 163, 74], (p - 50) / 50);
}

/** Softer background tint for heatmap cells */
function heatBg(pct: number): string {
  const p = Math.max(0, Math.min(100, pct));
  return p <= 50
    ? lerpColor([254, 226, 226], [254, 249, 195], p / 50)
    : lerpColor([254, 249, 195], [220, 252, 231], (p - 50) / 50);
}

function statusBadge(exam: Record<string, unknown>) {
  if (exam?.reviewed === true) {
    return (
      <Badge className="text-xs inline-flex items-center bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-400">
        <UserCheck className="h-3 w-3 mr-1" /> Human Reviewed
      </Badge>
    );
  }
  return (
    <Badge className="text-xs inline-flex items-center bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-400">
      <Bot className="h-3 w-3 mr-1" /> AI Graded
    </Badge>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Per-question stats */
function questionStats(submissions: any[]) {
  const qs = new Map<number, { obtained: number[]; max: number }>();
  for (const sub of submissions) {
    for (const r of sub.grade_json?.results || []) {
      const qn: number = r.q_num ?? r.question_number ?? 0;
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

/** Score distribution with gradient classes */
function scoreDistribution(percentages: number[]) {
  const buckets = [
    { range: "0–20%", min: 0, max: 20, count: 0, gradient: "from-red-400 to-red-500" },
    { range: "21–40%", min: 20, max: 40, count: 0, gradient: "from-orange-400 to-orange-500" },
    { range: "41–60%", min: 40, max: 60, count: 0, gradient: "from-yellow-400 to-amber-500" },
    { range: "61–80%", min: 60, max: 80, count: 0, gradient: "from-lime-400 to-green-500" },
    { range: "81–100%", min: 80, max: 101, count: 0, gradient: "from-emerald-400 to-emerald-600" },
  ];
  for (const pct of percentages) {
    for (const b of buckets) {
      if (pct >= b.min && pct < b.max) {
        b.count++;
        break;
      }
    }
  }
  return buckets;
}

/** Build heatmap: rows = students sorted by total %, cols = questions */
function buildHeatmap(
  graded: any[],
  maxMarks: number,
  roster?: any[],
) {
  const allQNums = new Set<number>();
  for (const sub of graded) {
    for (const r of sub.grade_json?.results || []) {
      allQNums.add(r.q_num ?? r.question_number ?? 0);
    }
  }
  const qNums = Array.from(allQNums).filter(Boolean).sort((a, b) => a - b);

  // Name resolution from roster
  const rollMap = new Map<string, string>();
  const nameMap = new Map<string, string>();
  if (roster) {
    for (const s of roster) {
      if (s.rollNo) rollMap.set(s.rollNo.trim().toLowerCase(), s.name);
      if (s.name) nameMap.set(s.name.trim().toLowerCase(), s.name);
    }
  }

  const rows = graded.map((sub: any) => {
    const rollKey = (sub.roll_number ?? "").trim().toLowerCase();
    const nameKey = (sub.student_name ?? "").trim().toLowerCase();
    const name =
      (rollKey && rollMap.get(rollKey)) ||
      (nameKey && nameMap.get(nameKey)) ||
      sub.student_name ||
      "Unknown";

    const qMarks = new Map<number, { obtained: number; max: number }>();
    for (const r of sub.grade_json?.results || []) {
      const qn: number = r.q_num ?? r.question_number ?? 0;
      if (qn)
        qMarks.set(qn, {
          obtained: r.marks_obtained ?? 0,
          max: r.max_marks ?? 0,
        });
    }

    const pct =
      sub.percentage ??
      (maxMarks > 0 ? percent(sub.total_score ?? 0, maxMarks) : 0);

    return {
      name,
      rollNo: sub.roll_number || "-",
      totalPct: pct,
      score: sub.total_score ?? 0,
      cells: qNums.map((qn) => {
        const m = qMarks.get(qn);
        if (!m) return { obtained: 0, max: 0, pct: 0 };
        return {
          obtained: m.obtained,
          max: m.max,
          pct: m.max > 0 ? percent(m.obtained, m.max) : 0,
        };
      }),
    };
  });

  rows.sort((a, b) => b.totalPct - a.totalPct);
  return { qNums, rows };
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Page component
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export default function ExamPerformanceDetailPage() {
  const params = useParams();
  const classroomId = params?.classroomId as string | undefined;
  const examId = params?.examId as string | undefined;
  const router = useRouter();

  /* ── Queries ──────────────────────────────────────────────────────────── */

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

  /* ── Derived data ─────────────────────────────────────────────────────── */

  const graded = useMemo(
    () =>
      submissions.filter(
        (s: Submission) =>
          s.grade_status === "graded" || s.grade_status === "completed",
      ),
    [submissions],
  );

  const maxMarks = useMemo(
    () => (exam as any)?.max_marks ?? (exam as any)?.total_marks ?? 0,
    [exam],
  );

  const studentPcts = useMemo(
    () =>
      graded.map(
        (s: any) =>
          s.percentage ?? (maxMarks > 0 ? percent(s.total_score ?? 0, maxMarks) : 0),
      ),
    [graded, maxMarks],
  );

  const kpi = useMemo(() => {
    const avgPct = safeAvg(studentPcts);
    const highest = studentPcts.length ? Math.max(...studentPcts) : 0;
    const lowest = studentPcts.length ? Math.min(...studentPcts) : 0;
    const needsReview = countNeedsReview(submissions as any);
    return {
      totalStudents: submissions.length,
      gradedCount: graded.length,
      avgPct,
      highest,
      lowest,
      needsReview,
    };
  }, [submissions, graded, studentPcts]);

  const distribution = useMemo(
    () => scoreDistribution(studentPcts),
    [studentPcts],
  );
  const qStats = useMemo(() => questionStats(graded), [graded]);
  const heatmap = useMemo(
    () => buildHeatmap(graded, maxMarks, roster),
    [graded, maxMarks, roster],
  );

  /* ── Guard ─────────────────────────────────────────────────────── */

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

  /* ── Render ────────────────────────────────────────────────────── */

  return (
    <AppShell pageTitle="Exam Performance">
      <div className="container mx-auto max-w-6xl px-4 py-8 space-y-8">
        {/* Header */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-3 -ml-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            onClick={() =>
              router.push(
                `/dashboard/classrooms/${classroomId}/performance`,
              )
            }
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Performance
          </Button>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                {(exam as any)?.title || "Exam"} — Performance
              </h2>
              <p className="text-sm text-zinc-500 mt-1">
                Detailed analytics for this exam.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {exam && statusBadge(exam as any)}
              <Button
                size="sm"
                className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                onClick={() =>
                  router.push(`/dashboard/results/${examId}`)
                }
              >
                <Eye className="h-4 w-4 mr-1" /> View Results
              </Button>
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-zinc-400" />
          </div>
        )}

        {!loading && (
          <>
            {/* ── KPI Cards ──────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <GradientKpiCard
                icon={<Users className="h-5 w-5" />}
                label="Students Graded"
                value={`${kpi.gradedCount}/${kpi.totalStudents}`}
                gradient="from-blue-500 to-indigo-600"
              />
              <GradientKpiCard
                icon={<TrendingUp className="h-5 w-5" />}
                label="Class Average"
                value={
                  kpi.avgPct > 0 ? `${kpi.avgPct.toFixed(1)}%` : "-"
                }
                gradient="from-emerald-500 to-teal-600"
              />
              <GradientKpiCard
                icon={<Trophy className="h-5 w-5" />}
                label="Highest / Lowest"
                value={
                  kpi.gradedCount > 0
                    ? `${kpi.highest.toFixed(0)}% / ${kpi.lowest.toFixed(0)}%`
                    : "-"
                }
                gradient="from-violet-500 to-purple-600"
              />
              <GradientKpiCard
                icon={<AlertTriangle className="h-5 w-5" />}
                label="Needs Review"
                value={kpi.needsReview}
                gradient="from-amber-500 to-orange-600"
              />
            </div>

            {/* ── Score Distribution ─────────────────────────────── */}
            <Card className="border-0 shadow-md bg-white dark:bg-zinc-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-indigo-500" /> Score
                  Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {kpi.gradedCount === 0 ? (
                  <p className="text-sm text-zinc-400 py-4">
                    No graded submissions yet.
                  </p>
                ) : (
                  <div
                    className="flex items-end gap-3 sm:gap-5 pt-4"
                    style={{ minHeight: 200 }}
                  >
                    {distribution.map((bucket) => {
                      const maxCount = Math.max(
                        ...distribution.map((b) => b.count),
                        1,
                      );
                      const heightPct = (bucket.count / maxCount) * 100;
                      return (
                        <div
                          key={bucket.range}
                          className="flex-1 flex flex-col items-center gap-2"
                        >
                          <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">
                            {bucket.count}
                          </span>
                          <div
                            className="w-full relative"
                            style={{ height: 140 }}
                          >
                            <div
                              className={`absolute bottom-0 w-full rounded-t-xl bg-gradient-to-t ${bucket.gradient} shadow-sm transition-all duration-500`}
                              style={{
                                height: `${Math.max(heightPct, 8)}%`,
                              }}
                            />
                          </div>
                          <span className="text-[11px] font-medium text-zinc-500 whitespace-nowrap">
                            {bucket.range}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Student × Question Heatmap ─────────────────────── */}
            {heatmap.qNums.length > 0 && heatmap.rows.length > 0 && (
              <Card className="border-0 shadow-md bg-white dark:bg-zinc-900">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-violet-500" /> Student
                    × Question Heatmap
                  </CardTitle>
                  <p className="text-xs text-zinc-500">
                    Each cell shows marks obtained. Colour:&nbsp;
                    <span className="text-red-500 font-semibold">red</span>{" "}
                    = low →{" "}
                    <span className="text-yellow-500 font-semibold">
                      yellow
                    </span>{" "}
                    = mid →{" "}
                    <span className="text-green-600 font-semibold">
                      green
                    </span>{" "}
                    = high.
                  </p>
                </CardHeader>
                <CardContent className="overflow-x-auto pb-4">
                  <table className="text-sm w-full min-w-[600px]">
                    <thead>
                      <tr>
                        <th className="py-2 pr-3 text-left text-zinc-500 font-medium text-xs sticky left-0 bg-white dark:bg-zinc-900 z-10">
                          Student
                        </th>
                        {heatmap.qNums.map((qn) => (
                          <th
                            key={qn}
                            className="py-2 px-1.5 text-center text-zinc-500 font-medium text-xs min-w-[56px]"
                          >
                            Q{qn}
                          </th>
                        ))}
                        <th className="py-2 pl-3 text-right text-zinc-500 font-semibold text-xs">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {heatmap.rows.map((row, ri) => (
                        <tr
                          key={ri}
                          className="border-t border-zinc-100 dark:border-zinc-800"
                        >
                          {/* Student name (sticky col) */}
                          <td className="py-2.5 pr-3 sticky left-0 bg-white dark:bg-zinc-900 z-10">
                            <div className="flex items-center gap-2">
                              {ri < 3 ? (
                                <span
                                  className={`flex-shrink-0 text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${
                                    ri === 0
                                      ? "bg-gradient-to-br from-yellow-400 to-amber-500"
                                      : ri === 1
                                        ? "bg-gradient-to-br from-zinc-300 to-zinc-400"
                                        : "bg-gradient-to-br from-amber-600 to-amber-700"
                                  }`}
                                >
                                  {ri + 1}
                                </span>
                              ) : (
                                <span className="flex-shrink-0 text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-800">
                                  {ri + 1}
                                </span>
                              )}
                              <span className="font-medium text-zinc-900 dark:text-zinc-100 text-xs truncate max-w-[120px]">
                                {row.name}
                              </span>
                            </div>
                          </td>

                          {/* Per-question cells */}
                          {row.cells.map((cell, ci) => (
                            <td key={ci} className="py-1.5 px-1">
                              <div
                                className="rounded-lg text-center text-xs font-semibold py-2 transition-colors"
                                style={{
                                  backgroundColor:
                                    cell.max > 0
                                      ? heatBg(cell.pct)
                                      : "#f4f4f5",
                                  color:
                                    cell.max > 0
                                      ? heatColor(cell.pct)
                                      : "#a1a1aa",
                                }}
                              >
                                {cell.max > 0
                                  ? `${cell.obtained}/${cell.max}`
                                  : "-"}
                              </div>
                            </td>
                          ))}

                          {/* Total % */}
                          <td className="py-2 pl-3 text-right">
                            <span
                              className="inline-block text-xs font-bold px-2.5 py-1 rounded-full"
                              style={{
                                backgroundColor: heatBg(row.totalPct),
                                color: heatColor(row.totalPct),
                              }}
                            >
                              {row.totalPct.toFixed(0)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            {/* ── Question Performance Bars ──────────────────────── */}
            {qStats.length > 0 && (
              <Card className="border-0 shadow-md bg-white dark:bg-zinc-900">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-teal-500" /> Question
                    Performance
                  </CardTitle>
                  <p className="text-xs text-zinc-500">
                    Class average per question.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3 pt-2">
                  {qStats.map((q) => {
                    const difficulty =
                      q.avgPct >= 75
                        ? {
                            label: "Easy",
                            color: "text-emerald-600",
                            bg: "bg-emerald-50 dark:bg-emerald-900/20",
                          }
                        : q.avgPct >= 45
                          ? {
                              label: "Medium",
                              color: "text-amber-600",
                              bg: "bg-amber-50 dark:bg-amber-900/20",
                            }
                          : {
                              label: "Hard",
                              color: "text-red-500",
                              bg: "bg-red-50 dark:bg-red-900/20",
                            };

                    const barGradient =
                      q.avgPct >= 75
                        ? "from-emerald-400 to-green-500"
                        : q.avgPct >= 45
                          ? "from-amber-400 to-yellow-500"
                          : "from-red-400 to-rose-500";

                    return (
                      <div
                        key={q.qNum}
                        className="flex items-center gap-3"
                      >
                        <span className="w-10 text-sm font-semibold text-zinc-700 dark:text-zinc-300 shrink-0">
                          Q{q.qNum}
                        </span>
                        <div className="flex-1 relative h-8 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${barGradient} transition-all duration-700`}
                            style={{
                              width: `${Math.max(q.avgPct, 3)}%`,
                            }}
                          />
                          <span className="absolute inset-0 flex items-center pl-3 text-xs font-semibold text-white mix-blend-difference">
                            {q.avgObtained.toFixed(1)} / {q.maxMarks} (
                            {q.avgPct.toFixed(0)}%)
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 py-0.5 border-0 font-semibold ${difficulty.color} ${difficulty.bg}`}
                        >
                          {difficulty.label}
                        </Badge>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* ── Student Leaderboard ────────────────────────────── */}
            <Card className="border-0 shadow-md bg-white dark:bg-zinc-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" /> Student
                  Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                {graded.length === 0 ? (
                  <p className="text-sm text-zinc-400 py-4">
                    No graded submissions yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {heatmap.rows.map((row, i) => {
                      const barColor =
                        row.totalPct >= 75
                          ? "from-emerald-400 to-green-500"
                          : row.totalPct >= 45
                            ? "from-amber-400 to-yellow-500"
                            : "from-red-400 to-rose-500";
                      const medal =
                        i === 0
                          ? "from-yellow-400 to-amber-500"
                          : i === 1
                            ? "from-zinc-300 to-zinc-400"
                            : i === 2
                              ? "from-amber-600 to-amber-700"
                              : null;

                      return (
                        <div
                          key={i}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                          {medal ? (
                            <span
                              className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br ${medal} shadow-sm`}
                            >
                              {i + 1}
                            </span>
                          ) : (
                            <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-zinc-400 bg-zinc-200 dark:bg-zinc-700">
                              {i + 1}
                            </span>
                          )}

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                              {row.name}
                            </p>
                            <p className="text-[11px] text-zinc-400 truncate">
                              {row.rollNo !== "-"
                                ? row.rollNo
                                : "No roll no."}
                            </p>
                          </div>

                          <div className="flex-1 max-w-[200px] hidden sm:block">
                            <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700`}
                                style={{
                                  width: `${Math.max(row.totalPct, 2)}%`,
                                }}
                              />
                            </div>
                          </div>

                          <span
                            className="text-sm font-bold tabular-nums shrink-0"
                            style={{ color: heatColor(row.totalPct) }}
                          >
                            {row.totalPct.toFixed(1)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Gradient KPI Card
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function GradientKpiCard({
  icon,
  label,
  value,
  gradient,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  gradient: string;
}) {
  return (
    <Card className="border-0 shadow-md overflow-hidden relative bg-white dark:bg-zinc-900">
      <div
        className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${gradient}`}
      />
      <CardContent className="flex items-center gap-3 py-5 pt-6">
        <div
          className={`rounded-lg p-2.5 bg-gradient-to-br ${gradient} text-white shadow-sm`}
        >
          {icon}
        </div>
        <div>
          <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">
            {label}
          </p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tabular-nums">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
