import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { ItineraryService } from '@/services/itinerary';
import { ItineraryDetails } from './ItineraryDetails';
import { ConfirmedItineraryDetails } from './ConfirmedItineraryDetails';
import { Loader2 } from 'lucide-react';

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
    return <ConfirmedItineraryDetails confirmedPlanId={Number(id)} />;
  }

  // Error state - default to edit mode
  if (error) {
    console.warn('Error checking confirmation status, loading in edit mode:', error);
    return <ItineraryDetails readOnly={false} />;
  }

  // Normal itinerary route
  return <ItineraryDetails readOnly={isConfirmed} />;
};
