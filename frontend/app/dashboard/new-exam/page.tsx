"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Upload, Loader2, CheckCircle2, FileText, X, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { saveAnswerKeyFile, saveStudentPaperFile } from "@/lib/firestore-client";
import { gradingService, examService } from "@/lib/api";
import { useUploadThing } from "@/lib/uploadthing";

export default function NewExamPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [examTitle, setExamTitle] = useState("");
  const [examDescription, setExamDescription] = useState("");
  const [marksPerQuestion, setMarksPerQuestion] = useState("1.0");
  const [professorKey, setProfessorKey] = useState<File | null>(null);
  const [answerKeyUpload, setAnswerKeyUpload] = useState<{ url: string; name: string; size: number; key?: string } | null>(null);
  const [studentUploads, setStudentUploads] = useState<{ url: string; name: string; size: number; key?: string }[]>([]);
  const [studentFiles, setStudentFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  // UploadThing programmatic uploaders
  const { startUpload: startAnswerKeyUpload, isUploading: isUploadingAnswerKey } = useUploadThing("answerKey", {
    onClientUploadComplete: (res) => {
      if (res?.[0]) {
        const f = res[0];
        const meta = { url: f.ufsUrl || f.url, name: f.name, size: f.size, key: f.key };
        setAnswerKeyUpload(meta);
        toast.success(`Uploaded: ${meta.name}`);
        console.log("[UploadThing] answer key uploaded:", meta);
      }
      setUploading(false);
    },
    onUploadError: (err) => {
      toast.error(`Answer key upload failed: ${err.message}`);
      console.error("[UploadThing] answer key upload error:", err);
      setUploading(false);
    },
  });

  const { startUpload: startStudentUpload, isUploading: isUploadingStudent } = useUploadThing("studentPaper", {
    onClientUploadComplete: (res) => {
      if (res) {
        const newUploads = res.map((f) => ({
          url: f.ufsUrl || f.url,
          name: f.name,
          size: f.size,
          key: f.key,
        }));
        setStudentUploads((prev) => [...prev, ...newUploads]);
        toast.success(`Uploaded ${newUploads.length} student paper(s)`);
        console.log("[UploadThing] student papers uploaded:", newUploads);
      }
      setUploading(false);
    },
    onUploadError: (err) => {
      toast.error(`Student paper upload failed: ${err.message}`);
      console.error("[UploadThing] student paper upload error:", err);
      setUploading(false);
    },
  });

  const gradingMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      if (!user?.uid) {
        throw new Error("User not authenticated");
      }
      return gradingService.gradeExam(formData, user.uid, setUploadProgress);
    },
    onSuccess: async (data) => {
      toast.success(
        `Successfully graded ${data.students_graded} student(s)!`
      );
      
      console.log("Grading response:", data);
      console.log("Exam ID:", data.exam_id);
      
      // Save UploadThing URLs to Firestore
      if (data.exam_id && data.exam_id !== "NaN" && data.exam_id !== "" && answerKeyUpload) {
        try {
          await saveAnswerKeyFile(data.exam_id, answerKeyUpload);
          console.log("✅ Saved answer key URL:", answerKeyUpload.url);
          
          const submissions = await examService.getExamSubmissions(data.exam_id);
          
          for (let i = 0; i < Math.min(submissions.length, studentUploads.length); i++) {
            const submission = submissions[i];
            const studentUpload = studentUploads[i];
            if (submission?.id && studentUpload) {
              await saveStudentPaperFile(data.exam_id, submission.id.toString(), studentUpload);
              console.log("✅ Saved student paper URL:", studentUpload.url);
            }
          }
        } catch (err) {
          console.error("❌ Failed to save URLs:", err);
        }
      }
      
      if (data.exam_id && data.exam_id !== "NaN" && data.exam_id !== "") {
        console.log("Redirecting to:", `/dashboard/results/${data.exam_id}`);
        router.push(`/dashboard/results/${data.exam_id}`);
      } else {
        console.warn("No valid exam_id in response, redirecting to dashboard");
        toast.error("Grading completed but exam ID not found. Check dashboard.");
        router.push("/dashboard");
      }
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || "Failed to grade exam. Please try again.";
      toast.error(errorMessage);
      
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

    if (!answerKeyUpload) {
      toast.error("Upload professor answer key first");
      return;
    }

    if (studentUploads.length === 0) {
      toast.error("Upload at least one student paper");
      return;
    }

    if (!professorKey || studentFiles.length === 0) {
      toast.error("Please upload both answer key and at least one student paper");
      return;
    }

    if (!user) {
      toast.error("User not authenticated");
      return;
    }

    try {
      setUploading(true);
      console.log("🚀 Starting grading with UploadThing URLs:", { answerKeyUpload, studentUploads });

      // Call backend grading with original files
      const formData = new FormData();
      formData.append("professor_key", professorKey);
      studentFiles.forEach(file => {
        formData.append("student_papers", file);
      });
      formData.append("exam_title", examTitle);
      formData.append("marks_per_question", marksPerQuestion);
      if (answerKeyUpload?.url) {
        formData.append("answer_key_url", answerKeyUpload.url);
      }
      if (studentUploads.length > 0) {
        formData.append("student_papers_urls", JSON.stringify(studentUploads.map((s) => s.url)));
      }

      gradingMutation.mutate(formData);
    } catch (err) {
      console.error("Firestore error (continuing with backend grading):", err);
      // Continue with backend grading even if Firestore fails
      const formData = new FormData();
      formData.append("professor_key", professorKey);
      studentFiles.forEach(file => {
        formData.append("student_papers", file);
      });
      formData.append("exam_title", examTitle);
      formData.append("marks_per_question", marksPerQuestion);
      
      gradingMutation.mutate(formData);
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppShell pageTitle="Create New Exam">
      <Button
        variant="ghost"
        onClick={() => router.push("/dashboard")}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
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
                <Label>Professor&apos;s Answer Key *</Label>
                {answerKeyUpload ? (
                  <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                    <FileText className="h-4 w-4 text-zinc-500 shrink-0" />
                    <span className="text-sm font-medium truncate">{answerKeyUpload.name}</span>
                    <span className="text-xs text-zinc-500">({Math.round(answerKeyUpload.size / 1024)} KB)</span>
                    <a href={answerKeyUpload.url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 flex items-center gap-1 ml-auto shrink-0">
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                    <button
                      type="button"
                      className="text-sm text-rose-600 shrink-0"
                      onClick={() => {
                        setAnswerKeyUpload(null);
                        setProfessorKey(null);
                      }}
                    >
                      Replace
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept="application/pdf"
                      disabled={isUploadingAnswerKey}
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        if (f.size > 50 * 1024 * 1024) {
                          toast.error("File exceeds 50MB limit");
                          return;
                        }
                        setProfessorKey(f);
                        setUploading(true);
                        await startAnswerKeyUpload([f]);
                      }}
                    />
                    {isUploadingAnswerKey && (
                      <div className="flex items-center gap-2 text-sm text-zinc-500">
                        <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Student Papers */}
              <div className="space-y-2">
                <Label>Student Exam Papers *</Label>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="application/pdf"
                    multiple
                    disabled={isUploadingStudent}
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;
                      const valid: File[] = [];
                      for (const f of files) {
                        if (f.size > 50 * 1024 * 1024) {
                          toast.error(`${f.name} exceeds 50MB limit`);
                          continue;
                        }
                        valid.push(f);
                      }
                      if (valid.length === 0) return;
                      setStudentFiles(prev => [...prev, ...valid]);
                      setUploading(true);
                      await startStudentUpload(valid);
                    }}
                  />
                  {isUploadingStudent && (
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                      <Loader2 className="h-4 w-4 animate-spin" /> Uploading {studentFiles.length} file(s)...
                    </div>
                  )}

                  {studentUploads.length > 0 && (
                    <ul className="space-y-1">
                      {studentUploads.map((s, idx) => (
                        <li key={idx} className="flex items-center justify-between rounded-lg border p-2">
                          <div className="flex items-center gap-2 text-sm truncate">
                            <FileText className="h-4 w-4 text-zinc-500 shrink-0" />
                            <span className="truncate">{s.name}</span>
                            <span className="text-xs text-zinc-500 shrink-0">({Math.round(s.size/1024)} KB)</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <a href={s.url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 flex items-center gap-1">
                              Open <ExternalLink className="h-3 w-3" />
                            </a>
                            <button 
                              type="button" 
                              className="text-sm text-rose-600" 
                              onClick={() => {
                                setStudentUploads((arr) => arr.filter((_, i) => i !== idx));
                                setStudentFiles((arr) => arr.filter((_, i) => i !== idx));
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {studentUploads.length === 0 && !isUploadingStudent && (
                    <div className="text-sm text-zinc-500">No student papers uploaded yet</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Card>
            <CardContent className="pt-6">
              {(uploading || gradingMutation.isPending) && (
                <div className="mb-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {uploading ? "Uploading files..." : "AI is analyzing handwriting..."}
                    </span>
                    <span className="font-medium">
                      {uploading ? "Uploading" : (uploadProgress < 100 ? `${uploadProgress}%` : "Processing")}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                    <div
                      className="h-full bg-zinc-900 transition-all duration-300 dark:bg-zinc-50"
                      style={{
                        width: uploading ? "100%" : (uploadProgress < 100 ? `${uploadProgress}%` : "100%"),
                      }}
                    />
                  </div>
                  <p className="text-xs text-zinc-500">
                    {uploading ? "Uploading to cloud storage..." : "This may take 30-60 seconds for AI processing..."}
                  </p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={uploading || gradingMutation.isPending}
              >
                {(uploading || gradingMutation.isPending) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {uploading ? "Uploading..." : "Processing with AI..."}
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
    </AppShell>
  );
}
