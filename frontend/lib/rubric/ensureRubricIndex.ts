import { NormalizedRubric } from "@/lib/rubric/rubricTypes";

export function ensureRubricIndex(rubric: NormalizedRubric | null | undefined): Map<number, number> {
  const m = new Map<number, number>();
  if (!rubric || !Array.isArray(rubric.questions)) return m;
  for (const q of rubric.questions) {
    const qNo = Number(q.qNo ?? NaN);
    const marks = Number(q.marks ?? NaN);
    if (!Number.isNaN(qNo) && !Number.isNaN(marks)) {
      m.set(qNo, marks);
    }
  }
  return m;
}

export default ensureRubricIndex;
