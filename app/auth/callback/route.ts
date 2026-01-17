import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const role = searchParams.get('role') || 'developer'
  const verifyRepo = searchParams.get('verify_repo') === 'true'
  const redirectTo = searchParams.get('redirect_to')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // If there's a custom redirect, use it
      if (redirectTo) {
        return NextResponse.redirect(`${origin}${redirectTo}`)
      }
      
      // If this was a repo verification OAuth, redirect back to new project page
      if (verifyRepo) {
        return NextResponse.redirect(`${origin}/new`)
      }
      
      // Redirect to dashboard
      return NextResponse.redirect(`${origin}/`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
