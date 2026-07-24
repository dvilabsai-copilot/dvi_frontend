// Helper utilities for Itinerary View

import { ViaRouteItem } from './types';

/**
 * Format via routes for display (with formatting)
 */
export function formatViaRoutesWithArrows(viaRoutes: ViaRouteItem[]): string {
  if (!viaRoutes || viaRoutes.length === 0) return '';

  return viaRoutes
    .map((via) => `<i class="ti ti-arrow-right"></i> ${via.itinerary_via_location_name}`)
    .join(' ');
}

/**
 * Format via routes for display (without formatting)
 */
export function formatViaRoutesPlain(viaRoutes: ViaRouteItem[]): string {
  if (!viaRoutes || viaRoutes.length === 0) return '';

  return viaRoutes
    .map((via) => via.itinerary_via_location_name)
    .join(', ');
}

/**
 * Format date for display
 */
export function formatItineraryDate(dateString: string): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Format time for display
 */
export function formatTime(timeString: string): string {
  const date = new Date(timeString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Check if time is before 6 AM
 */
export function isBeforeSixAM(timeString: string): boolean {
  const date = new Date(timeString);
  const hours = date.getHours();
  return hours < 6;
}

/**
 * Check if time is after 8 PM
 */
export function isAfterEightPM(timeString: string): boolean {
  const date = new Date(timeString);
  const hours = date.getHours();
  return hours >= 20;
}

/**
 * Calculate total PAX count
 */
export function calculateTotalPax(adults: number, children: number, infants: number): number {
  return adults + children + infants;
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, symbol: string = '₹'): string {
  return `${symbol} ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Calculate date range
 */
export function calculateDateRange(startDate: string, endDate: string): { nights: number; days: number } {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    nights: diffDays,
    days: diffDays + 1
  };
}

/**
 * Check if it's a day trip (source city === destination city)
 */
export function isDayTrip(previousDestination: string | null, currentSource: string, currentDestination: string): boolean {
  if (!previousDestination) return false;
  return previousDestination === currentSource && currentSource === currentDestination;
}

/**
 * Get itinerary preference label
 */
export function getItineraryPreferenceLabel(preference: number): string {
  switch (preference) {
    case 1:
      return 'Hotel';
    case 2:
      return 'Vehicle';
    case 3:
      return 'Both';
    default:
      return 'Unknown';
  }
}

/**
 * Get guide type label
 */
export function getGuideTypeLabel(type: number): string {
  switch (type) {
    case 1:
      return 'Full Itinerary';
    case 2:
      return 'Day-wise';
    default:
      return 'Unknown';
  }
}
