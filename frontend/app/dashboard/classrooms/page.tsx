"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, GraduationCap, PlusCircle } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { listClassrooms } from "@/lib/firestore/classrooms";

export default function ClassroomsPage() {
  const router = useRouter();
  const { user } = useAuth();

  const { data: classrooms, isLoading } = useQuery({
    queryKey: ["classrooms", user?.uid],
    queryFn: () => listClassrooms(user!.uid),
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <AppShell pageTitle="Classrooms">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        </div>
      </AppShell>
    );
  }

  console.log("Loaded classrooms", (classrooms || []).length);

  return (
    <AppShell pageTitle="Classrooms">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Classrooms</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Manage your classroom groups</p>
          </div>
          <Button onClick={() => router.push('/dashboard/classrooms/new')} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Classroom
          </Button>
        </div>

        {(!classrooms || classrooms.length === 0) ? (
          <Card className="max-w-2xl mx-auto border-0 shadow-md bg-white dark:bg-zinc-900">
            <CardContent className="py-12 text-center">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center">
                <GraduationCap className="h-8 w-8 text-violet-500" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">No classrooms yet</h3>
              <p className="text-sm text-zinc-500 mb-4">Create your first classroom to organize students and exams</p>
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white" onClick={() => router.push('/dashboard/classrooms/new')}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Classroom
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {classrooms.map((c: any) => (
              <Card key={c.id} className="border-0 shadow-md bg-white dark:bg-zinc-900 hover:shadow-lg transition-all cursor-pointer group" onClick={() => router.push(`/dashboard/classrooms/${c.id}`)}>
                <CardHeader>
                  <CardTitle className="line-clamp-2 text-zinc-900 dark:text-zinc-50">{c.name}</CardTitle>
                  <CardDescription>{c.subject || ""}{c.section ? ` • ${c.section}` : ""}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-zinc-500">Created: {c.created_at ? new Date(c.created_at.seconds ? c.created_at.seconds * 1000 : c.created_at).toLocaleDateString() : '—'}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
