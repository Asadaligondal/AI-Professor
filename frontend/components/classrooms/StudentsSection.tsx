"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { listStudents, createStudent, updateStudent, deleteStudent } from "@/lib/firestore/students";
import type { NewStudent } from "@/types/student";
import StudentFormDialog from "./StudentFormDialog";
import StudentsTable from "./StudentsTable";

interface StudentsSectionProps {
  classroomId: string;
}

export default function StudentsSection({ classroomId }: StudentsSectionProps) {
  const {
    data: students,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ["students", classroomId],
    queryFn: () => listStudents(classroomId),
    enabled: !!classroomId,
  });

  console.log("Loaded students", (students || []).length);

  const handleCreateStudent = async (data: NewStudent) => {
    try {
      const studentId = await createStudent(classroomId, data);
      console.log("Created student", studentId);
      toast.success("Student added successfully");
      refetch();
    } catch (err) {
      toast.error("Failed to add student");
      console.error(err);
      throw err;
    }
  };

  const handleUpdateStudent = async (studentId: string, data: NewStudent) => {
    try {
      await updateStudent(classroomId, studentId, data);
      toast.success("Student updated successfully");
      refetch();
    } catch (err) {
      toast.error("Failed to update student");
      console.error(err);
      throw err;
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    try {
      await deleteStudent(classroomId, studentId);
      refetch();
    } catch (err) {
      throw err;
    }
  };

  // Get existing roll numbers for duplicate validation
  const existingRollNumbers = (students || [])
    .filter(s => s.rollNo)
    .map(s => s.rollNo!) as string[];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <div>
              <CardTitle>Students</CardTitle>
              <CardDescription>Manage classroom roster</CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs">Roster v1</Badge>
          </div>
          <StudentFormDialog
            onSubmit={handleCreateStudent}
            existingRollNumbers={existingRollNumbers}
          >
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Student
            </Button>
          </StudentFormDialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
          </div>
        ) : (
          <StudentsTable
            students={students || []}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
          />
        )}
      </CardContent>
    </Card>
  );
}