import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC = ["/login"];
const ADMIN_ONLY = ["/sekolah", "/users", "/field-biodata"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const token = req.cookies.get("sinilai_session")?.value;
  const secret = process.env.AUTH_SECRET;
  if (!token || !secret) {
    const url = req.nextUrl.clone(); url.pathname = "/login"; url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    if (ADMIN_ONLY.some((p) => pathname.startsWith(p)) && payload.role !== "ADMIN") {
      const url = req.nextUrl.clone(); url.pathname = "/dashboard"; url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  } catch {
    const url = req.nextUrl.clone(); url.pathname = "/login"; url.search = "";
    const res = NextResponse.redirect(url);
    res.cookies.delete("sinilai_session");
    return res;
  }
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)"] };
