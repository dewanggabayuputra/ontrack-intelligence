import { apiClient } from "./axios";
import {
  FollowUp,
  FollowUpCreate,
  FollowUpHistory,
  FollowUpStatus,
  FollowUpUpdate,
} from "@/types";

export const followUpsApi = {
  /**
   * Get all follow-ups with optional status filter
   */
  async listAll(status?: FollowUpStatus): Promise<FollowUp[]> {
    const response = await apiClient.get<FollowUp[]>("/follow-ups", {
      params: status ? { status } : {},
    });
    return response.data;
  },

  async getByProject(projectId: string): Promise<FollowUp[]> {
    const response = await apiClient.get<FollowUp[]>(
      `/follow-ups/project/${encodeURIComponent(projectId)}`,
    );
    return response.data;
  },

  async update(followUpId: string, data: FollowUpUpdate): Promise<FollowUp> {
    const response = await apiClient.patch<FollowUp>(
      `/follow-ups/${encodeURIComponent(followUpId)}`,
      data,
    );
    return response.data;
  },

  async create(data: FollowUpCreate): Promise<FollowUp> {
    const response = await apiClient.post<FollowUp>("/follow-ups", data);
    return response.data;
  },

  async getHistory(followUpId: string): Promise<FollowUpHistory[]> {
    const response = await apiClient.get<FollowUpHistory[]>(
      `/follow-ups/${encodeURIComponent(followUpId)}/history`,
    );
    return response.data;
  },
};
