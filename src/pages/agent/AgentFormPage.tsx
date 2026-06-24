// FILE: src/pages/agent/AgentFormPage.tsx - 4-tab wizard (Basic Info, Staff, Wallet, Configuration)

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronRight, Eye, EyeOff, Plus, Pencil, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { AgentAPI } from "@/services/agentService";
import { GST_TYPE_OPTIONS, GST_PERCENTAGE_OPTIONS, NATIONALITY_OPTIONS, STATE_OPTIONS } from "@/types/agent";
import type { Agent, AgentStaff, WalletTransaction, AgentSubscription } from "@/types/agent";

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

const [configForm, setConfigForm] = useState({
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
setStaff((s || []) as AgentStaff[]);
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
  const couponTotal = (couponHistory || []).reduce((s, t) => s + t.transactionAmount, 0);
  const cashTotal = (cashHistory || []).reduce((s, t) => s + t.transactionAmount, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Edit Agent » {agentName}</h1>
        <div className="text-sm text-muted-foreground">Dashboard &gt; Agent &gt; Edit Agent</div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border shadow-sm p-4">
        <div className="flex items-center gap-2 flex-wrap">
          {TABS.map((tab, i) => (
            <div key={tab} className="flex items-center">
              <button
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
                  activeTab === i ? "bg-violet-500 text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
                onClick={() => setActiveTab(i)}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    activeTab === i ? "bg-white text-violet-500" : "bg-gray-200"
                  }`}
                >
                  {i + 1}
                </span>
                {tab}
              </button>
              {i < TABS.length - 1 && <ChevronRight className="h-4 w-4 text-gray-400 mx-1" />}
            </div>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        {activeTab === 0 && (
          <>
            <h2 className="text-lg font-semibold text-pink-600 mb-6">Basic Info</h2>
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
                            ? "bg-green-100 text-green-600"
                            : "bg-orange-100 text-orange-600"
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
              <Button variant="outline" className="border-primary text-primary">
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
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>{s.mobileNumber}</TableCell>
                    <TableCell>{s.email}</TableCell>
                    <TableCell>
                      <Switch checked={s.status === 1} className="data-[state=checked]:bg-violet-500" />
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
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 min-w-[200px]">
                  <p className="text-2xl font-bold">₹ {couponTotal.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">Coupon Wallet</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 min-w-[200px]">
                  <p className="text-2xl font-bold">₹ {cashTotal.toFixed(2)}</p>
                  <p className="text-sm text-gray-500">Cash Wallet</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="border-primary text-primary"
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
                  className="border-primary text-primary"
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

            <h3 className="font-semibold mb-2">List of Cash wallet History</h3>
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
                      <span className="px-2 py-1 rounded bg-green-100 text-green-600 text-xs">{t.transactionType}</span>
                    </TableCell>
                    <TableCell>{t.remark}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <h3 className="font-semibold mt-6 mb-2">List of Coupon Wallet History</h3>
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
                      <span className="px-2 py-1 rounded bg-green-100 text-green-600 text-xs">{t.transactionType}</span>
                    </TableCell>
                    <TableCell>{t.remark}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}

   {activeTab === 3 && (
  <>
    <h2 className="text-lg font-semibold text-pink-600 mb-4">Basic Info</h2>

    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div>
        <Label>Itinerary Discount Margin Percentage *</Label>
        <Input
          type="number"
          value={configForm.itineraryDiscountMargin}
          onChange={(e) =>
            setConfigForm((prev) => ({
              ...prev,
              itineraryDiscountMargin: e.target.value,
            }))
          }
          placeholder="Enter Margin Percentage"
        />
      </div>

      <div>
        <Label>Service Charge *</Label>
        <Input
          type="number"
          value={configForm.serviceCharge}
          onChange={(e) =>
            setConfigForm((prev) => ({
              ...prev,
              serviceCharge: e.target.value,
            }))
          }
          placeholder="Enter Service Charge"
        />
      </div>

      <div>
        <Label>Agent Margin GST Type *</Label>
        <Select
          value={configForm.agentMarginGstType}
          onValueChange={(value) =>
            setConfigForm((prev) => ({
              ...prev,
              agentMarginGstType: value,
            }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose GST Type" />
          </SelectTrigger>
          <SelectContent>
            {GST_TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Agent Margin GST Percentage *</Label>
        <Select
          value={configForm.agentMarginGstPercentage}
          onValueChange={(value) =>
            setConfigForm((prev) => ({
              ...prev,
              agentMarginGstPercentage: value,
            }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose GST Percentage" />
          </SelectTrigger>
          <SelectContent>
            {GST_PERCENTAGE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>

<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
  <div>
    <Label>Password</Label>
    <div className="relative">
      <Input
        type={showPassword ? "text" : "password"}
        placeholder="Enter Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button
        type="button"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
        onClick={() => setShowPassword(!showPassword)}
      >
        {showPassword ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>
  </div>
</div>

    <h2 className="text-lg font-semibold text-pink-600 mb-4">
      General Configuration
    </h2>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      <div>
        <Label>Logo Upload</Label>
        <div className="flex gap-2">
          <Input type="file" />
          <Button variant="link" size="sm">
            View
          </Button>
        </div>
      </div>

      <div>
        <Label>Company Name</Label>
        <Input
          value={configForm.companyName}
          onChange={(e) =>
            setConfigForm((prev) => ({
              ...prev,
              companyName: e.target.value,
            }))
          }
          placeholder="Enter Company Name"
        />
      </div>

      <div>
        <Label>Address</Label>
        <Textarea
          value={configForm.address}
          onChange={(e) =>
            setConfigForm((prev) => ({
              ...prev,
              address: e.target.value,
            }))
          }
          placeholder="Enter the Address"
        />
      </div>
    </div>

  <div className="mb-8">
  <Label>Terms and Condition</Label>

  <div className="mt-2 rounded-md border border-gray-200 bg-white">
    <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 px-3 py-2 text-sm text-gray-700">
      <Button type="button" variant="ghost" size="sm" className="h-8 px-2">
        B
      </Button>
      <Button type="button" variant="ghost" size="sm" className="h-8 px-2 italic">
        I
      </Button>
      <Button type="button" variant="ghost" size="sm" className="h-8 px-2 underline">
        U
      </Button>
      <span className="h-6 border-l border-gray-300" />
      <Button type="button" variant="ghost" size="sm" className="h-8 px-2">
        • List
      </Button>
      <Button type="button" variant="ghost" size="sm" className="h-8 px-2">
        1. List
      </Button>
      <span className="h-6 border-l border-gray-300" />
      <Button type="button" variant="ghost" size="sm" className="h-8 px-2">
        Link
      </Button>
      <Button type="button" variant="ghost" size="sm" className="h-8 px-2">
        Source
      </Button>
    </div>

    <Textarea
      value={configForm.termsAndCondition}
      onChange={(e) =>
        setConfigForm((prev) => ({
          ...prev,
          termsAndCondition: e.target.value,
        }))
      }
      placeholder="Enter the Terms and condition"
      className="min-h-[120px] resize-none border-0 focus-visible:ring-0"
    />
  </div>
</div>

    <h2 className="text-lg font-semibold text-pink-600 mb-4">
      Invoice Setting
    </h2>

    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div>
        <Label>Invoice Logo Upload</Label>
        <div className="flex gap-2">
          <Input type="file" />
          <Button variant="link" size="sm">
            View
          </Button>
        </div>
      </div>

      <div>
        <Label>GSTIN Number</Label>
        <Input
          value={configForm.gstinNumber}
          onChange={(e) =>
            setConfigForm((prev) => ({
              ...prev,
              gstinNumber: e.target.value,
            }))
          }
          placeholder="GSTIN Number"
        />
        <p className="text-xs text-gray-400 mt-1">
          GSTIN Format: 10AABCU9603R1Z5
        </p>
      </div>

      <div>
        <Label>Pan No</Label>
        <Input
          value={configForm.panNo}
          onChange={(e) =>
            setConfigForm((prev) => ({
              ...prev,
              panNo: e.target.value,
            }))
          }
          placeholder="PAN Number"
        />
      </div>

      <div>
        <Label>Invoice Address</Label>
        <Textarea
          value={configForm.invoiceAddress}
          onChange={(e) =>
            setConfigForm((prev) => ({
              ...prev,
              invoiceAddress: e.target.value,
            }))
          }
          placeholder="Enter the Address"
        />
      </div>
    </div>
  </>
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

      <Dialog open={walletModalOpen} onOpenChange={setWalletModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {walletType === "cash" ? "Cash" : "Coupon"} Wallet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Amount *</Label>
              <Input
                type="number"
                placeholder="Enter the Amount"
                value={walletAmount}
                onChange={(e) => setWalletAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>Remarks *</Label>
              <Textarea
                placeholder="Enter the Remarks"
                value={walletRemark}
                onChange={(e) => setWalletRemark(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWalletModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleWalletSubmit} className="bg-gradient-to-r from-primary to-pink-500">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
