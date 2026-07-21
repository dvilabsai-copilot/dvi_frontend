import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type VehicleRouteRestrictionDialogProps = {
  message: string | null;
  onClose: () => void;
};

export function VehicleRouteRestrictionDialog({ message, onClose }: VehicleRouteRestrictionDialogProps) {
  const vehicleOnly = Boolean(message && /This is a vehicle-type restriction|Changing the departure time will not remove this restriction/i.test(message));
  const allVehicleTimeRule = Boolean(message && /This restriction applies to every vehicle/i.test(message));
  const allowedVehicleMatch = message?.match(/Allowed vehicle types:\s*([\s\S]*)$/i);
  const allowedVehicleTypes = allowedVehicleMatch?.[1]
    ?.replace(/\.$/, '')
    .split(/,\s*/)
    .map((name) => name.trim())
    .filter(Boolean) || [];
  const messageWithoutAllowedVehicles = allowedVehicleMatch && typeof allowedVehicleMatch.index === 'number'
    ? message?.slice(0, allowedVehicleMatch.index).trim()
    : message;
  return (
    <Dialog open={Boolean(message)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-xl border-red-200" onClose={onClose}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-4 w-4" />
            </span>
            Vehicle route restriction
          </DialogTitle>
          <DialogDescription>
            {vehicleOnly
              ? "This itinerary cannot be saved because the selected vehicle is not permitted on this route."
              : allVehicleTimeRule
                ? "This itinerary cannot be saved because every vehicle is restricted during this time window."
                : "The requested timeline cannot be saved with the selected vehicle and departure time."}
          </DialogDescription>
        </DialogHeader>
        <div role="alert" className="whitespace-pre-line rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900">
          {messageWithoutAllowedVehicles}
        </div>
        {allowedVehicleTypes.length > 0 && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-sm font-semibold text-emerald-900">Allowed vehicle types</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {allowedVehicleTypes.map((vehicleType) => (
                <span key={vehicleType} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-800 shadow-sm">
                  {vehicleType}
                </span>
              ))}
            </div>
          </div>
        )}
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              {vehicleOnly ? "Choose another vehicle" : allVehicleTimeRule ? "Change departure time or route" : "Change vehicle or departure time"}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default VehicleRouteRestrictionDialog;
