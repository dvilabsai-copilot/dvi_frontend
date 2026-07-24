// FILE: src/pages/agent-subscription-plan/AgentSubscriptionPlanPreviewPage.tsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  agentSubscriptionPlanService,
  AgentSubscriptionPlanDetails,
} from "@/services/agentSubscriptionPlanService";

function fmtINR(n: number) {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(n ?? 0);
  } catch {
    return `₹${n ?? 0}`;
  }
}

// decode &lt;ul&gt;...&lt;/ul&gt; into real HTML markup
function decodeNotesHtml(html: string | undefined | null): string {
  if (!html) return "";
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
 // body.innerHTML converts entities (&lt;li&gt;) <li>
    return doc.body.innerHTML || "";
  } catch {
 // fallback using <textarea> trick
    const textarea = document.createElement("textarea");
    textarea.innerHTML = html;
    return textarea.value || "";
  }
}

export default function AgentSubscriptionPlanPreviewPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AgentSubscriptionPlanDetails | null>(null);

  useEffect(() => {
    boot();
 // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function boot() {
    if (!id) return;
    setLoading(true);
    try {
      const d = await agentSubscriptionPlanService.getOne(id);
      setData(d);
    } catch {
      toast.error("Failed to load subscription plan");
    } finally {
      setLoading(false);
    }
  }

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
        <span className="text-slate-600">{data?.planTitle || "Preview"}</span>
      </div>
    );
  }, [navigate, data?.planTitle]);

  const decodedNotes = useMemo(
    () => decodeNotesHtml(data?.notes),
    [data?.notes]
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-800">
          » {data?.planTitle || "Subscription Plan"}
        </h1>
        {breadcrumb}
      </div>

      <div className="bg-white rounded-lg border p-6">
        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500">Loading...</div>
        ) : !data ? (
          <div className="py-10 text-center text-sm text-slate-500">No data</div>
        ) : (
          <div className="rounded-lg border border-violet-100 bg-white p-6">
            <h2 className="text-xl font-semibold text-fuchsia-600 mb-6">
              Subscription Plan Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-slate-700">
              <div className="space-y-5">
                <div>
                  <div className="text-sm text-slate-500">Subscription Plan Title</div>
                  <div className="mt-1">{data.planTitle}</div>
                </div>

                <div>
                  <div className="text-sm text-slate-500">Joining Bonus</div>
                  <div className="mt-1">{fmtINR(data.joiningBonus)}</div>
                </div>

                <div>
                  <div className="text-sm text-slate-500">
                    Additional Charge For Per Staff
                  </div>
                  <div className="mt-1">{fmtINR(data.additionalChargePerStaff)}</div>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <div className="text-sm text-slate-500">itinerary Allowed</div>
                  <div className="mt-1">{data.itineraryCount}</div>
                </div>

                <div>
                  <div className="text-sm text-slate-500">Staff Count</div>
                  <div className="mt-1">{data.staffCount}</div>
                </div>

 {/* Subscription Notes with real bullets */}
                <div>
                  <div className="text-sm text-slate-500">Subscription Notes</div>
                  <div className="mt-2 border rounded-md px-5 py-4 min-h-[140px] text-sm text-slate-700 leading-relaxed">
                    {decodedNotes ? (
                      <div
                        className="[&_ul]:list-[square] [&_ul]:pl-5 [&_li]:mb-1"
                        dangerouslySetInnerHTML={{ __html: decodedNotes }}
                      />
                    ) : (
                      <span className="text-slate-400 italic">
                        No notes available for this plan.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <div className="text-sm text-slate-500">Subscription Type</div>
                  <div className="mt-1">{data.type}</div>
                </div>

                <div>
                  <div className="text-sm text-slate-500">Per Itinerary Cost</div>
                  <div className="mt-1">{fmtINR(data.itineraryCost)}</div>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <div className="text-sm text-slate-500">Subscription Amount</div>
                  <div className="mt-1">{fmtINR(data.cost)}</div>
                </div>

                <div>
                  <div className="text-sm text-slate-500">Validity in days</div>
                  <div className="mt-1">{data.validityDays}</div>
                </div>
              </div>
            </div>

            <div className="mt-10">
              <Button
                type="button"
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-10"
                onClick={() => navigate("/agent-subscription-plan")}
              >
                Back
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { AgentSubscriptionPlanPreviewPage };