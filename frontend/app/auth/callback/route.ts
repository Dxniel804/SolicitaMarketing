import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();

  let error: string | null = null;

  if (code) {
    // PKCE flow (?code=...), used by signInWithOtp's "Magic Link" template.
    const result = await supabase.auth.exchangeCodeForSession(code);
    error = result.error?.message ?? null;
  } else if (tokenHash && type) {
    // OTP/"Confirm signup" flow (?token_hash=...&type=...) — Supabase sends
    // this template instead of the code-based one for some project/email
    // configurations, so both must be handled here.
    const result = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    error = result.error?.message ?? null;
  } else {
    error = "missing_code_or_token";
  }

  if (error) {
    // Surface the real reason instead of silently bouncing to /home and
    // letting the middleware redirect to /login with no explanation — a
    // used/expired/prefetched link is common (some email clients/security
    // scanners auto-visit links before the user clicks, burning the
    // single-use token) and needs to be visible to debug or to tell the user
    // to request a new link.
    return NextResponse.redirect(`${origin}/login?auth_error=${encodeURIComponent(error)}`);
  }

  return NextResponse.redirect(`${origin}/home`);
}
