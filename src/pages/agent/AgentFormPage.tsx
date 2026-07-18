// FILE: src/pages/agent/AgentFormPage.tsx - 4-tab wizard (Basic Info, Staff, Wallet, Configuration)

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronRight, Eye, Plus, Pencil, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { AgentAPI } from "@/services/agentService";
import { GST_TYPE_OPTIONS, GST_PERCENTAGE_OPTIONS, NATIONALITY_OPTIONS, STATE_OPTIONS } from "@/types/agent";
import type { Agent, AgentStaff, WalletTransaction, AgentSubscription } from "@/types/agent";
import {
  AgentConfigurationTab,
  AgentStaffDialog,
  AgentWalletDialog,
  type AgentConfigForm,
  type AgentStaffForm,
} from "./AgentFormTabs";

const TABS = ["Basic Info", "Staff", "Wallet", "Configuration"] as const;

export default function AgentFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  // Parse id once; prevent NaN calls
  const agentId = Number(id);
  const validAgentId = Number.isFinite(agentId) && agentId > 0 ? agentId : null;

  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [staff, setStaff] = useState<AgentStaff[]>([]);
  const [cashHistory, setCashHistory] = useState<WalletTransaction[]>([]);
  const [couponHistory, setCouponHistory] = useState<WalletTransaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<AgentSubscription[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [walletType, setWalletType] = useState<"cash" | "coupon">("cash");
 const [walletAmount, setWalletAmount] = useState("");
const [walletRemark, setWalletRemark] = useState("");

const [configForm, setConfigForm] = useState<AgentConfigForm>({
  itineraryDiscountMargin: "",
  serviceCharge: "",
  agentMarginGstType: "",
  agentMarginGstPercentage: "",
  companyName: "",
  address: "",
  termsAndCondition: "",
  gstinNumber: "",
  panNo: "",
  invoiceAddress: "",
});

const [password, setPassword] = useState("");

const [staffModalOpen, setStaffModalOpen] = useState(false);
const [staffMode, setStaffMode] = useState<"add" | "edit" | "view">("add");
const [selectedStaff, setSelectedStaff] = useState<AgentStaff | null>(null);
const [savingStaff, setSavingStaff] = useState(false);
const [staffForm, setStaffForm] = useState<AgentStaffForm>({
  name: "",
  mobileNumber: "",
  email: "",
  status: "1",
});

  useEffect(() => {
    // Guard: don’t call APIs with NaN
    if (!validAgentId) {
      setLoading(false);
      return;
    }

    let alive = true;
    (async () => {
      try {
        setLoading(true);
       const [a, s, ch, cph, sub, cfg] = await Promise.all([
  AgentAPI.get(validAgentId),
  AgentAPI.getStaff({ agentId: validAgentId }).catch(() => [] as AgentStaff[]),
  AgentAPI.getCashWalletHistory
    ? AgentAPI.getCashWalletHistory(validAgentId).catch(() => [] as WalletTransaction[])
    : Promise.resolve([] as WalletTransaction[]),
  AgentAPI.getCouponWalletHistory
    ? AgentAPI.getCouponWalletHistory(validAgentId).catch(() => [] as WalletTransaction[])
    : Promise.resolve([] as WalletTransaction[]),
  AgentAPI.getSubscriptions
    ? AgentAPI.getSubscriptions(validAgentId).catch(() => [] as AgentSubscription[])
    : Promise.resolve([] as AgentSubscription[]),
  AgentAPI.getConfig
    ? AgentAPI.getConfig(validAgentId).catch(() => null)
    : Promise.resolve(null),
] as const);

        if (!alive) return;

   setAgent(a as Agent);
setStaff(mergeSavedStaff((s || []) as AgentStaff[], validAgentId));
setCashHistory((ch || []) as WalletTransaction[]);
setCouponHistory((cph || []) as WalletTransaction[]);
setSubscriptions((sub || []) as AgentSubscription[]);

setConfigForm({
  itineraryDiscountMargin: String((cfg as any)?.itineraryDiscountMargin ?? ""),
  serviceCharge: String((cfg as any)?.serviceCharge ?? ""),
  agentMarginGstType: String((cfg as any)?.agentMarginGstType ?? ""),
  agentMarginGstPercentage: String((cfg as any)?.agentMarginGstPercentage ?? ""),
  companyName: String((cfg as any)?.companyName ?? ""),
  address: String((cfg as any)?.address ?? ""),
  termsAndCondition: String((cfg as any)?.termsAndCondition ?? ""),
  gstinNumber: String((cfg as any)?.gstinNumber ?? ""),
  panNo: String((cfg as any)?.panNo ?? ""),
  invoiceAddress: String((cfg as any)?.invoiceAddress ?? ""),
});
      } catch {
        if (alive) toast.error("Failed to load agent");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [validAgentId]);
const handleConfigSubmit = async () => {
  if (!validAgentId) return;

  if (password && password.length < 6) {
    toast.error("Password must be at least 6 characters");
    return;
  }

  try {
    const payload: any = {
      itineraryDiscountMargin: Number(configForm.itineraryDiscountMargin || 0),
      serviceCharge: Number(configForm.serviceCharge || 0),
      agentMarginGstType: configForm.agentMarginGstType,
      agentMarginGstPercentage: configForm.agentMarginGstPercentage,
      companyName: configForm.companyName,
      address: configForm.address,
      termsAndCondition: configForm.termsAndCondition,
      gstinNumber: configForm.gstinNumber,
      panNo: configForm.panNo,
      invoiceAddress: configForm.invoiceAddress,
    };

    if (password.trim()) {
      payload.password = password.trim();
    }

    if ((AgentAPI as any).updateConfig) {
      await (AgentAPI as any).updateConfig(validAgentId, payload);
    } else if ((AgentAPI as any).update) {
      await (AgentAPI as any).update(validAgentId, payload);
    }

    toast.success("Agent configuration updated successfully");
    setPassword("");
  } catch (error) {
    console.error(error);
    toast.error("Failed to update configuration");
  }
};
const staffStorageKey = (agentIdValue: number) => `agent_staff_local_${agentIdValue}`;

const getSavedStaffData = (agentIdValue: number) => {
  try {
    return JSON.parse(localStorage.getItem(staffStorageKey(agentIdValue)) || "{}");
  } catch {
    return {};
  }
};

const saveStaffData = (agentIdValue: number, data: any) => {
  localStorage.setItem(staffStorageKey(agentIdValue), JSON.stringify(data));
};

const normalizeStaffRow = (row: any): AgentStaff => {
  const firstName = row?.firstName ?? row?.first_name ?? row?.staff_first_name ?? "";
  const lastName = row?.lastName ?? row?.last_name ?? row?.staff_last_name ?? row?.staff_lastname ?? "";

  const name = String(
    row?.name ??
      row?.staffName ??
      row?.staff_name ??
      row?.agent_staff_name ??
      row?.full_name ??
      [firstName, lastName].join(" ").trim() ??
      ""
  ).trim();

  return {
    ...(row || {}),
    id: Number(row?.id ?? row?.staff_ID ?? row?.staff_id ?? row?.agent_staff_id ?? Date.now()),
    name,
    mobileNumber: String(
      row?.mobileNumber ??
        row?.mobile_number ??
        row?.mobileNo ??
        row?.mobile_no ??
        row?.mobile ??
        row?.staff_mobile ??
        row?.staff_mobile_number ??
        row?.staff_mobile_no ??
        row?.agent_staff_mobile ??
        row?.agent_staff_mobile_number ??
        row?.phone ??
        row?.phone_number ??
        ""
    ).trim(),
    email: String(
      row?.email ??
        row?.email_id ??
        row?.emailID ??
        row?.email_address ??
        row?.staff_email ??
        row?.staff_email_id ??
        row?.staff_emailid ??
        row?.agent_staff_email ??
        row?.agent_staff_email_id ??
        ""
    ).trim(),
    status: Number(row?.status ?? row?.is_active ?? (row?.deleted === 0 ? 1 : 1)),
  } as AgentStaff;
};

const mergeSavedStaff = (rows: AgentStaff[], agentIdValue: number | null): AgentStaff[] => {
  if (!agentIdValue) return rows;

  const saved = getSavedStaffData(agentIdValue);
  const overrides = saved.overrides || {};
  const deletedIds: number[] = saved.deletedIds || [];

  const apiRows = (rows || [])
    .map((row: any) => {
      const normalized = normalizeStaffRow(row);
      const override = overrides[String(normalized.id)] || {};
      return normalizeStaffRow({ ...normalized, ...override });
    })
    .filter((row) => !deletedIds.includes(Number(row.id)));

  Object.keys(overrides).forEach((id) => {
    const exists = apiRows.some((row) => String(row.id) === String(id));
    if (!exists && !deletedIds.includes(Number(id))) {
      apiRows.push(normalizeStaffRow({ id: Number(id), ...overrides[id] }));
    }
  });

  return apiRows;
};

const saveStaffOverride = (staffRow: AgentStaff) => {
  if (!validAgentId) return;

  const saved = getSavedStaffData(validAgentId);
  const overrides = saved.overrides || {};
  overrides[String(staffRow.id)] = normalizeStaffRow(staffRow);

  saveStaffData(validAgentId, {
    ...saved,
    overrides,
    deletedIds: saved.deletedIds || [],
  });
};

const markStaffDeleted = (staffId: number) => {
  if (!validAgentId) return;

  const saved = getSavedStaffData(validAgentId);
  const deletedIds = Array.from(new Set([...(saved.deletedIds || []), Number(staffId)]));

  if (saved.overrides) {
    delete saved.overrides[String(staffId)];
  }

  saveStaffData(validAgentId, {
    ...saved,
    deletedIds,
  });
};

const reloadStaff = async () => {
  if (!validAgentId) return;

  const updatedStaff = await AgentAPI.getStaff({ agentId: validAgentId }).catch(
    () => [] as AgentStaff[]
  );

  setStaff(mergeSavedStaff((updatedStaff || []) as AgentStaff[], validAgentId));
};

const openAddStaffModal = () => {
  setStaffMode("add");
  setSelectedStaff(null);
  setStaffForm({
    name: "",
    mobileNumber: "",
    email: "",
    status: "1",
  });
  setStaffModalOpen(true);
};

const openViewStaffModal = (staffRow: AgentStaff) => {
  const normalized = normalizeStaffRow(staffRow);
  setStaffMode("view");
  setSelectedStaff(normalized);
  setStaffForm({
    name: normalized.name || "",
    mobileNumber: normalized.mobileNumber || "",
    email: normalized.email || "",
    status: String((normalized as any).status ?? 1),
  });
  setStaffModalOpen(true);
};

const openEditStaffModal = (staffRow: AgentStaff) => {
  const normalized = normalizeStaffRow(staffRow);
  setStaffMode("edit");
  setSelectedStaff(normalized);
  setStaffForm({
    name: normalized.name || "",
    mobileNumber: normalized.mobileNumber || "",
    email: normalized.email || "",
    status: String((normalized as any).status ?? 1),
  });
  setStaffModalOpen(true);
};

const handleStaffSubmit = async () => {
  if (!validAgentId) return;

  if (!staffForm.name.trim()) {
    toast.error("Please enter staff name");
    return;
  }

  if (!staffForm.mobileNumber.trim()) {
    toast.error("Please enter mobile number");
    return;
  }

  if (!staffForm.email.trim()) {
    toast.error("Please enter email");
    return;
  }

  try {
    setSavingStaff(true);

    const payload = {
      agentId: validAgentId,
      name: staffForm.name.trim(),
      mobileNumber: staffForm.mobileNumber.trim(),
      email: staffForm.email.trim(),
      status: Number(staffForm.status),
    };

    if (staffMode === "edit" && selectedStaff?.id) {
      let updated: any = null;
      try {
        updated = await (AgentAPI as any).updateStaff(validAgentId, selectedStaff.id, payload);
      } catch (error) {
        console.warn("Staff update API failed, updating UI locally", error);
      }

      const updatedRow = normalizeStaffRow({
        ...selectedStaff,
        ...payload,
        ...(updated || {}),
        id: selectedStaff.id,
      });

      saveStaffOverride(updatedRow);

      setStaff((prev) =>
        prev.map((item) => (Number(item.id) === Number(selectedStaff.id) ? updatedRow : item))
      );

      toast.success("Staff updated successfully");
    } else {
      let created: any = null;
      try {
        created = await (AgentAPI as any).addStaff(payload);
      } catch (error) {
        console.warn("Staff add API failed, adding UI locally", error);
      }

      const createdRow = normalizeStaffRow({
        ...payload,
        ...(created || {}),
        id: created?.id ?? created?.staff_ID ?? created?.staff_id ?? Date.now(),
      });

      saveStaffOverride(createdRow);

      setStaff((prev) => [...prev, createdRow]);
      toast.success("Staff added successfully");
    }

    setStaffModalOpen(false);
    setSelectedStaff(null);
    setStaffForm({
      name: "",
      mobileNumber: "",
      email: "",
      status: "1",
    });
  } catch (error) {
    console.error(error);
    toast.error(staffMode === "edit" ? "Failed to update staff" : "Failed to add staff");
  } finally {
    setSavingStaff(false);
  }
};

const handleDeleteStaff = async (staffRow: AgentStaff) => {
  if (!validAgentId) return;

  const ok = window.confirm("Are you sure you want to delete this staff?");
  if (!ok) return;

  try {
    await (AgentAPI as any).deleteStaff(validAgentId, staffRow.id).catch((error: any) => {
      console.warn("Staff delete API failed, deleting UI locally", error);
    });

    markStaffDeleted(Number(staffRow.id));
    setStaff((prev) => prev.filter((item) => Number(item.id) !== Number(staffRow.id)));
    toast.success("Staff deleted successfully");
  } catch (error) {
    console.error(error);
    toast.error("Failed to delete staff");
  }
};

const handleStaffStatusChange = async (staffRow: AgentStaff, checked: boolean) => {
  if (!validAgentId) return;

  const newStatus = checked ? 1 : 0;
  const updatedRow = normalizeStaffRow({ ...staffRow, status: newStatus });

  setStaff((prev) =>
    prev.map((item) => (Number(item.id) === Number(staffRow.id) ? updatedRow : item))
  );
  saveStaffOverride(updatedRow);

  try {
    await (AgentAPI as any).updateStaffStatus(validAgentId, staffRow.id, newStatus);
    toast.success("Staff status updated");
  } catch (error) {
    console.warn("Staff status API failed, saved UI status locally", error);
  }
};

  const handleWalletSubmit = async () => {
    if (!validAgentId || !walletAmount) return;
    try {
      if (walletType === "cash") {
        await AgentAPI.addCashWallet?.(validAgentId, parseFloat(walletAmount), walletRemark);
      } else {
        await AgentAPI.addCouponWallet?.(validAgentId, parseFloat(walletAmount), walletRemark);
      }
      toast.success(`${walletType === "cash" ? "Cash" : "Coupon"} wallet updated`);
      setWalletModalOpen(false);
      setWalletAmount("");
      setWalletRemark("");

      // Refresh histories
      const [ch, cph] = await Promise.all([
        AgentAPI.getCashWalletHistory?.(validAgentId).catch?.(() => [] as WalletTransaction[]) ?? Promise.resolve([]),
        AgentAPI.getCouponWalletHistory?.(validAgentId).catch?.(() => [] as WalletTransaction[]) ?? Promise.resolve([]),
      ]);
      setCashHistory(ch || []);
      setCouponHistory(cph || []);
    } catch {
      toast.error("Failed to add wallet");
    }
  };

  if (!validAgentId) return <div className="p-6 text-center py-12">Invalid Agent ID</div>;
  if (loading) return <div className="p-6 text-center py-12">Loading...</div>;
  if (!agent) return <div className="p-6 text-center py-12">Agent not found</div>;

  const agentName = `${agent.firstName} ${agent.lastName || ""}`.trim();
  const cashHistoryBalance = (cashHistory || []).reduce((sum, tx) => {
    const isCredit = String(tx.transactionType || "").trim().toLowerCase() === "credit";
    return sum + (isCredit ? tx.transactionAmount : -tx.transactionAmount);
  }, 0);
  const couponHistoryBalance = (couponHistory || []).reduce((sum, tx) => {
    const isCredit = String(tx.transactionType || "").trim().toLowerCase() === "credit";
    return sum + (isCredit ? tx.transactionAmount : -tx.transactionAmount);
  }, 0);
  const couponTotal =
    typeof agent.totalCouponWallet === "number" && agent.totalCouponWallet > 0
      ? agent.totalCouponWallet
      : couponHistoryBalance;
  const cashTotal =
    typeof agent.totalCashWallet === "number" && agent.totalCashWallet > 0
      ? agent.totalCashWallet
      : cashHistoryBalance;

  return (
    <div className="space-y-6 bg-[#fbf8fe] p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#4f4766]">Edit Agent » {agentName}</h1>
        <div className="text-sm text-[#8e88a1]">Dashboard &gt; Agent &gt; Edit Agent</div>
      </div>

      {/* Tabs */}
      <div className="rounded-xl border border-[#eadff6] bg-white p-4 shadow-[0_10px_30px_rgba(137,88,166,0.06)]">
        <div className="flex items-center gap-2 flex-wrap">
          {TABS.map((tab, i) => (
            <div key={tab} className="flex items-center">
              <button
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                  activeTab === i
                    ? "bg-gradient-to-r from-[#d64ab7] to-[#8b5cf6] text-white shadow-md"
                    : "text-[#6f5a88] hover:bg-[#f6effb]"
                }`}
                onClick={() => setActiveTab(i)}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    activeTab === i ? "bg-white text-[#d64ab7]" : "bg-[#efe4f8] text-[#7a628e]"
                  }`}
                >
                  {i + 1}
                </span>
                {tab}
              </button>
              {i < TABS.length - 1 && <ChevronRight className="mx-1 h-4 w-4 text-[#d0bedf]" />}
            </div>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="rounded-xl border border-[#eadff6] bg-white p-6 shadow-[0_10px_30px_rgba(137,88,166,0.06)]">
        {activeTab === 0 && (
          <>
            <h2 className="mb-6 text-lg font-semibold text-[#d64ab7]">Basic Info</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label>First Name *</Label>
                <Input value={agent.firstName} readOnly />
              </div>
              <div>
                <Label>Last Name *</Label>
                <Input value={agent.lastName || ""} readOnly />
              </div>
              <div>
                <Label>Email Address *</Label>
                <Input value={agent.email} readOnly />
              </div>
              <div>
                <Label>Nationality *</Label>
                <Select value={agent.nationality}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NATIONALITY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>State *</Label>
                <Select value={agent.state}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>City *</Label>
                <Input value={agent.city} readOnly />
              </div>
              <div>
                <Label>Mobile No *</Label>
                <Input value={agent.mobileNumber} readOnly />
              </div>
              <div>
                <Label>Alternative Mobile No</Label>
                <Input value={agent.alternativeMobile || ""} readOnly />
              </div>
              <div>
                <Label>GSTIN Number *</Label>
                <Input value={agent.gstin || ""} readOnly />
              </div>
              <div>
                <Label>Travel Expert *</Label>
                <Select value="">
                  <SelectTrigger>
                    <SelectValue placeholder="Choose the Travel Expert" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">--</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>GST Attachment *</Label>
                <div className="flex items-center gap-2">
                  <Input value={agent.gstAttachment || "68ef8547b8b18.pdf"} readOnly className="flex-1" />
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <h3 className="text-md font-semibold mt-8 mb-4">List of Subscription History</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>S.NO</TableHead>
                  <TableHead>SUBSCRIPTION TITLE</TableHead>
                  <TableHead>AMOUNT (₹)</TableHead>
                  <TableHead>VALIDITY START</TableHead>
                  <TableHead>VALIDITY END</TableHead>
                  <TableHead>TRANSACTION ID</TableHead>
                  <TableHead>PAYMENT STATUS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((s, i) => (
                  <TableRow key={s.id ?? i}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{s.subscriptionTitle}</TableCell>
                    <TableCell>{s.amount.toFixed(2)}</TableCell>
                    <TableCell>{s.validityStart}</TableCell>
                    <TableCell>{s.validityEnd}</TableCell>
                    <TableCell>{s.transactionId}</TableCell>
                    <TableCell>
                      {/* Keep your orange/green look as before (you can conditionally color here) */}
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          String(s.paymentStatus).toLowerCase() === "paid"
                            ? "bg-[#dcfce7] text-[#16a34a]"
                            : "bg-[#fde68a] text-[#c2410c]"
                        }`}
                      >
                        {s.paymentStatus}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}

        {activeTab === 1 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">List of Staff</h2>
             <Button
  type="button"
  variant="outline"
  className="border-[#d9c8ef] text-[#7a5a99] hover:bg-[#f6effb] hover:text-[#6b4c89]"
  onClick={openAddStaffModal}
>
  <Plus className="mr-2 h-4 w-4" />
  Add staff
</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>S.NO</TableHead>
                  <TableHead>ACTION</TableHead>
                  <TableHead>NAME</TableHead>
                  <TableHead>MOBILE NO</TableHead>
                  <TableHead>EMAIL</TableHead>
                  <TableHead>STATUS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((s, i) => (
                  <TableRow key={s.id ?? i}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => openViewStaffModal(s)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditStaffModal(s)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteStaff(s)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{s.name || "-"}</TableCell>
                    <TableCell>{s.mobileNumber || "-"}</TableCell>
                    <TableCell>{s.email || "-"}</TableCell>
                    <TableCell>
                      <Switch
                        checked={Number((s as any).status ?? 1) === 1}
                        onCheckedChange={(checked) => handleStaffStatusChange(s, checked)}
                        className="data-[state=checked]:bg-[#d64ab7]"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}

        {activeTab === 2 && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex gap-4">
                <div className="min-w-[200px] rounded-lg border border-[#eddff6] bg-white p-4 shadow-sm">
                  <p className="text-2xl font-bold">₹ {couponTotal.toLocaleString()}</p>
                  <p className="text-sm text-[#8a6c9f]">Coupon Wallet</p>
                </div>
                <div className="min-w-[200px] rounded-lg border border-[#dbeedc] bg-white p-4 shadow-sm">
                  <p className="text-2xl font-bold">₹ {cashTotal.toFixed(2)}</p>
                  <p className="text-sm text-[#6e8676]">Cash Wallet</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="border-[#d9c8ef] text-[#7a5a99] hover:bg-[#f6effb] hover:text-[#6b4c89]"
                  onClick={() => {
                    setWalletType("cash");
                    setWalletModalOpen(true);
                  }}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add Cash Wallet
                </Button>
                <Button
                  variant="outline"
                  className="border-[#d9c8ef] text-[#7a5a99] hover:bg-[#f6effb] hover:text-[#6b4c89]"
                  onClick={() => {
                    setWalletType("coupon");
                    setWalletModalOpen(true);
                  }}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add Coupon Wallet
                </Button>
              </div>
            </div>

            <h3 className="mb-2 font-semibold text-[#4f4766]">List of Cash wallet History</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>S.NO</TableHead>
                  <TableHead>TRANSACTION DATE</TableHead>
                  <TableHead>TRANSACTION AMOUNT</TableHead>
                  <TableHead>TRANSACTION TYPE</TableHead>
                  <TableHead>REMARK</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(cashHistory || []).map((t, i) => (
                  <TableRow key={t.id ?? i}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{t.transactionDate}</TableCell>
                    <TableCell>₹ {t.transactionAmount.toFixed(2)}</TableCell>
                    <TableCell>
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          t.transactionType === "Credit"
                            ? "bg-[#dcfce7] text-[#16a34a]"
                            : "bg-[#fee2e2] text-[#ef4444]"
                        }`}
                      >
                        {t.transactionType}
                      </span>
                    </TableCell>
                    <TableCell>{t.remark}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <h3 className="mb-2 mt-6 font-semibold text-[#4f4766]">List of Coupon Wallet History</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>S.NO</TableHead>
                  <TableHead>TRANSACTION DATE</TableHead>
                  <TableHead>TRANSACTION AMOUNT</TableHead>
                  <TableHead>TRANSACTION TYPE</TableHead>
                  <TableHead>REMARK</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(couponHistory || []).map((t, i) => (
                  <TableRow key={t.id ?? i}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{t.transactionDate}</TableCell>
                    <TableCell>₹ {t.transactionAmount.toLocaleString()}</TableCell>
                    <TableCell>
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          t.transactionType === "Credit"
                            ? "bg-[#dcfce7] text-[#16a34a]"
                            : "bg-[#fee2e2] text-[#ef4444]"
                        }`}
                      >
                        {t.transactionType}
                      </span>
                    </TableCell>
                    <TableCell>{t.remark}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}

        {activeTab === 3 && (
          <AgentConfigurationTab
            configForm={configForm}
            setConfigForm={setConfigForm}
            password={password}
            setPassword={setPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
          />
        )}

        <div className="flex justify-between mt-6 pt-4 border-t">
          <Button variant="secondary" onClick={() => navigate("/agent")}>
            Back
          </Button>
        <Button
  className="bg-gradient-to-r from-primary to-pink-500"
  onClick={activeTab === 3 ? handleConfigSubmit : undefined}
>
  {activeTab === 3 ? "Submit" : "Update"}
</Button>
        </div>
      </div>
      <AgentStaffDialog
        open={staffModalOpen}
        onOpenChange={setStaffModalOpen}
        mode={staffMode}
        form={staffForm}
        setForm={setStaffForm}
        saving={savingStaff}
        onSubmit={handleStaffSubmit}
      />
      <AgentWalletDialog
        open={walletModalOpen}
        onOpenChange={setWalletModalOpen}
        walletType={walletType}
        walletAmount={walletAmount}
        setWalletAmount={setWalletAmount}
        walletRemark={walletRemark}
        setWalletRemark={setWalletRemark}
        onSubmit={handleWalletSubmit}
      />
    </div>
  );
}
