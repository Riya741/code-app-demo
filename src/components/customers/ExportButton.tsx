import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Small outlined "Export" button used in the panel title bars. */
export function ExportButton({ onClick, disabled, title }: { onClick: () => void; disabled?: boolean; title?: string }) {
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={disabled}
      onClick={onClick}
      title={title ?? "Download the rows shown here (current filters and sorting) as a CSV file for Excel"}
      className="h-6 gap-1 bg-background px-2 text-[11px] font-medium [&_svg]:size-3"
    >
      <Download /> Export
    </Button>
  );
}
