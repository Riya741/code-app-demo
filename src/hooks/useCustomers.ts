import { useQuery } from "@tanstack/react-query";
import { fetchCustomers } from "@/lib/customerSource";

export function useCustomers() {
  return useQuery({ queryKey: ["customers"], queryFn: fetchCustomers });
}
