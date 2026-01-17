import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const role = searchParams.get('role') || 'developer'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Get the current user and update their metadata with the role
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Preserve existing metadata (like name from Google OAuth) and add/update role
        const currentMetadata = user.user_metadata || {}
        await supabase.auth.updateUser({
          data: { 
            ...currentMetadata,
            role: role,
            // Preserve Google name if available
            name: currentMetadata.name || currentMetadata.full_name || currentMetadata.name,
            full_name: currentMetadata.full_name || currentMetadata.name || currentMetadata.full_name
          }
        })
      }
      
      // Redirect to dashboard
      return NextResponse.redirect(`${origin}/`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
