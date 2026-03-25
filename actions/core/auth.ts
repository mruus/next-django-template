"use server";

import { apiPost } from "@/actions/base";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const result = await apiPost(
    "auth/login/",
    {
      email: email,
      password: password,
    },
    { requiresAuth: false },
  );

  console.log("Auth from Server", result);

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function verifyOtpAction(formData: FormData) {
  const email = formData.get("email") as string;
  const otpCode = formData.get("otpCode") as string;
  const rememberDevice = formData.get("rememberDevice") === "true";

  const result = await apiPost(
    "auth/verify-otp/",
    { email, otp_code: otpCode, remember_device: rememberDevice },
    { requiresAuth: false },
  );

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

export async function resendOtpAction(formData: FormData) {
  const email = formData.get("email") as string;

  const result = await apiPost(
    "auth/resend-otp/",
    { email },
    { requiresAuth: false },
  );

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

// Refresh access token
export async function refreshTokenAction(refreshToken: string) {
  const result = await apiPost(
    "auth/token/refresh/",
    {
      refresh: refreshToken,
    },
    { requiresAuth: false },
  );

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

// Verify token
export async function verifyTokenAction(token: string) {
  const result = await apiPost(
    "auth/token/verify/",
    {
      token: token,
    },
    { requiresAuth: false },
  );

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}
