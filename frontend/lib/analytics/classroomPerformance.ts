/**
 * Firestore read helpers for classroom performance — Performance v2
 *
 * Queries "exams" collection where classroom_id matches (set by backend grading
 * endpoint + frontend merge-update). Submissions are fetched via the REST API
 * (examService) to stay consistent with the rest of the app.
 */

import app from "../firebase-client";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { examService } from "../api";

const db = getFirestore(app);

export interface FirestoreExam {
  id: string;
  title?: string;
  description?: string;
  classroom_id?: string;
  subject_id?: string;
  teacher_id?: string;
  ownerId?: string;
  /** Backend uses created_at (snake_case); frontend merge may add createdAt */
  created_at?: any;
  createdAt?: any;
  max_marks?: number;
  total_questions?: number;
  total_submissions?: number;
  /** Status set by the backend: "in_progress" | "completed" */
  status?: string;
  /** Set to true when teacher manually reviews via the Review page */
  reviewed?: boolean;
  answerKeyFile?: any;
  answer_key_data?: any;
  rubric?: any;
  [key: string]: any;
}

/**
 * List all exams whose classroom_id matches the given classroomId.
 * Optionally filter by subject_id.
 */
export async function listExamsForClassroom(
  classroomId: string,
  subjectId?: string,
): Promise<FirestoreExam[]> {
  const col = collection(db, "exams");

  const q = query(col, where("classroom_id", "==", classroomId));
  const snap = await getDocs(q);

  let exams: FirestoreExam[] = [];
  snap.forEach((d) => {
    exams.push({ id: d.id, ...(d.data() as any) });
  });

  // Optional client-side subject filter
  if (subjectId) {
    exams = exams.filter((e) => e.subject_id === subjectId);
  }

  // Sort by created_at / createdAt desc (handle both field names)
  exams.sort((a, b) => {
    const getTs = (e: FirestoreExam) => {
      const v = e.created_at ?? e.createdAt;
      if (!v) return 0;
      if (v.seconds) return v.seconds;
      if (typeof v === "string") return Date.parse(v) / 1000;
      return 0;
    };
    return getTs(b) - getTs(a);
  });

  return exams;
}

/**
 * Fetch submissions for an exam. Reuses the existing REST examService
 * so we don't duplicate Firestore read logic.
 */
export async function getSubmissionsForExam(examId: string) {
  try {
    return await examService.getExamSubmissions(examId);
  } catch (err) {
    console.warn(`Performance: could not load submissions for exam ${examId}`, err);
    return [];
  }
}
