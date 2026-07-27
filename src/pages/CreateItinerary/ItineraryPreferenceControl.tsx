import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type Preference = 'vehicle' | 'hotel' | 'both';

export function ItineraryPreferenceControl({
  value,
  onChange,
  isVehicleAgent,
}: {
  value: Preference;
  onChange: (value: Preference) => void;
  isVehicleAgent: boolean;
}) {
  return (
    <div className="flex-1 bg-[#fef8ff] border border-[#e9d4ff] rounded-md p-3">
      <Label className="mb-2 block text-sm text-[#4a4260]">
        Itinerary Preference *
      </Label>
      {isVehicleAgent ? (
        <div data-testid="vehicle-agent-preference" className="text-sm font-medium text-[#4a4260]">
          Itinerary Demo
        </div>
      ) : (
        <RadioGroup
          value={value}
          onValueChange={(next) => onChange(next as Preference)}
          className="flex flex-wrap gap-4"
        >
          <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="vehicle" id="vehicle" />Vehicle</label>
          <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="hotel" id="hotel" />Hotel</label>
          <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="both" id="both" />Both Hotel and Vehicle</label>
        </RadioGroup>
      )}
    </div>
  );
}
