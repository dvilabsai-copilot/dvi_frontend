import { api } from '../lib/api';

export interface CreateOrderResponse {
  id?: string;
  orderId: string;
  amount: number;
  currency: string;
  key: string;
}

export interface VerifyPaymentData {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export const paymentService = {
  createWalletTopupOrder: async (amountInInr: number): Promise<CreateOrderResponse> => {
    return api('/payments/razorpay/wallet-topup/create-order', {
      method: 'POST',
      body: { amountInInr },
    });
  },

  confirmWalletTopup: async (data: VerifyPaymentData): Promise<any> => {
    return api('/payments/razorpay/wallet-topup/confirm', { method: 'POST', body: data });
  },

  createSubscriptionRenewalOrder: async (
    subscriptionPlanId: number,
    agentSubscribedPlanId?: number,
  ): Promise<CreateOrderResponse> => {
    return api('/payments/razorpay/subscription-renewal/create-order', {
      method: 'POST',
      body: { subscriptionPlanId, agentSubscribedPlanId },
    });
  },

  confirmSubscriptionRenewal: async (data: VerifyPaymentData): Promise<any> => {
    return api('/payments/razorpay/subscription-renewal/confirm', { method: 'POST', body: data });
  },

  createAgentRegistrationOrder: async (
    agentId: number,
    subscriptionPlanId: number,
    referralAgentId?: number,
  ): Promise<CreateOrderResponse> => {
    return api('/payments/razorpay/agent-registration/create-order', {
      method: 'POST',
      body: { agentId, subscriptionPlanId, referralAgentId },
    });
  },

  confirmAgentRegistrationPaid: async (data: VerifyPaymentData): Promise<any> => {
    return api('/payments/razorpay/agent-registration/confirm', { method: 'POST', body: data });
  },

  // Legacy compatibility wrappers
  createOrder: async (amount: number): Promise<CreateOrderResponse> => {
    return paymentService.createWalletTopupOrder(amount);
  },

  createSubscriptionOrder: async (
    planId: number,
    agentSubscribedPlanId?: number,
  ): Promise<CreateOrderResponse> => {
    return paymentService.createSubscriptionRenewalOrder(planId, agentSubscribedPlanId);
  },

  verifyPayment: async (data: VerifyPaymentData): Promise<any> => {
    return api('/payments/verify-payment', { method: 'POST', body: data });
  },

  getWalletHistory: async (): Promise<any[]> => {
    return api('/payments/wallet-history');
  }
};
