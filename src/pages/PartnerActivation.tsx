import {
  useEffect,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  Loader2,
  Mail,
  ShieldCheck,
} from "lucide-react";

import {
  Button,
} from "@/components/ui/button";

import {
  Input,
} from "@/components/ui/input";

import {
  activatePartner,
  resendPartnerActivation,
} from "@/services/auth";

export default function PartnerActivation() {
  const { token } =
    useParams<{
      token: string;
    }>();

  const navigate =
    useNavigate();

  const location =
    useLocation();

  const registrationEmail =
    String(
      (
        location.state as {
          email?: string;
        } | null
      )?.email || "",
    );

  const [
    activationError,
    setActivationError,
  ] = useState(
    token
      ? ""
      : "Enter your registered email to receive a new activation link.",
  );

  const [
    email,
    setEmail,
  ] = useState(
    registrationEmail,
  );

  const [
    resendLoading,
    setResendLoading,
  ] = useState(false);

  const [
    resendMessage,
    setResendMessage,
  ] = useState("");

  const [
    resendError,
    setResendError,
  ] = useState("");

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    activatePartner(token)
      .then(() => {
        if (!cancelled) {
          navigate(
            "/",
            {
              replace: true,
            },
          );
        }
      })
      .catch(
        (error: any) => {
          if (!cancelled) {
            setActivationError(
              error?.message ||
                "Unable to activate your partner account.",
            );
          }
        },
      );

    return () => {
      cancelled = true;
    };
  }, [
    navigate,
    token,
  ]);

  const handleResendActivation =
    async () => {
      const normalizedEmail =
        email
          .trim()
          .toLowerCase();

      if (
        !normalizedEmail ||
        !normalizedEmail.includes(
          "@",
        )
      ) {
        setResendError(
          "Enter a valid registered email address.",
        );

        setResendMessage("");

        return;
      }

      setResendLoading(
        true,
      );

      setResendError("");

      setResendMessage("");

      try {
        const result =
          await resendPartnerActivation(
            normalizedEmail,
          );

        setResendMessage(
          result?.message ||
            "A new activation link has been sent to your email.",
        );
      } catch (
        error: any
      ) {
        setResendError(
          error?.message ||
            "Unable to resend the activation email.",
        );
      } finally {
        setResendLoading(
          false,
        );
      }
    };

  if (
    token &&
    !activationError
  ) {
    return (
      <div className="min-h-screen bg-[#f4efff] px-4 py-10">
        <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center">
          <div className="w-full rounded-[28px] bg-white p-10 text-center shadow-[0_24px_80px_rgba(76,54,145,0.14)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f4f1ff] text-[#4424ff]">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>

            <h1 className="mt-6 text-2xl font-extrabold text-[#070b3f]">
              Activating your partner account
            </h1>

            <p className="mt-3 text-sm font-medium text-[#62658c]">
              Please wait while we securely verify your activation link.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4efff] px-4 py-10">
      <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center">
        <div className="w-full rounded-[28px] bg-white p-8 shadow-[0_24px_80px_rgba(76,54,145,0.14)] sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f4f1ff] text-[#4424ff]">
            <ShieldCheck className="h-8 w-8" />
          </div>

          <h1 className="mt-6 text-center text-2xl font-extrabold text-[#070b3f]">
            Partner account activation
          </h1>

          <p className="mt-3 text-center text-sm font-medium leading-6 text-[#62658c]">
            {activationError}
          </p>

          <div className="mt-8 rounded-2xl border border-[#ece9f8] bg-[#faf9ff] p-5">
            <label className="mb-2 block text-sm font-extrabold text-[#090c36]">
              Registered email address
            </label>

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#676a92]" />

              <Input
                type="email"
                value={email}
                onChange={(
                  event,
                ) =>
                  setEmail(
                    event.target.value,
                  )
                }
                placeholder="name@company.com"
                className="h-12 rounded-xl border-[#e7e9f5] bg-white pl-12 text-[#0d1042] placeholder:text-[#9a9cc0] focus-visible:ring-[#4424ff]"
              />
            </div>

            {resendMessage ? (
              <p className="mt-3 text-sm font-semibold text-green-700">
                {
                  resendMessage
                }
              </p>
            ) : null}

            {resendError ? (
              <p className="mt-3 text-sm font-semibold text-red-600">
                {
                  resendError
                }
              </p>
            ) : null}

            <Button
              type="button"
              onClick={
                handleResendActivation
              }
              disabled={
                resendLoading
              }
              className="mt-5 h-11 w-full rounded-xl bg-[#4424ff] font-bold text-white hover:bg-[#3520cc]"
            >
              {resendLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />

                  Sending activation email...
                </>
              ) : (
                "Resend Activation Email"
              )}
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              navigate(
                "/login",
                {
                  replace: true,
                },
              )
            }
            className="mt-5 h-11 w-full rounded-xl border-[#dedbef] font-bold text-[#171949]"
          >
            Back to Login
          </Button>
        </div>
      </div>
    </div>
  );
}