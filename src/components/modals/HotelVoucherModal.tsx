import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  HotelVoucherService, 
  HotelCancellationPolicy,
  HotelVoucherData 
} from '@/services/hotelVoucher';
import { AddHotelCancellationPolicyModal } from './AddHotelCancellationPolicyModal';
import { toast } from 'sonner';
import { Trash2, Plus, Loader2, Bold, Italic, Underline, List, ListOrdered, Eraser } from 'lucide-react';

interface HotelVoucherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itineraryPlanId: number;
  routeId: number;
  hotelId: number;
  hotelName: string;
  hotelEmail?: string;
  hotelStateCity?: string;
  routeDates: string[];
  dayNumbers: number[];
  hotelDetailsIds: number[];
  initialStatus?: 'confirmed' | 'cancelled' | 'pending';
  onSuccess?: () => void;
}

export const HotelVoucherModal: React.FC<HotelVoucherModalProps> = ({
  open,
  onOpenChange,
  itineraryPlanId,
  routeId,
  hotelId,
  hotelName,
  hotelEmail = '',
  hotelStateCity = '',
  routeDates,
  dayNumbers,
  hotelDetailsIds,
  initialStatus,
  onSuccess,
}) => {
  const [confirmedBy, setConfirmedBy] = useState('');
  const [emailId, setEmailId] = useState(hotelEmail);
  const [mobileNumber, setMobileNumber] = useState('');
  const [status, setStatus] = useState<'confirmed' | 'cancelled' | 'pending'>(
    initialStatus || 'cancelled',
  );
  const [invoiceTo, setInvoiceTo] = useState<'gst_bill_against_dvi' | 'hotel_direct' | 'agent'>('gst_bill_against_dvi');
  const [voucherTerms, setVoucherTerms] = useState('');
  const [cancellationPolicies, setCancellationPolicies] = useState<HotelCancellationPolicy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddPolicyModal, setShowAddPolicyModal] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const decodeHtml = (html: string) => {
    if (!html) return '';

    let decoded = html;

    for (let i = 0; i < 5; i++) {
      const txt = document.createElement('textarea');
      txt.innerHTML = decoded;
      const next = txt.value;

      if (next === decoded) break;
      decoded = next;
    }

    return decoded;
  };
  const syncEditorFromVoucherTerms = () => {
    if (!editorRef.current || isEditorFocused) return;
    const decoded = decodeHtml(voucherTerms);
    if (editorRef.current.innerHTML !== decoded) {
      editorRef.current.innerHTML = decoded;
    }
  };

  const applyEditorCommand = (
    command:
      | 'bold'
      | 'italic'
      | 'underline'
      | 'insertUnorderedList'
      | 'insertOrderedList'
      | 'removeFormat',
  ) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command);
    setVoucherTerms(editorRef.current.innerHTML);
  };

  // Format dates for display
  const formatDateString = (dates: string[]) => {
    return dates.map(d => new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })).join(', ');
  };

  const dayLabel = dayNumbers.length > 1 
    ? `Days ${dayNumbers.join(', ')}` 
    : `Day ${dayNumbers[0]}`;

  // Load existing voucher data and cancellation policies
  useEffect(() => {
    if (open) {
      loadVoucherData();
    }
  }, [open, itineraryPlanId, hotelId, initialStatus]);

  useEffect(() => {
    if (open && !isLoading) {
      syncEditorFromVoucherTerms();
    }
  }, [open, isLoading, voucherTerms, isEditorFocused]);

  const loadVoucherData = async () => {
    setIsLoading(true);
    try {
      // Load existing voucher if any
      const existingVoucher = await HotelVoucherService.getHotelVoucher(
        itineraryPlanId,
        hotelId
      );

      if (existingVoucher) {
        setConfirmedBy(existingVoucher.confirmedBy);
        setEmailId(existingVoucher.emailId);
        setMobileNumber(existingVoucher.mobileNumber);
        setStatus(initialStatus || existingVoucher.status);
        setInvoiceTo(existingVoucher.invoiceTo);
        setVoucherTerms(existingVoucher.voucherTermsCondition);
      } else {
        setStatus(initialStatus || 'cancelled');
        // Load default terms
        const defaultTerms = await HotelVoucherService.getDefaultVoucherTerms(itineraryPlanId);
        setVoucherTerms(defaultTerms);
      }

      // Load cancellation policies
      await loadCancellationPolicies();
    } catch (error) {
      console.error('Failed to load voucher data', error);
      toast.error('Failed to load voucher data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCancellationPolicies = async () => {
    try {
      const policies = await HotelVoucherService.getHotelCancellationPolicies(
        itineraryPlanId,
        hotelId
      );
      setCancellationPolicies(policies);
    } catch (error) {
      console.error('Failed to load cancellation policies', error);
    }
  };

  const handleDeletePolicy = async (policyId: number) => {
    if (!confirm('Are you sure you want to delete this cancellation policy?')) {
      return;
    }

    try {
      await HotelVoucherService.deleteCancellationPolicy(itineraryPlanId, policyId);
      toast.success('Cancellation policy deleted successfully');
      await loadCancellationPolicies();
    } catch (error: any) {
      console.error('Failed to delete policy', error);
      toast.error(error.message || 'Failed to delete cancellation policy');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Safety guard: Check if routeId is valid
    if (!routeId || isNaN(routeId) || routeId <= 0) {
      toast.error('Route ID is missing or invalid. Cannot create voucher.');
      return;
    }

    if (!confirmedBy.trim() || !emailId.trim() || !mobileNumber.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (cancellationPolicies.length === 0) {
      toast.error('Please add at least one cancellation policy before creating the voucher');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await HotelVoucherService.createHotelVouchers({
        itineraryPlanId,
        vouchers: [{
          routeId,
          hotelId,
          hotelDetailsIds,
          routeDates,
          confirmedBy,
          emailId,
          mobileNumber,
          status,
          invoiceTo,
          voucherTermsCondition: voucherTerms
        }]
      });

      if (response.success) {
        toast.success(response.message);
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        toast.error(response.message);
      }
    } catch (error: any) {
      console.error('Failed to create voucher', error);
      toast.error(error.message || 'Failed to create hotel voucher');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-xl text-[#4a4260]">
              Create Hotel Voucher
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-[#d546ab]" />
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="border-b border-gray-200 mb-4"></div>

              {/* Hotel Info Header */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-lg mb-4 flex justify-between items-center">
                <h6 className="text-sm font-semibold text-[#4a4260]">
                  {dayLabel} | [{hotelName} - {hotelStateCity}] | {formatDateString(routeDates)}
                </h6>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-[#d546ab] text-[#d546ab] hover:bg-[#fdf6ff]"
                  onClick={() => setShowAddPolicyModal(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Cancellation Policy
                </Button>
              </div>

              <div className="space-y-4">
                {/* Voucher Details Form */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Confirmed By */}
                  <div>
                    <Label htmlFor="confirmedBy" className="text-sm font-medium text-[#4a4260]">
                      Confirmed By <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="confirmedBy"
                      type="text"
                      value={confirmedBy}
                      onChange={(e) => setConfirmedBy(e.target.value)}
                      placeholder="Shruti"
                      required
                      className="mt-1"
                    />
                  </div>

                  {/* Email ID */}
                  <div>
                    <Label htmlFor="emailId" className="text-sm font-medium text-[#4a4260]">
                      Email ID <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="emailId"
                      type="email"
                      value={emailId}
                      onChange={(e) => setEmailId(e.target.value)}
                      placeholder="hotel@example.com"
                      required
                      className="mt-1"
                    />
                  </div>

                  {/* Mobile Number */}
                  <div>
                    <Label htmlFor="mobileNumber" className="text-sm font-medium text-[#4a4260]">
                      Mobile Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="mobileNumber"
                      type="tel"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      placeholder="6235002438"
                      required
                      className="mt-1"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <Label htmlFor="status" className="text-sm font-medium text-[#4a4260]">
                      Status <span className="text-red-500">*</span>
                    </Label>
                    <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Invoice To */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="invoiceTo" className="text-sm font-medium text-[#4a4260]">
                      Invoice To <span className="text-red-500">*</span>
                    </Label>
                    <Select value={invoiceTo} onValueChange={(value: any) => setInvoiceTo(value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select invoice to" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gst_bill_against_dvi">GST Bill Against DVI</SelectItem>
                        <SelectItem value="hotel_direct">Hotel Direct</SelectItem>
                        <SelectItem value="agent">Agent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Hotel Voucher Terms */}
                  <div className="md:col-span-2">
                    <Label className="text-sm font-medium text-[#4a4260]">
                      Hotel Voucher Terms and Condition <span className="text-red-500">*</span>
                    </Label>
                    <p className="mt-2 text-xs text-[#4a4260]">
                      Edit formatted voucher terms directly. Formatting will be saved with the voucher.
                    </p>
                    <div className="mt-2 rounded-lg border border-gray-300 bg-white overflow-hidden">
                      <div className="flex gap-1 border-b bg-gray-50 p-2">
                        <button type="button" onClick={() => applyEditorCommand('bold')} className="rounded p-2 hover:bg-gray-100" title="Bold">
                          <Bold className="h-4 w-4 text-[#4a4260]" />
                        </button>
                        <button type="button" onClick={() => applyEditorCommand('italic')} className="rounded p-2 hover:bg-gray-100" title="Italic">
                          <Italic className="h-4 w-4 text-[#4a4260]" />
                        </button>
                        <button type="button" onClick={() => applyEditorCommand('underline')} className="rounded p-2 hover:bg-gray-100" title="Underline">
                          <Underline className="h-4 w-4 text-[#4a4260]" />
                        </button>
                        <button type="button" onClick={() => applyEditorCommand('insertUnorderedList')} className="rounded p-2 hover:bg-gray-100" title="Bullet List">
                          <List className="h-4 w-4 text-[#4a4260]" />
                        </button>
                        <button type="button" onClick={() => applyEditorCommand('insertOrderedList')} className="rounded p-2 hover:bg-gray-100" title="Number List">
                          <ListOrdered className="h-4 w-4 text-[#4a4260]" />
                        </button>
                        <button type="button" onClick={() => applyEditorCommand('removeFormat')} className="rounded p-2 hover:bg-gray-100" title="Clear Format">
                          <Eraser className="h-4 w-4 text-[#4a4260]" />
                        </button>
                      </div>
                      <div
                        ref={editorRef}
                        contentEditable
                        suppressContentEditableWarning
                        className="min-h-[180px] max-h-[260px] overflow-y-auto px-4 py-3 text-sm text-[#1f1b3f] focus:outline-none"
                        onFocus={() => setIsEditorFocused(true)}
                        onBlur={() => {
                          setIsEditorFocused(false);
                          setVoucherTerms(editorRef.current?.innerHTML || '');
                        }}
                        onInput={() => {
                          setVoucherTerms(editorRef.current?.innerHTML || '');
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-b border-dashed border-gray-300 my-4"></div>

                {/* Cancellation Policy Section */}
                <div>
                  <h5 className="text-base font-semibold text-[#4a4260] mb-3">
                    Cancellation Policy
                  </h5>

                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">S.NO</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">HOTEL</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">CANCELLATION DATE</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">CANCELLATION %</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">DESCRIPTION</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700">OPTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cancellationPolicies.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                              No more Cancellation Policy found !!!
                            </td>
                          </tr>
                        ) : (
                          cancellationPolicies.map((policy, index) => (
                            <tr key={policy.id} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-3">{index + 1}</td>
                              <td className="px-4 py-3 font-medium">{policy.hotelName}</td>
                              <td className="px-4 py-3">
                                {new Date(policy.cancellationDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </td>
                              <td className="px-4 py-3 font-semibold text-red-600">
                                {policy.cancellationPercentage}%
                              </td>
                              <td className="px-4 py-3 text-gray-600">{policy.description}</td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeletePolicy(policy.id)}
                                  className="text-red-500 hover:text-red-700 transition-colors"
                                  title="Delete policy"
                                >
                                  <Trash2 className="w-4 h-4 inline" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-6 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#d546ab] hover:bg-[#c03d9f] text-white"
                  disabled={isSubmitting || cancellationPolicies.length === 0}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit'
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Cancellation Policy Modal */}
      <AddHotelCancellationPolicyModal
        open={showAddPolicyModal}
        onOpenChange={setShowAddPolicyModal}
        itineraryPlanId={itineraryPlanId}
        hotelId={hotelId}
        hotelName={hotelName}
        onSuccess={loadCancellationPolicies}
      />
    </>
  );
};
