import { apiClient } from "./axios";
import { Project } from "@/types";

export const projectsApi = {
  async listAll(): Promise<Project[]> {
    const response = await apiClient.get<Project[]>("/projects");
    return response.data;
  },

  async getById(projectId: string): Promise<Project> {
    const response = await apiClient.get<Project>(
      `/projects/${encodeURIComponent(projectId)}`,
    );
    return response.data;
  },
};
