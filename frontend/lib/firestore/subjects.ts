import app from "../firebase-client";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import type { NewSubject, Subject } from "@/types/subject";

const db = getFirestore(app);

export async function createSubject(classroomId: string, data: NewSubject) {
  const col = collection(db, "classrooms", String(classroomId), "subjects");
  const payload: any = {
    name: data.name,
    code: data.code || null,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };
  const ref = await addDoc(col, payload);
  return ref.id;
}

export async function listSubjects(classroomId: string) {
  if (!classroomId) return [];
  const col = collection(db, "classrooms", String(classroomId), "subjects");
  const q = query(col, orderBy("created_at", "desc"));
  const snap = await getDocs(q);
  const items: Subject[] = [];
  snap.forEach((d) => {
    items.push({ id: d.id, ...(d.data() as any) });
  });
  return items;
}