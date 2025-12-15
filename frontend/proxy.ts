import { auth } from "@/auth";
import { NextResponse } from "next/server";

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  
  // Allow public access to all-apps page
  if (pathname === "/all-apps") {
    return NextResponse.next();
  }
  
  // Allow public access to public-apps API
  if (pathname.startsWith("/api/public-apps")) {
    return NextResponse.next();
  }
  
  // Allow public access to share pages (for clients to download)
  if (pathname.startsWith("/share/")) {
    return NextResponse.next();
  }
  
  // Allow public access to download API (for clients to download)
  if (pathname.startsWith("/api/download/")) {
    return NextResponse.next();
  }
  
  // Allow public access to share API (for clients to view share info)
  if (pathname.startsWith("/api/share/")) {
    return NextResponse.next();
  }
  
  // Allow access to login page and auth routes
  if (pathname === "/login" || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }
  
  // Protect all other routes - require authentication
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Match all paths except static files and _next
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
