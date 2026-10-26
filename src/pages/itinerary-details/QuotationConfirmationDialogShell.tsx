import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface QuotationConfirmationDialogShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function QuotationConfirmationDialogShell({
  open,
  onOpenChange,
  children,
  title = "Book Total Package",
  description = "Review the package details and confirm your booking.",
}: QuotationConfirmationDialogShellProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className="h-[calc(100dvh-40px)] w-[calc(100vw-40px)] max-w-none max-h-none overflow-hidden rounded-md border border-slate-200 bg-[#f4f7fc] p-0 text-[#1e293b] shadow-xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="h-full overflow-y-auto">
          <div className="min-h-full bg-[#f4f7fc] px-4 pb-12 pt-4 sm:px-6 sm:pt-5">
            <div className="mx-auto max-w-[1440px]">
              {children}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default QuotationConfirmationDialogShell;
