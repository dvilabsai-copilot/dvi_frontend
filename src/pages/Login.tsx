// src/pages/Login.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  login,
  sendLoginEmailOtp,
  verifyLoginEmailOtp,
} from "@/services/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
//import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
//import PartnerRegistration from "./pages/PartnerRegistration";
const loginBannerSlides = [
  {
    title: "Premium Road Journeys",
    message: "Explore South India with Confidence",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=85",
    labels: [
      { text: "Scenic Coastal Highway", top: "30%", left: "12%" },
      { text: "Premium Coach", top: "70%", left: "58%" },
      { text: "Ocean Routes", top: "56%", left: "18%" },
    ],
    chips: ["Mountains", "Ocean Views", "Premium Road Trips"],
  },
  {
    title: "Kerala Experiences",
    message: "Curated Kerala Experiences",
    image:
      "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1800&q=85",
    labels: [
      { text: "Houseboat Stays", top: "35%", left: "15%" },
      { text: "Munnar Tea Gardens", top: "62%", left: "55%" },
      { text: "Kathakali Culture", top: "72%", left: "22%" },
    ],
    chips: ["Houseboats", "Munnar", "Kathakali"],
  },
  {
    title: "Temple Tourism",
    message: "Spiritual Journeys Simplified",
    image:
      "https://images.unsplash.com/photo-1621831714462-bec8edb22fe8?auto=format&fit=crop&w=1800&q=85",
    labels: [
      { text: "Meenakshi Temple", top: "32%", left: "13%" },
      { text: "Rameswaram", top: "60%", left: "58%" },
      { text: "Tirupati • Srisailam", top: "74%", left: "20%" },
    ],
    chips: ["Pilgrimage", "Darshan Routes", "Temple Circuits"],
  },
  {
    title: "Luxury Transport",
    message: "Reliable Transportation Network",
    image:
      "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1800&q=85",
    labels: [
      { text: "Innova Crysta", top: "34%", left: "14%" },
      { text: "Luxury Coach", top: "62%", left: "56%" },
      { text: "Airport Transfers", top: "75%", left: "22%" },
    ],
    chips: ["Tempo Traveller", "Luxury Coach", "Airport Transfers"],
  },
  {
    title: "AI Travel Technology",
    message: "Powered by DVI Optima AI",
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1800&q=85",
    labels: [
      { text: "AI Planner", top: "31%", left: "13%" },
      { text: "Route Intelligence", top: "58%", left: "57%" },
      { text: "Live Analytics", top: "74%", left: "22%" },
    ],
    chips: ["Route Maps", "Dynamic Itineraries", "Analytics Dashboard"],
  },
  {
    title: "MICE & Corporate Travel",
    message: "Corporate Travel & Events",
    image:
      "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1800&q=85",
    labels: [
      { text: "Conference Setup", top: "33%", left: "13%" },
      { text: "Corporate Groups", top: "61%", left: "57%" },
      { text: "Luxury Hotels", top: "73%", left: "20%" },
    ],
    chips: ["MICE", "Corporate Groups", "Luxury Hotels"],
  },
];

const loginStatsSets = [
  [
    { value: "17+", label: "Years of Service" },
    { value: "50,000+", label: "Travelers Served" },
    { value: "5,000+", label: "Travel Partners" },
  ],
  [
    { value: "5", label: "States Covered" },
    { value: "1000+", label: "Hotels Contracted" },
    { value: "24×7", label: "Operations Support" },
  ],
];

