import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  UserCog,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  api,
  API_BASE_URL,
} from "@/lib/api";
import {
  getAuthenticatedRoleId,
} from "@/services/accessControl";
import { USER_ROLES } from "@/constants/systemRoles";

import AgentProfileEditDialog from "./AgentProfileEditDialog";

interface AgentProfile {
  agent_ID: number;

  agent_name:
    string | null;

  agent_lastname:
    string | null;

  agent_email_id:
    string | null;

  agent_primary_mobile_number:
    string | null;

  agent_alternative_mobile_number:
    string | null;

  agent_gst_number?:
    string | null;
  country_label?: string | null;
  state_label?: string | null;
  city_label?: string | null;
  subscription_title?: string | null;
  travel_expert_id?: number | null;
  travel_expert_label?: string | null;
  travel_expert_mobile?: string | null;
  config?: {
  siteLogo?: string | null;
  companyName?: string | null;
  address?: string | null;
  termsAndCondition?: string | null;
  invoiceLogo?: string | null;
  gstinNumber?: string | null;
  panNo?: string | null;
  invoiceAddress?: string | null;
};
  login_enabled: boolean;
}

function resolveAgentLogo(
  value?: string | null,
) {
  const logo = String(
    value ?? "",
  ).trim();

  if (!logo) {
    return "";
  }

  if (
    /^https?:\/\//i.test(logo) ||
    logo.startsWith("//") ||
    logo.startsWith("data:") ||
    logo.startsWith("blob:")
  ) {
    return logo;
  }

  const apiBase = String(
    API_BASE_URL || "",
  ).replace(/\/+$/, "");

  const fileBase =
    apiBase.replace(
      /\/api\/v1$/i,
      "",
    );

  if (logo.startsWith("/uploads/")) {
    return `${fileBase}${logo}`;
  }

  if (logo.startsWith("uploads/")) {
    return `${fileBase}/${logo}`;
  }

  return `${fileBase}/uploads/agent_gallery/${encodeURIComponent(
    logo,
  )}`;
}

