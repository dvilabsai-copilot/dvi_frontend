import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { CheckCircle2 } from "lucide-react";

interface SubscriptionPlan {
  agent_subscription_plan_ID: number;
  agent_subscription_plan_title: string;
  itinerary_allowed: number;
  subscription_amount: number;
  admin_count: number;
  staff_count: number;
  additional_charge_for_per_staff: number;
  per_itinerary_cost: number;
  validity_in_days: number;
  recommended_status: number;
  subscription_notes: string;
  joining_bonus?: number;
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function normalizePlan(raw: any): SubscriptionPlan {
  return {
    agent_subscription_plan_ID: toNumber(raw?.agent_subscription_plan_ID ?? raw?.id),
    agent_subscription_plan_title: String(
      raw?.agent_subscription_plan_title ?? raw?.planTitle ?? "",
    ),
    itinerary_allowed: toNumber(raw?.itinerary_allowed ?? raw?.itineraryCount),
    subscription_amount: toNumber(raw?.subscription_amount ?? raw?.cost),
    admin_count: toNumber(raw?.admin_count ?? raw?.adminCount),
    staff_count: toNumber(raw?.staff_count ?? raw?.staffCount),
    additional_charge_for_per_staff: toNumber(
      raw?.additional_charge_for_per_staff ?? raw?.additionalChargePerStaff,
    ),
    per_itinerary_cost: toNumber(raw?.per_itinerary_cost ?? raw?.itineraryCost),
    validity_in_days: toNumber(raw?.validity_in_days ?? raw?.validityDays),
    recommended_status: toNumber(
      typeof raw?.recommended === "boolean"
        ? raw.recommended
          ? 1
          : 0
        : raw?.recommended_status,
    ),
    subscription_notes: String(raw?.subscription_notes ?? raw?.notes ?? ""),
    joining_bonus: toNumber(raw?.joining_bonus ?? raw?.joiningBonus),
  };
}

interface SubscriptionRenewalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlanId?: number;
  agentSubscribedPlanId?: number;
  onSelectPlan: (plan: SubscriptionPlan, agentSubscribedPlanId?: number) => Promise<void>;
  isLoading?: boolean;
}

