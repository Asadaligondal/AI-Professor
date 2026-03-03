"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Student } from "@/types/student";
import StudentFormDialog from "./StudentFormDialog";

interface StudentsTableProps {
  students: Student[];
  onUpdateStudent: (studentId: string, data: any) => Promise<void>;
  onDeleteStudent: (studentId: string) => Promise<void>;
}

export default function StudentsTable({
  students,
  onUpdateStudent,
  onDeleteStudent
}: StudentsTableProps) {
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (student: Student) => {
    if (!student.id) return;
    
    const confirmed = confirm(`Delete student "${student.name}"?`);
    if (!confirmed) return;

    setDeleting(student.id);
    try {
      await onDeleteStudent(student.id);
      toast.success("Student deleted successfully");
    } catch (err) {
      toast.error("Failed to delete student");
      console.error(err);
    } finally {
      setDeleting(null);
    }
  };

  const handleUpdate = async (studentId: string, data: any) => {
    await onUpdateStudent(studentId, data);
  };

  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  if (students.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-zinc-500">No students added yet</p>
      </div>
    );
  }

  // Get existing roll numbers for duplicate validation
  const existingRollNumbers = students
    .filter(s => s.rollNo)
    .map(s => s.rollNo!) as string[];

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Roll No</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.id}>
                <TableCell className="font-medium">{student.name}</TableCell>
                <TableCell>{student.rollNo || "—"}</TableCell>
                <TableCell>{student.email || "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <StudentFormDialog
                      student={student}
                      onSubmit={(data) => handleUpdate(student.id!, data)}
                      existingRollNumbers={existingRollNumbers}
                    >
                      <Button size="sm" variant="ghost">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </StudentFormDialog>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(student)}
                      disabled={deleting === student.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}