const Profile = () => {
  const role = getAuthenticatedRoleId();
  const isAgent = role === USER_ROLES.AGENT;

  const [profile, setProfile] =
    useState<AgentProfile | null>(null);
const [loading, setLoading] =
  useState(true);

const [
  editProfileOpen,
  setEditProfileOpen,
] = useState(false);

  useEffect(() => {
    if (!isAgent) {
      setLoading(false);
      return;
    }

    let alive = true;

    const fetchProfile = async () => {
      try {
        const data = (await api(
          "/agents/profile",
        )) as AgentProfile;

        if (alive) {
          setProfile(data);
        }
      } catch (error) {
        console.error(
          "Error fetching profile:",
          error,
        );
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      alive = false;
    };
  }, [isAgent]);

  if (!isAgent) {
    return <Navigate to="/restricted" replace />;
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Loading profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 text-center text-red-500">
        Failed to load profile.
      </div>
    );
  }

  const fullName =
    [
      profile.agent_name,
      profile.agent_lastname,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() || "Agent";
const location =
  [
    profile.city_label,
    profile.state_label,
    profile.country_label,
  ]
    .filter(Boolean)
    .join(", ") ||
  profile.config?.address?.trim() ||
  "Not Entered";

const invoiceLogo =
  resolveAgentLogo(
    profile.config?.invoiceLogo,
  );

const siteLogo =
  resolveAgentLogo(
    profile.config?.siteLogo,
  );

return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-3xl font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
          My Profile
        </h3>

        <Button
  variant="outline"
  onClick={() =>
    setEditProfileOpen(
      true,
    )
  }
>
  Edit Profile
</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 text-center space-y-4">
{invoiceLogo ? (
  <div className="mx-auto flex h-24 w-28 items-center justify-center rounded-xl border bg-white p-3">
    <img
      src={invoiceLogo}
      alt={fullName}
      className="max-h-full max-w-full object-contain"
    />
  </div>
) : (
  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
    <User className="h-12 w-12 text-primary" />
  </div>
)}

          <div>
            <h4 className="text-xl font-bold">
              {fullName}
            </h4>

            <p className="text-sm text-muted-foreground">
              {profile.subscription_title
                ? `${profile.subscription_title} Plan`
                : "Agent"}
            </p>
          </div>

          <div className="pt-4 border-t border-border">
  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
    <Shield className="h-4 w-4" />

    <span>
      Status:{" "}
      {profile.login_enabled
        ? "Active"
        : "Inactive"}
    </span>
  </div>
</div>


        </Card>

        <Card className="md:col-span-2 p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Mail className="h-4 w-4" />
                Email Address
              </div>

              <p className="text-foreground">
                {profile.agent_email_id || "Not Entered"}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Phone className="h-4 w-4" />
                Phone Number
              </div>

              <p className="text-foreground">
                {profile.agent_primary_mobile_number ||
                  "Not Entered"}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Phone className="h-4 w-4" />
                Alternative Mobile Number
              </div>

              <p className="text-foreground">
                {profile.agent_alternative_mobile_number ||
                  "Not Entered"}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <UserCog className="h-4 w-4" />
                Travel Expert
              </div>

              <p className="text-foreground">
                {profile.travel_expert_label ||
                  "No Travel Expert assigned"}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Phone className="h-4 w-4" />
                Travel Expert Mobile
              </div>

              <p className="text-foreground">
                {profile.travel_expert_mobile ||
                  "Not Entered"}
              </p>
            </div>

            <div className="sm:col-span-2 space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <MapPin className="h-4 w-4" />
                Location
              </div>

              <p className="text-foreground">
                {location}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b px-6 py-4">
          <h4 className="text-lg font-semibold">
            Additional Profile Details
          </h4>

          <p className="mt-1 text-sm text-muted-foreground">
            These details can be updated from Edit Profile.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              <tr>
                <td className="w-64 bg-muted/30 px-6 py-4 font-medium text-muted-foreground">
                  GSTIN Number
                </td>

                <td className="px-6 py-4">
                  {profile.agent_gst_number ||
                    "Not Entered"}
                </td>
              </tr>

              <tr>
                <td className="w-64 bg-muted/30 px-6 py-4 font-medium text-muted-foreground">
                  Site Logo
                </td>

                <td className="px-6 py-4">
                  {siteLogo ? (
                    <div className="flex h-16 w-28 items-center justify-center rounded-lg border bg-white p-2">
                      <img
                        src={siteLogo}
                        alt="Site Logo"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    "Not Entered"
                  )}
                </td>
              </tr>

              <tr>
                <td className="w-64 bg-muted/30 px-6 py-4 font-medium text-muted-foreground">
                  Company Name
                </td>

                <td className="px-6 py-4">
                  {profile.config?.companyName ||
                    "Not Entered"}
                </td>
              </tr>

              <tr>
                <td className="w-64 bg-muted/30 px-6 py-4 font-medium text-muted-foreground">
                  Address
                </td>

                <td className="whitespace-pre-wrap break-words px-6 py-4">
                  {profile.config?.address ||
                    "Not Entered"}
                </td>
              </tr>

              <tr>
                <td className="w-64 bg-muted/30 px-6 py-4 font-medium text-muted-foreground">
                  Terms and Condition
                </td>

                <td className="whitespace-pre-wrap break-words px-6 py-4">
                  {profile.config
                    ?.termsAndCondition ||
                    "Not Entered"}
                </td>
              </tr>

              <tr>
                <td className="w-64 bg-muted/30 px-6 py-4 font-medium text-muted-foreground">
                  Invoice GSTIN Number
                </td>

                <td className="px-6 py-4">
                  {profile.config
                    ?.gstinNumber ||
                    "Not Entered"}
                </td>
              </tr>

              <tr>
                <td className="w-64 bg-muted/30 px-6 py-4 font-medium text-muted-foreground">
                  PAN No
                </td>

                <td className="px-6 py-4">
                  {profile.config?.panNo ||
                    "Not Entered"}
                </td>
              </tr>

              <tr>
                <td className="w-64 bg-muted/30 px-6 py-4 font-medium text-muted-foreground">
                  Invoice Address
                </td>

                <td className="whitespace-pre-wrap break-words px-6 py-4">
                  {profile.config
                    ?.invoiceAddress ||
                    "Not Entered"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <AgentProfileEditDialog
        open={
          editProfileOpen
        }

        onOpenChange={
          setEditProfileOpen
        }

        profile={
          profile
        }

        onSaved={(
          updated,
        ) => {
          setProfile(
            updated as AgentProfile,
          );
        }}
      />
    </div>
  );
};

export default Profile;