import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const ItineraryDetailsLazy = React.lazy(async () => {
  type ItineraryDetailsModule = {
    ItineraryDetails?: React.ComponentType<{ readOnly?: boolean; presentationMode?: string }>;
    default?: React.ComponentType<{ readOnly?: boolean; presentationMode?: string }>;
  };
  const mod = await import('./ItineraryDetails') as ItineraryDetailsModule;
  const Resolved = mod?.ItineraryDetails || mod?.default;

  if (!Resolved) {
    console.error('ItineraryDetailsRouter: failed to resolve ItineraryDetails export from lazy import', {
      keys: Object.keys(mod || {}),
    });

    return {
      default: () => (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-red-600 font-semibold">Unable to load itinerary details component.</p>
            <p className="text-sm text-gray-600 mt-1">Please refresh this page once.</p>
          </div>
        </div>
      ),
    };
  }

  return { default: Resolved };
});

/**
 * Normal itinerary-details route. Confirmed itineraries are routed directly
 * to ConfirmedItineraryDetails in App.tsx, so this boundary performs no
 * confirmation probe before the normal page loads.
 */
export const ItineraryDetailsRouter: React.FC = () => {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-[#4ba3c3]" />
            <p className="text-gray-600">Loading itinerary...</p>
          </div>
        </div>
      }
    >
      <ItineraryDetailsLazy readOnly={false} presentationMode="standard" />
    </Suspense>
  );
};
