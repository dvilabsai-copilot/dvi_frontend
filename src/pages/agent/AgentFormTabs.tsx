import type { Dispatch, SetStateAction } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { GST_TYPE_OPTIONS, GST_PERCENTAGE_OPTIONS } from "@/types/agent";

export type AgentConfigForm = {
  itineraryDiscountMargin: string;
  serviceCharge: string;
  agentMarginGstType: string;
  agentMarginGstPercentage: string;
  companyName: string;
  address: string;
  termsAndCondition: string;
  gstinNumber: string;
  panNo: string;
  invoiceAddress: string;
};

export function AgentConfigurationTab({
  configForm,
  setConfigForm,
  password,
  setPassword,
  showPassword,
  setShowPassword,
}: {
  configForm: AgentConfigForm;
  setConfigForm: Dispatch<SetStateAction<AgentConfigForm>>;
  password: string;
  setPassword: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
}) {
  return (
  <>
    <h2 className="mb-4 text-lg font-semibold text-[#d64ab7]">Basic Info</h2>

    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div>
        <Label>Itinerary Discount Margin Percentage *</Label>
        <Input
          type="number"
          value={configForm.itineraryDiscountMargin}
          onChange={(e) =>
            setConfigForm((prev) => ({
              ...prev,
              itineraryDiscountMargin: e.target.value,
            }))
          }
          placeholder="Enter Margin Percentage"
        />
      </div>

      <div>
        <Label>Service Charge *</Label>
        <Input
          type="number"
          value={configForm.serviceCharge}
          onChange={(e) =>
            setConfigForm((prev) => ({
              ...prev,
              serviceCharge: e.target.value,
            }))
          }
          placeholder="Enter Service Charge"
        />
      </div>

      <div>
        <Label>Agent Margin GST Type *</Label>
        <Select
          value={configForm.agentMarginGstType}
          onValueChange={(value) =>
            setConfigForm((prev) => ({
              ...prev,
              agentMarginGstType: value,
            }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose GST Type" />
          </SelectTrigger>
          <SelectContent>
            {GST_TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Agent Margin GST Percentage *</Label>
        <Select
          value={configForm.agentMarginGstPercentage}
          onValueChange={(value) =>
            setConfigForm((prev) => ({
              ...prev,
              agentMarginGstPercentage: value,
            }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose GST Percentage" />
          </SelectTrigger>
          <SelectContent>
            {GST_PERCENTAGE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>

<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
  <div>
    <Label>Password</Label>
    <div className="relative">
      <Input
        type={showPassword ? "text" : "password"}
        placeholder="Enter Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button
        type="button"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
        onClick={() => setShowPassword(!showPassword)}
      >
        {showPassword ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>
  </div>
</div>

    <h2 className="mb-4 text-lg font-semibold text-[#d64ab7]">
      General Configuration
    </h2>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      <div>
        <Label>Logo Upload</Label>
        <div className="flex gap-2">
          <Input type="file" />
          <Button variant="link" size="sm">
            View
          </Button>
        </div>
      </div>

      <div>
        <Label>Company Name</Label>
        <Input
          value={configForm.companyName}
          onChange={(e) =>
            setConfigForm((prev) => ({
              ...prev,
              companyName: e.target.value,
            }))
          }
          placeholder="Enter Company Name"
        />
      </div>

      <div>
        <Label>Address</Label>
        <Textarea
          value={configForm.address}
          onChange={(e) =>
            setConfigForm((prev) => ({
              ...prev,
              address: e.target.value,
            }))
          }
          placeholder="Enter the Address"
        />
      </div>
    </div>

  <div className="mb-8">
  <Label>Terms and Condition</Label>

  <div className="mt-2 rounded-md border border-gray-200 bg-white">
    <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 px-3 py-2 text-sm text-gray-700">
      <Button type="button" variant="ghost" size="sm" className="h-8 px-2">
        B
      </Button>
      <Button type="button" variant="ghost" size="sm" className="h-8 px-2 italic">
        I
      </Button>
      <Button type="button" variant="ghost" size="sm" className="h-8 px-2 underline">
        U
      </Button>
      <span className="h-6 border-l border-gray-300" />
      <Button type="button" variant="ghost" size="sm" className="h-8 px-2">
        • List
      </Button>
      <Button type="button" variant="ghost" size="sm" className="h-8 px-2">
        1. List
      </Button>
      <span className="h-6 border-l border-gray-300" />
      <Button type="button" variant="ghost" size="sm" className="h-8 px-2">
        Link
      </Button>
      <Button type="button" variant="ghost" size="sm" className="h-8 px-2">
        Source
      </Button>
    </div>

    <Textarea
      value={configForm.termsAndCondition}
      onChange={(e) =>
        setConfigForm((prev) => ({
          ...prev,
          termsAndCondition: e.target.value,
        }))
      }
      placeholder="Enter the Terms and condition"
      className="min-h-[120px] resize-none border-0 focus-visible:ring-0"
    />
  </div>
</div>

    <h2 className="mb-4 text-lg font-semibold text-[#d64ab7]">
      Invoice Setting
    </h2>

    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div>
        <Label>Invoice Logo Upload</Label>
        <div className="flex gap-2">
          <Input type="file" />
          <Button variant="link" size="sm">
            View
          </Button>
        </div>
      </div>

      <div>
        <Label>GSTIN Number</Label>
        <Input
          value={configForm.gstinNumber}
          onChange={(e) =>
            setConfigForm((prev) => ({
              ...prev,
              gstinNumber: e.target.value,
            }))
          }
          placeholder="GSTIN Number"
        />
        <p className="text-xs text-gray-400 mt-1">
          GSTIN Format: 10AABCU9603R1Z5
        </p>
      </div>

      <div>
        <Label>Pan No</Label>
        <Input
          value={configForm.panNo}
          onChange={(e) =>
            setConfigForm((prev) => ({
              ...prev,
              panNo: e.target.value,
            }))
          }
          placeholder="PAN Number"
        />
      </div>

      <div>
        <Label>Invoice Address</Label>
        <Textarea
          value={configForm.invoiceAddress}
          onChange={(e) =>
            setConfigForm((prev) => ({
              ...prev,
              invoiceAddress: e.target.value,
            }))
          }
          placeholder="Enter the Address"
        />
      </div>
    </div>
  </>
  );
}

export type AgentStaffForm = {
  name: string;
  mobileNumber: string;
  email: string;
  status: string;
};

export function AgentStaffDialog({
  open,
  onOpenChange,
  mode,
  form,
  setForm,
  saving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit" | "view";
  form: AgentStaffForm;
  setForm: Dispatch<SetStateAction<AgentStaffForm>>;
  saving: boolean;
  onSubmit: () => void;
}) {
  const staffModalOpen = open;
  const setStaffModalOpen = onOpenChange;
  const staffMode = mode;
  const staffForm = form;
  const setStaffForm = setForm;
  const savingStaff = saving;
  const handleStaffSubmit = onSubmit;

  return (
      <Dialog open={staffModalOpen} onOpenChange={setStaffModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {staffMode === "view"
                ? "View Staff"
                : staffMode === "edit"
                ? "Edit Staff"
                : "Add Staff"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Name *</Label>
              <Input
                placeholder="Enter staff name"
                value={staffForm.name}
                disabled={staffMode === "view"}
                onChange={(e) =>
                  setStaffForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <Label>Mobile No *</Label>
              <Input
                placeholder="Enter mobile number"
                value={staffForm.mobileNumber}
                disabled={staffMode === "view"}
                onChange={(e) =>
                  setStaffForm((prev) => ({
                    ...prev,
                    mobileNumber: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="Enter email"
                value={staffForm.email}
                disabled={staffMode === "view"}
                onChange={(e) =>
                  setStaffForm((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <Label>Status</Label>
              <Select
                value={staffForm.status}
                disabled={staffMode === "view"}
                onValueChange={(value) =>
                  setStaffForm((prev) => ({
                    ...prev,
                    status: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Active</SelectItem>
                  <SelectItem value="0">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setStaffModalOpen(false)}
            >
              {staffMode === "view" ? "Close" : "Cancel"}
            </Button>

            {staffMode !== "view" && (
              <Button
                type="button"
                disabled={savingStaff}
                onClick={handleStaffSubmit}
                className="bg-gradient-to-r from-primary to-pink-500"
              >
                {savingStaff
                  ? "Saving..."
                  : staffMode === "edit"
                  ? "Update Staff"
                  : "Save Staff"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}

export function AgentWalletDialog({
  open,
  onOpenChange,
  walletType,
  walletAmount,
  setWalletAmount,
  walletRemark,
  setWalletRemark,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletType: "cash" | "coupon";
  walletAmount: string;
  setWalletAmount: (value: string) => void;
  walletRemark: string;
  setWalletRemark: (value: string) => void;
  onSubmit: () => void;
}) {
  const walletModalOpen = open;
  const setWalletModalOpen = onOpenChange;
  const handleWalletSubmit = onSubmit;

  return (
      <Dialog open={walletModalOpen} onOpenChange={setWalletModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {walletType === "cash" ? "Cash" : "Coupon"} Wallet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Amount *</Label>
              <Input
                type="number"
                placeholder="Enter the Amount"
                value={walletAmount}
                onChange={(e) => setWalletAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>Remarks *</Label>
              <Textarea
                placeholder="Enter the Remarks"
                value={walletRemark}
                onChange={(e) => setWalletRemark(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWalletModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleWalletSubmit} className="bg-gradient-to-r from-primary to-pink-500">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}

