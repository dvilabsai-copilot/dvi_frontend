import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentSuccess() {
  const location = useLocation();

  const data = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const flow = params.get("flow") || "payment";
    const orderId = params.get("orderId") || "";
    return { flow, orderId };
  }, [location.search]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center p-6">
      <div className="w-full rounded-2xl border bg-white p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-600" />
        <h1 className="text-2xl font-semibold text-slate-800">Payment Successful</h1>
        <p className="mt-2 text-slate-600">
          Your {data.flow.replaceAll("_", " ")} payment has been confirmed by the server.
        </p>
        {data.orderId ? (
          <p className="mt-2 text-sm text-slate-500">Order: {data.orderId}</p>
        ) : null}
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button asChild>
            <Link to="/dashboard">Go to Dashboard</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/wallet-history">View Wallet</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
