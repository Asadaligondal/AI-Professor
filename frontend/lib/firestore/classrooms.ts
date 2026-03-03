import app from "../firebase-client";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import type { NewClassroom, Classroom } from "@/types/classroom";

const db = getFirestore(app);

export async function createClassroom(teacherId: string, data: NewClassroom) {
  const col = collection(db, "classrooms");
  const payload: any = {
    teacher_id: teacherId,
    name: data.name,
    subject: data.subject || null,
    section: data.section || null,
    description: data.description || null,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };
  const ref = await addDoc(col, payload);
  return ref.id;
}

export async function listClassrooms(teacherId: string) {
  if (!teacherId) return [];
  const col = collection(db, "classrooms");
  // Remove orderBy to avoid composite index requirement that might cause persistence issues
  const q = query(col, where("teacher_id", "==", teacherId));
  const snap = await getDocs(q);
  const items: Classroom[] = [];
  snap.forEach((d) => {
    items.push({ id: d.id, ...(d.data() as any) });
  });
  // Sort client-side by created_at desc
  return items.sort((a, b) => {
    const aTime = a.created_at?.seconds || 0;
    const bTime = b.created_at?.seconds || 0;
    return bTime - aTime;
  });
}

export async function getClassroom(classroomId: string) {
  const ref = doc(db, "classrooms", String(classroomId));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) } as Classroom;
}
