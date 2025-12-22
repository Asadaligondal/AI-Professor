import { apiClient } from "./api-client";
import { Exam, CreateExamRequest, Submission, GradeResult } from "@/types";

export const examService = {
  // Get all exams for the current user
  getExams: async (userId: string) => {
    const response = await apiClient.get<Exam[]>("/api/v1/exams", {
      params: { user_id: userId }
    });
    return response.data;
  },

  // Get single exam
  getExam: async (examId: number) => {
    const response = await apiClient.get<Exam>(`/api/v1/exams/${examId}`);
    return response.data;
  },

  // Create new exam
  createExam: async (data: CreateExamRequest) => {
    const response = await apiClient.post<Exam>("/api/v1/exams", data);
    return response.data;
  },

  // Get exam submissions
  getExamSubmissions: async (examId: number) => {
    const response = await apiClient.get<Submission[]>(
      `/api/v1/exams/${examId}/submissions`
    );
    return response.data;
  },

  // Update submission
  updateSubmission: async (submissionId: number, data: Partial<Submission>) => {
    const response = await apiClient.patch<Submission>(
      `/api/v1/exams/submissions/${submissionId}`,
      data
    );
    return response.data;
  },
};

export const gradingService = {
  // Grade exam papers
  gradeExam: async (formData: FormData, onProgress?: (progress: number) => void) => {
    const response = await apiClient.post<GradeResult>(
      "/api/v1/grade",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress?.(percentCompleted);
          }
        },
      }
    );
    return response.data;
  },
};

export interface DashboardStats {
  total_exams: number;
  total_submissions: number;
  average_grade: number;
  total_students: number;
}

export const dashboardService = {
  // Get dashboard statistics
  getStats: async (userId: string) => {
    const response = await apiClient.get<DashboardStats>(
      "/api/v1/dashboard/stats",
      {
        params: { user_id: userId }
      }
    );
    return response.data;
  },
};
