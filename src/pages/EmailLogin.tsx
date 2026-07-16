import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { sendLoginEmailOtp, verifyLoginEmailOtp } from "@/services/auth";

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}${"•".repeat(Math.max(1, local.length - visible.length))}@${domain}`;
}

export default function EmailLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const initialEmail = String((location.state as { loginEmail?: string } | null)?.loginEmail || "");
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setInterval(() => {
      setResendIn((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendIn]);

  const handleSendOtp = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      toast({ title: "Email required", description: "Enter your registered email address.", variant: "destructive" });
      return;
    }
    if (resendIn > 0) return;

    setLoading(true);
    try {
      await sendLoginEmailOtp(normalizedEmail);
      setEmail(normalizedEmail);
      setOtp("");
      setOtpSent(true);
      setResendIn(60);
      toast({ title: "OTP sent", description: "Check your registered email for the login OTP." });
    } catch (error: any) {
      toast({ title: "Unable to send OTP", description: error?.message || "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const normalizedEmail = email.trim();
    const normalizedOtp = otp.trim();
    if (!normalizedEmail || !/^\d{6}$/.test(normalizedOtp)) {
      toast({ title: "Invalid OTP", description: "Enter the six-digit OTP from your email.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      await verifyLoginEmailOtp(normalizedEmail, normalizedOtp);
      toast({ title: "Login successful", description: "Welcome back to DVI Holidays." });
      navigate("/", { replace: true });
    } catch (error: any) {
      toast({ title: "OTP verification failed", description: error?.message || "Invalid or expired OTP.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = () => {
    setOtpSent(false);
    setOtp("");
    setResendIn(0);
  };

  return (
    <div className="min-h-screen w-full bg-[#eadfff] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg rounded-[32px] bg-white p-8 shadow-[0_28px_90px_rgba(79,52,166,0.18)] sm:p-10">
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#e4e2f5] px-4 py-2 text-sm font-bold text-[#171949] hover:bg-[#f7f5ff]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Login
        </button>

        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0edff] text-[#4424ff]">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-extrabold text-[#090c36]">Sign in with Email OTP</h1>
        <p className="mt-3 text-sm font-medium text-[#6f7195]">
          Use your registered partner email to receive a secure one-time code.
        </p>

        <div className="mt-8 space-y-5">
          <div>
            <label htmlFor="email-login-email" className="mb-3 block text-sm font-bold text-[#151735]">
              Registered email address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#56598a]" />
              <Input
                id="email-login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@company.com"
                disabled={loading}
                className="h-14 rounded-xl pl-12"
              />
            </div>
          </div>

          <Button
            type="button"
            onClick={handleSendOtp}
            disabled={loading || resendIn > 0}
            className="h-14 w-full rounded-xl bg-[#4424ff] text-base font-bold text-white hover:bg-[#3518e8]"
          >
            {loading && !otpSent ? "Sending code..." : resendIn > 0 ? `Resend code in ${resendIn}s` : otpSent ? "Resend code" : "Send verification code"}
          </Button>

          {otpSent && (
            <div>
              <div className="mb-5 flex items-center justify-between gap-3 rounded-xl bg-[#f7f5ff] px-4 py-3 text-sm font-semibold text-[#62658c]">
                <span>Code sent to <strong className="text-[#4424ff]">{maskEmail(email)}</strong></span>
                <button type="button" onClick={handleChangeEmail} className="font-bold text-[#4424ff] hover:underline">
                  Change email
                </button>
              </div>
              <label htmlFor="email-login-otp" className="mb-3 block text-sm font-bold text-[#151735]">
                Enter 6-digit verification code
              </label>
              <Input
                id="email-login-otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                disabled={loading}
                className="h-14 rounded-xl text-center text-xl tracking-[0.45em]"
              />
              <Button
                type="button"
                onClick={handleVerifyOtp}
                disabled={loading || otp.length !== 6}
                className="mt-4 h-14 w-full rounded-xl border border-[#4424ff]/25 bg-white text-base font-bold text-[#4424ff] hover:bg-[#f4f1ff]"
              >
                {loading ? "Verifying..." : "Verify & Login"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
