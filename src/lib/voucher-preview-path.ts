export function voucherPreviewPath(value: unknown): string | undefined {
  return typeof value === "string" && /^\/pdf-preview\/(?:voucher|hotel-voucher|travel-voucher)\/[1-9]\d*$/.test(value)
    ? value
    : undefined;
}
