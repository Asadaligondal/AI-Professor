"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Upload, Loader2, CheckCircle2, FileText, X, ExternalLink, BookOpen, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import RubricBuilder from "@/components/rubric/RubricBuilder";
import { Badge } from "@/components/ui/badge";
import { saveAnswerKeyFile, saveStudentPaperFile, updateExamClassroomLink } from "@/lib/firestore-client";
import { gradingService, examService } from "@/lib/api";
import { useUploadThing } from "@/lib/uploadthing";
import { normalizeRubric } from "@/lib/rubric/rubricUtils";
import buildGradingPrompt from "@/lib/grading/buildGradingPrompt";
import { listClassrooms } from "@/lib/firestore/classrooms";
import { listSubjects } from "@/lib/firestore/subjects";

export default function NewExamPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [examTitle, setExamTitle] = useState("");
  const [examDescription, setExamDescription] = useState("");
  const [selectedClassroomId, setSelectedClassroomId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  const [professorKey, setProfessorKey] = useState<File | null>(null);
  const [answerKeyUpload, setAnswerKeyUpload] = useState<{ url: string; name: string; size: number; key?: string } | null>(null);
  const [studentUploads, setStudentUploads] = useState<{ url: string; name: string; size: number; key?: string }[]>([]);
  const [studentFiles, setStudentFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [rubric, setRubric] = useState<{ numQuestions: number; questions: { marks: number; notes?: string }[] }>({ numQuestions: 0, questions: [] });
  const answerInputRef = useRef<HTMLInputElement | null>(null);
  const studentInputRef = useRef<HTMLInputElement | null>(null);

  // Query for classrooms and subjects
  const { data: classrooms, isLoading: classroomsLoading } = useQuery({
    queryKey: ["classrooms", user?.uid],
    queryFn: () => listClassrooms(user!.uid),
    enabled: !!user,
  });

  const { data: subjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ["subjects", selectedClassroomId],
    queryFn: () => listSubjects(selectedClassroomId),
    enabled: !!selectedClassroomId,
  });

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
          await saveAnswerKeyFile(data.exam_id.toString(), answerKeyUpload);
          console.log("✅ Saved answer key URL:", answerKeyUpload.url);

          const submissions = await examService.getExamSubmissions(data.exam_id);

          for (let i = 0; i < Math.min(submissions.length, studentUploads.length); i++) {
            const submission = submissions[i];
            const studentUpload = studentUploads[i];
            if (submission?.id && studentUpload) {
              await saveStudentPaperFile(data.exam_id.toString(), submission.id.toString(), studentUpload);
              console.log("✅ Saved student paper URL:", studentUpload.url);
            }
          }
          // Log parsed grading JSON if available (sample)
          try {
            const sample = submissions.find((s) => (s.grade_json?.results || []).some((q: any) => q.breakdown));
            if (sample) {
              console.log("Parsed LLM grading JSON (sample):", JSON.stringify(sample.grade_json, null, 2));
            }
          } catch (err) {
            // ignore logging failures
          }

          // Merge classroom/subject metadata into the backend-created exam document
          try {
            await updateExamClassroomLink(data.exam_id.toString(), {
              classroomId: selectedClassroomId,
              subjectId: selectedSubjectId,
              ownerId: user?.uid,
              description: examDescription,
              answerKeyFile: answerKeyUpload,
            });
            console.log("✅ Linked exam to classroom/subject (merge update)");
          } catch (err) {
            console.error("❌ Failed to link exam to classroom:", err);
          }
        } catch (err) {
          console.error("❌ Failed to save URLs:", err);
        }
      }

      if (data.exam_id && data.exam_id !== "NaN" && data.exam_id !== "") {
        console.log("Redirecting to Review for exam:", data.exam_id);
        router.push(`/dashboard/review?examId=${data.exam_id}`);
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

    if (!selectedClassroomId || !selectedSubjectId) {
      toast.error("Please select both classroom and subject");
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

      // Add classroom and subject IDs
      if (selectedClassroomId) {
        formData.append("classroom_id", selectedClassroomId);
      }
      if (selectedSubjectId) {
        formData.append("subject_id", selectedSubjectId);
      }

      // Attach rubric (normalized) if present and build grading prompt
      let normalized: any = null;
      try {
        normalized = normalizeRubric(rubric as any);
        formData.append("rubric", JSON.stringify(normalized));

        // Build a rich grading prompt to help the backend LLM use rubric + policy.
        const prompt = buildGradingPrompt({
          rubric: normalized,
          answerKeyContext: answerKeyUpload?.name || answerKeyUpload?.url || "",
          studentContext: studentUploads.map((s) => s.name || s.url).join("\n") || "",
        });
        formData.append("grading_prompt", prompt);
        console.log("Grading prompt (truncated):", prompt.slice(0, 800));
      } catch (e) {
        console.warn("Failed to attach rubric to grading request", e);
      }
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

      // Add classroom and subject IDs (fallback)
      if (selectedClassroomId) {
        formData.append("classroom_id", selectedClassroomId);
      }
      if (selectedSubjectId) {
        formData.append("subject_id", selectedSubjectId);
      }

      // fallback: attach grading prompt even when previous Firestore save failed
      try {
        const normalizedFallback = normalizeRubric(rubric as any);
        const prompt = buildGradingPrompt({
          rubric: normalizedFallback,
          answerKeyContext: answerKeyUpload?.name || answerKeyUpload?.url || "",
          studentContext: studentUploads.map((s) => s.name || s.url).join("\n") || "",
        });
        formData.append("rubric", JSON.stringify(normalizedFallback));
        formData.append("grading_prompt", prompt);
        console.log("Grading prompt (truncated):", prompt.slice(0, 800));
      } catch (e) {
        // ignore
      }

      gradingMutation.mutate(formData);
    } finally {
      setUploading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AppShell pageTitle="Create New Exam">
      <div className="container mx-auto px-4 py-6 space-y-5">
        {/* ── Header ───────────────────────────────────────────────────── */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 mb-2 text-zinc-500 hover:text-zinc-900"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
          </Button>
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
                Create New Exam
              </h2>
              <p className="text-sm text-zinc-500">
                Upload documents, configure rubric, and let AI handle the grading.
              </p>
            </div>
          </div>
        </div>

        {/* ── Form ─────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit}>
          {/* Two-column: Details + Uploads */}
          <div className="grid lg:grid-cols-2 gap-4 mb-4">
            {/* ── Exam Details ───────────────────────────────────────── */}
            <Card className="border-0 shadow-md bg-white dark:bg-zinc-900 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
              <CardHeader className="pb-3 pt-5">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="rounded-lg p-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  Exam Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Classroom *</Label>
                    <Select value={selectedClassroomId} onValueChange={(val) => {
                      setSelectedClassroomId(val);
                      setSelectedSubjectId("");
                    }}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={classroomsLoading ? "Loading..." : "Select classroom"} />
                      </SelectTrigger>
                      <SelectContent>
                        {(classrooms || []).map((classroom: any) => (
                          <SelectItem key={classroom.id} value={classroom.id}>
                            {classroom.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Subject *</Label>
                    <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId} disabled={!selectedClassroomId}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={subjectsLoading ? "Loading..." : selectedClassroomId ? "Select subject" : "Select classroom first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {(subjects || []).map((subject: any) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name}{subject.code ? ` (${subject.code})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Exam Title *</Label>
                  <Input
                    id="title"
                    className="h-9"
                    placeholder="e.g., Mathematics Midterm - Fall 2025"
                    value={examTitle}
                    onChange={(e) => setExamTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Add any notes or context about this exam..."
                    value={examDescription}
                    onChange={(e) => setExamDescription(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* ── Upload Documents ────────────────────────────────────── */}
            <Card className="border-0 shadow-md bg-white dark:bg-zinc-900 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-600" />
              <CardHeader className="pb-3 pt-5">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="rounded-lg p-1.5 bg-violet-50 dark:bg-violet-900/20 text-violet-600">
                    <Upload className="h-4 w-4" />
                  </div>
                  Upload Documents
                </CardTitle>
                <p className="text-xs text-zinc-400 mt-0.5">PDF files, max 50 MB each</p>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                {/* Answer Key */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Answer Key *</Label>
                  {answerKeyUpload ? (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 dark:bg-emerald-900/10 dark:border-emerald-800 px-3 py-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <FileText className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                      <span className="text-sm font-medium truncate flex-1">{answerKeyUpload.name}</span>
                      <span className="text-[10px] text-zinc-400 shrink-0">({Math.round(answerKeyUpload.size / 1024)} KB)</span>
                      <a href={answerKeyUpload.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-0.5 shrink-0">
                        Open <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                      <button
                        type="button"
                        className="text-xs text-rose-500 hover:text-rose-600 shrink-0"
                        onClick={() => { setAnswerKeyUpload(null); setProfessorKey(null); }}
                      >
                        Replace
                      </button>
                    </div>
                  ) : (
                    <div
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-200 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-600 bg-zinc-50/50 dark:bg-zinc-800/30 py-5 cursor-pointer transition-colors"
                      onClick={() => answerInputRef.current?.click()}
                    >
                      <input
                        ref={answerInputRef}
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        disabled={isUploadingAnswerKey}
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          if (f.size > 50 * 1024 * 1024) { toast.error("File exceeds 50MB limit"); return; }
                          setProfessorKey(f);
                          setUploading(true);
                          await startAnswerKeyUpload([f]);
                        }}
                      />
                      {isUploadingAnswerKey ? (
                        <Loader2 className="h-5 w-5 animate-spin text-blue-500 mb-1" />
                      ) : (
                        <Upload className="h-5 w-5 text-zinc-400 mb-1" />
                      )}
                      <span className="text-xs text-zinc-500">{isUploadingAnswerKey ? "Uploading..." : "Click to upload answer key"}</span>
                    </div>
                  )}
                </div>

                {/* Student Papers */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Student Papers *</Label>
                    {studentUploads.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{studentUploads.length} file{studentUploads.length !== 1 ? "s" : ""}</Badge>
                    )}
                  </div>
                  <input
                    ref={studentInputRef}
                    type="file"
                    accept="application/pdf"
                    multiple
                    className="hidden"
                    disabled={isUploadingStudent}
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;
                      const valid: File[] = [];
                      for (const f of files) {
                        if (f.size > 50 * 1024 * 1024) { toast.error(`${f.name} exceeds 50MB limit`); continue; }
                        valid.push(f);
                      }
                      if (valid.length === 0) return;
                      setStudentFiles(prev => [...prev, ...valid]);
                      setUploading(true);
                      await startStudentUpload(valid);
                    }}
                  />

                  {studentUploads.length > 0 ? (
                    <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                      {studentUploads.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 dark:bg-emerald-900/10 dark:border-emerald-800 px-2.5 py-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <p className="text-xs font-medium truncate flex-1">{s.name}</p>
                          <span className="text-[10px] text-zinc-400 shrink-0">({Math.round(s.size / 1024)} KB)</span>
                          <a href={s.url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 flex items-center gap-0.5 shrink-0">
                            Open <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                          <button
                            type="button"
                            className="text-rose-500 shrink-0"
                            onClick={() => {
                              setStudentUploads((arr) => arr.filter((_, i) => i !== idx));
                              setStudentFiles((arr) => arr.filter((_, i) => i !== idx));
                            }}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-200 dark:border-zinc-700 hover:border-violet-400 dark:hover:border-violet-600 bg-zinc-50/50 dark:bg-zinc-800/30 py-5 cursor-pointer transition-colors"
                      onClick={() => studentInputRef.current?.click()}
                    >
                      {isUploadingStudent ? (
                        <Loader2 className="h-5 w-5 animate-spin text-violet-500 mb-1" />
                      ) : (
                        <Upload className="h-5 w-5 text-zinc-400 mb-1" />
                      )}
                      <span className="text-xs text-zinc-500">{isUploadingStudent ? `Uploading ${studentFiles.length} file(s)...` : "Click to upload student papers"}</span>
                    </div>
                  )}

                  {studentUploads.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full text-xs h-8"
                      onClick={() => studentInputRef.current?.click()}
                      disabled={isUploadingStudent}
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      Add more papers
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Rubric (full-width) ──────────────────────────────────── */}
          <Card className="border-0 shadow-md bg-white dark:bg-zinc-900 overflow-hidden mb-4">
            <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-600" />
            <CardHeader className="pb-3 pt-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="rounded-lg p-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  Rubric
                </CardTitle>
                <Badge variant="secondary" className="text-[10px]">Rubric Policy v1</Badge>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">Define marks and notes per question for consistent grading</p>
            </CardHeader>
            <CardContent className="pt-0">
              <RubricBuilder
                value={rubric}
                onChange={(next) => {
                  setRubric(next);
                  console.log("rubric updated", next);
                }}
              />
            </CardContent>
          </Card>

          {/* ── Submit ───────────────────────────────────────────────── */}
          <div className="rounded-xl bg-white dark:bg-zinc-900 shadow-md overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-amber-500 to-orange-600" />
            <div className="p-4">
              {(uploading || gradingMutation.isPending) && (
                <div className="mb-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">
                      {uploading ? "Uploading files..." : "AI is analyzing handwriting..."}
                    </span>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      {uploading ? "Uploading" : (uploadProgress < 100 ? `${uploadProgress}%` : "Processing")}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300 rounded-full"
                      style={{
                        width: uploading ? "100%" : (uploadProgress < 100 ? `${uploadProgress}%` : "100%"),
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-zinc-400">
                    {uploading ? "Uploading to cloud storage..." : "This may take 30-60 seconds for AI processing..."}
                  </p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm"
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
                    <Sparkles className="mr-2 h-4 w-4" />
                    Grade Exam with AI
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
