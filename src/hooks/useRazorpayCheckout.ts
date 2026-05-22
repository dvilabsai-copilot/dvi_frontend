import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

type RazorpaySuccessPayload = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type OpenCheckoutInput = {
  key: string;
  amount: number;
  currency: string;
  orderId: string;
  name: string;
  description: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  onSuccess: (payload: RazorpaySuccessPayload) => Promise<void> | void;
  onFailure?: (error: unknown) => void;
  onDismiss?: () => void;
};

export function useRazorpayCheckout() {
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    const scriptId = 'dvi-razorpay-checkout-script';

    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const openCheckout = async (input: OpenCheckoutInput) => {
    if (!window.Razorpay) {
      throw new Error('Razorpay checkout SDK is not loaded');
    }

    const razorpay = new window.Razorpay({
      key: input.key,
      amount: input.amount,
      currency: input.currency,
      order_id: input.orderId,
      name: input.name,
      description: input.description,
      prefill: input.prefill,
      handler: async (payload: RazorpaySuccessPayload) => {
        if (!mountedRef.current) return;
        try {
          await input.onSuccess(payload);
        } catch (error) {
          input.onFailure?.(error);
        }
      },
      modal: {
        ondismiss: () => {
          if (!mountedRef.current) return;
          input.onDismiss?.();
        },
      },
    });

    razorpay.open();
  };

  return { openCheckout };
}
