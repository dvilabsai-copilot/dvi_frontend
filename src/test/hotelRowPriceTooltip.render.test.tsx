import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HotelRowPriceTooltip } from '@/pages/hotel-list/HotelRowPriceTooltip';

describe('HotelRowPriceTooltip hydrated offline breakdown', () => {
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
    expect(screen.getByText('Total Room Cost').parentElement).toHaveTextContent('₹ 4,750.00');
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
});
