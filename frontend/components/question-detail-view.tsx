"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CheckCircle2, XCircle, Lightbulb, TrendingUp } from "lucide-react";

interface Rationale {
  points_awarded: string[];
  points_deducted: string[];
  improvement_tip: string;
}

interface QuestionDetail {
  q_num: string;
  student_answer: string;
  processed_answer: string;
  expected_answer: string;
  marks_obtained: number;
  max_marks: number;
  feedback: string;
  rationale: Rationale;
  concept_alignment: string;
}

interface QuestionDetailViewProps {
  question: QuestionDetail;
  questionIndex: number;
}

export function QuestionDetailView({ question, questionIndex }: QuestionDetailViewProps) {
  const [activeTab, setActiveTab] = useState<"analysis" | "recognition">("analysis");

  return (
    <div className="space-y-4">
      {/* Header with Question Number and Score */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Question {questionIndex + 1}
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Concept Alignment: {question.concept_alignment}
            </span>
          </div>
          <div className="text-right">
            <span className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              {question.marks_obtained} / {question.max_marks}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Buttons */}
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
        <Button
          variant="ghost"
          className={`rounded-b-none ${
            activeTab === "analysis"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-zinc-600"
          }`}
          onClick={() => setActiveTab("analysis")}
        >
          AI Analysis
        </Button>
        <Button
          variant="ghost"
          className={`rounded-b-none ${
            activeTab === "recognition"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-zinc-600"
          }`}
          onClick={() => setActiveTab("recognition")}
        >
          Text Recognition
        </Button>
      </div>

      {/* Content Based on Active Tab */}
      {activeTab === "analysis" ? (
        <div className="space-y-4">
          {/* Three Column Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Raw Extracted Text */}
            <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
              <CardContent className="pt-4">
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                  Raw Extracted Text
                </h4>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                  {question.student_answer}
                </p>
              </CardContent>
            </Card>

            {/* Processed Answer Text */}
            <Card className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
              <CardContent className="pt-4">
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                  Processed Answer Text
                </h4>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                  {question.processed_answer}
                </p>
              </CardContent>
            </Card>

            {/* Expected Answer */}
            <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
              <CardContent className="pt-4">
                <h4 className="text-sm font-semibold text-green-900 dark:text-green-300 mb-2">
                  Expected Answer
                </h4>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                  {question.expected_answer}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Rationale Accordion */}
          <Card>
            <CardContent className="pt-4">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="rationale">
                  <AccordionTrigger className="text-left">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-amber-500" />
                      <span className="font-semibold">Detailed Rationale</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      {/* Points Awarded */}
                      {question.rationale.points_awarded.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <h5 className="text-sm font-semibold text-green-900 dark:text-green-300">
                              Points Awarded
                            </h5>
                          </div>
                          <ul className="space-y-1 ml-6">
                            {question.rationale.points_awarded.map((point, idx) => (
                              <li
                                key={idx}
                                className="text-sm text-zinc-700 dark:text-zinc-300 list-disc"
                              >
                                {point}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Points Deducted */}
                      {question.rationale.points_deducted.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <h5 className="text-sm font-semibold text-red-900 dark:text-red-300">
                              Points Deducted
                            </h5>
                          </div>
                          <ul className="space-y-1 ml-6">
                            {question.rationale.points_deducted.map((point, idx) => (
                              <li
                                key={idx}
                                className="text-sm text-zinc-700 dark:text-zinc-300 list-disc"
                              >
                                {point}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Improvement Tip */}
                      {question.rationale.improvement_tip && (
                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5" />
                            <div>
                              <h5 className="text-sm font-semibold text-amber-900 dark:text-amber-300 mb-1">
                                Improvement Tip
                              </h5>
                              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                                {question.rationale.improvement_tip}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Overall Feedback */}
          <Card>
            <CardContent className="pt-4">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                Overall Feedback
              </h4>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {question.feedback}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              Raw OCR Output
            </h4>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap font-mono">
              {question.student_answer}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
