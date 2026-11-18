import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCustomers, saveSummary } from "@/lib/customerSource";

export function useCustomers() {
  return useQuery({ queryKey: ["customers"], queryFn: fetchCustomers });
}

/**
 * Saves a customer's executive summary (SUM-EDIT-001) and refreshes the customer list. The invalidation is awaited, so the
 * mutation stays pending until the refetched rows (with the stored summary and new timestamp) are in the cache.
 */
export function useSaveSummary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, html }: { id: number; html: string }) => saveSummary(id, html),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}
