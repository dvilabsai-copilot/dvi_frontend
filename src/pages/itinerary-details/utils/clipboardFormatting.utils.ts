type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value !== null && typeof value === 'object' ? (value as UnknownRecord) : {};

export const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export const formatCurrency = (value?: number | string | null): string => {
  const amount = Number(value || 0);
  return `â‚¹ ${amount.toFixed(2)}`;
};

export const parseWalletAmount = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const cleaned = String(value ?? '').replace(/[^\d.-]/g, '');
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : 0;
};

export const getWalletAmountFromResponse = (walletData: unknown): number => {
  const wallet = asRecord(walletData);
  return parseWalletAmount(
    wallet.balance ??
      wallet.wallet_balance ??
      wallet.formatted_balance ??
      wallet.cashWalletBalance ??
      wallet.formattedBalance ??
      walletData,
  );
};

export const toMoneyNumber = (value?: number | string | null): number => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return 0;
  return Number(amount.toFixed(2));
};

export const getHotelSelectionAmount = (hotel: unknown): number => {
  const row = asRecord(hotel);
  const directTotal = Number(row.totalAmount ?? row.totalPrice ?? 0);
  if (Number.isFinite(directTotal) && directTotal > 0) return toMoneyNumber(directTotal);

  const totalHotelCost = Number(row.totalHotelCost ?? row.perNightAmount ?? row.pricePerNight ?? 0);
  const totalHotelTaxAmount = Number(row.totalHotelTaxAmount ?? row.taxAmount ?? 0);
  return toMoneyNumber(totalHotelCost + totalHotelTaxAmount);
};
