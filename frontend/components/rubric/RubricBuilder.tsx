"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import QuestionRubricRow from "./QuestionRubricRow";

interface QuestionItem {
  marks: number;
  notes?: string;
}

interface Rubric {
  numQuestions: number;
  questions: QuestionItem[];
}

interface Props {
  value: Rubric;
  onChange: (next: Rubric) => void;
}

export default function RubricBuilder({ value, onChange }: Props) {
  const ensureSize = (n: number, existing: QuestionItem[]) => {
    const next = existing.slice(0, n);
    while (next.length < n) next.push({ marks: 1, notes: "" });
    return next;
  };

  const handleNumChange = (v: number) => {
    const n = Math.max(0, Math.floor(v || 0));
    const questions = ensureSize(n, value?.questions || []);
    onChange({ numQuestions: n, questions });
  };

  const handleQuestionChange = (idx: number, q: QuestionItem) => {
    const questions = (value.questions || []).slice();
    questions[idx] = q;
    onChange({ numQuestions: value.numQuestions || questions.length, questions });
  };

  const totalMarks = (value.questions || []).reduce((s, q) => s + (Number(q.marks) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 items-end">
        <div>
          <Label className="text-xs">Number of Questions</Label>
          <Input
            type="number"
            value={value.numQuestions}
            onChange={(e) => handleNumChange(Number(e.target.value))}
            min={0}
          />
        </div>
        <div className="text-right">
          <div className="text-sm text-zinc-600">Total Marks</div>
          <div className="text-lg font-semibold">{totalMarks}</div>
        </div>
      </div>

      <div className="space-y-3">
        {(value.questions || []).map((q, idx) => (
          <div key={idx} className="rounded-lg border p-3">
            <QuestionRubricRow index={idx} value={q} onChange={(next) => handleQuestionChange(idx, next)} />
          </div>
        ))}
      </div>
    </div>
  );
}
