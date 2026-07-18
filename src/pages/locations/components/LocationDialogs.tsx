import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AutoSuggestSelect, AutoSuggestOption } from "@/components/AutoSuggestSelect";
import type { LocationRow, TollRow } from "@/services/locations";

const singleValue = (value: string | string[]) => (typeof value === "string" ? value : "");

export type DeleteSelectedRecordsDialogProps = {
  open: boolean;
  title: string;
  selectedLabel: string;
  message: string;
  warning?: string;
  source: string;
  destination: string;
  sourceOptions: AutoSuggestOption[];
  destinationOptions: AutoSuggestOption[];
  rows: LocationRow[];
  selectedIds: number[];
  allSelected: boolean;
  onSourceChange: (value: string) => void;
  onDestinationChange: (value: string) => void;
  onToggleRecord: (id: number, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  onConfirm: () => void;
  onClose: () => void;
  deletePopupPage?: number;
  deletePopupPageSize?: number;
  deletePopupTotal?: number;
  onDeletePopupPageChange?: (page: number) => void;
  onDeletePopupPageSizeChange?: (size: number) => void;
  hasBackendFilter?: boolean;
};

export function DeleteSelectedRecordsDialog({
  open,
  title,
  selectedLabel,
  message,
  warning,
  source,
  destination,
  sourceOptions,
  destinationOptions,
  rows,
  selectedIds,
  allSelected,
  onSourceChange,
  onDestinationChange,
  onToggleRecord,
  onToggleAll,
  onConfirm,
  onClose,
  deletePopupPage = 1,
  deletePopupPageSize = 10,
  deletePopupTotal = 0,
  onDeletePopupPageChange = () => undefined,
  onDeletePopupPageSizeChange = () => undefined,
  hasBackendFilter = false,
}: DeleteSelectedRecordsDialogProps) {
  const deletePopupTotalPages = Math.max(1, Math.ceil(deletePopupTotal / deletePopupPageSize));
  const selectedCount = rows.filter((row) => selectedIds.includes(row.location_ID)).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="text-sm">{message}</div>
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium">{selectedLabel}</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <div className="mb-1 text-xs">Source Location</div>
              <AutoSuggestSelect mode="single" value={source} onChange={(value) => onSourceChange(singleValue(value))} options={sourceOptions} placeholder="Choose Source Location" openOnFocus={false} />
            </div>
            <div>
              <div className="mb-1 text-xs">Destination Location</div>
              <AutoSuggestSelect mode="single" value={destination} onChange={(value) => onDestinationChange(singleValue(value))} options={destinationOptions} placeholder="Choose Destination Location" openOnFocus={false} />
            </div>
          </div>
          <div className="rounded-md border">
            <div className="border-b bg-muted/40 px-3 py-2 text-sm font-medium">Matching records: {hasBackendFilter ? deletePopupTotal : rows.length} | Selected in popup: {selectedCount}</div>
            <div className="max-h-56 overflow-auto">
              {rows.length ? (
                <Table>
                  <TableHeader><TableRow><TableHead className="w-10"><input type="checkbox" checked={allSelected} onChange={(event) => onToggleAll(event.target.checked)} aria-label="Select all matching records in popup" /></TableHead><TableHead>S.NO</TableHead><TableHead>SOURCE LOCATION</TableHead><TableHead>DESTINATION LOCATION</TableHead></TableRow></TableHeader>
                  <TableBody>{rows.map((row, index) => <TableRow key={row.location_ID}><TableCell><input type="checkbox" checked={selectedIds.includes(row.location_ID)} onChange={(event) => onToggleRecord(row.location_ID, event.target.checked)} aria-label={`Select popup record ${row.location_ID}`} /></TableCell><TableCell>{(deletePopupPage - 1) * deletePopupPageSize + index + 1}</TableCell><TableCell>{row.source_location}</TableCell><TableCell>{row.destination_location}</TableCell></TableRow>)}</TableBody>
                </Table>
              ) : <div className="px-3 py-5 text-center text-sm text-muted-foreground">No selected records found for the chosen source/destination.</div>}
            </div>
          </div>
          {hasBackendFilter && deletePopupTotal > 0 && <div className="flex items-center justify-between gap-2 border-t px-3 py-2 text-sm"><div className="flex items-center gap-2"><span>Show</span><Select value={String(deletePopupPageSize)} onValueChange={(value) => onDeletePopupPageSizeChange(Number(value))}><SelectTrigger className="w-16"><SelectValue /></SelectTrigger><SelectContent>{[5, 10, 25].map((size) => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}</SelectContent></Select><span>per page</span></div><div className="flex gap-1"><Button size="sm" variant="outline" disabled={deletePopupPage === 1} onClick={() => onDeletePopupPageChange(deletePopupPage - 1)}>Previous</Button><span className="px-2 py-1 text-xs">Page {deletePopupPage} of {deletePopupTotalPages}</span><Button size="sm" variant="outline" disabled={deletePopupPage >= deletePopupTotalPages} onClick={() => onDeletePopupPageChange(deletePopupPage + 1)}>Next</Button></div></div>}
          {warning ? <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{warning}</div> : null}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button variant="destructive" onClick={onConfirm} disabled={!selectedCount}>Delete</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteLocationNameDialog({ open, value, options, onChange, onConfirm, onClose }: { open: boolean; value: string; options: AutoSuggestOption[]; onChange: (value: string) => void; onConfirm: () => void; onClose: () => void }) {
  return <Dialog open={open} onOpenChange={onClose}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Delete Location</DialogTitle></DialogHeader><div className="space-y-3"><div className="text-sm text-muted-foreground">Select the location you want to delete from the database.</div><div><div className="text-xs mb-1">Location *</div><AutoSuggestSelect mode="single" value={value} onChange={(next) => onChange(singleValue(next))} options={options} placeholder="Choose Location" openOnFocus={false} /></div><div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">This will delete the selected location from stored locations.</div></div><DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button variant="destructive" onClick={onConfirm}>Delete</Button></DialogFooter></DialogContent></Dialog>;
}

export function UpdateLocationNameDialog({ open, oldName, newName, options, onOldNameChange, onNewNameChange, onConfirm, onClose }: { open: boolean; oldName: string; newName: string; options: AutoSuggestOption[]; onOldNameChange: (value: string) => void; onNewNameChange: (value: string) => void; onConfirm: () => void; onClose: () => void }) {
  return <Dialog open={open} onOpenChange={onClose}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Update Location Name</DialogTitle></DialogHeader><div className="space-y-3"><div className="text-sm text-muted-foreground">Select the existing location name and enter the new name. This will update all matching source and destination records in the database.</div><div><div className="text-xs mb-1">Existing Location *</div><AutoSuggestSelect mode="single" value={oldName} onChange={(next) => onOldNameChange(singleValue(next))} options={options} placeholder="Choose Existing Location" openOnFocus={false} /></div><div><div className="text-xs mb-1">New Location Name *</div><Input value={newName} onChange={(event) => onNewNameChange(event.target.value)} placeholder="Enter New Location Name" /></div><div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">This will update the selected location name wherever it appears as Source Location or Destination Location.</div></div><DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={onConfirm}>Update</Button></DialogFooter></DialogContent></Dialog>;
}

export function SimpleRenameDialog({ open, title, currentName, onSubmit, onClose }: { open: boolean; title: string; currentName: string; onSubmit: (value: string) => void; onClose: () => void }) {
  const [value, setValue] = useState(currentName);
  return <Dialog open={open} onOpenChange={onClose}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader><Input value={value} onChange={(event) => setValue(event.target.value)} /><DialogFooter><Button variant="outline" onClick={onClose}>Close</Button><Button onClick={() => onSubmit(value)}>Save</Button></DialogFooter></DialogContent></Dialog>;
}

export function TollDialog({ open, title, rows, onClose, onSubmit, onChange }: { open: boolean; title: string; rows: TollRow[]; onClose: () => void; onSubmit: () => void; onChange: (rows: TollRow[]) => void }) {
  return <Dialog open={open} onOpenChange={onClose}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader><div className="max-h-[60vh] overflow-y-auto rounded-md border"><Table><TableHeader><TableRow><TableHead>Vehicle Type</TableHead><TableHead className="text-right">Toll (â‚¹)</TableHead></TableRow></TableHeader><TableBody>{rows.map((row, index) => <TableRow key={row.vehicle_type_id}><TableCell>{row.vehicle_type_name}</TableCell><TableCell className="text-right"><Input className="w-32 ml-auto" type="number" value={String(row.toll_charge ?? 0)} onChange={(event) => { const next = [...rows]; next[index] = { ...row, toll_charge: Number(event.target.value || 0) }; onChange(next); }} /></TableCell></TableRow>)}</TableBody></Table></div><DialogFooter><Button variant="outline" onClick={onClose}>Close</Button><Button onClick={onSubmit}>Save</Button></DialogFooter></DialogContent></Dialog>;
}
