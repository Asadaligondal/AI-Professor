import app from "./firebase-client";
import { getFirestore, doc, setDoc, updateDoc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";

const db = getFirestore(app);

export async function saveAnswerKeyFile(examId: string, file: { url: string; name?: string; size?: number }) {
  const ref = doc(db, "exams", String(examId));
  const payload = {
    answerKeyFile: {
      url: file.url,
      name: file.name || null,
      size: file.size || null,
      uploadedAt: new Date().toISOString(),
    },
  };
  // merge to avoid overwriting existing fields
  await setDoc(ref, payload, { merge: true });
}

export async function saveStudentPaperFile(examId: string, submissionId: string, file: { url: string; name?: string; size?: number }) {
  const ref = doc(db, "exams", String(examId), "submissions", String(submissionId));
  const payload = {
    studentPaperFile: {
      url: file.url,
      name: file.name || null,
      size: file.size || null,
      uploadedAt: new Date().toISOString(),
    },
  };
  // merge update
  await setDoc(ref, payload, { merge: true });
}

export async function getAnswerKeyFile(examId: string) {
  const ref = doc(db, "exams", String(examId));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return data?.answerKeyFile || null;
}

export async function getStudentPaperFile(examId: string, submissionId: string) {
  const ref = doc(db, "exams", String(examId), "submissions", String(submissionId));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return data?.studentPaperFile || null;
}

export async function createExam(exam: { title: string; description?: string; marksPerQuestion?: number; ownerId?: string; answerKeyFile?: any; classroomId?: string; subjectId?: string }) {
  const col = collection(db, "exams");
  const payload: any = {
    title: exam.title,
    description: exam.description || null,
    marksPerQuestion: exam.marksPerQuestion || null,
    ownerId: exam.ownerId || null,
    classroom_id: exam.classroomId || null,
    subject_id: exam.subjectId || null,
    createdAt: serverTimestamp(),
  };
  if (exam.answerKeyFile) payload.answerKeyFile = { ...exam.answerKeyFile, uploadedAt: serverTimestamp() };

  const ref = await addDoc(col, payload);
  return ref.id;
}

/**
 * Merge classroom/subject metadata into an existing exam document
 * created by the backend grading endpoint. This avoids creating
 * a duplicate exam doc and ensures the backend-created exam
 * (which has linked submissions) also carries classroom_id and subject_id.
 */
export async function updateExamClassroomLink(
  examId: string,
  meta: {
    classroomId?: string;
    subjectId?: string;
    ownerId?: string;
    description?: string;
    answerKeyFile?: any;
  },
) {
  const ref = doc(db, "exams", String(examId));
  const payload: any = {
    classroom_id: meta.classroomId || null,
    subject_id: meta.subjectId || null,
    ownerId: meta.ownerId || null,
    description: meta.description || null,
  };
  if (meta.answerKeyFile) {
    payload.answerKeyFile = {
      ...meta.answerKeyFile,
      uploadedAt: new Date().toISOString(),
    };
  }
  await setDoc(ref, payload, { merge: true });
}

export async function createSubmission(examId: string, submission: { studentPaperFile: any; status?: string }) {
  const col = collection(db, "exams", String(examId), "submissions");
  const payload: any = {
    studentPaperFile: { ...submission.studentPaperFile, uploadedAt: serverTimestamp() },
    status: submission.status || "uploaded",
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(col, payload);
  return ref.id;
}
