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

export async function createExam(exam: { title: string; description?: string; marksPerQuestion?: number; ownerId?: string; answerKeyFile?: any }) {
  const col = collection(db, "exams");
  const payload: any = {
    title: exam.title,
    description: exam.description || null,
    marksPerQuestion: exam.marksPerQuestion || null,
    ownerId: exam.ownerId || null,
    createdAt: serverTimestamp(),
  };
  if (exam.answerKeyFile) payload.answerKeyFile = { ...exam.answerKeyFile, uploadedAt: serverTimestamp() };

  const ref = await addDoc(col, payload);
  return ref.id;
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
