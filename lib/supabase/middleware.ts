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
  // FAIL CLOSED: if the assurance level can't be read (tuple error or thrown),
  // require the challenge rather than letting the dashboard render — the
  // challenge page sends users with no enrolled factor straight back, so a
  // 2FA-less account is never stranded by this.
  if (user && pathname.startsWith("/dashboard")) {
    let needsChallenge = false;
    try {
      const { data: aal, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      needsChallenge =
        Boolean(error) || (!!aal && aal.currentLevel === "aal1" && aal.nextLevel === "aal2");
    } catch {
      needsChallenge = true;
    }
    if (needsChallenge) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/challenge";
      url.search = "";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  if (user && pathname === "/signin") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
