import { NextResponse, type NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

const PUBLIC_PATHS = new Set<string>([
  "/auth",
  "/api/auth",
  "/favicon.ico",
])

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow NextAuth and static paths
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/static/") ||
    pathname.match(/\.(.*)$/)
  ) {
    return NextResponse.next()
  }

  // Allow GET requests to /api/story (viewing stories)
  if (pathname.startsWith("/api/story") && request.method === "GET") {
    // For /api/story/marketplace/me, require authentication
    if (pathname === "/api/story/marketplace/me") {
      const token = await getToken({ req: request })
      if (!token) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        )
      }
    }
    return NextResponse.next()
  }

  // Allow visiting /auth if unauthenticated
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next()
  }

  const token = await getToken({ req: request })
  if (!token) {
    const url = new URL("/auth", request.url)
    url.searchParams.set("from", pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
}


