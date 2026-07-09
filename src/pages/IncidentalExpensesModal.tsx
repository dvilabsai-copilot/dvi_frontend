import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ItineraryService } from "@/services/itinerary";
import { AlertCircle, IndianRupee, Loader2, Plus, Wallet } from "lucide-react";
import { toast } from "sonner";

interface IncidentalExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  itineraryPlanId: number;
  onSuccess?: () => void;
}

const formatCurrency = (value: number) =>
  Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatMoney = (value: number) => `₹ ${formatCurrency(value)}`;

export const IncidentalExpensesModal: React.FC<IncidentalExpensesModalProps> = ({
  isOpen,
  onClose,
  itineraryPlanId,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [availableData, setAvailableData] = useState<any>(null);
  const [availableMargin, setAvailableMargin] = useState<any>(null);

  const [formData, setFormData] = useState({
    componentType: '',
    componentId: '',
    amount: '',
    reason: '',
  });

  useEffect(() => {
    if (isOpen && itineraryPlanId) {
      void fetchInitialData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, itineraryPlanId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const components = await ItineraryService.getIncidentalAvailableComponents(itineraryPlanId);
      setAvailableData(components);
    } catch (error) {
      console.error("Error fetching incidental data:", error);
      toast.error("Failed to load incidental expenses data");
    } finally {
      setLoading(false);
    }
  };

  const selectedOptions = useMemo(() => {
    if (!availableData) return [];
    switch (formData.componentType) {
      case '1':
        return availableData.guides || [];
      case '2':
        return availableData.hotspots || [];
      case '3':
        return availableData.activities || [];
      case '4':
        return availableData.hotels || [];
      case '5':
        return availableData.vendors || [];
      default:
        return [];
    }
  }, [availableData, formData.componentType]);

  const selectedItem = useMemo(
    () => selectedOptions.find((item: any) => String(item.id) === formData.componentId),
    [selectedOptions, formData.componentId],
  );

  const resetForm = () => {
    setFormData({
      componentType: '',
      componentId: '',
      amount: '',
      reason: '',
    });
    setAvailableMargin(null);
  };

  const handleTypeChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      componentType: value,
      componentId: '',
      amount: '',
    }));
    setAvailableMargin(null);
  };

  const handleComponentChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      componentId: value,
      amount: '',
    }));
  };

  useEffect(() => {
    if (!isOpen || !itineraryPlanId || !formData.componentType) {
      return;
    }

    const fetchSelectedMargin = async () => {
      try {
        setAvailableMargin(null);

        if (['1', '2', '3'].includes(formData.componentType)) {
          const res = await ItineraryService.getIncidentalAvailableMargin(
            itineraryPlanId,
            Number(formData.componentType),
          );
          setAvailableMargin(res);
          return;
        }

        if (['4', '5'].includes(formData.componentType) && formData.componentId) {
          const res = await ItineraryService.getIncidentalAvailableMargin(
            itineraryPlanId,
            Number(formData.componentType),
            Number(formData.componentId),
          );
          setAvailableMargin(res);
        }
      } catch (error: any) {
        console.error("Error fetching margin:", error);
        setAvailableMargin(null);
        toast.error(error?.message || "Failed to fetch available balance");
      }
    };

    void fetchSelectedMargin();
  }, [formData.componentType, formData.componentId, itineraryPlanId, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.componentType || !formData.componentId || !formData.amount) {
      toast.error("Please fill all required fields");
      return;
    }

    const enteredAmount = Number(formData.amount || 0);
    const availableBalance = Number(availableMargin?.total_balance ?? availableMargin?.total_avail_cost ?? 0);
    if (enteredAmount <= 0) {
      toast.error("Amount must be greater than zero");
      return;
    }
    if (availableMargin && enteredAmount > availableBalance) {
      toast.error(`Amount cannot exceed available balance (Rs. ${formatCurrency(availableBalance)})`);
      return;
    }

    setSubmitting(true);
    try {
      await ItineraryService.addIncidentalExpense({
        itineraryPlanId,
        componentType: Number(formData.componentType),
        componentId: Number(formData.componentId),
        amount: enteredAmount,
        reason: formData.reason,
        createdBy: 1,
      });

      toast.success("Incidental expense added successfully");
      resetForm();
      onSuccess?.();
    } catch (error: any) {
      console.error("Error adding incidental expense:", error);
      toast.error(error?.message || "Failed to add incidental expense");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Incidental Expenses</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#d546ab]" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-[28px] border border-[#f1dcc1] bg-[linear-gradient(135deg,_#fff8ef_0%,_#ffffff_55%,_#fff5f9_100%)] p-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#bd6f13]">
                    Finance Control
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-[#513f2d]">
                    Allocate incidental expenses against approved component margin
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-[#74614c]">
                    This flow follows the confirmed-itinerary PHP behavior: shared pool for guide, hotspot, and activity,
                    with component-specific balance for hotel and vendor allocations.
                  </p>
                </div>

                <div className="grid min-w-[260px] grid-cols-1 gap-3">
                  <div className="rounded-2xl border border-[#f0dfc7] bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a1712d]">Available Types</p>
                    <p className="mt-2 text-2xl font-semibold text-[#513f2d]">
                      {availableData?.availableTypes?.length || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 rounded-[28px] border border-[#eadff3] bg-white p-5 lg:grid-cols-[1.25fr,0.75fr]">
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Component Type</Label>
                    <Select value={formData.componentType} onValueChange={handleTypeChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose component type" />
                      </SelectTrigger>
                      <SelectContent>
                        {(availableData?.availableTypes || []).map((type: any) => (
                          <SelectItem key={type.id} value={String(type.id)}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Select Item</Label>
                    <Select
                      value={formData.componentId}
                      onValueChange={handleComponentChange}
                      disabled={!formData.componentType}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose itinerary item" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedOptions.map((item: any) => (
                          <SelectItem key={item.id} value={String(item.id)}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Selected Item</Label>
                  <div className="rounded-2xl border border-dashed border-[#dcc7ee] bg-[#faf6ff] px-4 py-3 text-sm text-[#5b5367]">
                    {selectedItem?.name || 'Choose a component type and item to inspect the available balance.'}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <div className="relative">
                      <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b7d9f]" />
                      <Input
                        className="pl-9"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                        placeholder="Enter approved amount"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Reason</Label>
                    <Textarea
                      value={formData.reason}
                      onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
                      placeholder="Add reason or operator note"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    className="bg-[#fd7e14] hover:bg-[#e67212]"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Add Expense
                  </Button>
                </div>
              </div>

              <div className="space-y-4 rounded-[24px] border border-[#f0e5fb] bg-[#fcf9ff] p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9b7db8]">
                    Balance Snapshot
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-[#433953]">
                    {selectedItem?.name || 'No component selected'}
                  </h3>
                </div>

                {availableMargin ? (
                  <div className="grid grid-cols-1 gap-3">
                    <div className="rounded-2xl border border-[#e6d8f6] bg-white p-4">
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8b6caf]">
                        <Wallet className="h-4 w-4" />
                        Total Amount
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-[#3f3654]">
                        Rs. {formatCurrency(Number(availableMargin.total_amount || 0))}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#e6d8f6] bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b6caf]">Used So Far</p>
                      <p className="mt-2 text-2xl font-semibold text-[#3f3654]">
                        Rs. {formatCurrency(Number(availableMargin.total_payed || 0))}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#dfd3f4] bg-[#fffaf1] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b17818]">Available Balance</p>
                      <p className="mt-2 text-3xl font-semibold text-[#6a4711]">
                        Rs. {formatCurrency(Number(availableMargin.total_balance ?? availableMargin.total_avail_cost ?? 0))}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#d9c7ed] bg-white p-4 text-sm text-[#6f677c]">
                    Select a valid component to load available allocation balance before adding an expense.
                  </div>
                )}

                <div className="rounded-2xl border border-dashed border-[#f1dcc1] bg-[#fff9f1] p-4 text-sm text-[#75592f]">
                  <p className="flex items-center gap-2 font-medium">
                    <AlertCircle className="h-4 w-4" />
                    Guardrail
                  </p>
                  <p className="mt-2">
                    The entered amount cannot exceed the remaining balance currently available for the selected pool or component.
                  </p>
                </div>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default IncidentalExpensesModal;
