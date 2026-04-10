import React from 'react';
import { AlertCircle, MapPin, DollarSign } from 'lucide-react';

/**
 * Normalized supplement structure from backend
 */
export interface NormalizedSupplement {
  type: string;
  description: string;
  amount: number;
  currency: string;
  source: 'search' | 'prebook';
  paymentLocation: 'HOTEL' | 'UNKNOWN';
  payableAtHotel: boolean;
  includedInPrice: boolean;
  isMandatory: boolean;
  chargeType?: string;
  fromDate?: string;
  toDate?: string;
  rawData: Record<string, any>;
}

interface SupplementDisplayProps {
  supplements: NormalizedSupplement[];
  showHeading?: boolean;
  compact?: boolean;
}

/**
 * Displays hotel supplements (additional charges) clearly to users before booking
 * Handles both known types (AtProperty) and unknown future types safely
 */
export function SupplementDisplay({
  supplements,
  showHeading = true,
  compact = false,
}: SupplementDisplayProps) {
  if (!supplements || supplements.length === 0) {
    return null;
  }

  // Separate by payment location for clearer display
  const atPropertyCharges = supplements.filter((s) => s.payableAtHotel);
  const unknownCharges = supplements.filter((s) => s.paymentLocation === 'UNKNOWN');

  return (
    <div className="space-y-4">
      {showHeading && (
        <div className="flex items-center gap-2 border-b pb-2">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <h3 className="text-sm font-semibold text-gray-800">Additional Charges</h3>
        </div>
      )}

      {/* AtProperty / Pay at Hotel Charges */}
      {atPropertyCharges.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span>Payable at Hotel</span>
          </div>
          {atPropertyCharges.map((supplement, idx) => (
            <SupplementItem key={idx} supplement={supplement} compact={compact} />
          ))}
          <p className="text-xs text-gray-600 mt-2">
            These charges will be payable directly at the property during check-in/check-out.
          </p>
        </div>
      )}

      {/* Unknown Type Charges */}
      {unknownCharges.length > 0 && (
        <div className="space-y-2 pt-2 border-t mt-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span>Other Charges</span>
          </div>
          {unknownCharges.map((supplement, idx) => (
            <SupplementItem key={idx} supplement={supplement} isUnknown compact={compact} />
          ))}
          <p className="text-xs text-gray-600 mt-2">
            Please review these charges carefully. Contact the hotel for details if needed.
          </p>
        </div>
      )}

      {/* Summary */}
      {!compact && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-3">
          <p className="text-xs text-blue-900">
            ℹ️ <strong>Important:</strong> All additional charges shown above are not included in the room price above
            and must be settled separately as per the terms.
          </p>
        </div>
      )}
    </div>
  );
}

interface SupplementItemProps {
  supplement: NormalizedSupplement;
  isUnknown?: boolean;
  compact?: boolean;
}

/**
 * Single supplement charge display
 */
function SupplementItem({ supplement, isUnknown = false, compact = false }: SupplementItemProps) {
  const formatAmount = (amount: number, currency: string) => {
    // Try to format with currency
    try {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
      }).format(amount);
    } catch {
      // Fallback if currency code is not recognized
      return `${currency} ${amount.toFixed(2)}`;
    }
  };

  const getMandatoryBadge = () => {
    if (supplement.isMandatory) {
      return (
        <span className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
          Mandatory
        </span>
      );
    }
    return null;
  };

  if (compact) {
    return (
      <div className="flex justify-between items-center text-sm py-1">
        <div>
          <p className={`font-medium ${isUnknown ? 'text-amber-700' : 'text-gray-700'}`}>
            {supplement.description || supplement.type}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getMandatoryBadge()}
          <p className="font-semibold text-gray-800">
            {formatAmount(supplement.amount, supplement.currency)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded p-3 mb-2 ${isUnknown ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={`font-semibold ${isUnknown ? 'text-amber-900' : 'text-gray-900'}`}>
              {supplement.description || supplement.type}
            </h4>
            {getMandatoryBadge()}
          </div>
          <div className="text-xs text-gray-600 space-y-1">
            <p>Type: <span className="font-mono text-gray-700">{supplement.type}</span></p>
            {supplement.chargeType && (
              <p>Charge Type: <span className="font-mono text-gray-700">{supplement.chargeType}</span></p>
            )}
            {supplement.fromDate && (
              <p>Applicable From: <span className="font-mono text-gray-700">{supplement.fromDate}</span></p>
            )}
          </div>
        </div>
        <div className="ml-4 text-right">
          <p className="text-lg font-bold text-gray-900">
            {formatAmount(supplement.amount, supplement.currency)}
          </p>
          <p className="text-xs text-gray-600">{supplement.currency}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Summary text for search results
 */
export function SupplementSummary({ supplements }: { supplements: NormalizedSupplement[] | undefined }) {
  if (!supplements || supplements.length === 0) {
    return null;
  }

  const mandatoryCount = supplements.filter((s) => s.isMandatory).length;
  const atPropertyCount = supplements.filter((s) => s.payableAtHotel).length;

  if (mandatoryCount === 0 && atPropertyCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded border border-amber-200">
      <AlertCircle className="w-4 h-4" />
      <span>
        {atPropertyCount > 0
          ? `${atPropertyCount} additional charge${atPropertyCount !== 1 ? 's' : ''} payable at hotel`
          : 'Additional charges apply'}
      </span>
    </div>
  );
}
