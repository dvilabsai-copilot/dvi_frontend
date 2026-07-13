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
  className = "",
}: {
  icon: React.ReactNode;
  placeholder: string;
  className?: string;
}) => (
  <div className={`relative ${className}`}>
    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[#676a92]">
      {icon}
    </span>
    <Input
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
                />
              </div>

              <div>
                <label className="mb-3 block text-sm font-extrabold text-[#090c36]">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <IconInput
                  icon={<Phone className="h-5 w-5" />}
                  placeholder="Enter mobile number"
                />
              </div>

              <div>
                <label className="mb-3 block text-sm font-extrabold text-[#090c36]">
                  Email ID <span className="text-red-500">*</span>
                </label>
                <IconInput
                  icon={<Mail className="h-5 w-5" />}
                  placeholder="Enter email ID"
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
              />
            </div>
          </section>

          <section className="rounded-3xl border border-[#f0eff8] bg-white p-7">
            <SectionTitle
              icon={<Phone className="h-7 w-7" />}
              title="Mobile Verification"
              subtitle="We will send an OTP to verify your mobile number"
            />

            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]">
              <div>
                <label className="mb-3 block text-sm font-extrabold text-[#090c36]">
                  Enter OTP <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Enter OTP received on your mobile number"
                  className="h-14 rounded-xl border-[#e7e9f5] bg-white text-[#0d1042] placeholder:text-[#9a9cc0] shadow-sm focus-visible:ring-[#4424ff]"
                />
              </div>

              <div className="flex items-end">
                <VerifiedCard text="Same as above mobile number" />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-[#f0eff8] bg-white p-7">
            <SectionTitle
              icon={<Mail className="h-7 w-7" />}
              title="Email Verification"
              subtitle="We will send an OTP to verify your email ID"
            />

            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]">
              <div>
                <label className="mb-3 block text-sm font-extrabold text-[#090c36]">
                  Enter OTP <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Enter OTP received on your email ID"
                  className="h-14 rounded-xl border-[#e7e9f5] bg-white text-[#0d1042] placeholder:text-[#9a9cc0] shadow-sm focus-visible:ring-[#4424ff]"
                />
              </div>

              <div className="flex items-end">
                <VerifiedCard text="Same as above email ID" />
              </div>
            </div>
          </section>

          <div className="rounded-3xl bg-white px-2">
            <div className="flex items-start gap-4">
              <input
                id="registrationDeclaration"
                type="checkbox"
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
              className="mt-7 h-16 w-full rounded-xl bg-[#4424ff] text-lg font-extrabold text-white shadow-lg shadow-[#4424ff]/25 hover:bg-[#3518e8]"
            >
              Create Account
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