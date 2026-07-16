// src/services/auth.ts
import { api, setToken, clearToken } from "@/lib/api";

export async function login(email: string, password: string) {
  const data = await api("/auth/login", {
    method: "POST",
    auth: false,
    body: { email, password },
  });
  if (data?.accessToken) {
    setToken(data.accessToken);
  }
  return data;
}

export async function sendLoginEmailOtp(email: string) {
  return api("/auth/email-login/send-otp", {
    method: "POST",
    auth: false,
    body: { email },
  });
}

export async function verifyLoginEmailOtp(email: string, otp: string) {
  const data = await api("/auth/email-login/verify-otp", {
    method: "POST",
    auth: false,
    body: { email, otp },
  });

  if (data?.accessToken) {
    setToken(data.accessToken);
  }

  return data;
}

export async function sendRegistrationEmailOtp(email: string) {
  return api("/auth/registration/email/send-otp", {
    method: "POST",
    auth: false,
    body: { email },
  });
}

export async function verifyRegistrationEmailOtp(email: string, otp: string) {
  return api("/auth/registration/email/verify-otp", {
    method: "POST",
    auth: false,
    body: { email, otp },
  });
}

export async function registerPartner(input: {
  companyName: string;
  mobile: string;
  email: string;
  pan: string;
  emailVerificationToken: string;
  declarationAccepted: boolean;
}) {
  return api("/auth/registration", {
    method: "POST",
    auth: false,
    body: input,
  });
}

export function logout() {
  clearToken();
}
