import { Ban, Eye, FileText, MoreVertical, Pencil, RefreshCw, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type HotelActionMenuProps = {
  onViewDetails?: () => void;
  onRefreshHotel?: () => void | Promise<void>;
  onChangeHotel?: () => void | Promise<void>;
  onChooseAlternative?: () => void | Promise<void>;
  onEditHotel?: () => void | Promise<void>;
  onViewVoucher?: () => void;
  onChangeStatus?: () => void | Promise<void>;
  onCancelHotel?: () => void | Promise<void>;
  cancelHotelLabel?: string;
  onRemoveHotel?: () => void | Promise<void>;
  disabled?: boolean;
};

/** The confirmed-hotel action menu shared by itinerary details and the hold modal. */
export function HotelActionsMenu({
  onViewDetails,
  onRefreshHotel,
  onChangeHotel,
  onChooseAlternative,
  onEditHotel,
  onViewVoucher,
  onChangeStatus,
  onCancelHotel,
  cancelHotelLabel = "Cancel Hotel",
  onRemoveHotel,
  disabled = false,
}: HotelActionMenuProps) {
  const run = (action?: () => void | Promise<void>) => {
    if (!action) return;
    void action();
  };

  const menuItemClass = "flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-medium";
  const disabledItemClass = `${menuItemClass} cursor-not-allowed text-slate-300`;
  const changeHotelAction = onChangeHotel || onChooseAlternative;
  const selectAction = (action?: () => void | Promise<void>) => () => run(action);

  return (
    <DropdownMenu>
      <div className="inline-flex" onClick={(event) => event.stopPropagation()}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Hotel actions"
            disabled={disabled}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#5c24e5] bg-white text-[#5c24e5] transition hover:bg-[#f3eeff] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <MoreVertical className="h-4 w-4" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
      </div>
      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={4}
        collisionPadding={8}
        className="z-[120] min-w-[176px] rounded-lg border-slate-200 bg-white p-1 text-[#1e1b4b] shadow-xl"
      >
          <DropdownMenuItem disabled={!onViewDetails} className={onViewDetails ? `${menuItemClass} hover:bg-[#f8f5fc]` : disabledItemClass} onSelect={selectAction(onViewDetails)}>
            <Eye className="h-3.5 w-3.5 text-[#5c24e5]" aria-hidden="true" />
            View Hotel Details
          </DropdownMenuItem>
          {onRefreshHotel && (
            <DropdownMenuItem className={`${menuItemClass} hover:bg-[#f8f5fc]`} onSelect={selectAction(onRefreshHotel)}>
              <RefreshCw className="h-3.5 w-3.5 text-[#5c24e5]" aria-hidden="true" />
              Refresh Hotel
            </DropdownMenuItem>
          )}
          <DropdownMenuItem disabled={!changeHotelAction} className={changeHotelAction ? `${menuItemClass} hover:bg-[#f8f5fc]` : disabledItemClass} onSelect={selectAction(changeHotelAction)}>
            <Ban className="h-3.5 w-3.5" aria-hidden="true" />
            Change Hotel
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!onEditHotel} className={onEditHotel ? `${menuItemClass} hover:bg-[#f8f5fc]` : disabledItemClass} onSelect={selectAction(onEditHotel)}>
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            Edit Hotel
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!onViewVoucher} className={onViewVoucher ? `${menuItemClass} hover:bg-[#f8f5fc]` : disabledItemClass} onSelect={selectAction(onViewVoucher)}>
            <FileText className="h-3.5 w-3.5 text-[#5c24e5]" aria-hidden="true" />
            View Voucher
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!onChangeStatus} className={onChangeStatus ? `${menuItemClass} hover:bg-[#f8f5fc]` : disabledItemClass} onSelect={selectAction(onChangeStatus)}>
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            Change Status
          </DropdownMenuItem>
          {onCancelHotel && (
            <DropdownMenuItem className={`${menuItemClass} text-red-600 hover:bg-red-50`} onSelect={selectAction(onCancelHotel)}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              {cancelHotelLabel}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem disabled={!onRemoveHotel} className={onRemoveHotel ? `${menuItemClass} hover:bg-[#f8f5fc]` : disabledItemClass} onSelect={selectAction(onRemoveHotel)}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Remove Hotel
          </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default HotelActionsMenu;