export function SubscriptionRenewalModal({
  open,
  onOpenChange,
  currentPlanId,
  agentSubscribedPlanId,
  onSelectPlan,
  isLoading = false,
}: SubscriptionRenewalModalProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      loadPlans();
    }
  }, [open]);

  const loadPlans = async () => {
    try {
      setLoadingPlans(true);
      // Fetch all subscription plans from backend
      const response = await api("/agent-subscription-plans");
      const rows = Array.isArray(response) ? response : response?.data || [];
      const allPlans = Array.isArray(rows) ? rows.map(normalizePlan) : [];
      
      if (Array.isArray(allPlans)) {
        setPlans(allPlans);
        
        // Set current plan if found
        if (currentPlanId) {
          const current = allPlans.find((p) => p.agent_subscription_plan_ID === currentPlanId);
          if (current) {
            setCurrentPlan(current);
            setSelectedPlanId(current.agent_subscription_plan_ID);
          }
        }
      }
    } catch (error) {
      console.error("Failed to load subscription plans:", error);
      toast.error("Failed to load subscription plans");
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    try {
      setSelectedPlanId(plan.agent_subscription_plan_ID);
      await onSelectPlan(plan, agentSubscribedPlanId);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to process plan selection:", error);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${toNumber(amount).toLocaleString("en-IN")}`;
  };

  const otherPlans = plans.filter(
    (p) => p.agent_subscription_plan_ID !== currentPlanId
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">Choose Subscription Plan</DialogTitle>
          <p className="text-center text-sm text-gray-600 mt-2">
            Don't miss out on the benefits of your subscription. Renew today to stay connected.
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Plan Section */}
          {currentPlan && (
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-700">Current Plan</h3>
              <PlanCard 
                plan={currentPlan} 
                isRecommended={true} 
                isCurrent={true}
                isSelected={selectedPlanId === currentPlan.agent_subscription_plan_ID}
                isLoading={isLoading && selectedPlanId === currentPlan.agent_subscription_plan_ID}
                onSelect={() => handleSelectPlan(currentPlan)}
              />
            </div>
          )}

          {/* Other Plans Section */}
          {otherPlans.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-700">Other Available Plans</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {otherPlans.map(plan => (
                  <PlanCard
                    key={plan.agent_subscription_plan_ID}
                    plan={plan}
                    isRecommended={plan.recommended_status === 1}
                    isCurrent={false}
                    isSelected={selectedPlanId === plan.agent_subscription_plan_ID}
                    isLoading={isLoading && selectedPlanId === plan.agent_subscription_plan_ID}
                    onSelect={() => handleSelectPlan(plan)}
                  />
                ))}
              </div>
            </div>
          )}

          {loadingPlans && (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading subscription plans...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface PlanCardProps {
  plan: SubscriptionPlan;
  isRecommended?: boolean;
  isCurrent?: boolean;
  isSelected?: boolean;
  isLoading?: boolean;
  onSelect: () => void;
}

function PlanCard({
  plan,
  isRecommended = false,
  isCurrent = false,
  isSelected = false,
  isLoading = false,
  onSelect,
}: PlanCardProps) {
  const formatCurrency = (amount: number) => {
    return `₹${toNumber(amount).toLocaleString("en-IN")}`;
  };

  return (
    <Card className={`relative p-6 transition-all ${
      isCurrent ? "border-2 border-red-500 bg-red-50" : "border hover:shadow-lg"
    } ${isRecommended && !isCurrent ? "border-2 border-orange-500" : ""}`}>
      {/* Badge */}
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-red-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
            Renew Existing Plan
          </div>
        </div>
      )}
      
      {isRecommended && !isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
            Recommended
          </div>
        </div>
      )}

      <div className="mt-4 space-y-4">
        <h4 className="text-lg font-semibold text-gray-800">
          {plan.agent_subscription_plan_title}
        </h4>

        <div className="text-center">
          <p className="text-3xl font-bold text-red-600">
            {formatCurrency(plan.subscription_amount)}
          </p>
          <p className="text-sm text-gray-600">per {plan.validity_in_days} days</p>
        </div>

        <div className="space-y-2 text-sm">
          <PlanFeature 
            icon="✓" 
            text={`Allowed Itinerary creation (${plan.itinerary_allowed})`}
          />
          <PlanFeature 
            icon="✓" 
            text={`Per Itinerary creating cost (${formatCurrency(plan.per_itinerary_cost)})`}
          />
          <PlanFeature 
            icon="✓" 
            text={`Staff login count (${plan.staff_count})`}
          />
          <PlanFeature 
            icon="✓" 
            text={`Per cost staff for extra login (${formatCurrency(plan.additional_charge_for_per_staff)})`}
          />
          {plan.joining_bonus && plan.joining_bonus > 0 && (
            <PlanFeature 
              icon="✓" 
              text={`Joining Bonus (${formatCurrency(plan.joining_bonus)})`}
              highlight={true}
            />
          )}
        </div>

        {plan.subscription_notes && (
          <p className="text-xs text-gray-600 italic border-t pt-2">
            {plan.subscription_notes}
          </p>
        )}

        <Button
          onClick={onSelect}
          disabled={isLoading}
          className={`w-full mt-4 font-semibold ${
            isCurrent || isRecommended
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "border-red-600 text-red-600 hover:bg-red-50"
          }`}
          variant={isCurrent || isRecommended ? "default" : "outline"}
        >
          {isLoading ? "Processing..." : "Choose Plan"}
        </Button>
      </div>
    </Card>
  );
}

function PlanFeature({ icon, text, highlight = false }: { icon: string; text: string; highlight?: boolean }) {
  return (
    <div className={`flex items-start gap-2 ${highlight ? "font-semibold text-green-700" : ""}`}>
      <span className="text-green-600 mt-0.5">{icon}</span>
      <span className="text-gray-700">{text}</span>
    </div>
  );
}
