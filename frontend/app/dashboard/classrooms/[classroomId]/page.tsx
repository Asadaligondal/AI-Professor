"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, BarChart3 } from "lucide-react";
import { getClassroom } from "@/lib/firestore/classrooms";
import { listSubjects, createSubject } from "@/lib/firestore/subjects";
import StudentsSection from "@/components/classrooms/StudentsSection";

export default function ClassroomDetailPage() {
  const params = useParams();
  const classroomId = params?.classroomId as string | undefined;
  const router = useRouter();
  const { user } = useAuth();
  const [classroom, setClassroom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectCode, setNewSubjectCode] = useState("");
  const [addingSubject, setAddingSubject] = useState(false);

  const { data: subjects, isLoading: subjectsLoading, refetch: refetchSubjects } = useQuery({
    queryKey: ["subjects", classroomId],
    queryFn: () => listSubjects(classroomId!),
    enabled: !!classroomId,
  });

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim() || !classroomId) return;
    setAddingSubject(true);
    try {
      await createSubject(classroomId, {
        name: newSubjectName.trim(),
        code: newSubjectCode.trim() || undefined
      });
      setNewSubjectName("");
      setNewSubjectCode("");
      setShowAddSubject(false);
      refetchSubjects();
    } catch (err) {
      console.error(err);
    } finally {
      setAddingSubject(false);
    }
  };

  useEffect(() => {
    if (!classroomId) return;
    
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getClassroom(classroomId);
        if (mounted) setClassroom(data);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [classroomId]);

  if (!classroomId) {
    return (
      <AppShell pageTitle="Classroom">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Invalid Classroom</h2>
            <p className="text-zinc-600 dark:text-zinc-400">Classroom ID not found.</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell pageTitle={classroom?.name || 'Classroom'}>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{classroom?.name || 'Classroom'}</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{classroom?.subject || ''}{classroom?.section ? ` • ${classroom.section}` : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/classrooms/${classroomId}/performance`)}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              View Performance
            </Button>
            <Badge variant="secondary">Classroom v1</Badge>
          </div>
        </div>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-700">{classroom?.description || 'No description provided.'}</p>
            <p className="text-xs text-zinc-500 mt-2">Created: {classroom?.created_at ? new Date(classroom.created_at.seconds ? classroom.created_at.seconds * 1000 : classroom.created_at).toLocaleString() : '-'}</p>
          </CardContent>
        </Card>

        {/* Students Section - Full Width */}
        <StudentsSection classroomId={classroomId || ""} />

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Subjects</CardTitle>
                  <CardDescription>Manage subjects for this classroom</CardDescription>
                </div>
                <Button size="sm" onClick={() => setShowAddSubject(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Subject
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showAddSubject && (
                <form onSubmit={handleAddSubject} className="mb-4 p-4 border rounded-lg space-y-3">
                  <div>
                    <Label>Subject Name *</Label>
                    <Input
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      required
                      placeholder="e.g., Algebra"
                    />
                  </div>
                  <div>
                    <Label>Subject Code</Label>
                    <Input
                      value={newSubjectCode}
                      onChange={(e) => setNewSubjectCode(e.target.value)}
                      placeholder="e.g., ALG101"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={addingSubject} size="sm">
                      {addingSubject ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowAddSubject(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
              {subjectsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (!subjects || subjects.length === 0) ? (
                <p className="text-sm text-zinc-500">No subjects added yet.</p>
              ) : (
                <div className="space-y-2">
                  {subjects.map((subject: any) => (
                    <div key={subject.id} className="flex items-center justify-between p-2 bg-zinc-50 rounded">
                      <div>
                        <p className="font-medium text-sm">{subject.name}</p>
                        {subject.code && <p className="text-xs text-zinc-500">{subject.code}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Exams</CardTitle>
              <CardDescription>Coming next</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-500">Link exams to classrooms in a future iteration.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
