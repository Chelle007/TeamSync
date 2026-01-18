import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createGoogleDoc, getDocumentLink, type AIResponseData } from '@/lib/google-docs'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { data, documentTitle, projectId } = body

    // Validate required fields
    if (!data || !data.script || !data.changes || !data.report_key) {
      return NextResponse.json(
        { error: 'Invalid data format. Required: script, changes, report_key' },
        { status: 400 }
      )
    }

    // If projectId is provided, verify user has access
    if (projectId) {
      const { data: projectAccess } = await supabase
        .from('project_user')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single()

      if (!projectAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Create the Google Doc
    const documentId = await createGoogleDoc(data as AIResponseData, documentTitle)
    const documentLink = await getDocumentLink(documentId)

    return NextResponse.json({
      success: true,
      documentId,
      documentLink,
      message: 'Google Doc created successfully',
    })
  } catch (error: any) {
    console.error('Error creating Google Doc:', error)
    
    // Provide helpful error messages
    if (error.message?.includes('Missing Google service account credentials')) {
      return NextResponse.json(
        { 
          error: 'Google service account not configured',
          details: 'Please set GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_PROJECT_ID environment variables'
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to create Google Doc',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}
