// DVI_AGENT_CABS_HOTELS_TOURS_ISOLATED_20261110: Agent Create Itinerary mode tabs, shown only in the Agent copy.
import { CarFront, Hotel, Compass } from "lucide-react";

type Preference = "vehicle" | "hotel" | "both";
const modes = [
  {value: "vehicle", label: "Cabs", Icon: CarFront},
  {value: "hotel", label: "Hotels", Icon: Hotel},
  {value: "both", label: "Tours & Attractions", Icon: Compass},
] as const;

export function AgentCreateModeTabs({ value, onChange }: {
  value: Preference;
  onChange: (value: Preference) => void;
}) {
  return (
    <div className="mb-3 rounded-xl border border-[#e5d8fa] bg-[#fbf9ff] p-2.5 sm:p-3" data-agent-create-modes>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Create Itinerary type">
        {modes.map(({value: mode, label, Icon}) => {
          const active = value === mode;
          return (
            <button key={mode} type="button" role="tab" aria-selected={active}
              onClick={() => onChange(mode)}
              className={
                "inline-flex min-h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 sm:flex-none " +
                (active ? "border-violet-500 bg-gradient-to-r from-violet-700 to-fuchsia-600 text-white shadow-sm" : "border-violet-100 bg-white text-[#29265a] hover:border-violet-400 hover:bg-violet-50")
              }>
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
