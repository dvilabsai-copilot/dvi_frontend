import { describe, expect, it } from 'vitest';
import { USER_ROLES } from '@/constants/systemRoles';
import {
  getEffectiveItineraryPreference,
  isVehicleAgentRole,
} from './vehicleAgentPolicy';

describe('vehicle agent policy', () => {
  it('uses the restricted role ID and forces vehicle preference', () => {
    expect(isVehicleAgentRole(USER_ROLES.VEHICLE_AGENT)).toBe(true);
    expect(getEffectiveItineraryPreference({ roleID: 9 }, 'hotel')).toBe('vehicle');
    expect(getEffectiveItineraryPreference({ roleID: 4 }, 'hotel')).toBe('hotel');
  });
});
