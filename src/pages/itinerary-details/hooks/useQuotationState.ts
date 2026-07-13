import { useState } from "react";

export type AdditionalPassenger = {
  title: string;
  name: string;
  age: string;
  nationality: string;
  panNo: string;
  passportNo: string;
};

export function useQuotationState() {
  const [confirmQuotationModal, setConfirmQuotationModal] = useState(false);
  const [voucherModal, setVoucherModal] = useState(false);
  const [pluckCardModal, setPluckCardModal] = useState(false);
  const [invoiceModal, setInvoiceModal] = useState(false);
  const [invoiceType, setInvoiceType] = useState<"tax" | "proforma">("tax");
  const [incidentalModal, setIncidentalModal] = useState(false);
  const [incidentalHistoryRefreshToken, setIncidentalHistoryRefreshToken] = useState(0);
  const [isConfirmingQuotation, setIsConfirmingQuotation] = useState(false);
  const [walletBalance, setWalletBalance] = useState("");
  const [walletBalanceAmount, setWalletBalanceAmount] = useState<number | null>(null);
  const [showWalletTopUpPanel, setShowWalletTopUpPanel] = useState(false);
  const [walletTopUpAmount, setWalletTopUpAmount] = useState("");
  const [walletTopUpRemark, setWalletTopUpRemark] = useState("");
  const [walletShortfallAmount, setWalletShortfallAmount] = useState(0);
  const [isWalletTopUpSubmitting, setIsWalletTopUpSubmitting] = useState(false);
  const [agentInfo, setAgentInfo] = useState<{
    quotation_no: string;
    agent_name: string;
    agent_display_name?: string;
    agent_id?: number;
  } | null>(null);
  const [guestDetails, setGuestDetails] = useState({
    salutation: "Mr", name: "", contactNo: "", age: "", nationality: "IN", panNo: "", passportNo: "",
    alternativeContactNo: "", emailId: "", arrivalDateTime: "", arrivalPlace: "", arrivalFlightDetails: "",
    departureDateTime: "", departurePlace: "", departureFlightDetails: "",
  });
  const [confirmDefaultNationality, setConfirmDefaultNationality] = useState("IN");
  const [additionalAdults, setAdditionalAdults] = useState<AdditionalPassenger[]>([]);
  const [additionalChildren, setAdditionalChildren] = useState<AdditionalPassenger[]>([]);
  const [additionalInfants, setAdditionalInfants] = useState<AdditionalPassenger[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [prebookData, setPrebookData] = useState<any | null>(null);
  const [isPrebooking, setIsPrebooking] = useState(false);
  const [isOpeningConfirmQuotation, setIsOpeningConfirmQuotation] = useState(false);
  const [hasAcceptedUpdatedPrice, setHasAcceptedUpdatedPrice] = useState(false);
  const [confirmOccupanciesTemplate, setConfirmOccupanciesTemplate] = useState<Array<{ adults: number; children: number; childrenAges: number[] }> | null>(null);

  return {
    confirmQuotationModal, setConfirmQuotationModal, voucherModal, setVoucherModal, pluckCardModal, setPluckCardModal,
    invoiceModal, setInvoiceModal, invoiceType, setInvoiceType, incidentalModal, setIncidentalModal,
    incidentalHistoryRefreshToken, setIncidentalHistoryRefreshToken, isConfirmingQuotation, setIsConfirmingQuotation,
    walletBalance, setWalletBalance, walletBalanceAmount, setWalletBalanceAmount, showWalletTopUpPanel, setShowWalletTopUpPanel,
    walletTopUpAmount, setWalletTopUpAmount, walletTopUpRemark, setWalletTopUpRemark, walletShortfallAmount, setWalletShortfallAmount,
    isWalletTopUpSubmitting, setIsWalletTopUpSubmitting, agentInfo, setAgentInfo, guestDetails, setGuestDetails,
    confirmDefaultNationality, setConfirmDefaultNationality, additionalAdults, setAdditionalAdults, additionalChildren, setAdditionalChildren,
    additionalInfants, setAdditionalInfants, formErrors, setFormErrors, prebookData, setPrebookData, isPrebooking, setIsPrebooking,
    isOpeningConfirmQuotation, setIsOpeningConfirmQuotation, hasAcceptedUpdatedPrice, setHasAcceptedUpdatedPrice,
    confirmOccupanciesTemplate, setConfirmOccupanciesTemplate,
  };
}
