import { useEffect, useRef, useState } from "react";
import { Ban, Eye, FileText, MoreVertical, Pencil, Trash2 } from "lucide-react";

export type HotelActionMenuProps = {
  onViewDetails?: () => void;
  onChangeHotel?: () => void | Promise<void>;
  onChooseAlternative?: () => void | Promise<void>;
  onEditHotel?: () => void | Promise<void>;
  onViewVoucher?: () => void;
  onChangeStatus?: () => void | Promise<void>;
  onCancelHotel?: () => void | Promise<void>;
  onRemoveHotel?: () => void | Promise<void>;
  disabled?: boolean;
};

/** The confirmed-hotel action menu shared by itinerary details and the hold modal. */
export function HotelActionsMenu({
  onViewDetails,
  onChangeHotel,
  onChooseAlternative,
  onEditHotel,
  onViewVoucher,
  onChangeStatus,
  onCancelHotel,
  onRemoveHotel,
  disabled = false,
}: HotelActionMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  const run = (action?: () => void | Promise<void>) => {
    if (!action) return;
    setOpen(false);
    void action();
  };

  const menuItemClass = "flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-medium";
  const disabledItemClass = `${menuItemClass} cursor-not-allowed text-slate-300`;
  const changeHotelAction = onChangeHotel || onChooseAlternative;

  return (
    <div ref={menuRef} className="relative inline-flex" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        aria-label="Hotel actions"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#5c24e5] bg-white text-[#5c24e5] transition hover:bg-[#f3eeff] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <MoreVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+4px)] z-50 min-w-[176px] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-[#1e1b4b] shadow-xl">
          <button type="button" disabled={!onViewDetails} className={onViewDetails ? `${menuItemClass} hover:bg-[#f8f5fc]` : disabledItemClass} onClick={() => run(onViewDetails)}>
            <Eye className="h-3.5 w-3.5 text-[#5c24e5]" aria-hidden="true" />
            View Hotel Details
          </button>
          <button type="button" disabled={!changeHotelAction} className={changeHotelAction ? `${menuItemClass} hover:bg-[#f8f5fc]` : disabledItemClass} onClick={() => run(changeHotelAction)}>
            <Ban className="h-3.5 w-3.5" aria-hidden="true" />
            Change Hotel
          </button>
          <button type="button" disabled={!onEditHotel} className={onEditHotel ? `${menuItemClass} hover:bg-[#f8f5fc]` : disabledItemClass} onClick={() => run(onEditHotel)}>
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            Edit Hotel
          </button>
          <button type="button" disabled={!onViewVoucher} className={onViewVoucher ? `${menuItemClass} hover:bg-[#f8f5fc]` : disabledItemClass} onClick={() => run(onViewVoucher)}>
            <FileText className="h-3.5 w-3.5 text-[#5c24e5]" aria-hidden="true" />
            View Voucher
          </button>
          <button type="button" disabled={!onChangeStatus} className={onChangeStatus ? `${menuItemClass} hover:bg-[#f8f5fc]` : disabledItemClass} onClick={() => run(onChangeStatus)}>
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            Change Status
          </button>
          {onCancelHotel && (
            <button type="button" className={`${menuItemClass} text-red-600 hover:bg-red-50`} onClick={() => run(onCancelHotel)}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Cancel Hotel
            </button>
          )}
          <button type="button" disabled={!onRemoveHotel} className={onRemoveHotel ? `${menuItemClass} hover:bg-[#f8f5fc]` : disabledItemClass} onClick={() => run(onRemoveHotel)}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Remove Hotel
          </button>
        </div>
      )}
    </div>
  );
}

export default HotelActionsMenu;
