import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Refreshes the auth session on every request and gates /dashboard behind
 * a signed-in user. Unauthenticated dashboard hits redirect to /signin.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/signin";
    return NextResponse.redirect(url);
  }

  // 2FA enforcement: Supabase does NOT auto-challenge. If the user has a
  // verified factor (nextLevel aal2) but this session is only aal1 (e.g. they
  // just signed in with Google), force the TOTP challenge before the dashboard.
  if (user && pathname.startsWith("/dashboard")) {
    try {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal && aal.currentLevel === "aal1" && aal.nextLevel === "aal2") {
        const url = request.nextUrl.clone();
        url.pathname = "/auth/challenge";
        url.search = "";
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
      }
    } catch {
      // Don't hard-fail the app if the MFA lookup hiccups; the challenge page
      // is still reachable and sensitive server actions re-check separately.
    }
  }

  if (user && pathname === "/signin") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
