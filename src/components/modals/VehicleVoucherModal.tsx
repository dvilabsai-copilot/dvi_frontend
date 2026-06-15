import React, { useEffect, useRef, useState } from 'react';
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
  VehicleVoucherService,
  VehicleCancellationPolicy,
} from '@/services/vehicleVoucher';
import { AddVehicleCancellationPolicyModal } from './AddVehicleCancellationPolicyModal';
import { toast } from 'sonner';
import { Trash2, Plus, Loader2, Bold, Italic, Underline, List, ListOrdered, Eraser } from 'lucide-react';

interface VehicleVoucherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itineraryPlanId: number;
  vendorEligibleId: number;
  confirmedVendorEligibleId: number;
  vehicleTypeId: number;
  vendorVehicleTypeId: number;
  vendorId: number;
  vendorName: string;
  vendorEmail?: string;
  vendorBranchId: number;
  vendorBranchName: string;
  vehicleTypeTitle: string;
  vehicleOrigin?: string;
  totalQty: number;
  totalAmount: number;
  initialStatus?: 'confirmed' | 'cancelled' | 'pending';
  onSuccess?: () => void;
}

export const VehicleVoucherModal: React.FC<VehicleVoucherModalProps> = ({
  open,
  onOpenChange,
  itineraryPlanId,
  vendorEligibleId,
  confirmedVendorEligibleId,
  vehicleTypeId,
  vendorVehicleTypeId,
  vendorId,
  vendorName,
  vendorEmail = '',
  vendorBranchId,
  vendorBranchName,
  vehicleTypeTitle,
  vehicleOrigin = '',
  totalQty,
  totalAmount,
  initialStatus,
  onSuccess,
}) => {
  const [confirmedBy, setConfirmedBy] = useState('');
  const [emailId, setEmailId] = useState(vendorEmail);
  const [mobileNumber, setMobileNumber] = useState('');
  const [status, setStatus] = useState<'confirmed' | 'cancelled' | 'pending'>(initialStatus || 'pending');
  const [invoiceTo, setInvoiceTo] = useState<'gst_bill_against_dvi' | 'hotel_direct' | 'agent'>('gst_bill_against_dvi');
  const [voucherTerms, setVoucherTerms] = useState('');
  const [cancellationPolicies, setCancellationPolicies] = useState<VehicleCancellationPolicy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddPolicyModal, setShowAddPolicyModal] = useState(false);
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (open) {
      void loadVoucherData();
    }
  }, [open, itineraryPlanId, vendorEligibleId, confirmedVendorEligibleId, initialStatus]);

  useEffect(() => {
    if (open && !isLoading) {
      syncEditorFromVoucherTerms();
    }
  }, [open, isLoading, voucherTerms, isEditorFocused]);

  const loadVoucherData = async () => {
    setIsLoading(true);

    try {
      const existingVoucher = await VehicleVoucherService.getVehicleVoucher(
        itineraryPlanId,
        confirmedVendorEligibleId || vendorEligibleId,
      );

      if (existingVoucher) {
        setConfirmedBy(existingVoucher.confirmedBy);
        setEmailId(existingVoucher.emailId || vendorEmail);
        setMobileNumber(existingVoucher.mobileNumber);
        setStatus(initialStatus || existingVoucher.status);
        setInvoiceTo(existingVoucher.invoiceTo);
        setVoucherTerms(existingVoucher.voucherTermsCondition);
      } else {
        setConfirmedBy('');
        setEmailId(vendorEmail);
        setMobileNumber('');
        setStatus(initialStatus || 'pending');
        setInvoiceTo('gst_bill_against_dvi');
        setVoucherTerms(await VehicleVoucherService.getDefaultVoucherTerms(itineraryPlanId));
      }

      await loadCancellationPolicies();
    } catch (error) {
      console.error('Failed to load vehicle voucher data', error);
      toast.error('Failed to load vehicle voucher data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCancellationPolicies = async () => {
    try {
      const policies = await VehicleVoucherService.getVehicleCancellationPolicies(
        itineraryPlanId,
        vendorId,
        vendorVehicleTypeId,
      );
      setCancellationPolicies(policies);
    } catch (error) {
      console.error('Failed to load vehicle cancellation policies', error);
    }
  };

  const handleDeletePolicy = async (policyId: number) => {
    if (!confirm('Are you sure you want to delete this vehicle cancellation policy?')) {
      return;
    }

    try {
      await VehicleVoucherService.deleteCancellationPolicy(itineraryPlanId, policyId);
      toast.success('Vehicle cancellation policy deleted successfully');
      await loadCancellationPolicies();
    } catch (error: any) {
      console.error('Failed to delete vehicle policy', error);
      toast.error(error.message || 'Failed to delete vehicle cancellation policy');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      const response = await VehicleVoucherService.createVehicleVouchers({
        itineraryPlanId,
        vouchers: [{
          vendorEligibleId,
          confirmedVendorEligibleId,
          vehicleTypeId,
          vendorVehicleTypeId,
          vendorId,
          vendorBranchId,
          totalVehicleQty: totalQty,
          grandTotal: totalAmount,
          confirmedBy,
          emailId,
          mobileNumber,
          status,
          invoiceTo,
          voucherTermsCondition: voucherTerms,
        }],
      });

      if (response.success) {
        toast.success(response.message);
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (error: any) {
      console.error('Failed to create vehicle voucher', error);
      toast.error(error.message || 'Failed to create vehicle voucher');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] sm:max-w-[900px] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-xl text-[#4a4260]">
              Create Vehicle Voucher
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-[#d546ab]" />
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-4 border-b border-gray-200" />

              <div className="mb-4 flex items-center justify-between rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 p-3">
                <h6 className="text-sm font-semibold text-[#4a4260]">
                  {vehicleTypeTitle} | [{vendorName}{vendorBranchName ? ` - ${vendorBranchName}` : ''}]
                  {vehicleOrigin ? ` | Origin: ${vehicleOrigin}` : ''}
                  {` | Qty: ${totalQty} | Amount: Rs. ${Number(totalAmount || 0).toFixed(2)}`}
                </h6>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-[#d546ab] text-[#d546ab] hover:bg-[#fdf6ff]"
                  onClick={() => setShowAddPolicyModal(true)}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add Cancellation Policy
                </Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <div>
                    <Label htmlFor="vehicleConfirmedBy" className="text-sm font-medium text-[#4a4260]">
                      Confirmed By <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="vehicleConfirmedBy"
                      value={confirmedBy}
                      onChange={(e) => setConfirmedBy(e.target.value)}
                      placeholder="Shruti"
                      className="mt-1"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="vehicleEmailId" className="text-sm font-medium text-[#4a4260]">
                      Email ID <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="vehicleEmailId"
                      type="email"
                      value={emailId}
                      onChange={(e) => setEmailId(e.target.value)}
                      placeholder="vendor@example.com"
                      className="mt-1"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="vehicleMobileNumber" className="text-sm font-medium text-[#4a4260]">
                      Mobile Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="vehicleMobileNumber"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      placeholder="6235002438"
                      className="mt-1"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="vehicleStatus" className="text-sm font-medium text-[#4a4260]">
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

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="vehicleInvoiceTo" className="text-sm font-medium text-[#4a4260]">
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

                  <div className="md:col-span-2">
                    <Label className="text-sm font-medium text-[#4a4260]">
                      Vehicle Voucher Terms and Condition <span className="text-red-500">*</span>
                    </Label>
                    <p className="mt-2 text-xs text-[#4a4260]">
                      Edit formatted voucher terms directly. Formatting will be saved with the voucher.
                    </p>
                    <div className="mt-2 overflow-hidden rounded-lg border border-gray-300 bg-white">
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

                <div className="my-4 border-b border-dashed border-gray-300" />

                <div>
                  <h5 className="mb-3 text-base font-semibold text-[#4a4260]">
                    Cancellation Policy
                  </h5>

                  <div className="overflow-hidden rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">S.NO</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">VENDOR</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">VEHICLE TYPE</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">CANCELLATION DATE</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">CANCELLATION %</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">DESCRIPTION</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700">OPTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cancellationPolicies.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                              No more Cancellation Policy found !!!
                            </td>
                          </tr>
                        ) : (
                          cancellationPolicies.map((policy, index) => (
                            <tr key={policy.id} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-3">{index + 1}</td>
                              <td className="px-4 py-3 font-medium">{policy.vendorName || vendorName}</td>
                              <td className="px-4 py-3">{policy.vehicleTypeName || vehicleTypeTitle}</td>
                              <td className="px-4 py-3">
                                {new Date(policy.cancellationDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
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
                                  className="text-red-500 transition-colors hover:text-red-700"
                                  title="Delete policy"
                                >
                                  <Trash2 className="inline h-4 w-4" />
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
                  className="bg-[#d546ab] text-white hover:bg-[#c03d9f]"
                  disabled={isSubmitting || cancellationPolicies.length === 0}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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

      <AddVehicleCancellationPolicyModal
        open={showAddPolicyModal}
        onOpenChange={setShowAddPolicyModal}
        itineraryPlanId={itineraryPlanId}
        vendorId={vendorId}
        vendorName={vendorName}
        vendorVehicleTypeId={vendorVehicleTypeId}
        vehicleTypeName={vehicleTypeTitle}
        onSuccess={loadCancellationPolicies}
      />
    </>
  );
};
