import { apiClient } from "./axios";
import { DashboardSummary, ProjectAssessment } from "@/types";

export const intelligenceApi = {
  /**
   * Run assessment for a project
   */
  async assessProject(projectId: string): Promise<ProjectAssessment> {
    const response = await apiClient.post<ProjectAssessment>(
      `/intelligence/assess/${encodeURIComponent(projectId)}`,
      {},
    );
    return response.data;
  },

  async getLatestAssessment(projectId: string): Promise<ProjectAssessment> {
    const response = await apiClient.get<ProjectAssessment>(
      `/intelligence/assessment/${encodeURIComponent(projectId)}`,
    );
    return response.data;
  },

  async getAssessmentHistory(
    projectId: string,
    limit = 10,
  ): Promise<ProjectAssessment[]> {
    const response = await apiClient.get<ProjectAssessment[]>(
      `/intelligence/history/${encodeURIComponent(projectId)}`,
      { params: { limit } },
    );
    return response.data;
  },

  async getFollowUpRecommendations(
    projectId: string,
  ): Promise<FollowUpRecommendationSummary> {
    const response = await apiClient.get<FollowUpRecommendationSummary>(
      `/intelligence/followups/${encodeURIComponent(projectId)}`,
    );
    return response.data;
  },

  async getDashboardSummary(): Promise<DashboardSummary> {
    const response = await apiClient.get<DashboardSummary>(
      "/intelligence/dashboard/summary",
    );
    return response.data;
  },
};

export interface FollowUpRecommendationSummary {
  total: number;
  critical: number;
  high: number;
  items: Array<{
    id: string;
    title: string;
    description: string;
    owner: string | null;
    status: string;
    dueDate: string | null;
    severity: string | null;
  }>;
}
