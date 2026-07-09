import React, { Suspense, useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { ItineraryService } from '@/services/itinerary';
import { ConfirmedItineraryDetails } from './ConfirmedItineraryDetails';
import { Loader2 } from 'lucide-react';

const ItineraryDetailsLazy = React.lazy(async () => {
  const mod: any = await import('./ItineraryDetails');
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
 * Smart router that checks if itinerary is confirmed
 * Renders ItineraryDetails in readOnly mode if confirmed, else in edit mode
 * No separate component needed - ItineraryDetails handles both modes via readOnly prop
 */
export const ItineraryDetailsRouter: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [isConfirmed, setIsConfirmed] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('Missing itinerary ID in URL');
      setIsConfirmed(false);
      return;
    }

    const isConfirmedRoute = location.pathname.startsWith('/confirmed-itinerary/');

    // If this is a confirmed itinerary route,
    // do not call the normal itinerary details API
    if (isConfirmedRoute) {
      setIsConfirmed(true);
      setError(null);
      return;
    }

    const checkConfirmationStatus = async () => {
      try {
        const response = await ItineraryService.getDetails(id);

        const apiConfirmed =
          response?.isConfirmed === true || response?.status === 'CONFIRMED';

        setIsConfirmed(apiConfirmed);
        setError(null);
      } catch (err: any) {
        console.error('Failed to check itinerary status:', err);
        setIsConfirmed(false);
        setError(err?.message || 'Failed to load itinerary');
      }
    };

    checkConfirmationStatus();
  }, [id, location.pathname]);

  // Loading state
  if (isConfirmed === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#4ba3c3]" />
          <p className="text-gray-600">Loading itinerary...</p>
        </div>
      </div>
    );
  }

  // Confirmed itinerary route
  if (location.pathname.startsWith('/confirmed-itinerary/')) {
    if (!ConfirmedItineraryDetails) {
      console.error('ItineraryDetailsRouter: ConfirmedItineraryDetails component is undefined');
      return (
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-red-600 font-semibold">Unable to load confirmed itinerary component.</p>
        </div>
      );
    }
    return <ConfirmedItineraryDetails confirmedPlanId={Number(id)} />;
  }

  // Error state - default to edit mode
  if (error) {
    console.warn('Error checking confirmation status, loading in edit mode:', error);
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
        <ItineraryDetailsLazy readOnly={false} />
      </Suspense>
    );
  }

  // Normal itinerary route
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
      <ItineraryDetailsLazy
        readOnly={isConfirmed}
        presentationMode={isConfirmed ? 'confirmed' : 'standard'}
      />
    </Suspense>
  );
};
