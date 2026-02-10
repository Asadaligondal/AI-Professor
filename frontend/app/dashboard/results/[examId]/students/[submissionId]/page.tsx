"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AppShell } from "@/components/layout/AppShell";
import StudentGradingReport from "@/components/results/StudentGradingReport";
import StudentPaperSideBySide from "@/components/results/StudentPaperSideBySide";
import { useQuery } from "@tanstack/react-query";
import { examService } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function StudentDetailPage() {
  const params = useParams();
  const examId = params?.examId as string;
  const submissionId = params?.submissionId as string;
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get("tab") || "report";

  useEffect(() => {
    console.log("Student Detail Tabs v1 mounted");
  }, []);

  useEffect(() => {
    console.log("Active tab:", tab);
  }, [tab]);

  const { data: exam } = useQuery({ queryKey: ["exam", examId], queryFn: () => examService.getExam(examId) });
  const { data: subs } = useQuery({ queryKey: ["submissions", examId], queryFn: () => examService.getExamSubmissions(examId), enabled: !!examId });
  const submission = (subs || []).find((s: any) => String(s.id) === String(submissionId));
  const studentName = submission?.student_name || "Student";

  // Back handler: go back to exam results hub
  const goBack = () => {
    if (examId) router.push(`/dashboard/results/${examId}`);
    else router.push('/dashboard/results');
  };

  return (
    <AppShell pageTitle={exam?.title || "Student Detail"}>
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="sm" onClick={goBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Results
          </Button>
        </div>

        <div className="text-sm text-zinc-600 mb-2">Results / {exam?.title || 'Exam'} / {studentName}</div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{studentName}</h1>
          <div className="flex items-center gap-2">
            <Button size="sm">Download Excel</Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue={tab} onValueChange={(v) => router.replace(`${location.pathname}?tab=${v}`)}>
        <TabsList>
          <TabsTrigger value="report">Grading Report</TabsTrigger>
          <TabsTrigger value="paper">Paper (Side-by-Side)</TabsTrigger>
        </TabsList>

        <TabsContent value="report">
          <StudentGradingReport examId={examId} submissionId={submissionId} />
        </TabsContent>
        <TabsContent value="paper">
          <StudentPaperSideBySide examId={examId} submissionId={submissionId} />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
