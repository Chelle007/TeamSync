import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { parseGitHubUrl } from '@/lib/github'
import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// GET: Fetch all updates for a project
export async function GET(
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

    // Fetch updates
    const { data: updates, error: updatesError } = await supabase
      .from('updates')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (updatesError) {
      console.error('Error fetching updates:', updatesError)
      return NextResponse.json({ error: 'Failed to fetch updates' }, { status: 500 })
    }

    return NextResponse.json({ updates: updates || [] })
  } catch (error) {
    console.error('Error in GET /api/projects/[projectId]/updates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Generate a new update from GitHub commits
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

    // Verify user is project owner
    const { data: projectAccess } = await supabase
      .from('project_user')
      .select('is_owner')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!projectAccess || !projectAccess.is_owner) {
      return NextResponse.json({ error: 'Only project owners can generate updates' }, { status: 403 })
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('github_url, summary, project_scope')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (!project.github_url) {
      return NextResponse.json({ error: 'No GitHub repository linked to this project' }, { status: 400 })
    }

    // Get existing updates to determine update number
    const { data: existingUpdates } = await supabase
      .from('updates')
      .select('id')
      .eq('project_id', projectId)

    const updateNumber = (existingUpdates?.length || 0) + 1

    // Parse GitHub URL
    const parsed = parseGitHubUrl(project.github_url)
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid GitHub URL format' }, { status: 400 })
    }

    // Get user's GitHub token
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.provider_token) {
      return NextResponse.json({ 
        error: 'GitHub authentication required. Please sign in with GitHub.' 
      }, { status: 401 })
    }

    // Fetch commits from GitHub
    let commits: any[] = []
    try {
      const commitsResponse = await fetch(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits?per_page=100&sort=committer-date&order=desc`,
        {
          headers: {
            Authorization: `Bearer ${session.provider_token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      )

      if (commitsResponse.ok) {
        const commitsData = await commitsResponse.json()
        // Handle both array and object responses
        if (Array.isArray(commitsData)) {
          commits = commitsData
        } else if (commitsData.commits && Array.isArray(commitsData.commits)) {
          commits = commitsData.commits
        } else {
          console.warn('Unexpected commits response format:', typeof commitsData)
          commits = []
        }
        console.log(`Successfully fetched ${commits.length} commits from GitHub`)
        if (commits.length > 0) {
          console.log('Sample commit:', JSON.stringify(commits[0], null, 2).substring(0, 200))
        }
      } else {
        const errorText = await commitsResponse.text()
        console.error('Failed to fetch commits:', commitsResponse.status, errorText)
        
        // If it's a 401/403, return an error instead of continuing silently
        if (commitsResponse.status === 401 || commitsResponse.status === 403) {
          return NextResponse.json({ 
            error: 'GitHub authentication expired or insufficient permissions. Please sign in again.' 
          }, { status: 401 })
        }
        
        // For other errors, log but continue - might be a private repo issue
        console.warn('Continuing without commits due to GitHub API error')
      }
    } catch (commitError) {
      console.error('Error fetching commits:', commitError)
      // Continue with empty commits array but log the error
    }

    // Format commits for AI context
    const commitsContext = commits.length > 0
      ? commits.slice(0, 50).map((commit: any) => ({
          message: commit.commit?.message || commit.message || 'No message',
          author: commit.commit?.author?.name || commit.author?.name || 'Unknown',
          date: commit.commit?.author?.date || commit.date || new Date().toISOString(),
          sha: (commit.sha || '').substring(0, 7),
        }))
      : []

    console.log(`Formatted ${commitsContext.length} commits for AI context`)

    // Prepare context for AI
    const commitsText = commitsContext.length > 0
      ? `Recent Commits (${commitsContext.length} total):\n${commitsContext.map(c => `- [${c.sha}] ${c.message} (${c.author}, ${new Date(c.date).toLocaleDateString()})`).join('\n')}`
      : 'No commits found in the repository. This might indicate the repository is empty or there was an error fetching commits.'

    const projectSummary = project.summary || 'No project summary available.'
    const projectScope = project.project_scope || 'No project scope available.'

    // Generate update using AI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a project management assistant that analyzes development progress and generates update summaries.

Your task is to:
1. Carefully analyze ALL GitHub commits provided - read each commit message to understand what work has been done
2. Compare the commits against the project scope to determine what features/requirements have been completed
3. Calculate the progress percentage (0-100%) based on how much of the project scope has been completed by analyzing the commits
4. Generate a comprehensive update summary that explains:
   - What work has been completed (based on the commits)
   - How it relates to the project scope
   - What progress percentage this represents
   - Key achievements and milestones

CRITICAL: If commits are provided in the user message, you MUST analyze them. Do NOT say "no code has been committed" or "0% progress" if commits are present. Even if commits seem minor, they represent progress and should be reflected in your analysis.

The update summary should be professional, clear, and informative. It should help reviewers understand what has been accomplished.

Return your response as JSON with:
- "summary": A detailed update summary (2-4 paragraphs) that references specific commits and their contributions
- "progress": A number between 0-100 representing the overall project progress percentage (must be > 0 if commits are present)
- "title": A concise title for this update (e.g., "Update 1: Initial Development Phase")`,
        },
        {
          role: 'user',
          content: `Generate Update ${updateNumber} for this project:

Project Summary:
${projectSummary}

Project Scope:
${projectScope}

${commitsText}

IMPORTANT: If commits are listed above, analyze them carefully to determine what work has been completed. Do NOT say "no code has been committed" if commits are present. Calculate progress based on how the commits relate to the project scope requirements.

Please analyze the commits and project scope to determine progress and generate a comprehensive update summary.`,
        },
      ],
      max_tokens: 1500,
      temperature: 0.7,
      response_format: { type: "json_object" },
    })

    let updateSummary = ''
    let progress = 0
    let updateTitle = `Update ${updateNumber}`

    try {
      const responseContent = completion.choices[0]?.message?.content || ''
      console.log('AI response received:', responseContent.substring(0, 200))
      const parsed = JSON.parse(responseContent)
      updateSummary = parsed.summary || ''
      progress = Math.min(100, Math.max(0, parseInt(String(parsed.progress)) || 0))
      updateTitle = parsed.title || `Update ${updateNumber}`
      console.log(`AI generated update: ${updateTitle}, Progress: ${progress}%`)
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError)
      console.error('Raw response:', completion.choices[0]?.message?.content)
      // Fallback summary - use commits if available
      if (commitsContext.length > 0) {
        updateSummary = `This update includes ${commitsContext.length} commits from the repository. Development work has been progressing according to the project scope. Key commits include: ${commitsContext.slice(0, 5).map(c => c.message.split('\n')[0]).join(', ')}.`
        // Estimate progress based on number of commits (rough heuristic)
        progress = Math.min(50, Math.max(5, commitsContext.length * 2))
      } else {
        updateSummary = 'Initial project setup and configuration.'
        progress = Math.min(10, updateNumber * 5)
      }
    }

    // Create the update in database
    const { data: newUpdate, error: insertError } = await supabase
      .from('updates')
      .insert({
        project_id: projectId,
        title: updateTitle,
        summary: updateSummary,
        status: 'completed',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating update:', insertError)
      return NextResponse.json({ error: 'Failed to create update' }, { status: 500 })
    }

    // Update project progress
    await supabase
      .from('projects')
      .update({ progress })
      .eq('id', projectId)

    return NextResponse.json({ 
      update: newUpdate,
      progress,
    })
  } catch (error) {
    console.error('Error in POST /api/projects/[projectId]/updates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
