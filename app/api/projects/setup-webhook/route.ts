import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { parseGitHubUrl } from '@/lib/github'

/**
 * Automatically create GitHub webhook for a project
 * POST /api/projects/setup-webhook
 */
export async function POST(request: Request) {
  try {
    const { projectId } = await request.json()

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's GitHub token
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.provider_token) {
      return NextResponse.json({ 
        error: 'GitHub authentication required. Please sign in with GitHub.' 
      }, { status: 401 })
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, github_url, webhook_secret')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (!project.github_url) {
      return NextResponse.json({ error: 'Project has no GitHub URL' }, { status: 400 })
    }

    if (!project.webhook_secret) {
      return NextResponse.json({ error: 'Project has no webhook secret' }, { status: 400 })
    }

    // Parse GitHub URL
    const parsed = parseGitHubUrl(project.github_url)
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid GitHub URL' }, { status: 400 })
    }

    // Get webhook URL
    const webhookUrl = process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/github`
      : 'http://localhost:3000/api/webhooks/github'

    // Check if webhook already exists
    const listWebhooksResponse = await fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/hooks`,
      {
        headers: {
          Authorization: `Bearer ${session.provider_token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    )

    if (!listWebhooksResponse.ok) {
      const errorText = await listWebhooksResponse.text()
      console.error('Failed to list webhooks:', errorText)
      return NextResponse.json({ 
        error: 'Failed to check existing webhooks. Make sure you have admin access to the repository.' 
      }, { status: listWebhooksResponse.status })
    }

    const existingWebhooks = await listWebhooksResponse.json()
    const existingWebhook = existingWebhooks.find((hook: any) => 
      hook.config?.url === webhookUrl
    )

    if (existingWebhook) {
      // Webhook already exists, update it
      const updateResponse = await fetch(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/hooks/${existingWebhook.id}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${session.provider_token}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            config: {
              url: webhookUrl,
              content_type: 'json',
              secret: project.webhook_secret,
              insecure_ssl: '0',
            },
            events: ['pull_request'],
            active: true,
          }),
        }
      )

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text()
        console.error('Failed to update webhook:', errorText)
        return NextResponse.json({ 
          error: 'Failed to update webhook. Make sure you have admin access to the repository.' 
        }, { status: updateResponse.status })
      }

      return NextResponse.json({ 
        success: true,
        message: 'Webhook updated successfully',
        webhookUrl,
        action: 'updated',
      })
    }

    // Create new webhook
    const createResponse = await fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/hooks`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.provider_token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'web',
          active: true,
          events: ['pull_request'],
          config: {
            url: webhookUrl,
            content_type: 'json',
            secret: project.webhook_secret,
            insecure_ssl: '0',
          },
        }),
      }
    )

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      console.error('Failed to create webhook:', errorText)
      
      // Parse error for better message
      let errorMessage = 'Failed to create webhook. Make sure you have admin access to the repository.'
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.message) {
          errorMessage = errorJson.message
        }
      } catch {}

      return NextResponse.json({ 
        error: errorMessage,
        details: errorText,
      }, { status: createResponse.status })
    }

    const webhook = await createResponse.json()

    return NextResponse.json({ 
      success: true,
      message: 'Webhook created successfully',
      webhookUrl,
      webhookId: webhook.id,
      action: 'created',
    })
  } catch (error) {
    console.error('Error setting up webhook:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to setup webhook' },
      { status: 500 }
    )
  }
}
