import { useEffect, useId, useRef, useState, type RefObject } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CustomerDetails, type SummaryState } from "@/components/customers/CustomerDetails";
import type { BriefController } from "@/hooks/useAiBrief";

const IDLE: SummaryState = { editing: false, dirty: false, saving: false };

// Below 1024px the dialog is a full-screen sheet (LAY-DLG-012); from 1024px it is centred, 80% of the viewport wide and at
// most 85vh tall (LAY-DLG-011). The shared DialogContent supplies `fixed left/top-1/2 -translate-x/y-1/2`, `max-w-lg`,
// `p-6` and `gap-4`; they are overridden here as UseCaseForm does. The title bar (the panel header) stays in view and
// only the panel body scrolls. Colours are the shared tokens, the summary keeps its stone scheme (LAY-DLG-013).
const CONTENT_CLASS =
  "flex flex-col gap-0 overflow-hidden border-0 p-0 outline-none " +
  "left-0 top-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 rounded-none sm:rounded-none " +
  "lg:left-1/2 lg:top-1/2 lg:h-auto lg:max-h-[85vh] lg:w-[80vw] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-lg lg:border " +
  // The shared close button sits at the top right; line it up with the 32px title bar.
  "[&>button]:right-3 [&>button]:top-2";

// The panel drops its own card chrome inside the dialog and keeps the right end of its header clear of the close button.
const PANEL_CLASS = "min-h-0 flex-1 rounded-none border-0 shadow-none !animate-none [&>header]:pr-10";

/**
 * The Executive Summary as a modal dialog (LAY-DLG-001..014). The page owns `open`; `onOpenChange(false)` is the only way
 * out and it applies the close rules: ignored while a save runs (LAY-DLG-008), a confirmation while the editor holds
 * unsaved changes (LAY-DLG-007), otherwise it closes. A successful save closes it (LAY-DLG-009). The content is mounted
 * only while open, so the editor state does not outlive the dialog.
 */
export function SummaryDialog({
  row,
  open,
  onOpenChange,
  returnFocusRef,
  ai,
}: {
  row: Record<string, unknown>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The reopen button; it gets the focus when the dialog closes, however it was opened (LAY-DLG-006). */
  returnFocusRef: RefObject<HTMLElement>;
  /** The page's AI brief (AIB-T07); it lives in the page, so closing the dialog keeps the run and the draft (AIB-HUMAN-010). */
  ai?: BriefController;
}) {
  const titleId = useId();
  const contentRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<SummaryState>(IDLE);
  const [confirming, setConfirming] = useState(false);
  const focusBeforeConfirm = useRef<HTMLElement | null>(null);
  const discarded = useRef(false);

  // Whatever closed the dialog, the next opening starts clean.
  useEffect(() => {
    discarded.current = false;
    if (!open) {
      setState(IDLE);
      setConfirming(false);
    }
  }, [open]);

  const trackState = (next: SummaryState) =>
    setState((prev) => (prev.editing === next.editing && prev.dirty === next.dirty && prev.saving === next.saving ? prev : next));

  const requestClose = () => {
    if (state.saving) return;
    if (state.editing && state.dirty) {
      focusBeforeConfirm.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setConfirming(true);
      return;
    }
    onOpenChange(false);
  };

  const discard = () => {
    discarded.current = true;
    setConfirming(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : requestClose())}>
        <DialogContent
          ref={contentRef}
          tabIndex={-1}
          aria-labelledby={titleId}
          className={CONTENT_CLASS}
          // Radix would focus the first focusable element, which is the click-to-edit text; focus the dialog itself
          // so that an automatic opening neither puts the cursor in the text nor starts the editor (LAY-DLG-004).
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            contentRef.current?.focus();
          }}
          // After an automatic opening Radix would return the focus to <body>.
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            returnFocusRef.current?.focus();
          }}
        >
          <CustomerDetails
            row={row}
            titleId={titleId}
            className={PANEL_CLASS}
            onStateChange={trackState}
            onSaved={() => onOpenChange(false)}
            ai={ai}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirming} onOpenChange={(o) => !o && setConfirming(false)}>
        <AlertDialogContent
          className="max-w-sm"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            if (discarded.current) returnFocusRef.current?.focus();
            else (focusBeforeConfirm.current?.isConnected ? focusBeforeConfirm.current : contentRef.current)?.focus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Discard your unsaved summary changes?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Your changes to the executive summary have not been saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs">Keep editing</AlertDialogCancel>
            <AlertDialogAction
              className="h-8 bg-destructive text-xs text-destructive-foreground hover:bg-destructive/90"
              onClick={discard}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
