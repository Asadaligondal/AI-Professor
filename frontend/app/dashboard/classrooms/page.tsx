"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
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
          <Button onClick={() => router.push('/dashboard/classrooms/new')}>New Classroom</Button>
        </div>

        {(!classrooms || classrooms.length === 0) ? (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-12 text-center">
              <h3 className="text-sm text-zinc-600">No classrooms yet</h3>
              <Button className="mt-4" onClick={() => router.push('/dashboard/classrooms/new')}>Create Classroom</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {classrooms.map((c: any) => (
              <Card key={c.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push(`/dashboard/classrooms/${c.id}`)}>
                <CardHeader>
                  <CardTitle className="line-clamp-2">{c.name}</CardTitle>
                  <CardDescription>{c.subject || ""}{c.section ? ` • ${c.section}` : ""}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-zinc-600">Created: {c.created_at ? new Date(c.created_at.seconds ? c.created_at.seconds * 1000 : c.created_at).toLocaleDateString() : '—'}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
