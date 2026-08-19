// FILE: src/pages/staff/StaffFormPage.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { StaffAPI, fetchStaffRoles } from "@/services/staffService";

type RoleOption = { id: number; label: string };

export default function StaffFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

    const [loading, setLoading] = useState(false); 
  const [saving, setSaving] = useState(false); 
  const [showPassword, setShowPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({
    email: "",
    mobileNumber: "",
  });

  // dynamic roles
  const [roles, setRoles] = useState<RoleOption[]>([]);

  // form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobileNumber: "",
    password: "",
    roleId: undefined as number | undefined, // ← dynamic numeric role
  });

  // load roles once
  useEffect(() => {
    (async () => {
      try {
        const r = await fetchStaffRoles();
        setRoles(r || []);
      } catch {
        // optional toast/log
      }
    })();
  }, []);

  // load staff if editing
  useEffect(() => {
    if (isEditMode && id) {
      setLoading(true);
      StaffAPI.get(Number(id))
        .then((staff) => {
          if (staff) {
            setFormData({
              name: staff.name,
              email: staff.email,
              mobileNumber: staff.mobileNumber,
              password: "",
              roleId: staff.roleId ?? undefined, // backend already returns roleId
            });
          }
        })
        .catch(() => toast.error("Failed to load staff"))
        .finally(() => setLoading(false));
    }
  }, [id, isEditMode]);

  // helper for selected role label (for any custom UI needs)
  const selectedRoleLabel =
    roles.find((r) => r.id === formData.roleId)?.label ?? "Select Role";

   useEffect(() => {
    const email = formData.email.trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldErrors((prev) => ({
        ...prev,
        email: "",
      }));
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const result = await StaffAPI.checkDuplicate({
          email,
          ignoreStaffId:
            isEditMode && id ? Number(id) : undefined,
        });

        if (cancelled) return;

        setFieldErrors((prev) => ({
          ...prev,
          email: result.emailExists
            ? "Entered staff Email Already Exists"
            : "",
        }));
      } catch {
        //
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [formData.email, id, isEditMode]);

  useEffect(() => {
    const mobile = formData.mobileNumber.trim();

    if (!mobile) {
      setFieldErrors((prev) => ({
        ...prev,
        mobileNumber: "",
      }));
      return;
    }

     if (mobile.length !== 10) {
      setFieldErrors((prev) => ({
        ...prev,
        mobileNumber:
          "This value length is invalid. It should be between 10 and 10 characters long.",
      }));
      return;
    }

    if (!/^[6-9]/.test(mobile)) {
      setFieldErrors((prev) => ({
        ...prev,
        mobileNumber:
          "Mobile number must start with 6, 7, 8, or 9.",
      }));
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const result = await StaffAPI.checkDuplicate({
          mobileNumber: mobile,
          ignoreStaffId:
            isEditMode && id ? Number(id) : undefined,
        });

        if (cancelled) return;

        setFieldErrors((prev) => ({
          ...prev,
          mobileNumber: result.mobileExists
            ? "Entered staff Mobile Already Exists"
            : "",
        }));
      } catch {
        //
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [formData.mobileNumber, id, isEditMode]);

   const handleSubmit = async (e: React.FormEvent) => { 
    e.preventDefault();

    if (fieldErrors.email || fieldErrors.mobileNumber) {
      return;
    }

    setSaving(true); 
 
    try {
           if (!formData.roleId || Number.isNaN(formData.roleId)) { 
        toast.error("Please select a role"); 
        setSaving(false); 
        return; 
      } 

         if (!/^[6-9]\d{9}$/.test(formData.mobileNumber.trim())) {
  setFieldErrors((prev) => ({
    ...prev,
    mobileNumber:
      formData.mobileNumber.trim().length !== 10
        ? "This value length is invalid. It should be between 10 and 10 characters long."
        : "Mobile number must start with 6, 7, 8, or 9.",
  }));
  setSaving(false);
  return;
}
 
      if (isEditMode && id) {
        await StaffAPI.update(Number(id), {
          name: formData.name.trim(),
          email: formData.email.trim(),
          mobileNumber: formData.mobileNumber.trim(),
          roleId: formData.roleId, // ← pass numeric roleId
          password: formData.password || undefined,
        });
        toast.success("Staff updated successfully");
      } else {
        // Create requires password (backend creates login)
        if (!formData.password || formData.password.trim().length < 6) {
          toast.error("Password must be at least 6 characters");
          setSaving(false);
          return;
        }
        await StaffAPI.create({
          name: formData.name.trim(),
          email: formData.email.trim(),
          mobileNumber: formData.mobileNumber.trim(),
          roleId: formData.roleId, // ← pass numeric roleId
          agentName: "--",
          status: 1,
          password: formData.password,
        });
        toast.success("Staff created successfully");
      }
      navigate("/staff");
      } catch (error: any) {
      const backendMessage =
        error?.response?.data?.message ??
        error?.message ??
        "Failed to save staff";

      const message = Array.isArray(backendMessage)
        ? backendMessage[0]
        : String(backendMessage);

      const normalizedMessage = message.toLowerCase();

      if (
        normalizedMessage.includes("staff email already exists") ||
        normalizedMessage.includes("login email already exists")
      ) {
        setFieldErrors((prev) => ({
          ...prev,
          email: "Entered staff Email Already Exists",
        }));
      } else if (normalizedMessage.includes("staff mobile already exists")) {
        setFieldErrors((prev) => ({
          ...prev,
          mobileNumber: "Entered staff Mobile Already Exists",
        }));
      } else {
        toast.error(message);
      }
    } finally { 
      setSaving(false); 
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">
          {isEditMode ? "Edit Staff" : "Add Staff"}
        </h1>
        <div className="text-sm text-muted-foreground">
          Dashboard &gt; Staff &gt; {isEditMode ? "Edit Staff" : "Add Staff"}
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-pink-600 mb-6">Staff Details</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Staff Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Staff Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* Email ID */}
            <div className="space-y-2">
              <Label htmlFor="email">
                Email ID <span className="text-red-500">*</span>
              </Label>
                            <Input 
                id="email" 
                type="email" 
                value={formData.email}
                className={fieldErrors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
                             onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required 
              />

              {fieldErrors.email && (
                <p className="text-sm text-red-500">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Mobile Number */}
            <div className="space-y-2">
              <Label htmlFor="mobile">
                Mobile Number <span className="text-red-500">*</span>
              </Label>
                          <Input 
                id="mobile" 
                inputMode="numeric"
                value={formData.mobileNumber}
                className={
                  fieldErrors.mobileNumber
                    ? "border-red-500 focus-visible:ring-red-500"
                    : ""
                }
                              onChange={(e) =>
                  setFormData({
                    ...formData,
                    mobileNumber: e.target.value.replace(/[^\d]/g, ""),
                  })
                }
                required 
              />

              {fieldErrors.mobileNumber && (
                <p className="text-sm text-red-500">
                  {fieldErrors.mobileNumber}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">
                Password{" "}
                {isEditMode ? (
                  <span className="text-gray-400">(optional)</span>
                ) : (
                  <span className="text-red-500">*</span>
                )}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!isEditMode}
                  minLength={isEditMode ? 0 : 6}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Role (dynamic) */}
            <div className="space-y-2">
              <Label htmlFor="role">
                Role <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.roleId !== undefined ? String(formData.roleId) : ""}
                onValueChange={(v) =>
                  setFormData({ ...formData, roleId: v ? Number(v) : undefined })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((opt) => (
                    <SelectItem key={opt.id} value={String(opt.id)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Optional helper text */}
              <p className="text-xs text-muted-foreground">{selectedRoleLabel}</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/staff")}
            >
              Back
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-gradient-to-r from-primary to-pink-500 hover:from-primary/90 hover:to-pink-500/90"
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}