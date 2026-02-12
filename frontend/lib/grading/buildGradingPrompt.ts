import { Rubric, NormalizedRubric } from "@/lib/rubric/rubricTypes";

interface BuildArgs {
  // accept either the original Rubric shape or the NormalizedRubric produced by normalizeRubric
  rubric?: Rubric | NormalizedRubric | null;
  answerKeyContext?: string; // plain text extracted from answer key or URL placeholder
  studentContext?: string; // plain text extracted from student answers
}

function formatPolicy(q: any) {
  if (!q?.policy) return "";
  const p = q.policy;
  return `Policy: allowsPartial=${p.allowPartialCredit}, requiresFinal=${p.requiresFinalAnswer}, methodWeight=${p.methodWeight}%, rounding=${p.rounding}${p.policyNotes ? `, notes=${p.policyNotes}` : ""}`;
}

export function buildGradingPrompt({ rubric, answerKeyContext, studentContext }: BuildArgs) {
  const parts: string[] = [];
  parts.push("You are an exam grader. Use the rubric and marking policy to score each question.");

  if (rubric) {
    parts.push(`Rubric Version: ${rubric.version ?? 1}`);
    const questionsArr = (rubric as any).questions || [];
    const totalQuestions = (rubric as any).totalQuestions ?? (rubric as any).numQuestions ?? questionsArr.length;
    parts.push(`Total Questions: ${totalQuestions}`);
    parts.push("Questions:");
    questionsArr.forEach((q: any, idx: number) => {
      const qNo = q.qNo ?? idx + 1;
      parts.push(`Q${qNo}: max marks ${q.marks}. Notes: ${q.notes || ""}`);
      const policyText = formatPolicy(q as any);
      if (policyText) parts.push(`  ${policyText}`);
    });
  }

  if (answerKeyContext) {
    parts.push("Answer Key Context:");
    parts.push(answerKeyContext);
  } else if (answerKeyContext === undefined) {
    parts.push("Answer Key Context: <not provided>");
  }

  if (studentContext) {
    parts.push("Student Context:");
    parts.push(studentContext);
  } else if (studentContext === undefined) {
    parts.push("Student Context: <not provided>");
  }

  parts.push("Instructions:\n- For each question, return JSON with qNo, score, max, breakdown:{method,final}, confidence (0-1), needsReview (true/false), rationale string.\n- Use the policy for weighting and rounding as specified.\n- Return ONLY a single JSON object with a top-level 'questions' array.");

  const prompt = parts.join("\n\n");
  return prompt;
}

export default buildGradingPrompt;
