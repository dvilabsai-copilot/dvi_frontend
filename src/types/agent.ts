// src/types/agent.ts

export interface Agent {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  mobileNumber: string;
  alternativeMobile?: string;
  travelExpert?: string;
  city: string;
  state: string;
  nationality: string;
  subscriptionType: string;
  gstin?: string;
  gstAttachment?: string;
  status: 0 | 1;
  totalCashWallet?: number;
  totalCouponWallet?: number;
}

export interface AgentListRow {
  id: number;
  name: string;
  email: string;
  mobileNumber: string;
  travelExpert: string;
  city: string;
  state: string;
  nationality: string;
  subscriptionType: string;
}

export interface AgentStaff {
  id: number;
  name: string;
  mobileNumber: string;
  email: string;
  status: 0 | 1;
}

export interface WalletTransaction {
  id: number;
  transactionDate: string;
  transactionAmount: number;
  transactionType: "Credit" | "Debit";
  remark: string;
}

export interface AgentSubscription {
  id: number;
  subscriptionTitle: string;
  amount: number;
  validityStart: string;
  validityEnd: string;
  transactionId?: string;
  paymentStatus: string;
}

export interface AgentConfig {
  itineraryDiscountMargin: number;
  serviceCharge: number;
  agentMarginGstType: string;
  agentMarginGstPercentage: string;
  password?: string;
  logoUrl?: string;
  companyName: string;
  address: string;
  termsAndCondition: string;
  invoiceLogoUrl?: string;
  gstinNumber: string;
  panNo: string;
  invoiceAddress: string;
}

export const GST_TYPE_OPTIONS = [
  { value: "Included", label: "Included" },
  { value: "Excluded", label: "Excluded" },
  { value: "Not Applicable", label: "Not Applicable" },
];

export const GST_PERCENTAGE_OPTIONS = [
  { value: "0", label: "0% GST - %0" },
  { value: "5", label: "5% GST - %5" },
  { value: "12", label: "12% GST - %12" },
  { value: "18", label: "18% GST - %18" },
  { value: "28", label: "28% GST - %28" },
];

export const NATIONALITY_OPTIONS = [
  { value: "India", label: "India" },
  { value: "USA", label: "USA" },
  { value: "UK", label: "UK" },
  { value: "UAE", label: "UAE" },
  { value: "Other", label: "Other" },
];

export const STATE_OPTIONS = [
  { value: "Tamil Nadu", label: "Tamil Nadu" },
  { value: "Karnataka", label: "Karnataka" },
  { value: "Kerala", label: "Kerala" },
  { value: "Uttar Pradesh", label: "Uttar Pradesh" },
  { value: "Maharashtra", label: "Maharashtra" },
  { value: "Andhra Pradesh", label: "Andhra Pradesh" },
  { value: "Punjab", label: "Punjab" },
];
