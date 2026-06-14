import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** OAuth + email-confirm redirect target: exchange the code for a session. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Only honor a same-origin relative path — block open redirects like
  // `//evil.com`, `/\evil.com`, or an absolute URL smuggled through `next`.
  const rawNext = searchParams.get("next") ?? "/dashboard";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.startsWith("/\\")
      ? rawNext
      : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/signin?error=auth`);
}
