import {
  useEffect,
  useState,
} from "react";

import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  api,
  API_BASE_URL,
} from "@/lib/api";

function resolveAgentGalleryUrl(
  value?: string | null,
) {
  const raw = String(
    value ?? "",
  ).trim();

  if (!raw) {
    return "";
  }

  if (
    /^https?:\/\//i.test(
      raw,
    ) ||
    raw.startsWith(
      "//",
    ) ||
    raw.startsWith(
      "data:",
    ) ||
    raw.startsWith(
      "blob:",
    )
  ) {
    return raw;
  }

  const apiBase = String(
    API_BASE_URL || "",
  ).replace(/\/+$/, "");

  const fileBase =
    apiBase.replace(
      /\/api\/v1$/i,
      "",
    );

  if (
    raw.startsWith(
      "/uploads/",
    )
  ) {
    return `${fileBase}${raw}`;
  }

  if (
    raw.startsWith(
      "uploads/",
    )
  ) {
    return `${fileBase}/${raw}`;
  }

  if (raw.startsWith("/")) {
    return raw;
  }

  return `${fileBase}/uploads/agent_gallery/${encodeURIComponent(
    raw,
  )}`;
}

type AgentProfileConfig = {
  siteLogo?: string | null;
  companyName?: string | null;
  address?: string | null;
  termsAndCondition?: string | null;
  invoiceLogo?: string | null;
  gstinNumber?: string | null;
  panNo?: string | null;
  invoiceAddress?: string | null;
};

export type EditableAgentProfile = {
  agent_ID: number;

  agent_name: string | null;
  agent_lastname: string | null;
  agent_email_id: string | null;
  agent_primary_mobile_number: string | null;
  agent_alternative_mobile_number: string | null;
  agent_gst_number?: string | null;

  travel_expert_label?: string | null;

  config?: AgentProfileConfig;
};

type Props = {
  open: boolean;

  onOpenChange: (
    open: boolean,
  ) => void;

  profile: EditableAgentProfile;

  onSaved: (
    profile: EditableAgentProfile,
  ) => void;
};

const emptyForm = {
  firstName: "",
  lastName: "",
  primaryMobile: "",
  alternativeMobile: "",
  agentGstin: "",

  companyName: "",
  address: "",
  termsAndCondition: "",

  gstinNumber: "",
  panNo: "",
  invoiceAddress: "",
};

