export function displayName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 50);
}

export function accountError(error: unknown): string {
  const e = error as { code?: string; message?: string };
  if (e?.code === "email_address_not_authorized" || /email address.*not authorized|error sending.*email/i.test(e?.message || ""))
    return "Account emails are not available yet. Please use Google sign-in when available, or submit a review as a guest.";
  if (e?.code === "email_not_confirmed")
    return "Please confirm your email before signing in. Check your inbox and spam folder.";
  if (e?.code === "invalid_credentials") return "The email or password is incorrect. Please try again.";
  if (e?.code === "over_email_send_rate_limit") return "Too many email requests. Please wait before trying again.";
  return e?.message || "Unable to continue. Please try again.";
}
