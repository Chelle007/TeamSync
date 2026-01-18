import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/service'
import { NextResponse } from 'next/server'
import { parseGitHubUrl } from '@/lib/github'
import { storeWebhookEvent, triggerVideoGeneration, getProjectOwnerGitHubToken } from '@/lib/webhook-processor'

/**
 * Process existing commits from the main branch and create an initial update
 * POST /api/projects/[projectId]/process-existing-commits
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const supabase = await createClient()
    const { projectId } = await params

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has access to this project
    const { data: projectAccess } = await supabase
      .from('project_user')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!projectAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, github_url, live_url')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (!project.github_url) {
      return NextResponse.json({ error: 'No GitHub repository linked to this project' }, { status: 400 })
    }

    // Parse GitHub URL
    const parsed = parseGitHubUrl(project.github_url)
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid GitHub URL format' }, { status: 400 })
    }

    // Get GitHub token
    const { data: { session } } = await supabase.auth.getSession()
    const githubToken = await getProjectOwnerGitHubToken(projectId) || session?.provider_token

    if (!githubToken) {
      return NextResponse.json({ 
        error: 'GitHub authentication required. Please sign in with GitHub.' 
      }, { status: 401 })
    }

    console.log(`🔄 Processing existing commits for project: ${project.name}`)
    console.log(`   Repository: ${parsed.owner}/${parsed.repo}`)

    // First, get the repository info to find the default branch
    const repoResponse = await fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    )

    if (!repoResponse.ok) {
      const errorText = await repoResponse.text()
      console.error('Failed to fetch repo info:', errorText)
      return NextResponse.json({ 
        error: 'Failed to fetch repository information. Make sure the repository exists and you have access.' 
      }, { status: repoResponse.status })
    }

    const repoData = await repoResponse.json()
    const defaultBranch = repoData.default_branch || 'main'
    console.log(`   Default branch: ${defaultBranch}`)

    // Fetch ALL commits from default branch (with pagination)
    console.log('   Fetching all commits (this may take a moment)...')
    let allCommits: any[] = []
    let page = 1
    const perPage = 100 // GitHub's max per page
    let hasMore = true

    while (hasMore) {
      const commitsResponse = await fetch(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits?sha=${defaultBranch}&per_page=${perPage}&page=${page}&sort=committer-date&order=desc`,
        {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      )

      if (!commitsResponse.ok) {
        const errorText = await commitsResponse.text()
        console.error('Failed to fetch commits:', errorText)
        return NextResponse.json({ 
          error: 'Failed to fetch commits from GitHub. Make sure the repository exists and you have access.' 
        }, { status: commitsResponse.status })
      }

      const commits = await commitsResponse.json()
      
      if (!commits || commits.length === 0) {
        hasMore = false
        break
      }

      allCommits = allCommits.concat(commits)
      console.log(`   Fetched page ${page}: ${commits.length} commits (total: ${allCommits.length})`)

      // Check if there are more pages
      const linkHeader = commitsResponse.headers.get('link')
      hasMore = commits.length === perPage && (linkHeader?.includes('rel="next"') ?? false)
      page++
    }
    
    if (allCommits.length === 0) {
      return NextResponse.json({ 
        error: 'No commits found in the default branch' 
      }, { status: 400 })
    }

    console.log(`   ✅ Found ${allCommits.length} total commits`)
    const commits = allCommits

    // Get the diff for the most recent commit
    const latestCommit = commits[0]
    const commitSha = latestCommit.sha

    // Fetch the commit diff
    const commitResponse = await fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits/${commitSha}`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3.diff',
        },
      }
    )

    let diff = ''
    if (commitResponse.ok) {
      diff = await commitResponse.text()
    } else {
      console.warn('Could not fetch commit diff, continuing without it')
    }

    // Extract commit messages
    const commitMessages = commits.map((c: any) => c.commit.message)

    // Create a synthetic webhook payload similar to PR merge
    const syntheticPayload = {
      event_info: {
        repository: `${parsed.owner}/${parsed.repo}`,
        pr_number: 0, // Use 0 to indicate this is from existing commits
        merged_by: latestCommit.committer?.login || latestCommit.commit.committer.name || 'unknown',
        timestamp: latestCommit.commit.committer.date || new Date().toISOString(),
      },
      high_level: {
        title: `Initial Update: ${commits.length} commit${commits.length > 1 ? 's' : ''} from ${defaultBranch} branch`,
        body: `Processing existing commits from the ${defaultBranch} branch.\n\nCommits:\n${commitMessages.map((msg: string, i: number) => `${i + 1}. ${msg}`).join('\n')}`,
      },
      raw_commits: commitMessages,
      raw_diff: diff,
    }

    console.log('   Creating synthetic webhook event...')

    // Store webhook event
    const webhookEvent = await storeWebhookEvent({
      projectId: project.id,
      eventType: 'initial_commits',
      prNumber: 0,
      prTitle: syntheticPayload.high_level.title,
      prBody: syntheticPayload.high_level.body,
      mergedBy: syntheticPayload.event_info.merged_by,
      mergedAt: syntheticPayload.event_info.timestamp,
      rawPayload: syntheticPayload,
    })

    if (!webhookEvent) {
      console.error('Failed to store webhook event')
      return NextResponse.json({ 
        error: 'Failed to create webhook event' 
      }, { status: 500 })
    }

    console.log(`   ✅ Webhook event created: ${webhookEvent.id}`)

    // Create a pending update immediately so users can see progress
    // Use service client to bypass RLS (same as generate-video route)
    console.log('   💾 Creating pending update...')
    const serviceSupabase = createServiceClient()
    const { data: update, error: updateError } = await serviceSupabase
      .from('updates')
      .insert({
        project_id: project.id,
        webhook_event_id: webhookEvent.id,
        title: syntheticPayload.high_level.title,
        summary: `Processing ${commits.length} commit${commits.length > 1 ? 's' : ''} from ${defaultBranch} branch...`,
        status: 'processing',
      })
      .select()
      .single()

    if (updateError) {
      console.error('Error creating pending update:', updateError)
      // Don't fail the whole process, but log the error
    } else {
      console.log(`   ✅ Pending update created: ${update.id}`)
    }

    // Trigger video generation asynchronously
    console.log('   🎬 Triggering video generation...')
    triggerVideoGeneration(project.id, webhookEvent.id)
    console.log('   ✅ Video generation queued')

    return NextResponse.json({
      success: true,
      message: `Processing ${commits.length} existing commit${commits.length > 1 ? 's' : ''} from ${defaultBranch} branch`,
      webhook_event: {
        id: webhookEvent.id,
        pr_number: 0,
        pr_title: syntheticPayload.high_level.title,
      },
      update: update ? {
        id: update.id,
        title: update.title,
        status: update.status,
      } : null,
      commits_processed: commits.length,
      branch: defaultBranch,
    })
  } catch (error) {
    console.error('Error processing existing commits:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to process existing commits',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
