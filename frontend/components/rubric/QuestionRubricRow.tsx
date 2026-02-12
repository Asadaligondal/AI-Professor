"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import MarkingPolicyEditor from "./MarkingPolicyEditor";

interface Policy {
  allowPartialCredit?: boolean;
  requiresFinalAnswer?: boolean;
  methodWeight?: number;
  rounding?: "none" | "0.5" | "0.25";
  policyNotes?: string;
}

interface Props {
  index: number;
  value: { marks: number; notes?: string; policy?: Policy };
  onChange: (next: { marks: number; notes?: string; policy?: Policy }) => void;
}

export default function QuestionRubricRow({ index, value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-12 gap-3 items-start">
        <div className="col-span-1 text-sm font-medium">{index + 1}</div>
        <div className="col-span-3">
          <Label className="text-xs">Marks</Label>
          <Input
            type="number"
            value={value.marks}
            onChange={(e) => onChange({ ...value, marks: Number(e.target.value || 0) })}
            className="w-full"
          />
        </div>
        <div className="col-span-8">
          <Label className="text-xs">Notes (optional)</Label>
          <Textarea
            value={value.notes || ""}
            onChange={(e) => onChange({ ...value, notes: e.target.value })}
            rows={2}
            className="w-full"
          />
        </div>
      </div>

      <details className="border rounded p-3">
        <summary className="cursor-pointer text-sm font-medium">Advanced</summary>
        <div className="mt-3">
          <MarkingPolicyEditor
            value={value.policy}
            onChange={(next) => {
              onChange({ ...value, policy: next });
              console.log("rubric policy updated", { index, policy: next });
            }}
          />
        </div>
      </details>
    </div>
  );
}
