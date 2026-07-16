import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  CreditCard,
  Mail,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import {
  registerPartner,
  sendRegistrationEmailOtp,
  verifyRegistrationEmailOtp,
} from "@/services/auth";

const RegistrationStep = ({
  number,
  title,
  active,
}: {
  number: number;
  title: string;
  active?: boolean;
}) => (
  <div className="flex flex-col items-center gap-3 min-w-[150px]">
    <div
      className={`h-11 w-11 rounded-full flex items-center justify-center font-extrabold shadow-sm ${
        active
          ? "bg-[#4424ff] text-white shadow-[#4424ff]/30"
          : "bg-[#f1efff] text-[#171949]"
      }`}
    >
      {number}
    </div>
    <div
      className={`text-sm font-bold ${
        active ? "text-[#4424ff]" : "text-[#171949]"
      }`}
    >
      {title}
    </div>
  </div>
);

const IconInput = ({
  icon,
  placeholder,
  value,
  onChange,
  type = "text",
  id,
  className = "",
}: {
  icon: React.ReactNode;
  placeholder: string;
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  id?: string;
  className?: string;
}) => (
  <div className={`relative ${className}`}>
    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[#676a92]">
      {icon}
    </span>
    <Input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="h-14 rounded-xl border-[#e7e9f5] bg-white pl-14 text-[#0d1042] placeholder:text-[#9a9cc0] shadow-sm focus-visible:ring-[#4424ff]"
    />
  </div>
);

const SectionTitle = ({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) => (
  <div className="flex items-center gap-4">
    <div className="h-14 w-14 rounded-2xl bg-[#f4f1ff] text-[#4424ff] flex items-center justify-center">
      {icon}
    </div>
    <div>
      <h2 className="text-xl font-extrabold text-[#070b3f]">{title}</h2>
      <p className="mt-1 text-sm font-medium text-[#62658c]">{subtitle}</p>
    </div>
  </div>
);

const VerifiedCard = ({ text }: { text: string }) => (
  <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
    <div className="flex items-center gap-2 font-extrabold">
      <CheckCircle2 className="h-5 w-5" />
      Verified
    </div>
    <p className="mt-1 text-xs font-semibold">{text}</p>
  </div>
);

export default function PartnerRegistration() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [emailVerificationId, setEmailVerificationId] = useState("");
  const [emailVerificationOtp, setEmailVerificationOtp] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpVerified, setEmailOtpVerified] = useState(false);
  const [emailVerificationToken, setEmailVerificationToken] = useState("");
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);
  const [emailResendIn, setEmailResendIn] = useState(0);
  const [companyName, setCompanyName] = useState("");
  const [mobile, setMobile] = useState("");
  const [pan, setPan] = useState("");
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [registrationLoading, setRegistrationLoading] = useState(false);

  useEffect(() => {
    if (emailResendIn <= 0) return;
    const timer = window.setInterval(() => {
      setEmailResendIn((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [emailResendIn]);

  const resetEmailVerification = (value: string) => {
    setEmailVerificationId(value);
    setEmailOtpSent(false);
    setEmailOtpVerified(false);
    setEmailVerificationOtp("");
    setEmailVerificationToken("");
    setEmailResendIn(0);
  };

  const handleSendEmailVerificationOtp = async () => {
    const emailValue = emailVerificationId.trim();

    if (!emailValue) {
      toast({
        title: "Email required",
        description: "Please enter the email ID you want to verify.",
        variant: "destructive",
      });
      return;
    }

    setEmailOtpLoading(true);

    try {
      await sendRegistrationEmailOtp(emailValue);
      setEmailOtpSent(true);
      setEmailOtpVerified(false);
      setEmailVerificationOtp("");
      setEmailVerificationToken("");
      setEmailResendIn(60);

      toast({
        title: "OTP sent",
        description: "Please check your email ID for the OTP.",
      });
    } catch (e: any) {
      toast({
        title: "Unable to send OTP",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setEmailOtpLoading(false);
    }
  };

  const handleVerifyEmailVerificationOtp = async () => {
    const emailValue = emailVerificationId.trim();
    const otpValue = emailVerificationOtp.trim();

    if (!emailValue || !otpValue) {
      toast({
        title: "OTP required",
        description: "Please enter the email ID and OTP.",
        variant: "destructive",
      });
      return;
    }

    setEmailOtpLoading(true);

    try {
      const result = await verifyRegistrationEmailOtp(emailValue, otpValue);
      setEmailOtpVerified(true);
      setEmailVerificationToken(String(result?.verificationToken || ""));

      toast({
        title: "Email verified",
        description: "Email verification completed successfully.",
      });
    } catch (e: any) {
      toast({
        title: "OTP verification failed",
        description: e?.message || "Invalid or expired OTP.",
        variant: "destructive",
      });
    } finally {
      setEmailOtpLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    const normalizedEmail = emailVerificationId.trim().toLowerCase();
    const normalizedPan = pan.trim().toUpperCase();

    if (!companyName.trim() || !mobile.trim() || !normalizedEmail || !normalizedPan) {
      toast({
        title: "Complete your details",
        description: "Company name, mobile number, email, and PAN are required.",
        variant: "destructive",
      });
      return;
    }

    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(normalizedPan)) {
      toast({
        title: "Invalid PAN",
        description: "Enter a valid 10-character PAN number.",
        variant: "destructive",
      });
      return;
    }

    if (!emailOtpVerified || !emailVerificationToken) {
      toast({
        title: "Verify your email",
        description: "Verify the registration email before creating the account.",
        variant: "destructive",
      });
      return;
    }

    if (!declarationAccepted) {
      toast({
        title: "Declaration required",
        description: "Accept the declaration before creating the account.",
        variant: "destructive",
      });
      return;
    }

    setRegistrationLoading(true);
    try {
      await registerPartner({
        companyName: companyName.trim(),
        mobile: mobile.trim(),
        email: normalizedEmail,
        pan: normalizedPan,
        emailVerificationToken,
        declarationAccepted,
      });
      toast({
        title: "Registration submitted",
        description: "Your application is pending approval. You can sign in after approval.",
      });
      navigate("/login", { replace: true });
    } catch (e: any) {
      toast({
        title: "Unable to create account",
        description: e?.message || "Please review your details and try again.",
        variant: "destructive",
      });
    } finally {
      setRegistrationLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4efff] px-4 py-8">
      <div className="mx-auto max-w-[1450px] rounded-[34px] bg-white px-8 py-8 shadow-[0_24px_80px_rgba(76,54,145,0.14)]">
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#e4e2f5] px-4 py-2 text-sm font-bold text-[#171949] hover:bg-[#f7f5ff]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Login
        </button>

        <div className="relative overflow-hidden rounded-[28px] bg-white">
          <div className="absolute right-[-70px] top-[-70px] hidden h-72 w-72 overflow-hidden rounded-full lg:block">
            <img
              src="https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=900&q=85"
              alt="Kerala travel"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-white/20" />
          </div>

          <div className="relative z-10 max-w-5xl">
            <div className="leading-none">
              <div className="relative inline-block">
                <svg
                  className="absolute -top-5 left-0 h-9 w-24 overflow-visible"
                  viewBox="0 0 130 52"
                  fill="none"
                >
                  <path
                    d="M8 39
                       C38 37, 75 27, 107 11
                       L102 6
                       L125 0
                       L116 21
                       L112 15
                       C78 31, 40 41, 9 40
                       C7 40, 6 39, 8 39Z"
                    fill="#ef4444"
                  />
                </svg>

                <div className="text-[42px] tracking-[0.28em] font-medium text-[#101344]">
                  DVi
                </div>
                <span className="absolute -top-7 left-[100px] text-xs font-bold text-[#101344]">
                  ®
                </span>
              </div>

              <div className="text-[24px] font-medium text-[#101344] mt-1">
                holidays
              </div>
            </div>

            <div className="mt-12">
              <h1 className="text-[42px] font-extrabold leading-tight text-[#070b3f]">
                Welcome to DVI Holidays
              </h1>
              <p className="mt-4 text-lg font-medium text-[#555982]">
                Create your account and start your journey with us
              </p>
            </div>
          </div>

          <div className="relative z-10 mt-12 flex items-start justify-center gap-4">
            <RegistrationStep number={1} title="Company Details" active />
            <div className="mt-5 h-[2px] flex-1 max-w-[280px] bg-gradient-to-r from-[#4424ff] to-[#ece9ff]" />
            <RegistrationStep number={2} title="PAN Verification" />
            <div className="mt-5 h-[2px] flex-1 max-w-[280px] bg-[#ece9ff]" />
            <RegistrationStep number={3} title="Mobile Verification" />
          </div>
        </div>

        <div className="mt-10 space-y-10">
          <section className="rounded-3xl border border-[#f0eff8] bg-white p-7">
            <SectionTitle
              icon={<Building2 className="h-7 w-7" />}
              title="Company Details"
              subtitle="Please provide your company information"
            />

            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div>
                <label className="mb-3 block text-sm font-extrabold text-[#090c36]">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <IconInput
                  icon={<Building2 className="h-5 w-5" />}
                  placeholder="Enter your company name"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                />
              </div>

              <div>
                <label className="mb-3 block text-sm font-extrabold text-[#090c36]">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <IconInput
                  icon={<Phone className="h-5 w-5" />}
                  placeholder="Enter mobile number"
                  value={mobile}
                  onChange={(event) => setMobile(event.target.value)}
                  type="tel"
                />
              </div>

              <div>
                <label className="mb-3 block text-sm font-extrabold text-[#090c36]">
                  Email ID <span className="text-red-500">*</span>
                </label>
                <IconInput
                  icon={<Mail className="h-5 w-5" />}
                  placeholder="Enter email ID"
                  value={emailVerificationId}
                  onChange={(event) => resetEmailVerification(event.target.value)}
                  type="email"
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-[#f0eff8] bg-white p-7">
            <SectionTitle
              icon={<CreditCard className="h-7 w-7" />}
              title="PAN Card Verification"
              subtitle="Please enter your PAN card number"
            />

            <div className="mt-8">
              <label className="mb-3 block text-sm font-extrabold text-[#090c36]">
                PAN Card Number <span className="text-red-500">*</span>
              </label>
              <IconInput
                icon={<CreditCard className="h-5 w-5" />}
                placeholder="Enter 10 digit PAN number (e.g. ABCDE1234F)"
                value={pan}
                onChange={(event) => setPan(event.target.value.toUpperCase())}
              />
            </div>
          </section>

          <section className="rounded-3xl border border-[#f0eff8] bg-white p-7">
            <SectionTitle
              icon={<Phone className="h-7 w-7" />}
              title="Mobile Contact"
              subtitle="Use a mobile number that your onboarding team can reach"
            />

            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]">
              <div>
                <label className="mb-3 block text-sm font-extrabold text-[#090c36]">
                  Mobile number <span className="text-red-500">*</span>
                </label>
                <Input
                  type="tel"
                  value={mobile}
                  onChange={(event) => setMobile(event.target.value)}
                  placeholder="Enter mobile number"
                  className="h-14 rounded-xl border-[#e7e9f5] bg-white text-[#0d1042] placeholder:text-[#9a9cc0] shadow-sm focus-visible:ring-[#4424ff]"
                />
              </div>

              <div className="flex items-end">
                <div className="rounded-xl border border-[#e5e2f5] bg-[#faf9ff] px-4 py-3 text-sm font-semibold leading-5 text-[#62658c]">
                  Mobile verification will be completed during onboarding approval.
                </div>
              </div>
            </div>
          </section>

<section className="rounded-3xl border border-[#f0eff8] bg-white p-7">
  <SectionTitle
    icon={<Mail className="h-7 w-7" />}
    title="Email Verification"
    subtitle="Save your email ID and verify it using OTP"
  />

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_240px]">
    <div>
      <label className="mb-3 block text-sm font-extrabold text-[#090c36]">
        Email ID <span className="text-red-500">*</span>
      </label>

      <div className="relative">
        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[#676a92]">
          <Mail className="h-5 w-5" />
        </span>

        <Input
          value={emailVerificationId}
          onChange={(e) => {
            resetEmailVerification(e.target.value);
          }}
          type="email"
          placeholder="Enter the email you will use to sign in"
          className="h-14 rounded-xl border-[#e7e9f5] bg-white pl-14 text-[#0d1042] placeholder:text-[#9a9cc0] shadow-sm focus-visible:ring-[#4424ff]"
        />
      </div>
    </div>

    <div className="flex items-end">
      <Button
        type="button"
        onClick={handleSendEmailVerificationOtp}
        disabled={emailOtpLoading || emailResendIn > 0}
        className="h-14 w-full rounded-xl bg-[#4424ff] text-base font-extrabold text-white shadow-lg shadow-[#4424ff]/20 hover:bg-[#3518e8]"
      >
        {emailOtpLoading && !emailOtpSent
          ? "Sending code..."
          : emailResendIn > 0
            ? `Resend code in ${emailResendIn}s`
            : emailOtpSent
              ? "Resend code"
              : "Send verification code"}
      </Button>
    </div>
  </div>

  <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_240px]">
    <div>
      <label className="mb-3 block text-sm font-extrabold text-[#090c36]">
        Enter OTP <span className="text-red-500">*</span>
      </label>

      <Input
        inputMode="numeric"
        maxLength={6}
        value={emailVerificationOtp}
        onChange={(e) => setEmailVerificationOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
        placeholder="Enter 6-digit code"
        disabled={!emailOtpSent || emailOtpVerified}
        className="h-14 rounded-xl border-[#e7e9f5] bg-white text-[#0d1042] placeholder:text-[#9a9cc0] shadow-sm focus-visible:ring-[#4424ff] disabled:bg-[#f8f8fc]"
      />
    </div>

    <div className="flex items-end">
      {emailOtpVerified ? (
        <VerifiedCard text="Email ID verified successfully" />
      ) : (
        <Button
          type="button"
          onClick={handleVerifyEmailVerificationOtp}
          disabled={!emailOtpSent || emailOtpLoading || emailVerificationOtp.length !== 6}
          className="h-14 w-full rounded-xl border border-[#4424ff]/25 bg-white text-[#4424ff] hover:bg-[#f4f1ff] font-bold text-base shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {emailOtpLoading && emailOtpSent ? "Verifying..." : "Verify email"}
        </Button>
      )}
    </div>
  </div>

  {emailOtpSent && !emailOtpVerified && (
    <p className="mt-4 text-sm font-semibold text-[#62658c]">
      A verification code has been sent to{" "}
      <span className="text-[#4424ff]">{emailVerificationId}</span>. Verify this email before creating the account.
    </p>
  )}
</section>

          <div className="rounded-3xl bg-white px-2">
            <div className="flex items-start gap-4">
              <input
                id="registrationDeclaration"
                type="checkbox"
                checked={declarationAccepted}
                onChange={(event) => setDeclarationAccepted(event.target.checked)}
                className="mt-1 h-6 w-6 rounded border-[#b8b2ff] accent-[#4424ff]"
              />

              <label
                htmlFor="registrationDeclaration"
                className="text-sm font-semibold leading-7 text-[#232650]"
              >
                I hereby declare that the above information is true and correct.
                <br />
                <span className="font-medium text-[#62658c]">
                  By creating an account, you agree to our{" "}
                  <a className="font-bold text-[#4424ff] underline" href="#">
                    Terms & Conditions
                  </a>{" "}
                  and{" "}
                  <a className="font-bold text-[#4424ff] underline" href="#">
                    Privacy Policy
                  </a>
                  .
                </span>
              </label>
            </div>

            <Button
              type="button"
              onClick={handleCreateAccount}
              disabled={registrationLoading}
              className="mt-7 h-16 w-full rounded-xl bg-[#4424ff] text-lg font-extrabold text-white shadow-lg shadow-[#4424ff]/25 hover:bg-[#3518e8]"
            >
              {registrationLoading ? "Submitting..." : "Create Account"}
              <ArrowRight className="ml-4 h-6 w-6" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-5 rounded-3xl bg-[#fbfaff] p-6 lg:grid-cols-3">
            <div className="flex gap-4 border-[#e2def7] lg:border-r lg:pr-6">
              <div className="text-[#4424ff]">
                <ShieldCheck className="h-9 w-9" />
              </div>
              <div>
                <h3 className="font-extrabold text-[#070b3f]">
                  Your Journey, Our Priority
                </h3>
                <p className="mt-3 text-sm font-medium leading-6 text-[#555982]">
                  We are here to make your travel business grow with smart
                  technology and dedicated support.
                </p>
              </div>
            </div>

            <div className="flex gap-4 border-[#e2def7] lg:border-r lg:px-6">
              <div className="text-[#4424ff]">
                <Phone className="h-9 w-9" />
              </div>
              <div>
                <h3 className="font-extrabold text-[#070b3f]">24×7 Support</h3>
                <p className="mt-3 text-sm font-bold text-[#171949]">
                  +91 8921 77 66 88
                </p>
                <p className="mt-2 text-sm font-medium text-[#555982]">
                  We’re here to help you anytime.
                </p>
              </div>
            </div>

            <div className="flex gap-4 lg:pl-6">
              <div className="text-[#4424ff]">
                <Mail className="h-9 w-9" />
              </div>
              <div>
                <h3 className="font-extrabold text-[#070b3f]">Email Support</h3>
                <p className="mt-3 text-sm font-bold text-[#171949]">
                  partner.support@dviholidays.com
                </p>
                <p className="mt-2 text-sm font-medium text-[#555982]">
                  We’re here to help you anytime.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
