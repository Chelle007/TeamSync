import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

type RouteContext = {
  params: Promise<{ projectId: string }>
}

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const supabase = await createClient()
    
    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = await context.params

    // Get project with webhook secret
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, webhook_secret')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Generate webhook URL
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/github`

    return NextResponse.json({
      webhookUrl,
      webhookSecret: project.webhook_secret,
      projectId: project.id,
    })
  } catch (error) {
    console.error('Get webhook config error:', error)
    return NextResponse.json(
      { error: 'Failed to get webhook configuration' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const supabase = await createClient()
    
    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = await context.params

    // Regenerate webhook secret
    const { data: newSecret, error: regenerateError } = await supabase
      .rpc('regenerate_webhook_secret', { p_project_id: projectId })

    if (regenerateError) {
      console.error('Regenerate error:', regenerateError)
      return NextResponse.json(
        { error: regenerateError.message || 'Failed to regenerate webhook secret' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      webhookSecret: newSecret,
      message: 'Webhook secret regenerated successfully',
    })
  } catch (error) {
    console.error('Regenerate webhook secret error:', error)
    return NextResponse.json(
      { error: 'Failed to regenerate webhook secret' },
      { status: 500 }
    )
  }
}
