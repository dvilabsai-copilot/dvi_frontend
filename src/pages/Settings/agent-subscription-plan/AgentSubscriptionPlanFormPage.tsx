// FILE: src/pages/agent-subscription-plan/AgentSubscriptionPlanFormPage.tsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import {
  agentSubscriptionPlanService,
  AgentSubscriptionPlanPayload,
  SubscriptionType,
} from "@/services/agentSubscriptionPlanService";

import { CKEditor } from "ckeditor4-react";

function toNum(v: string) {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : 0;
}

export default function AgentSubscriptionPlanFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [planTitle, setPlanTitle] = useState("");
  const [type, setType] = useState<SubscriptionType>("Paid");
  const [cost, setCost] = useState("");
  const [itineraryCount, setItineraryCount] = useState("");
  const [itineraryCost, setItineraryCost] = useState("");
  const [joiningBonus, setJoiningBonus] = useState("");
  const [validityDays, setValidityDays] = useState("");
  const [adminCount, setAdminCount] = useState("1");
  const [staffCount, setStaffCount] = useState("");
  const [additionalChargePerStaff, setAdditionalChargePerStaff] = useState("");
 const [notes, setNotes] = useState(""); // HTML string

  const title = isEdit ? "Edit Subscription Plan" : "Add Subscription Plan";

  const breadcrumb = useMemo(() => {
    return (
      <div className="text-sm text-violet-700 flex items-center gap-2">
        <span className="hover:underline cursor-pointer" onClick={() => navigate("/")}>
          Dashboard
        </span>
        <span className="text-slate-400">›</span>
        <span
          className="hover:underline cursor-pointer"
          onClick={() => navigate("/agent-subscription-plan")}
        >
          List of Subscription Plan
        </span>
        <span className="text-slate-400">›</span>
        <span className="text-slate-600">{title}</span>
      </div>
    );
  }, [navigate, title]);

  useEffect(() => {
    boot();
 // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function boot() {
    if (!isEdit || !id) return;
    setLoading(true);
    try {
      const d = await agentSubscriptionPlanService.getOne(id);

      setPlanTitle(d.planTitle ?? "");
      setType(d.type ?? "Paid");
      setCost(String(d.cost ?? ""));
      setItineraryCount(String(d.itineraryCount ?? ""));
      setItineraryCost(String(d.itineraryCost ?? ""));
      setJoiningBonus(String(d.joiningBonus ?? ""));
      setValidityDays(String(d.validityDays ?? ""));
      setAdminCount(String(d.adminCount ?? 1));
      setStaffCount(String(d.staffCount ?? ""));
      setAdditionalChargePerStaff(String(d.additionalChargePerStaff ?? ""));
      setNotes(String(d.notes ?? ""));
    } catch {
      toast.error("Failed to load subscription plan");
    } finally {
      setLoading(false);
    }
  }

  function validate() {
    if (!planTitle.trim()) return "Subscription Title is required";
    if (!type) return "Type is required";
    if (!cost.trim()) return "Subscription Amount is required";
    if (!itineraryCount.trim()) return "No of Itinerary Allowed is required";
    if (!itineraryCost.trim()) return "Cost of Per Itinerary is required";
    if (!joiningBonus.trim()) return "Joining Bonus is required";
    if (!validityDays.trim()) return "Validity in days is required";
    if (!staffCount.trim()) return "Staff Count is required";
    if (!additionalChargePerStaff.trim())
      return "Additional Charge for Per Staff is required";

 // Notes required (as in screenshot)
    const plain = notes.replace(/<[^>]+>/g, "").trim();
    if (!plain) return "Notes is required";

    return null;
  }

  async function onSave() {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    const payload: AgentSubscriptionPlanPayload = {
      planTitle: planTitle.trim(),
      type,
      cost: toNum(cost),
      itineraryCount: toNum(itineraryCount),
      itineraryCost: toNum(itineraryCost),
      joiningBonus: toNum(joiningBonus),
      validityDays: toNum(validityDays),
      adminCount: toNum(adminCount || "1") || 1,
      staffCount: toNum(staffCount),
      additionalChargePerStaff: toNum(additionalChargePerStaff),
 notes: notes "", // HTML
    };

    setSaving(true);
    try {
      if (isEdit && id) {
        await agentSubscriptionPlanService.update(id, payload);
        toast.success("Subscription plan updated");
      } else {
        await agentSubscriptionPlanService.create(payload);
        toast.success("Subscription plan created");
      }
      navigate("/agent-subscription-plan");
    } catch {
      toast.error(isEdit ? "Failed to update" : "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-800">{title}</h1>
        {breadcrumb}
      </div>

      <div className="bg-white rounded-lg border p-6">
        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500">Loading...</div>
        ) : (
          <>
            <div className="rounded-lg border border-violet-100 bg-white p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Subscription Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    className="h-11"
                    placeholder="Enter the Subscription Title"
                    value={planTitle}
                    onChange={(e) => setPlanTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="border rounded-md h-11 px-3 w-full"
                    value={type}
                    onChange={(e) => setType(e.target.value as SubscriptionType)}
                  >
                    <option value="Paid">Paid</option>
                    <option value="Free">Free</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Subscription Amount <span className="text-red-500">*</span>
                  </label>
                  <Input
                    className="h-11"
                    placeholder="Enter the Subscription Cost"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    No of Itinerary Allowed <span className="text-red-500">*</span>
                  </label>
                  <Input
                    className="h-11"
                    placeholder="Enter the No of Itinerary Allowed"
                    value={itineraryCount}
                    onChange={(e) => setItineraryCount(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Cost of Per Itinerary <span className="text-red-500">*</span>
                  </label>
                  <Input
                    className="h-11"
                    placeholder="Enter the Cost of Per Itinerary"
                    value={itineraryCost}
                    onChange={(e) => setItineraryCost(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Joining Bonus <span className="text-red-500">*</span>
                  </label>
                  <Input
                    className="h-11"
                    placeholder="Enter the Joining Bonus"
                    value={joiningBonus}
                    onChange={(e) => setJoiningBonus(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Validity in days <span className="text-red-500">*</span>
                  </label>
                  <Input
                    className="h-11"
                    value={validityDays}
                    onChange={(e) => setValidityDays(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Admin Count
                  </label>
                  <Input className="h-11" value={adminCount} readOnly />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Staff Count <span className="text-red-500">*</span>
                  </label>
                  <Input
                    className="h-11"
                    placeholder="Enter the Staff Count"
                    value={staffCount}
                    onChange={(e) => setStaffCount(e.target.value)}
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Additional Charge for Per Staff <span className="text-red-500">*</span>
                  </label>
                  <Input
                    className="h-11"
                    placeholder="Enter the Additional Charge for Per Staff"
                    value={additionalChargePerStaff}
                    onChange={(e) => setAdditionalChargePerStaff(e.target.value)}
                  />
                </div>

 {/* NOTES (CKEditor-like toolbar as per screenshot) */}
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Notes <span className="text-red-500">*</span>
                  </label>

                  <div className="rounded-md border overflow-hidden">
                    <CKEditor
                      initData={notes}
                      onChange={(evt: any) => {
                        const data = evt.editor?.getData?.() ?? "";
                        setNotes(data);
                      }}
                      config={{
                        height: 200,
 // Toolbar close to your screenshot (Paragraph dropdown, bold/italic, lists, link, undo/redo, Source, etc.)
                        toolbar: [
                          { name: "document", items: ["Source"] },
                          { name: "clipboard", items: ["Cut", "Copy", "Paste", "PasteText", "PasteFromWord", "-", "Undo", "Redo"] },
 { name: "styles", items: ["Format"] }, // shows "Paragraph"
                          { name: "basicstyles", items: ["Bold", "Italic", "Underline", "Strike", "-", "RemoveFormat"] },
                          { name: "paragraph", items: ["NumberedList", "BulletedList", "-", "Outdent", "Indent", "-", "Blockquote"] },
                          { name: "links", items: ["Link", "Unlink"] },
                          { name: "insert", items: ["Image", "Table", "HorizontalRule", "SpecialChar"] },
                          { name: "tools", items: ["Maximize"] },
                        ],
                        removeButtons: "",
                      }}
                    />
                  </div>

                  <p className="text-xs text-slate-500 mt-2">
                    Note: The exact PDF/Word export icons seen in your screenshot require CKEditor plugins.
                    This setup gives the same editor UI/toolbar style and stores HTML in DB.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-10 flex items-center justify-between">
              <Button
                type="button"
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-10"
                onClick={() => navigate("/agent-subscription-plan")}
                disabled={saving}
              >
                Back
              </Button>

              <Button
                type="button"
                className="bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 text-white px-10"
                onClick={onSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
export { AgentSubscriptionPlanFormPage };