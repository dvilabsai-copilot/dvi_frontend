
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type BankForm = {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifscCode: string;
  branchName: string;
  accountType: string;
  upiId: string;
};

type BankPreview = {
  accountHolderName: string;
  bankName: string;
  accountNumberMasked: string;
  ifscCode: string;
  branchName: string;
  accountType: string;
  upiId: string;
  approvedAt?: string;
};

type BankRequest = BankPreview & {
  id: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedAt: string;
  rejectionReason?: string | null;
};

type BankStatus = {
  approved: BankPreview | null;
  lastRequest: BankRequest | null;
  canSubmit: boolean;
  canReview: boolean;
};

export type VendorBankDetailsHandle = {
  submitIfDirty: (vendorId: number) => Promise<void>;
};

type Props = {
  vendorId?: number;
};

const emptyForm: BankForm = {
  accountHolderName: "",
  bankName: "",
  accountNumber: "",
  confirmAccountNumber: "",
  ifscCode: "",
  branchName: "",
  accountType: "",
  upiId: "",
};

export const VendorBankDetailsSection = forwardRef<
  VendorBankDetailsHandle,
  Props
>(function VendorBankDetailsSection({ vendorId }, ref) {
  const [form, setForm] = useState<BankForm>({ ...emptyForm });
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<BankStatus | null>(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");

  const loadStatus = useCallback(async (id: number) => {
    try {
      const result = (await api(
        `/vendor-bank-details/${id}`
      )) as BankStatus;

      setStatus(result);
      setLoadError("");
    } catch {
      setStatus(null);
      setLoadError("Unable to load bank information.");
    }
  }, []);

  useEffect(() => {
    if (vendorId) {
      void loadStatus(vendorId);
    }
  }, [vendorId, loadStatus]);

  const updateField = (
    key: keyof BankForm,
    raw: string
  ) => {
    let value = raw;

    if (
      key === "accountNumber" ||
      key === "confirmAccountNumber"
    ) {
      value = raw.replace(/\D/g, "").slice(0, 20);
    }

    if (key === "ifscCode") {
      value = raw.toUpperCase().slice(0, 11);
    }

    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
    setDirty(true);
  };

  const validate = (): string | null => {
    if (
      form.accountHolderName.trim().length < 2 ||
      form.bankName.trim().length < 2
    ) {
      return "Enter the account holder name and bank name.";
    }

    if (!/^\d{6,20}$/.test(form.accountNumber)) {
      return "Enter a valid bank account number.";
    }

    if (form.accountNumber !== form.confirmAccountNumber) {
      return "Account numbers do not match.";
    }

    if (
      !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(
        form.ifscCode.trim().toUpperCase()
      )
    ) {
      return "Enter a valid IFSC code.";
    }

    if (
      form.accountType &&
      !["SAVINGS", "CURRENT"].includes(form.accountType)
    ) {
      return "Select a valid account type.";
    }

    return null;
  };

  useImperativeHandle(ref, () => ({
    async submitIfDirty(id: number) {
      // No bank entry means the original vendor save
      // must continue exactly as before.
      if (!dirty) return;

      if (status?.lastRequest?.status === "PENDING") {
        const message =
          "A bank change is already pending approval.";
        toast.error(message);
        throw new Error(message);
      }

      const error = validate();
      if (error) {
        toast.error(error);
        throw new Error(error);
      }

      setBusy(true);

      try {
        await api(`/vendor-bank-details/${id}/requests`, {
          method: "POST",
          body: {
            ...form,
            accountHolderName: form.accountHolderName.trim(),
            bankName: form.bankName.trim(),
            ifscCode: form.ifscCode.trim().toUpperCase(),
            branchName: form.branchName.trim(),
            upiId: form.upiId.trim(),
          },
        });

        setForm({ ...emptyForm });
        setDirty(false);

        await loadStatus(id);

        toast.success(
          "Bank details submitted for Admin approval."
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to submit bank details."
        );
        throw error;
      } finally {
        setBusy(false);
      }
    },
  }));

  const review = async (
    action: "approve" | "reject",
    requestId: number
  ) => {
    if (action === "reject" && reason.trim().length < 5) {
      toast.error("Enter a rejection reason.");
      return;
    }

    setBusy(true);

    try {
      await api(
        `/vendor-bank-details/requests/${requestId}/${action}`,
        {
          method: "POST",
          ...(action === "reject"
            ? { body: { reason: reason.trim() } }
            : {}),
        }
      );

      toast.success(
        action === "approve"
          ? "Bank details approved."
          : "Bank change rejected."
      );

      setReason("");

      if (vendorId) {
        await loadStatus(vendorId);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Review action failed."
      );
    } finally {
      setBusy(false);
    }
  };

  const field = (
    label: string,
    key: keyof BankForm,
    required = false,
    type = "text"
  ) => (
    <div className="space-y-2">
      <Label htmlFor={`vendor-bank-${key}`}>
        {label}{required ? " *" : ""}
      </Label>
      <Input
        id={`vendor-bank-${key}`}
        type={type}
        value={form[key]}
        autoComplete="off"
        maxLength={
          key === "ifscCode"
            ? 11
            : key === "accountNumber" ||
                key === "confirmAccountNumber"
              ? 20
              : 120
        }
        onChange={(event) =>
          updateField(key, event.target.value)
        }
        disabled={
          busy ||
          status?.canSubmit === false ||
          status?.lastRequest?.status === "PENDING"
        }
        placeholder={label}
      />
    </div>
  );

  const lastRequest = status?.lastRequest;
  const hasPending = lastRequest?.status === "PENDING";

  return (
    <section className="mt-4 space-y-5 border-t pt-6">
      <div>
        <h3 className="text-lg font-semibold text-pink-600">
          Bank Details
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Add or update vendor bank information. New submissions
          require Admin approval before becoming active.
        </p>
      </div>

      {loadError && (
        <p className="text-sm text-red-600" role="alert">
          {loadError}
        </p>
      )}

      {status?.approved && (
        <div className="rounded-lg border bg-gray-50 p-4">
          <p className="mb-3 font-medium">
            Approved Bank Account
          </p>
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <p>
              <strong>Account Holder:</strong>{" "}
              {status.approved.accountHolderName}
            </p>
            <p>
              <strong>Bank:</strong>{" "}
              {status.approved.bankName}
            </p>
            <p>
              <strong>Account:</strong>{" "}
              {status.approved.accountNumberMasked}
            </p>
            <p>
              <strong>IFSC:</strong>{" "}
              {status.approved.ifscCode}
            </p>
            <p>
              <strong>Branch:</strong>{" "}
              {status.approved.branchName || "—"}
            </p>
            <p>
              <strong>Type:</strong>{" "}
              {status.approved.accountType || "—"}
            </p>
          </div>
        </div>
      )}

      {lastRequest && (
        <div className="space-y-3 rounded-lg border p-4">
          <p className="font-medium">
            Latest Bank Request — {lastRequest.status}
          </p>
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <p>
              <strong>Account Holder:</strong>{" "}
              {lastRequest.accountHolderName}
            </p>
            <p>
              <strong>Bank:</strong>{" "}
              {lastRequest.bankName}
            </p>
            <p>
              <strong>Account:</strong>{" "}
              {lastRequest.accountNumberMasked}
            </p>
            <p>
              <strong>IFSC:</strong>{" "}
              {lastRequest.ifscCode}
            </p>
          </div>

          {lastRequest.status === "REJECTED" &&
            lastRequest.rejectionReason && (
              <p className="text-sm text-red-600">
                Reason: {lastRequest.rejectionReason}
              </p>
            )}

          {hasPending && status?.canReview && (
            <div className="space-y-3 border-t pt-3">
              <Label htmlFor="bank-rejection-reason">
                Reason for rejection
              </Label>
              <Input
                id="bank-rejection-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={255}
                placeholder="Required only when rejecting"
              />
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    review("approve", lastRequest.id)
                  }
                >
                  Approve Bank Details
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={busy || reason.trim().length < 5}
                  onClick={() =>
                    review("reject", lastRequest.id)
                  }
                >
                  Reject
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {(status?.canSubmit !== false) && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {field("Account Holder Name", "accountHolderName", true)}
            {field("Bank Name", "bankName", true)}
            {field("Account Number", "accountNumber", true, "password")}
            {field(
              "Confirm Account Number",
              "confirmAccountNumber",
              true,
              "password"
            )}
            {field("IFSC Code", "ifscCode", true)}
            {field("Branch Name", "branchName")}

            <div className="space-y-2">
              <Label htmlFor="vendor-bank-accountType">
                Account Type
              </Label>
              <select
                id="vendor-bank-accountType"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.accountType}
                disabled={busy || hasPending}
                onChange={(e) =>
                  updateField("accountType", e.target.value)
                }
              >
                <option value="">Choose Account Type</option>
                <option value="SAVINGS">Savings</option>
                <option value="CURRENT">Current</option>
              </select>
            </div>

            {field("UPI ID (Optional)", "upiId")}
          </div>

          <p className="text-xs text-muted-foreground">
            Bank information is submitted using the existing
            Update & Continue button. Leave these fields empty
            to keep existing vendor information unchanged.
            The account number is never returned in full.
          </p>
        </>
      )}
    </section>
  );
});
