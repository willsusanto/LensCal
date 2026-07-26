import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getSafeRedirectPath } from "@/lib/navigation";
import { getSupabaseEnv } from "@/lib/supabase/env";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/api/health") {
    const response = NextResponse.next({ request });
    response.headers.set("X-LensCal-Origin", "next-proxy");
    return response;
  }

  let supabaseResponse = NextResponse.next({ request });
  const { supabaseUrl, supabaseKey } = getSupabaseEnv();

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh session. IMPORTANT: do not add logic between createServerClient and getUser.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicPath =
    pathname === "/login" ||
    pathname.startsWith("/auth/");

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", getSafeRedirectPath(`${pathname}${request.nextUrl.search}`));
    const response = NextResponse.redirect(url);
    response.headers.set("X-LensCal-Origin", "next-proxy");
    return response;
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    const response = NextResponse.redirect(url);
    response.headers.set("X-LensCal-Origin", "next-proxy");
    return response;
  }

  supabaseResponse.headers.set("X-LensCal-Origin", "next-proxy");
  return supabaseResponse;
}

export const config = {
  matcher: [
    // Skip Next.js internals and public files with extensions.
    "/((?!_next/static|_next/image|.*\\..*).*)",
  ],
};
