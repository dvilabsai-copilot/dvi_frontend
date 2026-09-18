import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Phone, UserCog } from "lucide-react";

import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import {
  getAuthenticatedRoleId,
} from "@/services/accessControl";
import { USER_ROLES } from "@/constants/systemRoles";

type AgentTravelExpertProfile = {
  travel_expert_id: number | null;
  travel_expert_label?: string | null;
  travel_expert_mobile?: string | null;
};

const TravelExpertSettings = () => {
  const role = getAuthenticatedRoleId();
  const isAgent = role === USER_ROLES.AGENT;

  const [profile, setProfile] =
    useState<AgentTravelExpertProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAgent) {
      setLoading(false);
      return;
    }

    let alive = true;

    const fetchTravelExpert = async () => {
      try {
        setLoading(true);
        setError("");

        const data = (await api(
          "/agents/profile",
        )) as AgentTravelExpertProfile;

        if (alive) {
          setProfile(data);
        }
      } catch (err) {
        console.error(
          "Error fetching assigned Travel Expert:",
          err,
        );

        if (alive) {
          setError(
            "Unable to load Travel Expert details.",
          );
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    fetchTravelExpert();

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
        Loading Travel Expert details...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        {error}
      </div>
    );
  }

  const hasAssignedTravelExpert =
    Number(profile?.travel_expert_id || 0) > 0;

  if (!hasAssignedTravelExpert) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <h3 className="text-3xl font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
          Travel Expert Settings
        </h3>

        <Card className="p-6">
          <p className="text-muted-foreground">
            No Travel Expert assigned
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h3 className="text-3xl font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
        Travel Expert Settings
      </h3>

      <Card className="p-6 space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">
            Your assigned Travel Expert
          </p>
          <p className="mt-1 text-sm text-foreground">
            This Travel Expert is assigned specifically to
            your Agent account.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <UserCog className="h-4 w-4" />
              Travel Expert Name
            </div>

            <p className="text-foreground">
              {profile?.travel_expert_label ||
                "Not available"}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Phone className="h-4 w-4" />
              Travel Expert Mobile Number
            </div>

            <p className="text-foreground">
              {profile?.travel_expert_mobile ||
                "Not available"}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default TravelExpertSettings;