const loginOverlayMessages = [
  "Empowering Travel Partners",
  "Creating Journeys with AI",
  "Connecting Destinations Across South India",
  "Smart Planning. Seamless Operations.",
  "One Platform. Infinite Possibilities.",
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginMode, setLoginMode] = useState<"password" | "emailOtp">("password");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpResendIn, setEmailOtpResendIn] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeStatsSet, setActiveStatsSet] = useState(0);
  const [activeOverlayMessage, setActiveOverlayMessage] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const slideTimer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % loginBannerSlides.length);
    }, 4500);

    const statsTimer = window.setInterval(() => {
      setActiveStatsSet((current) => (current + 1) % loginStatsSets.length);
    }, 4200);

    const overlayTimer = window.setInterval(() => {
      setActiveOverlayMessage(
        (current) => (current + 1) % loginOverlayMessages.length
      );
    }, 3600);

    return () => {
      window.clearInterval(slideTimer);
      window.clearInterval(statsTimer);
      window.clearInterval(overlayTimer);
    };
  }, []);

  useEffect(() => {
    if (emailOtpResendIn <= 0) return;
    const timer = window.setInterval(() => {
      setEmailOtpResendIn((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [emailOtpResendIn]);

  const currentBannerSlide = loginBannerSlides[activeSlide];
  const currentStatsSet = loginStatsSets[activeStatsSet];

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast({ title: "Logged in" });
      navigate("/");
    } catch (e: unknown) {
      toast({
        title: "Login failed",
        description: e instanceof Error ? e.message : "Unable to sign in",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const switchLoginMode = (mode: "password" | "emailOtp") => {
    setLoginMode(mode);
    setEmailOtp("");
    setEmailOtpSent(false);
    setEmailOtpResendIn(0);
  };

  const sendEmailOtp = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      toast({
        title: "Email required",
        description: "Enter your registered partner email address.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await sendLoginEmailOtp(normalizedEmail);
      setEmail(normalizedEmail);
      setEmailOtp("");
      setEmailOtpSent(true);
      setEmailOtpResendIn(60);
      toast({ title: "Verification code sent", description: "Check your email for the login code." });
    } catch (e: unknown) {
      toast({
        title: "Unable to send code",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(emailOtp.trim())) {
      toast({
        title: "Invalid code",
        description: "Enter the six-digit code sent to your email.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await verifyLoginEmailOtp(email.trim(), emailOtp.trim());
      toast({ title: "Logged in" });
      navigate("/");
    } catch (e: unknown) {
      toast({
        title: "Verification failed",
        description: e instanceof Error ? e.message : "Invalid or expired code.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  

    return (
<div className="min-h-screen w-full bg-[#eadfff] flex items-center justify-center px-4 sm:px-8 lg:px-10 py-4 lg:py-5 overflow-hidden">
      <div className="w-full max-w-[1500px] h-[calc(100vh-40px)] max-h-[820px] min-h-[620px] bg-white rounded-[42px] shadow-[0_28px_90px_rgba(79,52,166,0.18)] p-5 lg:p-7 flex overflow-hidden">
        <div className="hidden lg:flex lg:w-[51%] lg:h-full relative overflow-hidden rounded-[30px] border border-white/40 bg-[#060821] shadow-[0_26px_70px_rgba(22,14,83,0.24)]">
        <style>
          {`
            @keyframes loginKenBurns {
              0% {
                transform: scale(1) translate3d(0, 0, 0);
              }
              100% {
                transform: scale(1.12) translate3d(-18px, -10px, 0);
              }
            }

            @keyframes loginFloat {
              0%, 100% {
                transform: translate3d(0, 0, 0);
              }
              50% {
                transform: translate3d(10px, -12px, 0);
              }
            }

            @keyframes loginRouteDash {
              0% {
                stroke-dashoffset: 620;
                opacity: 0.2;
              }
              45% {
                opacity: 1;
              }
              100% {
                stroke-dashoffset: 0;
                opacity: 0.85;
              }
            }

                        @keyframes loginStatPop {
              0% {
                opacity: 0;
                transform: translateY(14px) scale(0.96);
              }
              100% {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }


            .login-floating {
              animation: loginFloat 5s ease-in-out infinite;
            }

            .login-route-path {
              stroke-dasharray: 620;
              animation: loginRouteDash 4.5s ease-in-out infinite;
            }

            .login-stat-pop {
              animation: loginStatPop 0.75s ease-out both;
            }

            .login-logo-arrow-up {
              animation: loginLogoArrowUp 2.8s ease-in-out infinite;
            }          `}
        </style>

                <div className="pointer-events-none absolute inset-0 rounded-[30px] ring-1 ring-inset ring-white/20 z-30" />

        {loginBannerSlides.map((slide, index) => (
          <div
            key={slide.title}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[1400ms] ease-out ${
              activeSlide === index ? "opacity-100" : "opacity-0"
            }`}
          >
            <div
              className={`absolute inset-0 bg-cover bg-center ${
                activeSlide === index ? "login-ken-burns" : "scale-105"
              }`}
              style={{
                backgroundImage: `linear-gradient(115deg, rgba(5, 7, 35, 0.92) 0%, rgba(14, 18, 62, 0.72) 39%, rgba(28, 25, 92, 0.24) 74%), url(${slide.image})`,
              }}
            />
          </div>
        ))}

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(92,69,255,0.38),transparent_28%),radial-gradient(circle_at_82%_78%,rgba(239,68,68,0.30),transparent_30%)] z-10" />

        <div className="absolute inset-0 z-10 opacity-35">
          <div className="absolute top-16 left-28 h-40 w-40 rounded-full border border-white/30 login-floating" />
          <div className="absolute bottom-32 right-20 h-56 w-56 rounded-full border border-white/20 login-floating" />
          <div className="absolute top-1/2 left-[42%] h-24 w-24 rounded-full bg-white/10 blur-2xl login-floating" />
        </div>

        <svg
          className="absolute inset-x-10 bottom-20 z-20 h-56 w-[88%] opacity-80"
          viewBox="0 0 760 240"
          fill="none"
        >
          <defs>
            <marker
              id="loginArrow"
              markerWidth="12"
              markerHeight="12"
              refX="8"
              refY="4"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,8 L9,4 z" fill="#ef4444" />
            </marker>
          </defs>
          <path
            d="M30 190 C170 40, 260 210, 390 92 C510 -18, 590 112, 720 38"
            stroke="#ef4444"
            strokeWidth="4"
            strokeLinecap="round"
            markerEnd="url(#loginArrow)"
            className="login-route-path"
          />
          <path
            d="M30 190 C170 40, 260 210, 390 92 C510 -18, 590 112, 720 38"
            stroke="white"
            strokeWidth="10"
            strokeLinecap="round"
            opacity="0.12"
          />
        </svg>

        {currentBannerSlide.labels.map((label, index) => (
          <div
            key={`${currentBannerSlide.title}-${label.text}`}
            className="absolute z-20 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-xs font-semibold text-white shadow-2xl backdrop-blur-md login-floating"
            style={{
              top: label.top,
              left: label.left,
              animationDelay: `${index * 0.45}s`,
            }}
          >
            {label.text}
          </div>
        ))}

        <div className="relative z-30 flex flex-col justify-between px-10 xl:px-12 py-7 xl:py-8 w-full">
          <div className="flex items-start justify-between">
            <div className="leading-none">
              <div className="relative inline-block">
                <div className="text-[44px] xl:text-[50px] tracking-[0.28em] font-medium text-white drop-shadow-xl">
                  DVi
                </div>
<svg
  className="absolute -top-6 left-0 h-10 w-28 overflow-visible"
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
                <span className="absolute -top-[34px] left-[108px] text-sm font-bold text-white">
                  ®
                </span>
              </div>

              <div className="text-[22px] xl:text-[24px] font-medium text-white/90 mt-1">
                holidays
              </div>
            </div>

            <div className="rounded-full border border-white/25 bg-white/15 px-5 py-2 text-xs font-bold uppercase tracking-[0.32em] text-white backdrop-blur-md">
              Live Travel Showcase
            </div>
          </div>

          <div className="max-w-3xl pb-0">
            <div className="mb-5 inline-flex rounded-full border border-white/20 bg-white/15 px-5 py-2 text-sm font-semibold text-white backdrop-blur-md">
              {currentBannerSlide.title}
            </div>

            <h1 className="text-white font-extrabold leading-tight drop-shadow-2xl">
              <span
                key={loginOverlayMessages[activeOverlayMessage]}
                className="block text-[24px] xl:text-[28px] login-stat-pop"
              >
                {loginOverlayMessages[activeOverlayMessage]}
              </span>

              <span
                key={currentBannerSlide.message}
                className="mt-2 block text-[38px] xl:text-[44px] 2xl:text-[48px] text-white login-stat-pop"
              >
                {currentBannerSlide.message}
              </span>
            </h1>

            <div className="mt-7 h-1 w-20 bg-[#ef4444] rounded-full" />

            <div className="mt-5 flex flex-wrap gap-2">
              {currentBannerSlide.chips.map((chip) => (
                <span
                  key={`${currentBannerSlide.title}-${chip}`}
                  className="rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md"
                >
                  {chip}
                </span>
              ))}
            </div>

            <div
              key={activeStatsSet}
              className="mt-6 grid grid-cols-3 gap-3 login-stat-pop"
            >
              {currentStatsSet.map((stat) => (
                <div
                  key={`${stat.value}-${stat.label}`}
                  className="rounded-2xl border border-white/20 bg-white/15 p-3 text-white shadow-2xl backdrop-blur-md"
                >
                  <div className="text-[22px] xl:text-[24px] font-extrabold leading-none">
                    {stat.value}
                  </div>
                  <div className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex items-center gap-2">
              {loginBannerSlides.map((slide, index) => (
                <button
                  key={slide.title}
                  type="button"
                  onClick={() => setActiveSlide(index)}
                  className={`h-2 rounded-full transition-all duration-500 ${
                    activeSlide === index
                      ? "w-10 bg-white"
                      : "w-2 bg-white/45 hover:bg-white/70"
                  }`}
                  aria-label={`Show ${slide.title}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

            <div className="flex w-full lg:w-[47%] items-center justify-center px-6 sm:px-10 lg:px-14 py-8 bg-white">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-10 text-center">
            <div className="text-5xl tracking-[0.22em] font-semibold text-[#101344]">
              DVi
            </div>
            <div className="text-2xl font-medium text-[#101344]">holidays</div>
          </div>

          <h2 className="text-[34px] font-extrabold text-[#090c36]">
            Travel Partner Login
          </h2>

          <div className="mt-4 h-1 w-12 bg-[#4424ff] rounded-full" />

          <p className="mt-6 text-sm sm:text-base text-[#6f7195] font-medium">
            Welcome back! Please login to continue managing your travel business.
          </p>

          <form className="mt-9 space-y-6" onSubmit={loginMode === "password" ? onSubmit : verifyEmailOtp}>
            <div>
              <label htmlFor="login-email" className="block text-sm font-bold text-[#151735] mb-3">
                Partner email address
              </label>

              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[#56598a]">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 21a8 8 0 0 0-16 0" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>

                <Input
                  id="login-email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (loginMode === "emailOtp") {
                      setEmailOtpSent(false);
                      setEmailOtp("");
                      setEmailOtpResendIn(0);
                    }
                  }}
                  type="email"
                  placeholder="name@company.com"
                  className="h-14 pl-14 rounded-xl border-[#e0e3f4] bg-white text-[#101344] placeholder:text-[#9a9cc0] shadow-sm focus-visible:ring-[#4424ff]"
                />
              </div>
            </div>

            {loginMode === "password" ? (
              <>
                <div>
                  <label htmlFor="login-password" className="block text-sm font-bold text-[#151735] mb-3">
                    Password
                  </label>

                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[#56598a]">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>

                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="h-14 pl-14 rounded-xl border-[#e0e3f4] bg-white text-[#101344] placeholder:text-[#9a9cc0] shadow-sm focus-visible:ring-[#4424ff]"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((visible) => !visible)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#4424ff]"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input id="rememberMe" type="checkbox" className="h-4 w-4 rounded border-[#9a9cc0] accent-[#4424ff]" />
                  <label htmlFor="rememberMe" className="text-sm font-semibold text-[#24264a]">Remember Me</label>
                </div>

                <Button type="submit" disabled={loading} className="w-full h-14 rounded-xl bg-[#4424ff] hover:bg-[#3518e8] text-white font-bold text-base shadow-lg shadow-[#4424ff]/25">
                  {loading ? "Signing in..." : "Sign in with Password"}
                </Button>

                <button type="button" onClick={() => switchLoginMode("emailOtp")} className="w-full text-sm font-extrabold text-[#4424ff] hover:underline">
                  Sign in with Email OTP
                </button>
              </>
            ) : (
              <>
                <div className="rounded-xl bg-[#f7f5ff] px-4 py-3 text-sm font-semibold text-[#62658c]">
                  We will send a 6-digit verification code to your registered email.
                </div>

                {!emailOtpSent ? (
                  <Button type="button" onClick={sendEmailOtp} disabled={loading} className="w-full h-14 rounded-xl bg-[#4424ff] hover:bg-[#3518e8] text-white font-bold text-base shadow-lg shadow-[#4424ff]/25">
                    {loading ? "Sending code..." : "Send verification code"}
                  </Button>
                ) : (
                  <>
                    <div>
                      <label htmlFor="login-email-otp" className="block text-sm font-bold text-[#151735] mb-3">
                        Enter verification code
                      </label>
                      <Input
                        id="login-email-otp"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={emailOtp}
                        onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="000000"
                        disabled={loading}
                        className="h-14 rounded-xl text-center text-xl tracking-[0.45em]"
                      />
                    </div>
                    <Button type="submit" disabled={loading || emailOtp.length !== 6} className="w-full h-14 rounded-xl bg-[#4424ff] hover:bg-[#3518e8] text-white font-bold text-base shadow-lg shadow-[#4424ff]/25">
                      {loading ? "Verifying..." : "Verify & Sign in"}
                    </Button>
                    <button type="button" disabled={emailOtpResendIn > 0 || loading} onClick={sendEmailOtp} className="w-full text-sm font-extrabold text-[#4424ff] hover:underline disabled:cursor-not-allowed disabled:text-[#9a9cc0]">
                      {emailOtpResendIn > 0 ? `Resend code in ${emailOtpResendIn}s` : "Resend code"}
                    </button>
                  </>
                )}

                <button type="button" onClick={() => switchLoginMode("password")} className="w-full text-sm font-extrabold text-[#4424ff] hover:underline">
                  Sign in with password
                </button>
              </>
            )}
          </form>

          <div className="mt-7 border-t border-[#ececf7] pt-6 text-center">
            <p className="text-sm font-medium text-[#6f7195]">
              New to DVI Holidays?
            </p>
            <button
              type="button"
              onClick={() => navigate("/partner-registration")}
              className="mt-2 text-sm font-extrabold text-[#4424ff] hover:underline"
            >
              Create a travel partner account
            </button>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
