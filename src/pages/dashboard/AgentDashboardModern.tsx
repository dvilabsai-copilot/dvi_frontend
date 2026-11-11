import { AgentDashboardSlideshow } from "./AgentDashboardSlideshow";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  FileText,
  PhoneCall,
  Plus,
  ReceiptText,
  TrendingUp,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAuthenticatedUser } from "@/services/accessControl";
import { getAgentDisplayName, getAgentDisplayMobile, unpackAgentProfile } from "@/services/agentDisplayIdentity";
import { api } from "@/lib/api";
import type { AgentDashboardStats } from "@/services/dashboard";
import { ItineraryService } from "@/services/itinerary";

type AgentDashboardContext = {
  dashboardData: AgentDashboardStats;
  isProcessingPayment: boolean;
  isTopUpModalOpen: boolean;
  setIsTopUpModalOpen: (isOpen: boolean) => void;
  topUpAmount: string;
  setTopUpAmount: (amount: string) => void;
  handleTopUp: () => void | Promise<void>;
  handleRenew: (planId: number) => void | Promise<void>;
};

type AgentActivity = {
  id: string;
  date: string | null;
  quote: string;
};

const money = (value: number | null | undefined) =>
  `₹ ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (dateString: string | null) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return Number.isNaN(date.getTime())
    ? dateString
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
};

const activityDate = (value: string | null) => {
  if (!value) return "Date unavailable";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function AgentDashboardModern({ context }: { context: Record<string, unknown> }) {
  const {
    dashboardData,
    isProcessingPayment,
    isTopUpModalOpen,
    setIsTopUpModalOpen,
    topUpAmount,
    setTopUpAmount,
    handleTopUp,
    handleRenew,
  } = context as unknown as AgentDashboardContext;
  const user = getAuthenticatedUser();
  // DVI_AGENT_NAME_AND_HEADER_V6: use the signed-in Agent profile, not a sample person's name.
  const [agentIdentity, setAgentIdentity] = useState<Record<string, unknown> | null>(null);
  const agentName = getAgentDisplayName(agentIdentity, user);
  const agentMobile = getAgentDisplayMobile(agentIdentity, user);
  const agentPhoneLink = agentMobile
    ? `tel:${agentMobile.replace(/[^+\d]/g, "")}`
    : null;
  const [recentActivity, setRecentActivity] = useState<AgentActivity[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void api("/agents/profile", { cache: "no-store" })
      .then((response: unknown) => {
        const resolved = unpackAgentProfile(response);
        if (active) {
          setAgentIdentity(resolved);
          if (getAgentDisplayName(resolved, user) === "Agent") {
            console.warn("Agent dashboard: profile has no usable agent name. Check /agents/profile and signed-in Agent account.");
          }
        }
      })
      .catch((error: unknown) => {
        console.warn("Agent dashboard: unable to fetch signed-in Agent profile.", error);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const agentId = Number(user?.agentId || 0);

    const load = async () => {
      setActivityLoading(true);
      try {
        // Reuse the application's existing itinerary list API, which is
        // already scoped to the authenticated user by the backend.
        const response = (await ItineraryService.getLatest({
          page: 1,
          pageSize: 4,
          ...(agentId > 0 ? { agentId } : {}),
        })) as {
          data?: Array<{
            itinerary_quote_ID?: string;
            itinerary_booking_ID?: string;
            createdon?: string;
            modify?: number;
          }>;
        };
        if (!active) return;
        const rows = Array.isArray(response?.data) ? response.data : [];
        setRecentActivity(
          rows.map((row, index) => ({
            id: `${row.modify ?? index}-${index}`,
            quote: String(
              row.itinerary_quote_ID || row.itinerary_booking_ID || "Itinerary",
            ),
            date: row.createdon || null,
          })),
        );
      } catch {
        if (active) setRecentActivity([]);
      } finally {
        if (active) setActivityLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [user?.agentId]);

  const validityDate = dashboardData.validityEnds
    ? new Date(dashboardData.validityEnds)
    : null;
  const renewalEligible = Boolean(
    dashboardData.planId &&
      validityDate &&
      !Number.isNaN(validityDate.getTime()) &&
      validityDate.getTime() <= Date.now() + 30 * 24 * 60 * 60 * 1000,
  );

  return (
    <div className="dvi-agent-dashboard">
      <section className="dvi-agent-hero" aria-label="Agent welcome and contact">
        {/* DVI_AGENT_SIX_STATES_SLIDESHOW_V1 */}
        <AgentDashboardSlideshow />
        <div className="dvi-agent-hero-copy">
          <h1>
            Welcome back, <span>{agentName}</span> <span aria-hidden="true">👋</span>
          </h1>
          <p>Here's what's happening with your account today.</p>
          <Button
            type="button"
            onClick={() => setIsTopUpModalOpen(true)}
            className="dvi-agent-topup-btn"
          >
            <Plus size={19} /> Top Up Wallet
          </Button>
        </div>
        <div className="dvi-agent-contact">
          {agentPhoneLink ? (
            <a className="dvi-agent-contact-icon" href={agentPhoneLink} aria-label={`Call ${agentName}`}>
              <PhoneCall size={25} />
            </a>
          ) : (
            <span className="dvi-agent-contact-icon" aria-hidden="true">
              <PhoneCall size={25} />
            </span>
          )}
          <div className="dvi-agent-contact-details">
            <div className="dvi-agent-contact-label">Agent Contact</div>
            <strong title={agentName}>{agentName}</strong>
            {agentPhoneLink ? (
              <a href={agentPhoneLink}>{agentMobile}</a>
            ) : (
              <span className="dvi-agent-phone-missing">Phone not provided</span>
            )}
          </div>
        </div>
      </section>

      <section className="dvi-agent-stat-grid" aria-label="Agent account overview">
        <article className="dvi-agent-stat dvi-agent-stat-customers">
          <div className="dvi-agent-stat-icon"><UsersRound size={27} /></div>
          <div className="dvi-agent-stat-label">Total Customers</div>
          <div className="dvi-agent-stat-value">{dashboardData.totalCustomers ?? 0}</div>
          <UsersRound className="dvi-agent-stat-watermark" size={96} aria-hidden="true" />
        </article>
        <article className="dvi-agent-stat dvi-agent-stat-validity">
          <div className="dvi-agent-stat-icon"><CalendarDays size={27} /></div>
          <div className="dvi-agent-stat-label">Validity Ends</div>
          <div className="dvi-agent-stat-value dvi-agent-date-value">{formatDate(dashboardData.validityEnds)}</div>
          {renewalEligible && (
            <button
              type="button"
              className="dvi-agent-stat-inline-link"
              disabled={isProcessingPayment}
              onClick={() => dashboardData.planId && void handleRenew(dashboardData.planId)}
            >
              {isProcessingPayment ? "Processing..." : "Renew now"}
            </button>
          )}
          <CalendarDays className="dvi-agent-stat-watermark" size={94} aria-hidden="true" />
        </article>
        <article className="dvi-agent-stat dvi-agent-stat-invoices">
          <div className="dvi-agent-stat-icon"><FileText size={27} /></div>
          <div className="dvi-agent-stat-label">Paid Invoice</div>
          <div className="dvi-agent-stat-value">{dashboardData.paidInvoices ?? 0}</div>
          <ReceiptText className="dvi-agent-stat-watermark" size={92} aria-hidden="true" />
        </article>
        <article className="dvi-agent-stat dvi-agent-stat-profit">
          <div className="dvi-agent-stat-icon"><WalletCards size={27} /></div>
          <div className="dvi-agent-stat-label">Last Month Profit</div>
          <div className="dvi-agent-stat-value">{money(dashboardData.lastMonthProfit)}</div>
          <TrendingUp className="dvi-agent-stat-watermark" size={92} aria-hidden="true" />
        </article>
        <article className="dvi-agent-stat dvi-agent-stat-wallet">
          <div className="dvi-agent-stat-icon"><WalletCards size={27} /></div>
          <div className="dvi-agent-stat-label">Wallet Balance</div>
          <div className="dvi-agent-stat-value">{money(dashboardData.totalCashWallet)}</div>
          <Link to="/wallet-history" className="dvi-agent-stat-inline-link">
            View History <ArrowRight size={15} />
          </Link>
          <WalletCards className="dvi-agent-stat-watermark" size={95} aria-hidden="true" />
        </article>
      </section>

      <div className="dvi-agent-lower-grid">
        <section className="dvi-agent-section-card" aria-label="Recent activity">
          <header className="dvi-agent-section-heading">
            <div className="dvi-agent-section-title"><Clock3 size={25} /><h2>Recent Activity</h2></div>
            <Link to="/latest-itinerary" className="dvi-agent-view-all">View All <ArrowRight size={18} /></Link>
          </header>
          <div className="dvi-agent-activity-rows">
            {activityLoading ? (
              <div className="dvi-agent-activity-empty">Loading your recent itineraries…</div>
            ) : recentActivity.length === 0 ? (
              <div className="dvi-agent-activity-empty">
                <FileText size={30} />
                <strong>No recent itineraries available</strong>
                <span>Your itinerary activity will appear here when available.</span>
              </div>
            ) : (
              recentActivity.map((activity) => (
                <Link key={activity.id} to="/latest-itinerary" className="dvi-agent-activity-row">
                  <span className="dvi-agent-activity-icon"><FileText size={24} /></span>
                  <span className="dvi-agent-activity-name">
                    <strong>Itinerary Created</strong>
                    <small title={activity.quote}>{activity.quote}</small>
                  </span>
                  <time>{activityDate(activity.date)}</time>
                  <span className="dvi-agent-activity-status">Created</span>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="dvi-agent-section-card dvi-agent-wallet-section" aria-label="Wallet and financials">
          <header className="dvi-agent-section-heading">
            <div className="dvi-agent-section-title"><WalletCards size={28} /><h2>Wallet &amp; Financials</h2></div>
          </header>
          <Link to="/wallet-history" className="dvi-agent-finance-hero">
            <span>Wallet Balance</span>
            <strong>{money(dashboardData.totalCashWallet)}</strong>
            <WalletCards className="dvi-agent-finance-hero-icon" size={96} aria-hidden="true" />
          </Link>
          <div className="dvi-agent-finance-bottom">
            <div className="dvi-agent-finance-mini dvi-agent-finance-mini-profit">
              <span className="dvi-agent-finance-icon"><TrendingUp size={27} /></span>
              <div><small>Last Month Profit</small><strong>{money(dashboardData.lastMonthProfit)}</strong></div>
            </div>
            <div className="dvi-agent-finance-mini dvi-agent-finance-mini-invoice">
              <span className="dvi-agent-finance-icon"><ReceiptText size={27} /></span>
              <div><small>Paid Invoice</small><strong>{dashboardData.paidInvoices ?? 0}</strong></div>
            </div>
          </div>
        </section>
      </div>

      <Dialog open={isTopUpModalOpen} onOpenChange={setIsTopUpModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Top Up Wallet</DialogTitle></DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="agent-wallet-topup-amount">Amount (INR)</Label>
            <Input
              id="agent-wallet-topup-amount"
              type="number"
              placeholder="Enter amount"
              min="1"
              step="0.01"
              value={topUpAmount}
              onChange={(event) => setTopUpAmount(event.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Payment fees and taxes, if applicable, will be shown at checkout.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setIsTopUpModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isProcessingPayment}
              onClick={() => void handleTopUp()}
              className="bg-gradient-to-r from-violet-700 to-pink-500 text-white"
            >
              {isProcessingPayment ? "Processing..." : "Pay Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
