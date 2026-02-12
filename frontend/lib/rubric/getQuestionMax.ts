import { NormalizedRubric } from "@/lib/rubric/rubricTypes";

export function getQuestionMax(rubric: NormalizedRubric | null | undefined, qNo: number, fallbackMax = 1): number {
  if (!rubric || !Array.isArray(rubric.questions)) return fallbackMax;
  const q = rubric.questions.find((qq) => Number(qq.qNo) === Number(qNo));
  if (q && (q.marks !== undefined && q.marks !== null)) {
    const m = Number(q.marks);
    if (!Number.isNaN(m) && m > 0) return m;
  }
  return fallbackMax;
}

export default getQuestionMax;
