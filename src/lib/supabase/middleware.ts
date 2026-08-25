import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { HOME_FOR_ROLE, type Role, type Status } from "@/lib/types";

const PUBLIC_PATHS = ["/login", "/register"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));

  if (!user) {
    if (isPublic) return response;
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single<{ role: Role; status: Status }>();

  // Signed in but not yet approved, or switched off by an admin.
  if (!profile || profile.status !== "active") {
    if (path === "/pending") return response;
    return NextResponse.redirect(new URL("/pending", request.url));
  }

  const home = HOME_FOR_ROLE[profile.role];

  if (isPublic || path === "/" || path === "/pending") {
    return NextResponse.redirect(new URL(home, request.url));
  }

  // Keep each role inside its own section.
  const section = "/" + path.split("/")[1];
  const owned = Object.values(HOME_FOR_ROLE);
  if (owned.includes(section) && section !== home) {
    return NextResponse.redirect(new URL(home, request.url));
  }

  return response;
}
