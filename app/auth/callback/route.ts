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
      // Get the current user and update their metadata with the role
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // After OAuth login, user.user_metadata is merged with OAuth provider's data
        // Supabase merges metadata, so custom_name should persist if it exists
        const currentMetadata = user.user_metadata || {}
        
        // Check if user has a custom name that should be preserved
        const hasCustomName = currentMetadata.name_customized === true
        const customName = currentMetadata.custom_name
        
        // Determine which name to use: custom name takes priority over OAuth name
        let nameToUse: string
        if (hasCustomName && customName) {
          // User has customized their name, preserve it
          nameToUse = customName
        } else {
          // Use OAuth provider's name (first login or name not customized)
          nameToUse = currentMetadata.name || currentMetadata.full_name || user.email?.split("@")[0] || "User"
        }
        
        // Update metadata, preserving custom name if it exists
        await supabase.auth.updateUser({
          data: { 
            ...currentMetadata, // Preserve all existing metadata
            role: role,
            // Set name fields
            name: nameToUse,
            full_name: nameToUse,
            // Preserve customization flag and custom name if they exist
            ...(hasCustomName && customName ? {
              name_customized: true,
              custom_name: customName
            } : {})
          }
        })
      }
      
      // Handle redirects
      // If there's a custom redirect, use it
      if (redirectTo) {
        return NextResponse.redirect(`${origin}${redirectTo}`)
      }
      
      // If this was a repo verification OAuth, redirect back to new project page
      if (verifyRepo) {
        return NextResponse.redirect(`${origin}/new`)
      }
      
      // Redirect based on role (default behavior)
      if (role === 'developer') {
        return NextResponse.redirect(`${origin}/`)
      } else {
        return NextResponse.redirect(`${origin}/demo-project`)
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
