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
} from "lucide-react";
import { listExamsForClassroom, getSubmissionsForExam } from "@/lib/analytics/classroomPerformance";
import { safeAvg, aggregateStudentStats, countNeedsReview } from "@/lib/analytics/scoreUtils";
import { listStudents } from "@/lib/firestore/students";
import { listSubjects } from "@/lib/firestore/subjects";
import { getClassroom } from "@/lib/firestore/classrooms";
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
          <KpiCard icon={<Users className="h-5 w-5" />} label="Students" value={kpi.studentCount} />
          <KpiCard icon={<FileText className="h-5 w-5" />} label="Exams" value={kpi.examCount} />
          <KpiCard icon={<FileText className="h-5 w-5" />} label="Submissions" value={kpi.totalSubmissions} />
          <KpiCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Class Average"
            value={kpi.classAvg > 0 ? `${kpi.classAvg.toFixed(1)}%` : "-"}
          />
          <KpiCard
            icon={<AlertTriangle className="h-5 w-5" />}
            label="Needs Review"
            value={kpi.needsReview}
          />
        </div>

        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        )}

        {/* ── Exam list (primary table) ─────────────────────────────────── */}
        {!loading && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Exams</CardTitle>
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
                            {totalSubs > 0 ? `${avg.toFixed(1)}%` : "-"}
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
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Classroom Leaderboard</CardTitle>
              <p className="text-sm text-zinc-500">
                Aggregated across all exams in this classroom.
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-zinc-500">
                      <th className="py-2 pr-4">#</th>
                      <th className="py-2 pr-4">Student</th>
                      <th className="py-2 pr-4">Roll No</th>
                      <th className="py-2 pr-4 text-right">Exams</th>
                      <th className="py-2 pr-4 text-right">Avg %</th>
                      <th className="py-2 pr-4 text-right">Best %</th>
                      <th className="py-2 text-right">Worst %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((row, i) => (
                      <tr
                        key={row.studentId}
                        className="border-b last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                      >
                        <td className="py-2 pr-4 font-medium text-zinc-400">{i + 1}</td>
                        <td className="py-2 pr-4 font-medium text-zinc-900 dark:text-zinc-50">
                          {row.studentName}
                        </td>
                        <td className="py-2 pr-4 text-zinc-500">{row.rollNo || "-"}</td>
                        <td className="py-2 pr-4 text-right tabular-nums">{row.examsTaken}</td>
                        <td className="py-2 pr-4 text-right font-semibold tabular-nums">
                          {row.avgPercent.toFixed(1)}%
                        </td>
                        <td className="py-2 pr-4 text-right text-green-600 tabular-nums">
                          {row.bestPercent.toFixed(1)}%
                        </td>
                        <td className="py-2 text-right text-red-500 tabular-nums">
                          {row.worstPercent.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
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
