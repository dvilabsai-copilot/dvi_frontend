import React from "react";

type VehicleQuote = Record<string, unknown>;
interface Props {
  vehicles: VehicleQuote[];
  selectedVendorEligibleId?: number | null;
  resolveVehicleDisplayAmount: (vehicle: VehicleQuote) => number;
  formatCurrencyINR: (value: number | string | undefined | null) => string;
  vehicleTypeLabel: string;
}

const vendorName = (vehicle: VehicleQuote): string =>
  String(vehicle.vendorName ?? "").trim() || "Unnamed vendor";

/**
 * Reuses the same vendor and total-selling inputs as the comparison table.
 * Shows all quotations that fit; only hidden quotations get the +N badge.
 */
export const VehicleVendorInlineSummary: React.FC<Props> = ({
  vehicles,
  selectedVendorEligibleId,
  resolveVehicleDisplayAmount,
  formatCurrencyINR,
  vehicleTypeLabel,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const measureRef = React.useRef<HTMLDivElement>(null);
  const popupRef = React.useRef<HTMLDetailsElement>(null);
  const [visibleCount, setVisibleCount] = React.useState(1);

  const ordered = React.useMemo(() => {
    if (!Array.isArray(vehicles)) return [];
    const selectedId = Number(selectedVendorEligibleId ?? 0);
    const current = vehicles.find(vehicle =>
      selectedId > 0 && Number(vehicle.vendorEligibleId ?? 0) === selectedId,
    ) ?? vehicles.find(vehicle => vehicle.isAssigned === true);
    return current ? [current, ...vehicles.filter(vehicle => vehicle !== current)] : vehicles;
  }, [vehicles, selectedVendorEligibleId]);

  const price = React.useCallback((vehicle: VehicleQuote): string => {
    if (vehicle.grandTotal == null && vehicle.totalAmount == null) return "—";
    const amount = Number(resolveVehicleDisplayAmount(vehicle));
    return Number.isFinite(amount) ? formatCurrencyINR(amount) : "—";
  }, [resolveVehicleDisplayAmount, formatCurrencyINR]);

  const signature = ordered.map(vehicle => [
    vehicle.vendorEligibleId, vehicle.vendorName, vehicle.grandTotal,
    vehicle.totalAmount, vehicle.isAssigned,
  ].join(':')).join('|');

  React.useLayoutEffect(() => {
    if (!ordered.length) return;
    const root = containerRef.current;
    const measure = measureRef.current;
    if (!root || !measure) return;
    const update = () => {
      const space = Math.floor(root.getBoundingClientRect().width);
      const widths = Array.from(measure.querySelectorAll<HTMLElement>('[data-quote-measure]'))
        .map(node => Math.ceil(node.getBoundingClientRect().width));
      const badge = measure.querySelector<HTMLElement>('[data-overflow-measure]');
      const badgeWidth = Math.ceil(badge?.getBoundingClientRect().width ?? 0);
      if (!space || widths.length !== ordered.length) return;
      let count = 1;
      for (let n = widths.length; n >= 1; n--) {
        const hasHidden = n < widths.length;
        const cellCount = n + Number(hasHidden);
        const total = widths.slice(0,n).reduce((a,b)=>a+b,0)
          + 12 * Math.max(0,cellCount-1) + (hasHidden ? badgeWidth : 0);
        if (total <= space || n === 1) { count=n; break; }
      }
      setVisibleCount(previous => previous === count ? previous : count);
    };
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(root);
    window.addEventListener('resize',update);
    update();
    return () => {observer?.disconnect(); window.removeEventListener('resize',update);};
  }, [signature,ordered.length]);

  React.useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const details = popupRef.current;
      if (details?.open && event.target instanceof Node && !details.contains(event.target)) {
        details.open=false;
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && popupRef.current?.open) popupRef.current.open=false;
    };
    document.addEventListener('pointerdown',onPointerDown);
    document.addEventListener('keydown',onEscape);
    return () => {
      document.removeEventListener('pointerdown',onPointerDown);
      document.removeEventListener('keydown',onEscape);
    };
  }, []);

  if (!ordered.length) return null;
  const shown = ordered.slice(0,visibleCount);
  const hidden = ordered.slice(visibleCount);
  const quoteMarkup = (vehicle: VehicleQuote, index: number) => (
    <div key={String(vehicle.vendorEligibleId ?? index)+'-'+index}
      className="flex shrink-0 flex-col items-center gap-0.5 text-center"
      title={vendorName(vehicle)}>
      <span className="block max-w-[185px] truncate text-sm font-semibold text-purple-800">{vendorName(vehicle)}</span>
      <span className="whitespace-nowrap text-sm font-bold text-purple-800">{price(vehicle)}</span>
    </div>
  );

  return (
    <div ref={containerRef}
      className="relative flex min-w-0 flex-1 items-center justify-start gap-3"
      data-testid="vehicle-vendor-responsive-header">
      {shown.map(quoteMarkup)}
      {hidden.length > 0 && (
        <details ref={popupRef} className="relative shrink-0" data-testid="other-vendors-popup">
          <summary className="cursor-pointer list-none whitespace-nowrap rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 [&::-webkit-details-marker]:hidden">
            +{hidden.length} other vendor{hidden.length === 1 ? '' : 's'}
          </summary>
          <div className="absolute right-0 top-full z-[100] mt-2 max-h-[55vh] w-[min(90vw,370px)] overflow-y-auto rounded-lg border border-purple-200 bg-white p-3 shadow-xl">
            <p className="mb-2 border-b border-purple-100 pb-2 text-sm font-bold text-purple-900">
              Other vendor quotations — {vehicleTypeLabel}
            </p>
            {hidden.map((vehicle,index) => (
              <div key={String(vehicle.vendorEligibleId ?? index)+'-'+index}
                className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 text-sm last:border-b-0">
                <span className="min-w-0 break-words font-semibold text-slate-800">{vendorName(vehicle)}</span>
                <span className="shrink-0 font-bold text-purple-800">{price(vehicle)}</span>
              </div>
            ))}
            <p className="mt-2 text-[11px] text-slate-500">Choose a different vendor using the existing selection table below.</p>
          </div>
        </details>
      )}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div ref={measureRef} className="invisible flex w-max items-center gap-3 whitespace-nowrap">
          {ordered.map((vehicle,index) => (
            <div key={'measure-'+String(vehicle.vendorEligibleId ?? index)+'-'+index}
              data-quote-measure className="flex shrink-0 flex-col items-center gap-0.5 text-center">
              <span className="block max-w-[185px] truncate text-sm font-semibold">{vendorName(vehicle)}</span>
              <span className="whitespace-nowrap text-sm font-bold">{price(vehicle)}</span>
            </div>
          ))}
          <span data-overflow-measure className="shrink-0 whitespace-nowrap rounded-lg border border-purple-200 px-3 py-1.5 text-xs font-semibold">
            +{ordered.length} other vendors
          </span>
        </div>
      </div>
    </div>
  );
};
