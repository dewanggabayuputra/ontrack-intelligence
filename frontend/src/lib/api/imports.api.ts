import { apiClient } from "./axios";
import { API_URL } from "./axios";
import { DataDictionaryUploadResult, ImportBatch, ImportResult } from "@/types";

export const importsApi = {
  async uploadProjectMaster(file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.postFormData<ImportResult>(
      "/imports/project-master",
      formData,
    );
    return response.data;
  },

  async uploadProjectUpdates(file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.postFormData<ImportResult>(
      "/imports/project-updates",
      formData,
    );
    return response.data;
  },

  async uploadProductionData(file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.postFormData<ImportResult>(
      "/imports/production-data",
      formData,
    );
    return response.data;
  },

  async uploadDataDictionaryPdf(
    file: File,
  ): Promise<DataDictionaryUploadResult> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.postFormData<DataDictionaryUploadResult>(
      "/imports/data-dictionary",
      formData,
    );
    return response.data;
  },

  getDataDictionaryFileUrl(batchId: string) {
    return `${API_URL}/imports/data-dictionary/${encodeURIComponent(batchId)}/file`;
  },

  /**
   * Get import history
   */
  async getHistory(limit = 50): Promise<ImportBatch[]> {
    const response = await apiClient.get<ImportBatch[]>("/imports/history", {
      params: { limit },
    });
    return response.data;
  },
};
