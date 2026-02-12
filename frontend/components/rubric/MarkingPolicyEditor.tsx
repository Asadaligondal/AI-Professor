"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Policy {
  allowPartialCredit?: boolean;
  requiresFinalAnswer?: boolean;
  methodWeight?: number;
  rounding?: "none" | "0.5" | "0.25";
  policyNotes?: string;
}

interface Props {
  value?: Policy;
  onChange: (next: Policy) => void;
}

export default function MarkingPolicyEditor({ value, onChange }: Props) {
  const v = value || {};

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!v.requiresFinalAnswer}
            onChange={(e) => onChange({ ...v, requiresFinalAnswer: e.target.checked })}
          />
          <span className="text-sm">Final answer required?</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!v.allowPartialCredit}
            onChange={(e) => onChange({ ...v, allowPartialCredit: e.target.checked })}
          />
          <span className="text-sm">Allow partial credit?</span>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4 items-end">
        <div>
          <Label className="text-xs">Method Weight (%)</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={100}
              value={v.methodWeight ?? 70}
              onChange={(e) => {
                const m = Math.min(100, Math.max(0, Number(e.target.value || 0)));
                onChange({ ...v, methodWeight: m });
              }}
            />
            <div className="text-sm text-zinc-500">Final: {100 - (v.methodWeight ?? 70)}%</div>
          </div>
        </div>

        <div>
          <Label className="text-xs">Rounding</Label>
          <select
            className="w-full p-2 border rounded"
            value={v.rounding ?? "none"}
            onChange={(e) => onChange({ ...v, rounding: e.target.value as any })}
          >
            <option value="none">None</option>
            <option value="0.5">Nearest 0.5</option>
            <option value="0.25">Nearest 0.25</option>
          </select>
        </div>
      </div>

      <div>
        <Label className="text-xs">Policy Notes (optional)</Label>
        <Textarea
          rows={3}
          value={v.policyNotes || ""}
          onChange={(e) => onChange({ ...v, policyNotes: e.target.value })}
        />
      </div>
    </div>
  );
}
