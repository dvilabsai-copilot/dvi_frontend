import {
  applyChildAgesToTemplate,
  buildSupplierOccupancies,
  buildTboOccupancies,
  type QuotationOccupancy,
} from './quotationOccupancy.utils';

export const resolveQuotationBookingOccupancy = ({
  requiresHotelBookingFlow,
  requiresDetailedPassengerFlow,
  confirmOccupanciesTemplate,
  normalizedAdditionalChildren,
  roomCount,
  adults,
  children,
}: {
  requiresHotelBookingFlow: boolean;
  requiresDetailedPassengerFlow: boolean;
  confirmOccupanciesTemplate: QuotationOccupancy[] | null;
  normalizedAdditionalChildren: Array<{ age: string }>;
  roomCount: number;
  adults: number;
  children: number;
}): { childAges: number[]; occupancies: QuotationOccupancy[] } => {
  const childAges = requiresDetailedPassengerFlow
    ? (confirmOccupanciesTemplate && confirmOccupanciesTemplate.length > 0
      ? confirmOccupanciesTemplate.flatMap((occupancy) =>
          Array.isArray(occupancy.childrenAges) ? occupancy.childrenAges.map(Number) : [],
        )
      : normalizedAdditionalChildren.map((child) => Number(child.age)))
        .filter((age) => Number.isFinite(age) && age >= 0 && age <= 11)
    : [];
  const totalAdults = Math.max(Number(adults || 1), 1);
  const totalChildren = Math.max(Number(children || 0), 0);
  const occupancies = !requiresHotelBookingFlow
    ? []
    : requiresDetailedPassengerFlow
      ? confirmOccupanciesTemplate && confirmOccupanciesTemplate.length > 0
        ? applyChildAgesToTemplate(confirmOccupanciesTemplate, childAges)
        : buildTboOccupancies(roomCount, totalAdults, childAges)
      : buildSupplierOccupancies(roomCount, totalAdults, totalChildren);
  return { childAges, occupancies };
};
