import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HotelRowPriceTooltip } from '@/pages/hotel-list/HotelRowPriceTooltip';

const openTooltip = () => fireEvent.mouseEnter(screen.getByLabelText('Show hotel price breakdown'), { clientX: 100, clientY: 100 });

describe('HotelRowPriceTooltip', () => {
  it('renders the API-provided breakdown without recalculating it', () => {
    render(<HotelRowPriceTooltip
      hotel={{
        provider: 'axisrooms',
        startingFromBaseAmount: 7000,
        selectedTotalPrice: 9999,
        noOfRooms: 2,
        totalRoomCost: 6000,
        roomRate: 3000,
        extraBedCount: 1,
        extraBedRate: 1000,
        totalExtraBedCost: 1000,
        hotelMarginPercentage: 10,
        hotelMarginAmount: 700,
        hotelMarginBaseAmount: 7000,
        totalHotelCost: 7700,
        selectedPriceSnapshot: { basePricePerNight: 7000, totalPrice: 9999 },
      } as any}
      grandTotal={9999}
      roomCount={1}
      extraBedCount={0}
    >₹ 7,700.00</HotelRowPriceTooltip>);

    openTooltip();
    expect(screen.getByText('Room Cost').parentElement).toHaveTextContent('2 × ₹ 3,000.00 = ₹ 6,000.00');
    expect(screen.getByText('Extra Bed Cost').parentElement).toHaveTextContent('1 × ₹ 1,000.00 = ₹ 1,000.00');
    expect(screen.getByText('Total').parentElement).toHaveTextContent('₹ 7,000.00');
    expect(screen.getByText('Hotel Margin (10%)').parentElement).toHaveTextContent('₹ 700.00');
    expect(screen.getByText('Grand Total').parentElement).toHaveTextContent('₹ 7,700.00');
  });

  it('does not invent supplement or margin lines when the API omits them', () => {
    render(<HotelRowPriceTooltip
      hotel={{ provider: 'offline', totalRoomCost: 5000, roomRate: 5000, totalHotelCost: 5000 } as any}
      grandTotal={5000}
      roomCount={1}
      extraBedCount={1}
      childWithoutBedCount={1}
      hotelMarginPercentage={10}
    >₹ 5,000.00</HotelRowPriceTooltip>);

    openTooltip();
    expect(screen.getByText('Grand Total').parentElement).toHaveTextContent('₹ 5,000.00');
    expect(screen.queryByText('Extra Bed Cost')).not.toBeInTheDocument();
    expect(screen.queryByText('Without Bed Cost')).not.toBeInTheDocument();
    expect(screen.queryByText(/Hotel Margin/)).not.toBeInTheDocument();
  });

  it('renders AxisRooms baseTotalPrice as the API total', () => {
    render(<HotelRowPriceTooltip
      hotel={{
        provider: 'axisrooms',
        baseTotalPrice: 9600,
        hotelMarginPercentage: 6,
        hotelMarginAmount: 576,
        totalPrice: 10176,
      } as any}
      grandTotal={10176}
    >₹ 10,176.00</HotelRowPriceTooltip>);

    openTooltip();
    expect(screen.getByText('Total').parentElement).toHaveTextContent('₹ 9,600.00');
    expect(screen.getByText('Hotel Margin (6%)').parentElement).toHaveTextContent('₹ 576.00');
    expect(screen.getByText('Grand Total').parentElement).toHaveTextContent('₹ 10,176.00');
  });

  it('renders the canonical AxisRooms room equation without deriving it', () => {
    render(<HotelRowPriceTooltip
      hotel={{ provider: 'axisrooms', roomCount: 2, roomRate: 6800, totalRoomCost: 13600,
        totalHotelCost: 20034, selectedPriceSnapshot: { hotelMarginBaseAmount: 18900,
          hotelMarginPercentage: 6, hotelMarginAmount: 1134 } } as any}
      grandTotal={20034}
      roomCount={2}
    >â‚¹ 20,034.00</HotelRowPriceTooltip>);

    openTooltip();
    expect(screen.getByText('Room Cost').parentElement).toHaveTextContent('2 × ₹ 6,800.00 = ₹ 13,600.00');
  });
  it('falls back to the API snapshot when a normalized aggregate is zero', () => {
    render(<HotelRowPriceTooltip
      hotel={{
        provider: 'axisrooms',
        hotelMarginBaseAmount: 0,
        totalHotelCost: 0,
        selectedPriceSnapshot: {
          hotelMarginBaseAmount: 9600,
          hotelMarginPercentage: 6,
          hotelMarginTotalAmount: 576,
          totalPrice: 10176,
        },
      } as any}
      grandTotal={0}
    >â‚¹ 10,176.00</HotelRowPriceTooltip>);

    openTooltip();
    expect(screen.getByText('Total').parentElement).toHaveTextContent('9,600.00');
    expect(screen.getByText('Hotel Margin (6%)').parentElement).toHaveTextContent('576.00');
    expect(screen.getByText('Grand Total').parentElement).toHaveTextContent('10,176.00');
  });
});
