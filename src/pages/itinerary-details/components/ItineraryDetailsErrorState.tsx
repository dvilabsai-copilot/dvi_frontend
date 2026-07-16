import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export interface ItineraryDetailsErrorStateProps {
  error: string | null;
  planId?: number;
}

export function ItineraryDetailsErrorState({ error, planId }: ItineraryDetailsErrorStateProps) {
  return (
    <div className="w-full max-w-full flex flex-col items-center py-16 gap-4">
      <p className="text-sm text-red-600">{error || "Itinerary details not found"}</p>
      {planId && (
        <Link to={`/create-itinerary?id=${planId}`}>
          <Button variant="outline" className="border-[#d546ab] text-[#d546ab] hover:bg-[#fdf6ff]">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Route List
          </Button>
        </Link>
      )}
    </div>
  );
}
