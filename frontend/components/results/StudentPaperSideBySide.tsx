"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAnswerKeyFile, getStudentPaperFile } from "@/lib/firestore-client";

interface Props {
  examId: string;
  submissionId: string;
}

export default function StudentPaperSideBySide({ examId, submissionId }: Props) {
  const { data: answerKeyFile, isLoading: loadingAnswer } = useQuery({ queryKey: ["answerKeyFile", examId], queryFn: () => getAnswerKeyFile(examId), enabled: !!examId });
  const { data: studentFile, isLoading: loadingStudent } = useQuery({ queryKey: ["studentPaperFile", examId, submissionId], queryFn: () => getStudentPaperFile(examId, submissionId), enabled: !!examId && !!submissionId });

  useEffect(() => {
    console.log("StudentPaperSideBySide mounted");
  }, []);

  const studentPdf = studentFile?.url || null;
  const answerKey = answerKeyFile?.url || null;
  const studentName = studentFile?.name || "Student PDF";
  const answerName = answerKeyFile?.name || "Answer Key";

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-zinc-600">Compare student paper with answer key.</div>
        <div className="flex items-center gap-2">
          <Button size="sm" disabled>Zoom -</Button>
          <Button size="sm" disabled>Zoom +</Button>
          {studentPdf && (
            <a href={studentPdf} target="_blank" rel="noreferrer" className="text-sm text-blue-600">Open student in new tab</a>
          )}
          {answerKey && (
            <a href={answerKey} target="_blank" rel="noreferrer" className="text-sm text-blue-600">Open answer key in new tab</a>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
            <CardHeader>
              <CardTitle>Student Paper</CardTitle>
            </CardHeader>
            <CardContent className="h-[75vh]">
              {studentPdf ? (
                <div className="h-full">
                  <div className="text-sm text-zinc-600 mb-2">{studentName}</div>
                  <iframe src={studentPdf} className="w-full h-[calc(75vh-28px)]" title="student-paper" />
                </div>
              ) : (
                <div className="text-zinc-500">No student PDF uploaded yet</div>
              )}
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
              <CardTitle>Answer Key</CardTitle>
            </CardHeader>
            <CardContent className="h-[75vh]">
              {answerKey ? (
                <div className="h-full">
                  <div className="text-sm text-zinc-600 mb-2">{answerName}</div>
                  <iframe src={answerKey} className="w-full h-[calc(75vh-28px)]" title="answer-key" />
                </div>
              ) : (
                <div className="text-zinc-500">No answer key uploaded yet</div>
              )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
