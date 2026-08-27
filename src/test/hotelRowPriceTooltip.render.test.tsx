import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HotelRowPriceTooltip } from '@/pages/hotel-list/HotelRowPriceTooltip';

describe('HotelRowPriceTooltip hydrated offline breakdown', () => {
  it('uses the AxisRooms DOUBLE rate instead of a stale starting amount', () => {
    render(
      <HotelRowPriceTooltip
        hotel={{
          provider: 'axisrooms',
          startingFromBaseAmount: 7000,
          selectedTotalPrice: 7500,
          totalRoomCost: 6000,
          totalExtraBedCost: 1000,
          totalChildWithoutBedCost: 500,
          hotelMarginPercentage: 0,
          selectedPriceSnapshot: {
            provider: 'axisrooms',
            basePricePerNight: 7000,
            baseTotalPrice: 6000,
            extraBedCount: 1,
            extraBedRate: 1000,
            childWithoutBedCount: 1,
            childWithoutBedRate: 500,
            totalPrice: 7500,
          },
        } as any}
        grandTotal={7500}
        roomCount={1}
        extraBedCount={1}
        childWithoutBedCount={1}
      >
        ₹ 7,500.00
      </HotelRowPriceTooltip>,
    );

    fireEvent.mouseEnter(screen.getByLabelText('Show hotel price breakdown'), { clientX: 100, clientY: 100 });
    expect(screen.getByText('Room Cost').parentElement).toHaveTextContent('1 × ₹ 6,000.00 = ₹ 6,000.00');
    expect(screen.getByText('Total').parentElement).toHaveTextContent('₹ 7,500.00');
    expect(screen.getByText('Grand Total').parentElement).toHaveTextContent('₹ 7,500.00');
  });

  it('uses the offline one-night room amount instead of the continuous-stay base total', () => {
    render(
      <HotelRowPriceTooltip
        hotel={{
          provider: 'offline',
          startingFromBaseAmount: 3675,
          selectedTotalPrice: 60637.5,
          selectedPriceSnapshot: {
            provider: 'offline',
            baseTotalPrice: 55125,
            basePricePerNight: 55125,
            hotelMarginPercentage: 10,
            hotelMarginAmount: 5512.5,
            totalPrice: 60637.5,
            numberOfNights: 3,
          },
        } as any}
        grandTotal={60637.5}
        roomCount={5}
      >
        ₹ 60,637.50
      </HotelRowPriceTooltip>,
    );

    fireEvent.mouseEnter(screen.getByLabelText('Show hotel price breakdown'), { clientX: 100, clientY: 100 });
    expect(screen.getByText('Room Cost').parentElement).toHaveTextContent('5 × ₹ 3,675.00 = ₹ 18,375.00');
  });

  it('keeps the tooltip grand total equal to the authoritative row total', () => {
    render(
      <HotelRowPriceTooltip
        hotel={{
          provider: 'offline',
          startingFromBaseAmount: 3675,
          selectedTotalPrice: 20212.5,
          extraBedCount: 1,
          childWithoutBedCount: 1,
          extraBedRate: 950,
          childWithoutBedRate: 660,
          selectedPriceSnapshot: {
            provider: 'offline', baseTotalPrice: 18375, totalPrice: 20212.5,
            hotelMarginPercentage: 10, hotelMarginAmount: 1837.5,
            extraBedAmount: 0, childWithoutBedAmount: 0,
          },
        } as any}
        grandTotal={20212.5}
        roomCount={5}
      >
        ₹20,212.50
      </HotelRowPriceTooltip>,
    );

    fireEvent.mouseEnter(screen.getByLabelText('Show hotel price breakdown'), { clientX: 100, clientY: 100 });
    expect(screen.getByText('Grand Total').parentElement).toHaveTextContent(/20,212\.50/);
  });

  it('normalizes an occupancy-scoped starting amount to the per-room rate', () => {
    render(
      <HotelRowPriceTooltip
        hotel={{
          provider: 'offline',
          startingFromBaseAmount: 18375,
          selectedTotalPrice: 20212.5,
          selectedPriceSnapshot: {
            provider: 'offline',
            baseTotalPrice: 18375,
            totalPrice: 20212.5,
          },
        } as any}
        grandTotal={20212.5}
        roomCount={5}
      >
        ₹20,212.50
      </HotelRowPriceTooltip>,
    );

    fireEvent.mouseEnter(screen.getByLabelText('Show hotel price breakdown'), { clientX: 100, clientY: 100 });
    expect(screen.getByText('Room Cost').parentElement).toHaveTextContent(/5.*3,675\.00.*18,375\.00/);
  });

  it('normalizes the hydrated multi-room occupancy amount after reset', () => {
    render(
      <HotelRowPriceTooltip
        hotel={{
          provider: 'offline',
          startingFromBaseAmount: 3675,
          selectedTotalPrice: 20212.5,
          selectedPriceSnapshot: {
            provider: 'offline',
            baseTotalPrice: 91875,
            totalPrice: 20212.5,
          },
        } as any}
        grandTotal={20212.5}
        roomCount={5}
      >
        ₹102,833.50
      </HotelRowPriceTooltip>,
    );

    fireEvent.mouseEnter(screen.getByLabelText('Show hotel price breakdown'), { clientX: 100, clientY: 100 });
    expect(screen.getByText('Room Cost').parentElement).toHaveTextContent(/5.*3,675\.00.*18,375\.00/);
  });

  it('renders the authoritative SPRISE route-night amounts', () => {
    render(
      <HotelRowPriceTooltip
        hotel={{
          provider: 'offline',
          canonicalHotelId: 435,
          hotelCode: '435',
          rateOptionId: 'sprise-rate',
          selectedTotalPrice: 5700,
          selectedPriceSnapshot: {
            provider: 'offline', canonicalHotelId: 435, hotelCode: '435', rateOptionId: 'sprise-rate',
            pricingScope: 'ROUTE_NIGHT', basePricePerNight: 4750, baseTotalPrice: 4750,
            hotelMarginPercentage: 20, hotelMarginAmount: 950, hotelMarginTotalAmount: 950,
            pricePerNight: 5700, totalPrice: 5700, numberOfNights: 1,
          },
        } as any}
        grandTotal={5700}
        roomCount={1}
      >
        ₹ 5,700.00
      </HotelRowPriceTooltip>,
    );

    fireEvent.mouseEnter(screen.getByLabelText('Show hotel price breakdown'), { clientX: 100, clientY: 100 });
    expect(screen.getByText('Room Cost').parentElement).toHaveTextContent('1 × ₹ 4,750.00 = ₹ 4,750.00');
    expect(screen.getByText('Hotel Margin (20%)').parentElement).toHaveTextContent('₹ 950.00');
    expect(screen.getByText('Grand Total').parentElement).toHaveTextContent('₹ 5,700.00');
    expect(screen.queryByText('Margin breakdown unavailable')).not.toBeInTheDocument();
  });

  it('uses the API margin when a selected snapshot has no margin metadata', () => {
    render(
      <HotelRowPriceTooltip
        hotel={{
          provider: 'offline',
          selectedTotalPrice: 5700,
          selectedPriceSnapshot: {
            provider: 'offline',
            baseTotalPrice: 4750,
            totalPrice: 5700,
          },
        } as any}
        grandTotal={5700}
        roomCount={1}
        hotelMarginPercentage={20}
      >
        ₹ 5,700.00
      </HotelRowPriceTooltip>,
    );

    fireEvent.mouseEnter(screen.getByLabelText('Show hotel price breakdown'), { clientX: 100, clientY: 100 });
    expect(screen.getByText('Hotel Margin (20%)').parentElement).toHaveTextContent('₹ 950.00');
    expect(screen.queryByText('Margin breakdown unavailable')).not.toBeInTheDocument();
  });

  it('uses the persisted row margin when the cache snapshot contains zero margin', () => {
    render(
      <HotelRowPriceTooltip
        hotel={{
          provider: 'offline',
          selectedTotalPrice: 3370.5,
          totalRoomCost: 3370.5,
          totalHotelCost: 3370.5,
          hotelMarginPercentage: 7,
          selectedPriceSnapshot: { totalPrice: 3370.5 },
        } as any}
        grandTotal={3370.5}
        roomCount={1}
      >
        â‚¹ 3,370.50
      </HotelRowPriceTooltip>,
    );

    fireEvent.mouseEnter(screen.getByLabelText('Show hotel price breakdown'), { clientX: 100, clientY: 100 });
    expect(screen.getByText('Hotel Margin (7%)').parentElement).toHaveTextContent(/235\.94/);
    expect(screen.getByText('Grand Total').parentElement).toHaveTextContent(/3,370\.50/);
  });

  it('uses the complete room and supplement subtotal for multi-room margin', () => {
    render(
      <HotelRowPriceTooltip
        hotel={{
          provider: 'offline',
          selectedTotalPrice: 197175,
          selectedPriceSnapshot: {
            baseTotalPrice: 176400,
            extraBedAmount: 2850,
            extraBedRate: 950,
            hotelMarginPercentage: 10,
            totalPrice: 197175,
          },
        } as any}
        grandTotal={197175}
        roomCount={4}
        extraBedCount={3}
      >
        ₹ 197,175.00
      </HotelRowPriceTooltip>,
    );

    fireEvent.mouseEnter(screen.getByLabelText('Show hotel price breakdown'), { clientX: 100, clientY: 100 });
    expect(screen.getByText('Total').parentElement).toHaveTextContent('₹ 1,79,250.00');
    expect(screen.getByText('Hotel Margin (10%)').parentElement).toHaveTextContent('₹ 17,925.00');
    expect(screen.getByText('Grand Total').parentElement).toHaveTextContent('₹ 1,97,175.00');
  });
});
