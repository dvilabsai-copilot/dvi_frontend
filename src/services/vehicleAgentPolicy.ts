import { USER_ROLES } from '@/constants/systemRoles';
import type { AuthTokenPayload } from './accessControl';

export const VEHICLE_ONLY_PREFERENCE = 'vehicle' as const;

export function isVehicleAgentRole(role: unknown): boolean {
  return Number(role) === USER_ROLES.VEHICLE_AGENT;
}

export function isVehicleAgentUser(user: AuthTokenPayload | null): boolean {
  return isVehicleAgentRole(user?.roleID ?? user?.role);
}

export function getEffectiveItineraryPreference(
  user: AuthTokenPayload | null,
  requested: 'vehicle' | 'hotel' | 'both',
): 'vehicle' | 'hotel' | 'both' {
  return isVehicleAgentUser(user) ? VEHICLE_ONLY_PREFERENCE : requested;
}

export const VEHICLE_AGENT_MENU_IDS = [
  'dashboard',
  'create-itinerary',
  'latest-itinerary',
  'confirmed-itinerary',
  'profile',
] as const;
