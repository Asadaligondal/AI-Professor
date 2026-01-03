"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { examService } from "@/lib/api";
import { ImageViewer } from "@/components/image-viewer";
import { motion, AnimatePresence } from "framer-motion";

interface ReviewPageProps {
  params: Promise<{
    id: string;
    studentId: string;
  }>;
}

export default function ReviewPage({ params }: ReviewPageProps) {
  const router = useRouter();
  const { id: examId, studentId } = use(params);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"side-by-side" | "ai-analysis">("side-by-side");
  const [activeTab, setActiveTab] = useState<"student" | "key">("student");

  // Fetch exam details
  const { data: exam } = useQuery({
    queryKey: ["exam", examId],
    queryFn: () => examService.getExam(examId),
  });

  // Fetch submissions
  const { data: submissions } = useQuery({
    queryKey: ["submissions", examId],
    queryFn: () => examService.getExamSubmissions(examId),
  });

  const submission = submissions?.find((s) => s.id === studentId);
  const questions = submission?.grade_json?.results || [];
  const currentQuestion = questions[currentQuestionIndex];

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleViewModeChange = (mode: string) => {
    if (mode === "ai-analysis") {
      router.push(`/dashboard/results/${examId}?studentId=${studentId}`);
    } else {
      setViewMode("side-by-side");
    }
  };

  if (!submission || !currentQuestion) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => router.push(`/exams/${examId}`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Students
            </Button>
            
            <Select value={viewMode} onValueChange={handleViewModeChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="View Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="side-by-side">Side-by-Side</SelectItem>
                <SelectItem value="ai-analysis">AI Analysis</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={() => router.push(`/dashboard/results/${examId}?studentId=${studentId}`)}>
              <FileText className="mr-2 h-4 w-4" />
              View Summary
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {submission.student_name}
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {exam?.title} - Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {currentQuestion.marks_obtained} / {currentQuestion.max_marks}
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Score</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            {/* Question Text */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                Q{currentQuestion.q_num}: Question
              </h2>
              <p className="text-zinc-700 dark:text-zinc-300">
                {currentQuestion.expected_answer 
                  ? "Answer the following question based on the content."
                  : "View the student's answer and compare with the answer key."}
              </p>
            </div>

            {/* Toggle Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "student" | "key")} className="mb-4">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="student">Student Answer</TabsTrigger>
                <TabsTrigger value="key">Answer Key</TabsTrigger>
              </TabsList>
              
              <TabsContent value="student" className="mt-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key="student"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                      <CardContent className="p-6">
                        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-4">
                          Student's Handwritten Answer
                        </h3>
                        {/* PDF viewer for student submission */}
                        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 h-[600px]">
                          {submission?.answer_pdf_url ? (
                            <iframe
                              src={submission.answer_pdf_url}
                              className="w-full h-full rounded-lg"
                              title={`${submission.student_name}'s Answer Sheet`}
                            />
                          ) : (
                            <div className="p-4 h-full overflow-auto">
                              <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap font-mono text-sm">
                                {currentQuestion.student_answer}
                              </p>
                              <p className="text-xs text-zinc-500 mt-4 italic">
                                Note: PDF not available. Showing extracted text.
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </AnimatePresence>
              </TabsContent>
              
              <TabsContent value="key" className="mt-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key="key"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                      <CardContent className="p-6">
                        <h3 className="text-sm font-semibold text-green-900 dark:text-green-300 mb-4">
                          Professor's Answer Key
                        </h3>
                        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 h-[600px]">
                          {exam?.answer_key_pdf_url ? (
                            <iframe
                              src={exam.answer_key_pdf_url}
                              className="w-full h-full rounded-lg"
                              title="Professor's Answer Key"
                            />
                          ) : (
                            <div className="p-6">
                              <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                                {currentQuestion.expected_answer || "Answer key not available."}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </AnimatePresence>
              </TabsContent>
            </Tabs>

            {/* Feedback Section */}
            <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
              <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-300 mb-2">
                AI Feedback
              </h4>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {currentQuestion.feedback}
              </p>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Bottom Navigation */}
      <footer className="sticky bottom-0 border-t border-zinc-200 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
            
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            
            <Button
              variant="outline"
              onClick={handleNext}
              disabled={currentQuestionIndex === questions.length - 1}
            >
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
