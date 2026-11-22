import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { followUpsApi } from "@/lib/api/follow-ups.api";
import { FollowUpCreate, FollowUpStatus, FollowUpUpdate } from "@/types";

export function useFollowUps(status?: FollowUpStatus) {
  return useQuery({
    queryKey: ["follow-ups", status ?? "all"],
    queryFn: () => followUpsApi.listAll(status),
  });
}

export function useProjectFollowUps(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-follow-ups", projectId],
    queryFn: async () => {
      if (!projectId) throw new Error("Project ID is required.");
      return followUpsApi.getByProject(projectId);
    },
    enabled: Boolean(projectId),
  });
}

export function useUpdateFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: FollowUpUpdate }) =>
      followUpsApi.update(id, data),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["follow-ups"] }),
        queryClient.invalidateQueries({ queryKey: ["project-follow-ups"] }),
      ]);
    },
  });
}

export function useCreateFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: FollowUpCreate) => followUpsApi.create(data),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["follow-ups"] }),
        queryClient.invalidateQueries({ queryKey: ["project-follow-ups"] }),
      ]);
    },
  });
}

export function useFollowUpHistory(followUpId: string) {
  return useQuery({
    queryKey: ["follow-up-history", followUpId],
    queryFn: () => followUpsApi.getHistory(followUpId),
  });
}
