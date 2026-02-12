import { Rubric, NormalizedRubric, QuestionItem } from "./rubricTypes";

export function computeTotalMarks(rubric: Rubric): number {
  if (!rubric || !rubric.questions) return 0;
  return rubric.questions.reduce((s, q) => s + (Number(q.marks) || 0), 0);
}

export function normalizeRubric(rubric: Rubric): NormalizedRubric {
  const questions: QuestionItem[] = Array.isArray(rubric?.questions) ? rubric.questions : [];
  const totalQuestions = Math.max(0, Math.floor(rubric?.numQuestions || questions.length));

  // Ensure sequential qNo and valid marks
  const normalizedQuestions = Array.from({ length: totalQuestions }).map((_, idx) => {
    const src = questions[idx] || { marks: 0, notes: "", policy: undefined };
    const marks = Number(src.marks) || 0;
    const policy = src.policy || {
      allowPartialCredit: true,
      requiresFinalAnswer: false,
      methodWeight: 70,
      rounding: "none",
      policyNotes: "",
    };
    return {
      qNo: idx + 1,
      marks,
      notes: src.notes || "",
      policy: {
        allowPartialCredit: !!policy.allowPartialCredit,
        requiresFinalAnswer: !!policy.requiresFinalAnswer,
        methodWeight: Number(policy.methodWeight) || 0,
        rounding: policy.rounding || "none",
        policyNotes: policy.policyNotes || "",
      },
    };
  });

  const totalMarks = normalizedQuestions.reduce((s, q) => s + q.marks, 0);

  return {
    version: 1,
    totalQuestions,
    totalMarks,
    questions: normalizedQuestions,
  };
}
