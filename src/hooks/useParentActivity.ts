import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseCaseInput } from "@/lib/types";
import { deleteEvent, deleteUseCase, fetchEvents, fetchUseCases, saveEvent, saveUseCase } from "@/lib/parentData";

export function useUseCases(parentId: number | null) {
  return useQuery({
    queryKey: ["useCases", parentId],
    queryFn: () => fetchUseCases(parentId as number),
    enabled: parentId != null,
  });
}

export function useEvents(parentId: number | null) {
  return useQuery({
    queryKey: ["events", parentId],
    queryFn: () => fetchEvents(parentId as number),
    enabled: parentId != null,
  });
}

export function useDeleteUseCase(parentId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteUseCase,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["useCases", parentId] }),
  });
}

export function useDeleteEvent(parentId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events", parentId] }),
  });
}

export function useSaveUseCase(parentId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveUseCase,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["useCases", parentId] }),
  });
}

export type BulkSaveResult = { failed: { index: number; message: string }[] };

/**
 * Saves several use cases one after another (every save rewrites the workbook, so writes must not overlap) and keeps going when one fails,
 * so the caller can show which rows did not save. `onProgress` is told how many rows have been attempted.
 */
export function useSaveUseCases(parentId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ inputs, onProgress }: { inputs: UseCaseInput[]; onProgress?: (done: number) => void }): Promise<BulkSaveResult> => {
      const failed: BulkSaveResult["failed"] = [];
      for (let i = 0; i < inputs.length; i++) {
        try {
          await saveUseCase(inputs[i]);
        } catch (e) {
          failed.push({ index: i, message: e instanceof Error ? e.message : String(e) });
        }
        onProgress?.(i + 1);
      }
      return { failed };
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["useCases", parentId] }),
  });
}

export function useSaveEvent(parentId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveEvent,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events", parentId] }),
  });
}
