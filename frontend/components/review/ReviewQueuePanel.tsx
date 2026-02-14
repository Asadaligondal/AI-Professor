"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { examService } from "@/lib/api";
import { Loader2 } from "lucide-react";

interface Props {
  examId: string;
}

export default function ReviewQueuePanel({ examId }: Props) {
  const { data: submissions, isLoading } = useQuery({
    queryKey: ["submissions", examId],
    queryFn: () => examService.getExamSubmissions(examId),
    enabled: !!examId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review Queue</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-zinc-700">{(submissions || []).length} submission(s)</div>
        <div className="mt-3">
          <Button variant="outline" onClick={() => { /* noop: navigation handled by parent */ }}>
            Open First
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
