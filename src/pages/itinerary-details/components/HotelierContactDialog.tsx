import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OTHER_HOTELIER_PHONE_OPTION } from "../utils/hotelierContact.utils";

export type HotelierContactDialogProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  hotelName?: string;
  contactName: string;
  onContactNameChange: (value: string) => void;
  contactPhone: string;
  onContactPhoneChange: (value: string) => void;
  phoneOptions?: readonly string[];
  selectedPhoneOption?: string;
  onPhoneOptionChange?: (value: string) => void;
  showContactFields?: boolean;
  isLoadingContact?: boolean;
  extraContent?: ReactNode;
  confirmed?: boolean;
  onConfirmedChange?: (confirmed: boolean) => void;
  confirmationText?: string;
  error?: string | null;
  isSubmitting?: boolean;
  cancelLabel: string;
  confirmLabel?: string;
  submittingLabel?: string;
  confirmClassName?: string;
  onClose: () => void;
  onConfirm?: () => void;
};

/** Shared hotelier contact form for placing, removing, or replacing an offline hold. */
export function HotelierContactDialog({
  open,
  title,
  description,
  contactName,
  onContactNameChange,
  contactPhone,
  onContactPhoneChange,
  phoneOptions = [],
  selectedPhoneOption = OTHER_HOTELIER_PHONE_OPTION,
  onPhoneOptionChange,
  showContactFields = true,
  isLoadingContact = false,
  extraContent,
  confirmed = false,
  onConfirmedChange,
  confirmationText,
  error,
  isSubmitting = false,
  cancelLabel,
  confirmLabel,
  submittingLabel,
  confirmClassName,
  onClose,
  onConfirm,
}: HotelierContactDialogProps) {
  const hasPhoneChoices = phoneOptions.length > 1;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !isSubmitting) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {extraContent}

        {showContactFields && (
          <div className="space-y-3">
            {isLoadingContact && <p className="text-xs text-slate-500">Loading saved hotel contact details…</p>}
            <label className="block space-y-1 text-sm">
              <span>Hotelier contact name</span>
              <input
                value={contactName}
                onChange={(event) => onContactNameChange(event.target.value)}
                autoComplete="name"
                className="w-full rounded-md border px-3 py-2"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Hotelier phone number</span>
              {hasPhoneChoices ? (
                <>
                  <select
                    value={selectedPhoneOption}
                    onChange={(event) => onPhoneOptionChange?.(event.target.value)}
                    className="w-full rounded-md border px-3 py-2"
                  >
                    {phoneOptions.map((phone) => <option key={phone} value={phone}>{phone}</option>)}
                    <option value={OTHER_HOTELIER_PHONE_OPTION}>Other</option>
                  </select>
                  {selectedPhoneOption === OTHER_HOTELIER_PHONE_OPTION && (
                    <input
                      value={contactPhone}
                      onChange={(event) => onContactPhoneChange(event.target.value)}
                      autoComplete="tel"
                      inputMode="tel"
                      placeholder="Enter hotelier phone number"
                      className="w-full rounded-md border px-3 py-2"
                    />
                  )}
                </>
              ) : (
                <input
                  value={contactPhone}
                  onChange={(event) => onContactPhoneChange(event.target.value)}
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="Enter hotelier phone number"
                  className="w-full rounded-md border px-3 py-2"
                />
              )}
            </label>
          </div>
        )}

        {confirmationText && onConfirmedChange && (
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => onConfirmedChange(event.target.checked)}
              className="mt-1"
            />
            <span>{confirmationText}</span>
          </label>
        )}

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
            {cancelLabel}
          </Button>
          {confirmLabel && onConfirm && (
            <Button type="button" disabled={isSubmitting} onClick={onConfirm} className={confirmClassName}>
              {isSubmitting ? submittingLabel || "Please wait…" : confirmLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HotelierContactDialog;
