import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ItineraryService } from "@/services/itinerary";
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api";

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  itineraryPlanId: number;
  type?: 'tax' | 'proforma';
}

const formatCurrency = (value: number) =>
  Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDate = (value?: string | Date | null) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const toWords = (amount: number) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertBelowThousand = (n: number): string => {
    let result = '';
    if (n >= 100) {
      result += `${ones[Math.floor(n / 100)]} Hundred `;
      n %= 100;
    }
    if (n >= 20) {
      result += `${tens[Math.floor(n / 10)]} `;
      n %= 10;
    }
    if (n > 0) {
      result += `${ones[n]} `;
    }
    return result.trim();
  };

  const integerPart = Math.floor(Number(amount || 0));
  const paise = Math.round((Number(amount || 0) - integerPart) * 100);
  if (integerPart === 0) return 'Zero Rupees Only';

  const crore = Math.floor(integerPart / 10000000);
  const lakh = Math.floor((integerPart % 10000000) / 100000);
  const thousand = Math.floor((integerPart % 100000) / 1000);
  const hundred = integerPart % 1000;

  const parts: string[] = [];
  if (crore) parts.push(`${convertBelowThousand(crore)} Crore`);
  if (lakh) parts.push(`${convertBelowThousand(lakh)} Lakh`);
  if (thousand) parts.push(`${convertBelowThousand(thousand)} Thousand`);
  if (hundred) parts.push(convertBelowThousand(hundred));

  return `${parts.join(' ').trim()} Rupees${paise ? ` and ${convertBelowThousand(paise)} Paise` : ''} Only`;
};

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  itineraryPlanId,
  type = 'tax',
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (isOpen && itineraryPlanId) {
      void fetchData();
    }
  }, [isOpen, itineraryPlanId, type]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await ItineraryService.getInvoiceData(itineraryPlanId);
      setData(res);
    } catch (error) {
      console.error("Error fetching invoice data:", error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const companyLogoUrl = useMemo(() => {
    const raw = String(data?.company?.logoUrl || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    const base = API_BASE_URL.replace(/\/api\/v1$/i, '');
    return `${base}${raw.startsWith('/') ? raw : `/${raw}`}`;
  }, [data]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{type === 'tax' ? 'Tax Invoice' : 'Proforma Invoice'}</span>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#d546ab]" />
          </div>
        ) : data ? (
          <div className="bg-white p-6 text-black print:p-0">
            <div className="rounded-[28px] border border-[#e7d9f4] bg-gradient-to-br from-[#fffdf7] via-white to-[#f6efff] p-6">
              <div className="flex flex-col gap-6 border-b border-[#eadff3] pb-6 md:flex-row md:items-start md:justify-between">
                <div className="max-w-2xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#9b7db8]">
                    {type === 'tax' ? 'Tax Invoice' : 'Proforma Invoice'}
                  </p>
                  <h1 className="mt-2 text-2xl font-semibold text-[#3f3654]">
                    {data.company?.name || 'DVI'}
                  </h1>
                  <p className="mt-2 whitespace-pre-line text-sm text-[#645b74]">
                    {data.company?.address || '--'}
                    {data.company?.pincode ? ` - ${data.company.pincode}` : ''}
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-1 text-sm text-[#4e455f] md:grid-cols-2">
                    <p>GSTIN/UIN: {data.company?.gstNo || '--'}</p>
                    <p>State: {data.company?.gstStateName || '--'}{data.company?.gstStateCode ? `, Code: ${data.company.gstStateCode}` : ''}</p>
                    <p>CIN: {data.company?.cin || '--'}</p>
                    <p>Email: {data.company?.email || '--'}</p>
                    <p>Contact: {data.company?.contactNo || '--'}</p>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-4 md:items-end">
                  {companyLogoUrl ? (
                    <img src={companyLogoUrl} alt="Company logo" className="h-14 w-auto object-contain" />
                  ) : null}
                  <div className="grid min-w-[280px] grid-cols-2 overflow-hidden rounded-2xl border border-[#eadff3] bg-white text-sm">
                    <div className="border-b border-r border-[#f0e6fb] p-3">
                      <p className="text-[#8a7b9d]">Invoice No</p>
                      <p className="mt-1 font-semibold text-[#3f3654]">{data.meta?.invoiceNo || '--'}</p>
                    </div>
                    <div className="border-b border-[#f0e6fb] p-3">
                      <p className="text-[#8a7b9d]">Dated</p>
                      <p className="mt-1 font-semibold text-[#3f3654]">{formatDate(data.meta?.invoiceDate)}</p>
                    </div>
                    <div className="border-r border-[#f0e6fb] p-3">
                      <p className="text-[#8a7b9d]">Delivery Note</p>
                      <p className="mt-1 font-semibold text-[#3f3654]">{data.meta?.deliveryNote || '--'}</p>
                    </div>
                    <div className="p-3">
                      <p className="text-[#8a7b9d]">Travel Expert</p>
                      <p className="mt-1 font-semibold text-[#3f3654]">{data.meta?.travelExpertName || '--'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-[1.1fr,0.9fr]">
                <div className="rounded-2xl border border-[#eadff3] bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9b7db8]">Buyer</p>
                  <h3 className="mt-2 text-lg font-semibold text-[#3f3654]">{data.buyer?.companyName || '--'}</h3>
                  <p className="mt-2 whitespace-pre-line text-sm text-[#5a5268]">{data.buyer?.address || '--'}</p>
                  <div className="mt-3 space-y-1 text-sm text-[#4e455f]">
                    <p>GSTIN/UIN: {data.buyer?.gstNo || '--'}</p>
                    <p>State: {data.buyer?.gstStateName || '--'}{data.buyer?.gstStateCode ? `, Code: ${data.buyer.gstStateCode}` : ''}</p>
                    <p>PAN: {data.buyer?.panNo || '--'}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#eadff3] bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9b7db8]">Guest Details</p>
                  <h3 className="mt-2 text-lg font-semibold text-[#3f3654]">{data.guest?.name || '--'}</h3>
                  <div className="mt-3 space-y-1 text-sm text-[#4e455f]">
                    <p>Contact Number: {data.guest?.contactNo || '--'}</p>
                    <p>Arrival: {data.guest?.arrivalPlace || '--'}{data.guest?.arrivalDateTime ? `, ${new Date(data.guest.arrivalDateTime).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}</p>
                    <p>Departure: {data.guest?.departurePlace || '--'}{data.guest?.departureDateTime ? `, ${new Date(data.guest.departureDateTime).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-[#eadff3] bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-[#faf6ff] text-[#4d4560]">
                    <tr>
                      <th className="w-[7%] border-b border-[#eadff3] px-3 py-3 text-left font-semibold">SI No.</th>
                      <th className="w-[58%] border-b border-[#eadff3] px-3 py-3 text-left font-semibold">Particulars</th>
                      <th className="w-[15%] border-b border-[#eadff3] px-3 py-3 text-left font-semibold">HSN/SAC</th>
                      <th className="w-[20%] border-b border-[#eadff3] px-3 py-3 text-right font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.lineItems || []).map((item: any) => (
                      <tr key={item.key} className="align-top border-b border-[#f1e8fb] last:border-b-0">
                        <td className="px-3 py-3 text-[#4d4560]">{item.serialNo || ''}</td>
                        <td className="px-3 py-3">
                          <p className="font-semibold text-[#3f3654]">{item.title}</p>
                          {Array.isArray(item.notes) && item.notes.length > 0 ? (
                            <div className="mt-1 space-y-1 text-xs text-[#6f677c]">
                              {item.notes.map((note: any, index: number) => (
                                <p key={`${item.key}-note-${index}`}>{note.label}</p>
                              ))}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-3 py-3 text-[#4d4560]">{item.hsnSac || '--'}</td>
                        <td className="px-3 py-3 text-right font-semibold text-[#3f3654]">{formatCurrency(Number(item.amount || 0))}</td>
                      </tr>
                    ))}
                    {Number(data.totals?.couponDiscount || 0) > 0 ? (
                      <tr className="border-b border-[#f1e8fb]">
                        <td colSpan={3} className="px-3 py-3 text-right font-semibold text-[#7d667f]">Coupon Discount</td>
                        <td className="px-3 py-3 text-right font-semibold text-[#7d667f]">{formatCurrency(Number(data.totals?.couponDiscount || 0))}</td>
                      </tr>
                    ) : null}
                    <tr className="bg-[#fffaf1]">
                      <td colSpan={3} className="px-3 py-3 text-right text-base font-semibold text-[#3f3654]">Total Amount</td>
                      <td className="px-3 py-3 text-right text-base font-bold text-[#3f3654]">{formatCurrency(Number(data.totals?.totalAmount || 0))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-[1.15fr,0.85fr]">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[#eadff3] bg-white p-4">
                    <p className="text-sm font-semibold text-[#3f3654]">Amount Chargeable (in words)</p>
                    <p className="mt-2 text-sm text-[#5a5268]">{toWords(Number(data.totals?.totalAmount || 0))}</p>
                    <p className="mt-3 text-sm text-[#4e455f]">Company&apos;s PAN: <span className="font-semibold">{data.company?.panNo || data.buyer?.panNo || '--'}</span></p>
                  </div>
                  <div className="rounded-2xl border border-[#eadff3] bg-white p-4">
                    <p className="text-sm font-semibold text-[#3f3654] underline">Declaration</p>
                    <p className="mt-2 text-sm leading-6 text-[#5a5268]">{data.declaration || '--'}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#eadff3] bg-white p-4">
                  <p className="text-sm font-semibold text-[#3f3654]">Company Bank Details</p>
                  <div className="mt-3 space-y-1 text-sm text-[#5a5268]">
                    <p>Account Name: {data.company?.bank?.accountName || '--'}</p>
                    <p>Account Number: {data.company?.bank?.accountNo || '--'}</p>
                    <p>Branch & IFSC: {data.company?.bank?.branchName || '--'}{data.company?.bank?.ifscCode ? `, ${data.company.bank.ifscCode}` : ''}</p>
                    <p>Bank Name: {data.company?.bank?.bankName || '--'}</p>
                  </div>
                  <div className="mt-12 text-right text-sm text-[#5a5268]">
                    <p>for {data.company?.name || 'DVI'}</p>
                    <div className="mt-12 border-t border-dashed border-[#d9c7ed] pt-2 font-semibold text-[#3f3654]">
                      Authorized Signatory
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            Failed to load invoice data.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
