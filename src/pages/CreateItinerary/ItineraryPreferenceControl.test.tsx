// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ItineraryPreferenceControl } from './ItineraryPreferenceControl';

describe('ItineraryPreferenceControl', () => {
  it('does not render preference radio inputs for a vehicle agent', () => {
    render(<ItineraryPreferenceControl value="vehicle" onChange={() => undefined} isVehicleAgent />);
    expect(screen.getByTestId('vehicle-agent-preference')).toHaveTextContent('Itinerary Demo');
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
  });

  it('keeps the normal preference radios for other roles', () => {
    render(<ItineraryPreferenceControl value="both" onChange={() => undefined} isVehicleAgent={false} />);
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });
});
