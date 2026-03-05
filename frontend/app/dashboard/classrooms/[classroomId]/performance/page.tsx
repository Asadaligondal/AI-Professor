"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Users,
  FileText,
  TrendingUp,
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  Bot,
  UserCheck,
  Trophy,
} from "lucide-react";
import { listExamsForClassroom, getSubmissionsForExam } from "@/lib/analytics/classroomPerformance";
import { safeAvg, aggregateStudentStats, countNeedsReview } from "@/lib/analytics/scoreUtils";
import { listStudents } from "@/lib/firestore/students";
import { listSubjects } from "@/lib/firestore/subjects";
import { getClassroom } from "@/lib/firestore/classrooms";
import type { Submission } from "@/types/database";

// ─── helpers ────────────────────────────────────────────────────────────────

/** Interpolate two RGB triples */
function lerpColor(a: [number, number, number], b: [number, number, number], t: number) {
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
}

/** Red → Yellow → Green text colour (0-100) */
function heatColor(pct: number): string {
  const p = Math.max(0, Math.min(100, pct));
  return p <= 50
    ? lerpColor([220, 38, 38], [180, 140, 8], p / 50)
    : lerpColor([180, 140, 8], [22, 163, 74], (p - 50) / 50);
}

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

/** Determine display status for an exam */
function examStatusTag(exam: any): { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode } {
  if (exam.reviewed === true) {
    return { label: "Human Reviewed", variant: "default", icon: <UserCheck className="h-3 w-3 mr-1" /> };
  }
  if (exam.status === "completed" || exam.status === "in_progress") {
    return { label: "AI Graded", variant: "secondary", icon: <Bot className="h-3 w-3 mr-1" /> };
  }
  return { label: "Pending", variant: "outline", icon: null };
}

// ─── page ───────────────────────────────────────────────────────────────────

