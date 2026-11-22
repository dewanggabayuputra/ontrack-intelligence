import { useQuery } from "@tanstack/react-query";
import { intelligenceApi } from "@/lib/api/intelligence.api";
import { isNotFoundError } from "@/lib/api/errors";
import { projectsApi } from "@/lib/api/projects.api";
import { PortfolioEntry } from "@/types";

async function loadPortfolio(): Promise<PortfolioEntry[]> {
  const projects = await projectsApi.listAll();

  return Promise.all(
    projects.map(async (project) => {
      try {
        const assessment = await intelligenceApi.getLatestAssessment(
          project.id,
        );
        return { project, assessment };
      } catch (error) {
        if (isNotFoundError(error)) {
          return { project, assessment: null };
        }
        throw error;
      }
    }),
  );
}

export function usePortfolio() {
  return useQuery({
    queryKey: ["portfolio"],
    queryFn: loadPortfolio,
  });
}
