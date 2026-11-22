import { apiClient } from "./axios";
import { ProjectEvidence } from "@/types";

export const evidenceApi = {
  /**
   * Get all evidence for a project
   */
  async getProjectEvidence(projectId: string): Promise<ProjectEvidence> {
    const response = await apiClient.get<ProjectEvidence>(
      `/evidence/project/${encodeURIComponent(projectId)}`,
    );
    return response.data;
  },
};