export default function ClassroomPerformancePage() {
  const params = useParams();
  const classroomId = params?.classroomId as string | undefined;
  const router = useRouter();

  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
  const [examSubmissionMap, setExamSubmissionMap] = useState<Record<string, Submission[]>>({});
  const [subsLoading, setSubsLoading] = useState(false);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: classroom } = useQuery({
    queryKey: ["classroom", classroomId],
    queryFn: () => getClassroom(classroomId!),
    enabled: !!classroomId,
  });

  const { data: subjects } = useQuery({
    queryKey: ["subjects", classroomId],
    queryFn: () => listSubjects(classroomId!),
    enabled: !!classroomId,
  });

  const activeSubjectId = subjectFilter === "all" ? undefined : subjectFilter;

  const { data: exams, isLoading: examsLoading } = useQuery({
    queryKey: ["classroomExams", classroomId, activeSubjectId],
    queryFn: () => listExamsForClassroom(classroomId!, activeSubjectId),
    enabled: !!classroomId,
  });

  const { data: roster } = useQuery({
    queryKey: ["students", classroomId],
    queryFn: () => listStudents(classroomId!),
    enabled: !!classroomId,
  });

  // ── Fetch submissions for every exam in this classroom ────────────────────
  useEffect(() => {
    if (!exams || exams.length === 0) {
      setAllSubmissions([]);
      setExamSubmissionMap({});
      return;
    }

    let cancelled = false;
    setSubsLoading(true);

    (async () => {
      const map: Record<string, Submission[]> = {};
      const flat: Submission[] = [];

      await Promise.all(
        exams.map(async (exam) => {
          const subs = await getSubmissionsForExam(exam.id);
          map[exam.id] = subs;
          flat.push(...subs);
        }),
      );

      if (!cancelled) {
        setExamSubmissionMap(map);
        setAllSubmissions(flat);
        setSubsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [exams]);

  // ── Computed ──────────────────────────────────────────────────────────────

  const leaderboard = useMemo(() => {
    if (!allSubmissions.length || !roster) return [];
    return aggregateStudentStats(allSubmissions as any, roster);
  }, [allSubmissions, roster]);

  const kpi = useMemo(() => {
    const studentCount = roster?.length ?? 0;
    const examCount = exams?.length ?? 0;
    const totalSubmissions = allSubmissions.length;
    const graded = allSubmissions.filter(
      (s) => s.grade_status === "graded" || s.grade_status === "completed",
    );
    const classAvg = safeAvg(graded.map((s) => s.percentage ?? 0));
    const needsReview = countNeedsReview(allSubmissions as any);
    return { studentCount, examCount, totalSubmissions, classAvg, needsReview };
  }, [roster, exams, allSubmissions]);

  const examRows = useMemo(() => {
    if (!exams) return [];
    return exams.map((exam) => {
      const subs = examSubmissionMap[exam.id] ?? [];
      const graded = subs.filter(
        (s) => s.grade_status === "graded" || s.grade_status === "completed",
      );
      const avg = safeAvg(graded.map((s) => s.percentage ?? 0));
      const needsReview = countNeedsReview(subs as any);
      const tag = examStatusTag(exam);
      return { exam, avg, needsReview, totalSubs: subs.length, gradedCount: graded.length, tag };
    });
  }, [exams, examSubmissionMap]);

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!classroomId) {
    return (
      <AppShell pageTitle="Performance">
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-zinc-500">Invalid classroom.</p>
        </div>
      </AppShell>
    );
  }

  const loading = examsLoading || subsLoading;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AppShell pageTitle="Performance">
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Back + Header */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2 text-zinc-500 hover:text-zinc-900"
            onClick={() => router.push(`/dashboard/classrooms/${classroomId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Classroom
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {classroom?.name ?? "Classroom"} — Performance
              </h2>
              <p className="text-sm text-zinc-500 mt-0.5">
                Overview of all exams and student performance in this classroom.
              </p>
            </div>
          </div>
        </div>

        {/* Subject filter */}
        {subjects && subjects.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Filter by subject:
            </span>
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="All subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subjects</SelectItem>
                {subjects.map((s: any) => (
                  <SelectItem key={s.id} value={s.id!}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <GradientKpiCard icon={<Users className="h-5 w-5" />} label="Students" value={kpi.studentCount} gradient="from-blue-500 to-indigo-600" />
          <GradientKpiCard icon={<FileText className="h-5 w-5" />} label="Exams" value={kpi.examCount} gradient="from-violet-500 to-purple-600" />
          <GradientKpiCard icon={<FileText className="h-5 w-5" />} label="Submissions" value={kpi.totalSubmissions} gradient="from-cyan-500 to-blue-600" />
          <GradientKpiCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Class Average"
            value={kpi.classAvg > 0 ? `${kpi.classAvg.toFixed(1)}%` : "-"}
            gradient="from-emerald-500 to-teal-600"
          />
          <GradientKpiCard
            icon={<AlertTriangle className="h-5 w-5" />}
            label="Needs Review"
            value={kpi.needsReview}
            gradient="from-amber-500 to-orange-600"
          />
        </div>

        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        )}

        {/* ── Exam list (primary table) ─────────────────────────────────── */}
        {!loading && (
          <Card className="border-0 shadow-md bg-white dark:bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Exams</CardTitle>
              <p className="text-sm text-zinc-500">
                Click an exam to see detailed performance analytics.
              </p>
            </CardHeader>
            <CardContent>
              {examRows.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  No graded exams found for this classroom. Create and grade an exam first.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-zinc-500">
                        <th className="py-2 pr-4">Exam Title</th>
                        <th className="py-2 pr-4">Date</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4 text-right">Students</th>
                        <th className="py-2 pr-4 text-right">Avg %</th>
                        <th className="py-2 pr-4 text-right">Review</th>
                        <th className="py-2 text-right"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {examRows.map(({ exam, avg, needsReview, totalSubs, gradedCount, tag }) => (
                        <tr
                          key={exam.id}
                          className="border-b last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors"
                          onClick={() =>
                            router.push(
                              `/dashboard/classrooms/${classroomId}/performance/${exam.id}`,
                            )
                          }
                        >
                          <td className="py-3 pr-4 font-medium text-zinc-900 dark:text-zinc-50">
                            {exam.title || "Untitled"}
                          </td>
                          <td className="py-3 pr-4 text-zinc-500">
                            {fmtDate(exam.created_at ?? exam.createdAt)}
                          </td>
                          <td className="py-3 pr-4">
                            <Badge variant={tag.variant} className="text-xs inline-flex items-center">
                              {tag.icon}
                              {tag.label}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4 text-right tabular-nums">
                            {gradedCount}/{totalSubs}
                          </td>
                          <td className="py-3 pr-4 text-right font-semibold tabular-nums">
                            {totalSubs > 0 ? (
                              <span style={{ color: heatColor(avg) }}>{avg.toFixed(1)}%</span>
                            ) : "-"}
                          </td>
                          <td className="py-3 pr-4 text-right">
                            {needsReview > 0 ? (
                              <Badge variant="destructive" className="text-xs">
                                {needsReview}
                              </Badge>
                            ) : (
                              <span className="text-zinc-400">0</span>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            <ChevronRight className="h-4 w-4 text-zinc-400 inline" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Classroom Leaderboard ────────────────────────────────────── */}
        {!loading && leaderboard.length > 0 && (
          <Card className="border-0 shadow-md bg-white dark:bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" /> Classroom Leaderboard
              </CardTitle>
              <p className="text-sm text-zinc-500">
                Aggregated across all exams in this classroom.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {leaderboard.map((row, i) => {
                  const barColor =
                    row.avgPercent >= 75
                      ? "from-emerald-400 to-green-500"
                      : row.avgPercent >= 45
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
                      key={row.studentId}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      {medal ? (
                        <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br ${medal} shadow-sm`}>
                          {i + 1}
                        </span>
                      ) : (
                        <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-zinc-400 bg-zinc-200 dark:bg-zinc-700">
                          {i + 1}
                        </span>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {row.studentName}
                        </p>
                        <p className="text-[11px] text-zinc-400 truncate">
                          {row.rollNo || "No roll no."} · {row.examsTaken} exam{row.examsTaken !== 1 ? "s" : ""}
                        </p>
                      </div>

                      <div className="flex-1 max-w-[200px] hidden sm:block">
                        <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700`}
                            style={{ width: `${Math.max(row.avgPercent, 2)}%` }}
                          />
                        </div>
                      </div>

                      <div className="text-right shrink-0 tabular-nums">
                        <span className="text-sm font-bold" style={{ color: heatColor(row.avgPercent) }}>
                          {row.avgPercent.toFixed(1)}%
                        </span>
                        <p className="text-[10px] text-zinc-400">
                          <span className="text-green-600">{row.bestPercent.toFixed(0)}%</span>
                          {" / "}
                          <span className="text-red-500">{row.worstPercent.toFixed(0)}%</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

// ─── Gradient KPI card sub-component ────────────────────────────────────────

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
      <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${gradient}`} />
      <CardContent className="flex items-center gap-3 py-5 pt-6">
        <div className={`rounded-lg p-2.5 bg-gradient-to-br ${gradient} text-white shadow-sm`}>
          {icon}
        </div>
        <div>
          <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
