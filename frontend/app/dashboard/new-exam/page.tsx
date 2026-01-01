"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Upload, Loader2, CheckCircle2 } from "lucide-react";
import { FileUploadZone } from "@/components/file-upload-zone";
import { gradingService } from "@/lib/api";
import { toast } from "sonner";

export default function NewExamPage() {
  const router = useRouter();
  const { user } = useUser();
  const [examTitle, setExamTitle] = useState("");
  const [examDescription, setExamDescription] = useState("");
  const [marksPerQuestion, setMarksPerQuestion] = useState("1.0");
  const [professorKey, setProfessorKey] = useState<File | null>(null);
  const [studentPapers, setStudentPapers] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const gradingMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }
      return gradingService.gradeExam(formData, user.id, setUploadProgress);
    },
    onSuccess: (data) => {
      toast.success(
        `Successfully graded ${data.students_graded} student(s)!`
      );
      // Redirect to results page with exam ID
      if (data.exam_id) {
        router.push(`/dashboard/results/${data.exam_id}`);
      } else {
        router.push("/dashboard");
      }
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || "Failed to grade exam. Please try again.";
      toast.error(errorMessage);
      
      // If insufficient credits, redirect to pricing page
      if (error.response?.status === 403 && errorMessage.includes("Insufficient credits")) {
        setTimeout(() => {
          router.push("/pricing");
        }, 2000);
      }
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!examTitle.trim()) {
      toast.error("Please enter an exam title");
      return;
    }

    if (!professorKey || !studentPapers) {
      toast.error("Please upload both answer key and student papers");
      return;
    }

    if (!user) {
      toast.error("User not authenticated");
      return;
    }

    const formData = new FormData();
    formData.append("professor_key", professorKey);
    formData.append("student_papers", studentPapers);
    formData.append("exam_title", examTitle);
    formData.append("marks_per_question", marksPerQuestion);

    gradingMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard")}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Create New Exam
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Upload answer key and student papers for AI grading
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
          {/* Exam Information */}
          <Card>
            <CardHeader>
              <CardTitle>Exam Information</CardTitle>
              <CardDescription>
                Basic details about the exam
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Exam Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Mathematics Midterm - Fall 2025"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Add any notes or context about this exam..."
                  value={examDescription}
                  onChange={(e) => setExamDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="marks">Marks per Question *</Label>
                <Input
                  id="marks"
                  type="number"
                  step="0.5"
                  min="0.5"
                  placeholder="1.0"
                  value={marksPerQuestion}
                  onChange={(e) => setMarksPerQuestion(e.target.value)}
                  required
                />
                <p className="text-xs text-zinc-500">
                  Default marks allocated for each question
                </p>
              </div>
            </CardContent>
          </Card>

          {/* File Uploads */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Documents</CardTitle>
              <CardDescription>
                Upload PDF files for grading (maximum 50MB each)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Professor's Answer Key */}
              <div className="space-y-2">
                <Label>Professor's Answer Key *</Label>
                <FileUploadZone
                  file={professorKey}
                  onFileSelect={setProfessorKey}
                  accept=".pdf"
                  label="Upload Professor's Answer Key"
                  description="Clear PDF of the answer key with solutions"
                />
              </div>

              {/* Student Papers */}
              <div className="space-y-2">
                <Label>Student Exam Papers *</Label>
                <FileUploadZone
                  file={studentPapers}
                  onFileSelect={setStudentPapers}
                  accept=".pdf"
                  label="Upload Student Papers"
                  description="PDF can contain multiple students (batch grading supported)"
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Card>
            <CardContent className="pt-6">
              {gradingMutation.isPending && (
                <div className="mb-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {uploadProgress < 100
                        ? "Uploading files..."
                        : "AI is analyzing handwriting..."}
                    </span>
                    <span className="font-medium">
                      {uploadProgress < 100 ? `${uploadProgress}%` : "Processing"}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                    <div
                      className="h-full bg-zinc-900 transition-all duration-300 dark:bg-zinc-50"
                      style={{
                        width: uploadProgress < 100 ? `${uploadProgress}%` : "100%",
                      }}
                    />
                  </div>
                  <p className="text-xs text-zinc-500">
                    This may take 30-60 seconds for AI processing...
                  </p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={gradingMutation.isPending}
              >
                {gradingMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing with AI...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Grade Exam with AI
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </form>
      </main>
    </div>
  );
}
