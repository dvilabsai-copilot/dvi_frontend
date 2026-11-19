import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { HotelIntentPreviewResponse } from '@/services/itinerary';
import { HotelCardAvailabilityAction } from './HotelCardAvailabilityAction';

function deferredPreview() {
  let resolve!: (value: HotelIntentPreviewResponse) => void;
  const response = new Promise<HotelIntentPreviewResponse>((complete) => { resolve = complete; });
  return { response, resolve };
}

const base = { className: '', disabled: false, choosing: false };

describe('HotelCardAvailabilityAction', () => {
  it('requires a positive availability result before calling the Choose flow', async () => {
    const pending = deferredPreview();
    const run = vi.fn(() => pending.response);
    const onChoose = vi.fn();
    render(<HotelCardAvailabilityAction {...base} request={{ key: 'live', planId: 100, run }} onChoose={onChoose} />);

    expect(screen.queryByRole('button', { name: 'Choose' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Check availability' }));
    expect(screen.getByRole('button', { name: 'Checking availability…' })).toBeDisabled();
    await act(async () => pending.resolve({ status: 'AVAILABLE' }));
    expect(run).toHaveBeenCalledTimes(1);
    expect(onChoose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Choose' }));
    expect(onChoose).toHaveBeenCalledTimes(1);
    act(() => onChoose.mock.calls[0][0]({ status: 'NO_AVAILABILITY', message: 'Rate expired for this stay.' }));
    expect(screen.getByRole('button', { name: 'Not Available' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Rate expired');
  });

  it('offers a retry for a supplier error and shows a definitive no-rate result before Choose', async () => {
    const run = vi.fn()
      .mockResolvedValueOnce({ status: 'REFRESH_FAILED', message: 'Supplier timed out.' })
      .mockResolvedValueOnce({ status: 'NO_AVAILABILITY', message: 'No current rate for Bellmount on 2026-12-07.' });
    const onChoose = vi.fn();
    render(<HotelCardAvailabilityAction {...base} request={{ key: 'bellmount', planId: 101, run }} onChoose={onChoose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Check availability' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Retry availability' }));
    expect(await screen.findByRole('button', { name: 'Not Available' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('2026-12-07');
    expect(screen.queryByRole('button', { name: 'Choose' })).toBeNull();
    expect(onChoose).not.toHaveBeenCalled();
  });

  it('discards an old availability result after switching to a different rate', async () => {
    const pending = deferredPreview();
    const oldRun = vi.fn((_signal: AbortSignal) => pending.response);
    const run = vi.fn().mockResolvedValue({ status: 'NO_AVAILABILITY' });
    const onChoose = vi.fn();
    const { rerender } = render(
      <HotelCardAvailabilityAction key="CP" {...base} request={{ key: 'CP', planId: 102, run: oldRun }} onChoose={onChoose} />,
    );
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Check availability' })));
    const signal = oldRun.mock.calls[0][0];

    rerender(<HotelCardAvailabilityAction key="MAP" {...base} request={{ key: 'MAP', planId: 102, run }} onChoose={onChoose} />);
    expect(signal.aborted).toBe(true);
    await act(async () => pending.resolve({ status: 'AVAILABLE' }));
    expect(screen.queryByRole('button', { name: 'Choose' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Check availability' }));
    expect(await screen.findByRole('button', { name: 'Not Available' })).toBeDisabled();
  });
});