export default function AgentProfileEditDialog({
  open,
  onOpenChange,
  profile,
  onSaved,
}: Props) {
  const [
    form,
    setForm,
  ] = useState(
    emptyForm,
  );

  const [
    siteLogo,
    setSiteLogo,
  ] = useState<File | null>(
    null,
  );

  const [
  invoiceLogo,
  setInvoiceLogo,
] = useState<File | null>(
  null,
);

const [
  siteLogoPreview,
  setSiteLogoPreview,
] = useState("");

const [
  invoiceLogoPreview,
  setInvoiceLogoPreview,
] = useState("");

const [
  saving,
    setSaving,
  ] = useState(false);

  useEffect(() => {
    if (!open) return;

    setForm({
      firstName:
        profile.agent_name ??
        "",

      lastName:
        profile.agent_lastname ??
        "",

      primaryMobile:
        profile.agent_primary_mobile_number ??
        "",

      alternativeMobile:
        profile.agent_alternative_mobile_number ??
        "",

      agentGstin:
        profile.agent_gst_number ??
        "",

      companyName:
        profile.config
          ?.companyName ??
        "",

      address:
        profile.config
          ?.address ??
        "",

      termsAndCondition:
        profile.config
          ?.termsAndCondition ??
        "",

      gstinNumber:
        profile.config
          ?.gstinNumber ??
        "",

      panNo:
        profile.config
          ?.panNo ??
        "",

      invoiceAddress:
        profile.config
          ?.invoiceAddress ??
        "",
    });

    setSiteLogo(null);
    setInvoiceLogo(null);
  }, [
    open,
    profile,
  ]);

  useEffect(() => {
  if (!siteLogo) {
    setSiteLogoPreview(
      resolveAgentGalleryUrl(
        profile.config
          ?.siteLogo,
      ),
    );

    return;
  }

  const objectUrl =
    URL.createObjectURL(
      siteLogo,
    );

  setSiteLogoPreview(
    objectUrl,
  );

  return () => {
    URL.revokeObjectURL(
      objectUrl,
    );
  };
}, [
  siteLogo,
  profile.config?.siteLogo,
]);

useEffect(() => {
  if (!invoiceLogo) {
    setInvoiceLogoPreview(
      resolveAgentGalleryUrl(
        profile.config
          ?.invoiceLogo,
      ),
    );

    return;
  }

  const objectUrl =
    URL.createObjectURL(
      invoiceLogo,
    );

  setInvoiceLogoPreview(
    objectUrl,
  );

  return () => {
    URL.revokeObjectURL(
      objectUrl,
    );
  };
}, [
  invoiceLogo,
  profile.config
    ?.invoiceLogo,
]);

  const updateField = (
    key:
      keyof typeof form,
    value: string,
  ) => {
    setForm(
      (current) => ({
        ...current,
        [key]: value,
      }),
    );
  };

  const validateImage = (
    file:
      File | undefined,
  ) => {
    if (!file) {
      return true;
    }

    if (
      ![
        "image/jpeg",
        "image/png",
      ].includes(
        file.type,
      )
    ) {
      toast.error(
        "Only JPG, JPEG and PNG images are allowed",
      );

      return false;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      toast.error(
        "Image size must be below 5 MB",
      );

      return false;
    }

    return true;
  };

  const handleSubmit =
    async (
      event:
        React.FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      if (
        !form.firstName
          .trim()
      ) {
        toast.error(
          "First name is required",
        );

        return;
      }

      if (
        !form.lastName
          .trim()
      ) {
        toast.error(
          "Last name is required",
        );

        return;
      }

      if (
        !form.primaryMobile
          .trim()
      ) {
        toast.error(
          "Mobile number is required",
        );

        return;
      }

      if (
        form.gstinNumber &&
        !/^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z][A-Z0-9]$/i.test(
          form.gstinNumber
            .trim(),
        )
      ) {
        toast.error(
          "Invalid Invoice GSTIN number",
        );

        return;
      }

      if (
        form.panNo &&
        !/^[A-Z]{5}\d{4}[A-Z]$/i.test(
          form.panNo
            .trim(),
        )
      ) {
        toast.error(
          "Invalid PAN number",
        );

        return;
      }

      try {
        setSaving(true);

        const data =
          new FormData();

        Object.entries(
          form,
        ).forEach(
          ([
            key,
            value,
          ]) => {
            data.append(
              key,
              value,
            );
          },
        );

        if (siteLogo) {
          data.append(
            "siteLogo",
            siteLogo,
          );
        }

        if (
          invoiceLogo
        ) {
          data.append(
            "invoiceLogo",
            invoiceLogo,
          );
        }

        const updated =
          (await api(
            "/agents/profile",
            {
              method:
                "PUT",

              body:
                data,
            },
          )) as EditableAgentProfile;

       onSaved(
  updated,
);

window.dispatchEvent(
  new CustomEvent(
    "agent-profile-updated",
    {
      detail:
        updated,
    },
  ),
);

toast.success(
  "Profile updated successfully",
);

onOpenChange(
  false,
);
      } catch (error) {
        console.error(
          "Profile update failed",
          error,
        );

        toast.error(
          "Unable to update profile",
        );
      } finally {
        setSaving(false);
      }
    };

  return (
    <Dialog
      open={open}
      onOpenChange={
        onOpenChange
      }
    >
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit Profile
          </DialogTitle>

          <DialogDescription>
            Update your Agent profile, company and invoice settings.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-7"
        >
          <div>
            <h3 className="mb-4 font-semibold text-primary">
              Basic Info
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  First Name
                </Label>

                <Input
                  value={
                    form.firstName
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "firstName",
                      event
                        .target
                        .value,
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Last Name
                </Label>

                <Input
                  value={
                    form.lastName
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "lastName",
                      event
                        .target
                        .value,
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Email Address
                </Label>

                <Input
                  value={
                    profile.agent_email_id ??
                    ""
                  }
                  readOnly
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Mobile No
                </Label>

                <Input
                  value={
                    form.primaryMobile
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "primaryMobile",
                      event
                        .target
                        .value,
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Alternative Mobile No
                </Label>

                <Input
                  value={
                    form.alternativeMobile
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "alternativeMobile",
                      event
                        .target
                        .value,
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>
                  GSTIN Number
                </Label>

                <Input
                  value={
                    form.agentGstin
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "agentGstin",
                      event
                        .target
                        .value,
                    )
                  }
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>
                  Travel Expert
                </Label>

                <Input
                  value={
                    profile.travel_expert_label ||
                    "No Travel Expert assigned"
                  }
                  readOnly
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-primary">
              General Configuration
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
  <Label>
    Site Logo
  </Label>

  <Input
    type="file"
    accept=".jpg,.jpeg,.png"
    onChange={(
      event,
    ) => {
      const file =
        event
          .target
          .files?.[0];

      if (
        validateImage(
          file,
        )
      ) {
        setSiteLogo(
          file ??
            null,
        );
      } else {
        event.target.value =
          "";
      }
    }}
  />

  {siteLogoPreview && (
    <div className="mt-3 flex min-h-28 items-center justify-center rounded-lg border bg-muted/20 p-3">
      <img
        src={
          siteLogoPreview
        }
        alt="Site logo"
        className="max-h-24 max-w-full object-contain"
      />
    </div>
  )}
</div>

              <div className="space-y-2">
                <Label>
                  Company Name
                </Label>

                <Input
                  value={
                    form.companyName
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "companyName",
                      event
                        .target
                        .value,
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Address
                </Label>

                <Textarea
                  value={
                    form.address
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "address",
                      event
                        .target
                        .value,
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Terms and Condition
                </Label>

                <Textarea
                  value={
                    form.termsAndCondition
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "termsAndCondition",
                      event
                        .target
                        .value,
                    )
                  }
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-primary">
              Invoice Setting
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
<div className="space-y-2">
  <Label>
    Invoice Logo
  </Label>

  <Input
    type="file"
    accept=".jpg,.jpeg,.png"
    onChange={(
      event,
    ) => {
      const file =
        event
          .target
          .files?.[0];

      if (
        validateImage(
          file,
        )
      ) {
        setInvoiceLogo(
          file ??
            null,
        );
      } else {
        event.target.value =
          "";
      }
    }}
  />

  {invoiceLogoPreview && (
    <div className="mt-3 flex min-h-28 items-center justify-center rounded-lg border bg-muted/20 p-3">
      <img
        src={
          invoiceLogoPreview
        }
        alt="Invoice logo"
        className="max-h-24 max-w-full object-contain"
      />
    </div>
  )}
</div>
              <div className="space-y-2">
                <Label>
                  Invoice GSTIN Number
                </Label>

                <Input
                  maxLength={15}
                  value={
                    form.gstinNumber
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "gstinNumber",
                      event
                        .target
                        .value
                        .toUpperCase(),
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>
                  PAN No
                </Label>

                <Input
                  maxLength={10}
                  value={
                    form.panNo
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "panNo",
                      event
                        .target
                        .value
                        .toUpperCase(),
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Invoice Address
                </Label>

                <Textarea
                  value={
                    form.invoiceAddress
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "invoiceAddress",
                      event
                        .target
                        .value,
                    )
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={
                saving
              }
              onClick={() =>
                onOpenChange(
                  false,
                )
              }
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={
                saving
              }
            >
              {saving
                ? "Saving..."
                : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}