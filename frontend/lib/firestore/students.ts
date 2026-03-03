import app from "../firebase-client";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import type { NewStudent, Student, StudentUpdate } from "@/types/student";

const db = getFirestore(app);

export async function createStudent(classroomId: string, data: NewStudent) {
  const col = collection(db, "classrooms", String(classroomId), "students");
  const payload: any = {
    name: data.name,
    rollNo: data.rollNo || null,
    email: data.email || null,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };
  const ref = await addDoc(col, payload);
  return ref.id;
}

export async function listStudents(classroomId: string) {
  if (!classroomId) return [];
  const col = collection(db, "classrooms", String(classroomId), "students");
  const q = query(col, orderBy("created_at", "desc"));
  const snap = await getDocs(q);
  const items: Student[] = [];
  snap.forEach((d) => {
    items.push({ id: d.id, ...(d.data() as any) });
  });
  return items;
}

export async function updateStudent(classroomId: string, studentId: string, patch: StudentUpdate) {
  const ref = doc(db, "classrooms", String(classroomId), "students", String(studentId));
  const payload: any = {
    ...patch,
    updated_at: serverTimestamp(),
  };
  await updateDoc(ref, payload);
}

export async function deleteStudent(classroomId: string, studentId: string) {
  const ref = doc(db, "classrooms", String(classroomId), "students", String(studentId));
  await deleteDoc(ref);
}

export async function getStudent(classroomId: string, studentId: string) {
  const ref = doc(db, "classrooms", String(classroomId), "students", String(studentId));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) } as Student;
}