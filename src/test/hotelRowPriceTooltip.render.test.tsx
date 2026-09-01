import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HotelRowPriceTooltip } from '@/pages/hotel-list/HotelRowPriceTooltip';

const openTooltip = () => fireEvent.mouseEnter(screen.getByLabelText('Show hotel price breakdown'), { clientX: 100, clientY: 100 });

describe('HotelRowPriceTooltip', () => {
  it('shows VSR aggregate room cost as a per-room equation', () => {
    render(<HotelRowPriceTooltip
      hotel={{
        provider: 'tbo',
        totalRoomCost: 12667.18,
        roomRate: 12667.18,
        hotelMarginPercentage: 10,
        hotelMarginAmount: 1266.72,
        hotelMarginBaseAmount: 12667.18,
        totalHotelCost: 13933.90,
      } as any}
      grandTotal={13933.90}
      roomCount={2}
    >₹ 6,966.95</HotelRowPriceTooltip>);

    openTooltip();
    expect(screen.getByText('Room Cost').parentElement).toHaveTextContent('2 × ₹ 6,333.59 = ₹ 12,667.18');
    expect(screen.getByText('Hotel Margin (10%)').parentElement).toHaveTextContent('₹ 1,266.72');
    expect(screen.getByText('Grand Total').parentElement).toHaveTextContent('₹ 13,933.90');
  });

  it('hides supplement cost rows for VSR even when supplement fields are present', () => {
    render(<HotelRowPriceTooltip
      hotel={{
        provider: 'tbo',
        totalRoomCost: 12667.18,
        roomRate: 12667.18,
        extraBedCount: 1,
        extraBedRate: 1000,
        totalExtraBedCost: 1000,
        childWithBedCount: 1,
        childWithBedRate: 1200,
        totalChildWithBedCost: 1200,
        childWithoutBedCount: 1,
        childWithoutBedRate: 800,
        totalChildWithoutBedCost: 800,
        totalHotelCost: 15667.18,
      } as any}
      grandTotal={15667.18}
      roomCount={2}
    >â‚¹ 7,833.59</HotelRowPriceTooltip>);

    openTooltip();
    expect(screen.queryByText('Extra Bed Cost')).not.toBeInTheDocument();
    expect(screen.queryByText('With Bed Cost')).not.toBeInTheDocument();
    expect(screen.queryByText('Without Bed Cost')).not.toBeInTheDocument();
    expect(screen.getByText('Grand Total').parentElement).toHaveTextContent('15,667.18');
  });

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
      grandTotal={7700}
      roomCount={2}
      extraBedCount={0}
    >₹ 7,700.00</HotelRowPriceTooltip>);

    openTooltip();
    expect(screen.getByText('Room Cost').parentElement).toHaveTextContent('2 × ₹ 3,000.00 = ₹ 6,000.00');
    expect(screen.getByText('Extra Bed Cost').parentElement).toHaveTextContent('1 × ₹ 1,000.00 = ₹ 1,000.00');
    expect(screen.getByText('Total').parentElement).toHaveTextContent('₹ 7,000.00');
    expect(screen.getByText('Hotel Margin (10%)').parentElement).toHaveTextContent('₹ 700.00');
    expect(screen.getByText('Grand Total').parentElement).toHaveTextContent('₹ 7,700.00');
  });

  it('derives the displayed unit rate from the aggregate for manual rows', () => {
    render(<HotelRowPriceTooltip
      hotel={{
        provider: 'offline',
        totalRoomCost: 17700,
        roomRate: 17700,
        totalHotelCost: 18762,
        hotelMarginAmount: 1062,
      } as any}
      grandTotal={18762}
      roomCount={3}
    >₹ 18,762.00</HotelRowPriceTooltip>);

    openTooltip();
    expect(screen.getByText('Room Cost').parentElement).toHaveTextContent('3 × ₹ 5,900.00 = ₹ 17,700.00');
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
  it('keeps the tooltip grand total identical to the rendered row amount', () => {
    render(<HotelRowPriceTooltip
      hotel={{ provider: 'axisrooms', totalHotelCost: 18900, totalRoomCost: 13600, roomRate: 6800 } as any}
      grandTotal={20034}
      roomCount={2}
    >₹ 20,034.00</HotelRowPriceTooltip>);

    openTooltip();
    expect(screen.getByText('Grand Total').parentElement).toHaveTextContent('20,034.00');
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

  it('groups multi-room costs by the selected physical-room category', () => {
    render(<HotelRowPriceTooltip
      hotel={{
        provider: 'offline',
        totalHotelCost: 24000,
        selectedPriceSnapshot: {
          roomTypeBreakdown: [
            { roomType: 'Garden Cottage', roomCount: 1, roomRate: 6800, roomCost: 6800, childWithBedCount: 1, childWithBedRate: 1000, childWithBedCost: 1000, subtotal: 7800 },
            { roomType: 'Deluxe', roomCount: 1, roomRate: 7500, roomCost: 7500, childWithBedCount: 1, childWithBedRate: 1200, childWithBedCost: 1200, childWithoutBedCount: 1, childWithoutBedRate: 900, childWithoutBedCost: 900, subtotal: 9600 },
            { roomType: 'Garden Cottage', roomCount: 1, roomRate: 6800, roomCost: 6800, childWithBedCount: 1, childWithBedRate: 1000, childWithBedCost: 1000, subtotal: 7800 },
          ],
          hotelMarginBaseAmount: 25200,
          hotelMarginPercentage: 0,
          totalPrice: 25200,
        },
      } as any}
      grandTotal={25200}
      roomCount={3}
    >₹ 25,200.00</HotelRowPriceTooltip>);

    openTooltip();
    expect(screen.getByText('Garden Cottage').parentElement).toHaveTextContent('2 rooms');
    expect(screen.getByText('Deluxe').parentElement).toHaveTextContent('1 room');
    expect(screen.getByText('Garden Cottage').parentElement?.parentElement).toHaveTextContent('With Bed Cost');
    expect(screen.getByText('Without Bed Cost').parentElement).toHaveTextContent('1 x ₹ 900.00 = ₹ 900.00');
    expect(screen.getByText('Grand Total').parentElement).toHaveTextContent('25,200.00');
  });

  it('uses the mixed-room snapshot margin instead of a stale flattened row margin', () => {
    render(<HotelRowPriceTooltip
      hotel={{
        hotelMarginTotalAmount: 1452,
        totalHotelCost: 23161,
        selectedPriceSnapshot: {
          hotelMarginBaseAmount: 21850,
          hotelMarginPercentage: 6,
          hotelMarginTotalAmount: 1311,
          roomTypeBreakdown: [
            { roomType: 'Garden Cottage', roomCount: 2, roomRate: 6800, roomCost: 13600, childWithBedCount: 2, childWithBedRate: 1000, childWithBedCost: 2000, subtotal: 15600 },
            { roomType: 'Deluxe', roomCount: 1, roomRate: 4450, roomCost: 4450, childWithBedCount: 1, childWithBedRate: 1000, childWithBedCost: 1000, childWithoutBedCount: 1, childWithoutBedRate: 800, childWithoutBedCost: 800, subtotal: 6250 },
          ],
        },
      } as any}
      grandTotal={23161}
      roomCount={3}
    >₹ 23,161.00</HotelRowPriceTooltip>);

    openTooltip();
    expect(screen.getByText('Hotel Margin (6%)').parentElement).toHaveTextContent('1,311.00');
    expect(screen.getByText('Grand Total').parentElement).toHaveTextContent('23,161.00');
  });
});
