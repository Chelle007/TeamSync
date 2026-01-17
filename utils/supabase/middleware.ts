import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Protected routes - redirect to login if not authenticated
  if (!user) {
    // Allow access to login, auth callback, and public assets
    if (
      pathname === '/login' ||
      pathname.startsWith('/auth/') ||
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/api/') ||
      pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp)$/)
    ) {
      return supabaseResponse
    }
    // Redirect all other routes to login
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // User is authenticated - check role and redirect accordingly
  const userRole = user.user_metadata?.role || 'developer'
  const url = request.nextUrl.clone()

  // Skip redirect logic for API routes, static files, and auth routes
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/auth/') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp)$/)
  ) {
    return supabaseResponse
  }

  // If on login page and authenticated, redirect to dashboard
  if (pathname === '/login') {
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Allow developers to access any routes (project pages, etc.)
  // Only restrict reviewers from accessing developer dashboard root

  return supabaseResponse
}
