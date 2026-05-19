import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { paymentService } from "@/services/paymentService";
import { useRazorpayCheckout } from "@/hooks/useRazorpayCheckout";
import { toast } from "sonner";

type Props = {
  agentId: number;
  subscriptionPlanId: number;
  referralAgentId?: number;
  disabled?: boolean;
  label?: string;
  onPaid?: () => Promise<void> | void;
};

export function AgentRegistrationCheckoutButton(props: Props) {
  const navigate = useNavigate();
  const { openCheckout } = useRazorpayCheckout();
  const [busy, setBusy] = useState(false);

  const onPay = async () => {
    try {
      setBusy(true);
      const order = await paymentService.createAgentRegistrationOrder(
        props.agentId,
        props.subscriptionPlanId,
        props.referralAgentId,
      );

      await openCheckout({
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        orderId: order.orderId,
        name: "DVI Holidays",
        description: "Agent Registration Paid Plan",
        onSuccess: async (response) => {
          await paymentService.confirmAgentRegistrationPaid(response);
          await props.onPaid?.();
          navigate(`/payments/success?flow=agent_registration_paid&orderId=${encodeURIComponent(order.orderId)}`);
        },
        onFailure: (error) => {
          console.error(error);
          toast.error("Registration payment verification failed");
        },
        onDismiss: () => {
          toast.error("Payment cancelled");
        },
      });
    } catch (error) {
      console.error(error);
      toast.error("Unable to initiate registration payment");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button onClick={onPay} disabled={props.disabled || busy}>
      {busy ? "Processing..." : props.label || "Pay Registration Plan"}
    </Button>
  );
}
