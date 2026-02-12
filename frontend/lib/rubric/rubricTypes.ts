export interface QuestionItem {
  qNo?: number;
  marks: number;
  notes?: string;
  policy?: {
    allowPartialCredit?: boolean;
    requiresFinalAnswer?: boolean;
    methodWeight?: number;
    rounding?: "none" | "0.5" | "0.25";
    policyNotes?: string;
  };
}

export interface Rubric {
  version?: number;
  numQuestions: number;
  questions: QuestionItem[];
}

export interface NormalizedRubric {
  version: number;
  totalQuestions: number;
  totalMarks: number;
  questions: { qNo: number; marks: number; notes?: string }[];
}
