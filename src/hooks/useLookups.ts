import { useQuery } from "@tanstack/react-query";
import {
  fetchContentTypes,
  fetchDepartments,
  fetchEventTypes,
  fetchPersonnel,
  fetchSolutions,
  fetchSolutionStatuses,
  fetchSolutionUseCaseTypes,
  fetchStakeholders,
  fetchSubsidiaries,
} from "@/lib/lookups";

// Reference data changes rarely, so keep it for the session instead of re-reading it on every dialog open.
export const LOOKUP_STALE = 10 * 60 * 1000;
const STALE = LOOKUP_STALE;

export const useSubsidiaries = (customerKeys: number[], enabled: boolean) =>
  useQuery({ queryKey: ["lookup", "subsidiaries", ...customerKeys], queryFn: () => fetchSubsidiaries(customerKeys), enabled, staleTime: STALE });

export const useDepartments = (subsidiaryKey: number | null) =>
  useQuery({
    queryKey: ["lookup", "departments", subsidiaryKey],
    queryFn: () => fetchDepartments(subsidiaryKey as number),
    enabled: subsidiaryKey != null,
    staleTime: STALE,
  });

export const useStakeholders = (departmentKey: number | null) =>
  useQuery({
    queryKey: ["lookup", "stakeholders", departmentKey],
    queryFn: () => fetchStakeholders(departmentKey as number),
    enabled: departmentKey != null,
    staleTime: STALE,
  });

export const useSolutions = (enabled: boolean) => useQuery({ queryKey: ["lookup", "solutions"], queryFn: fetchSolutions, enabled, staleTime: STALE });
export const useContentTypes = (enabled: boolean) => useQuery({ queryKey: ["lookup", "contentTypes"], queryFn: fetchContentTypes, enabled, staleTime: STALE });
export const usePersonnel = (enabled: boolean) => useQuery({ queryKey: ["lookup", "personnel"], queryFn: fetchPersonnel, enabled, staleTime: STALE });
export const useEventTypes = (enabled: boolean) => useQuery({ queryKey: ["lookup", "eventTypes"], queryFn: fetchEventTypes, enabled, staleTime: STALE });
export const useSolutionUseCaseTypes = (enabled: boolean) =>
  useQuery({ queryKey: ["lookup", "solutionUseCaseTypes"], queryFn: fetchSolutionUseCaseTypes, enabled, staleTime: STALE });
export const useSolutionStatuses = (enabled: boolean) =>
  useQuery({ queryKey: ["lookup", "solutionStatuses"], queryFn: fetchSolutionStatuses, enabled, staleTime: STALE });
