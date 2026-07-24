// FILE: src/pages/staff/StaffPreviewPage.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { StaffAPI } from "@/services/staffService";
import type { Staff } from "@/types/staff";

export default function StaffPreviewPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<Staff | null>(null);

  useEffect(() => {
    if (id) {
      StaffAPI.get(Number(id))
        .then((data) => setStaff(data))
        .catch(() => toast.error("Failed to load staff"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="p-6">
        <div className="text-center py-12">Staff not found</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
 {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Preview Staff</h1>
        <div className="text-sm text-muted-foreground">
          Dashboard &gt; Staff &gt; Preview Staff
        </div>
      </div>

 {/* Preview Card */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-pink-600 mb-6">Staff Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 {/* Staff Name */}
          <div>
            <p className="text-sm text-gray-500">Staff Name</p>
            <p className="font-medium">{staff.name}</p>
          </div>

 {/* Email ID */}
          <div>
            <p className="text-sm text-gray-500">Email ID</p>
            <p className="font-medium">{staff.email}</p>
          </div>

 {/* Mobile Number */}
          <div>
            <p className="text-sm text-gray-500">Mobile Number</p>
            <p className="font-medium">{staff.mobileNumber}</p>
          </div>

 {/* Role */}
          <div>
            <p className="text-sm text-gray-500">Role</p>
            <p className="font-medium">{staff.roleAccess}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
 {/* User Name */}
          <div>
            <p className="text-sm text-gray-500">User Name</p>
            <p className="font-medium">{staff.mobileNumber}</p>
          </div>

 {/* Status */}
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <p className={`font-medium ${staff.status === 1 ? "text-green-600" : "text-red-600"}`}>
              {staff.status === 1 ? "Active" : "Inactive"}
            </p>
          </div>
        </div>

 {/* Back Button */}
        <div className="flex justify-start pt-6">
          <Button
            variant="secondary"
            onClick={() => navigate("/staff")}
          >
            Back
          </Button>
        </div>
      </div>
    </div>
  );
}