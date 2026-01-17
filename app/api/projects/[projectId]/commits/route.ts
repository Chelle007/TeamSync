import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { parseGitHubUrl } from '@/lib/github'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = await params

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

    // Get project details to find GitHub URL
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('github_url')
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

    // Get user's GitHub token from session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.provider_token) {
      return NextResponse.json({ 
        error: 'GitHub authentication required. Please sign in with GitHub.' 
      }, { status: 401 })
    }

    // Fetch commits from GitHub API
    const commitsResponse = await fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits?per_page=30&sort=committer-date&order=desc`,
      {
        headers: {
          Authorization: `Bearer ${session.provider_token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    )

    if (commitsResponse.status === 404) {
      // Could be private repo without repo scope, or actually not found
      // Try to check if it's a private repo by checking the repo endpoint
      try {
        const repoCheckResponse = await fetch(
          `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
          {
            headers: {
              Authorization: `Bearer ${session.provider_token}`,
              Accept: 'application/vnd.github.v3+json',
            },
          }
        )
        
        // If we can access the repo but not commits, we need repo scope
        if (repoCheckResponse.ok) {
          const repoData = await repoCheckResponse.json()
          if (repoData.private) {
            return NextResponse.json({ 
              error: 'REPO_SCOPE_REQUIRED',
              message: 'This is a private repository. Please grant access to view commits.' 
            }, { status: 403 })
          }
        }
      } catch (checkError) {
        // If repo check fails, continue with not found error
        console.error('Error checking repo:', checkError)
      }
      
      // Return a more informative error
      return NextResponse.json({ 
        error: 'REPOSITORY_NOT_FOUND',
        message: 'Repository not found or you do not have access to it. If this is a private repository, please grant repository access.' 
      }, { status: 404 })
    }

    if (commitsResponse.status === 401 || commitsResponse.status === 403) {
      // If we get 403, check if it's because the repo is private and needs repo scope
      if (commitsResponse.status === 403) {
        const repoCheckResponse = await fetch(
          `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
          {
            headers: {
              Authorization: `Bearer ${session.provider_token}`,
              Accept: 'application/vnd.github.v3+json',
            },
          }
        )
        
        // If we can access the repo info but not commits, we need repo scope
        if (repoCheckResponse.ok) {
          const repoData = await repoCheckResponse.json()
          if (repoData.private) {
            return NextResponse.json({ 
              error: 'REPO_SCOPE_REQUIRED',
              message: 'This is a private repository. Please grant access to view commits.' 
            }, { status: 403 })
          }
        }
      }
      
      return NextResponse.json({ 
        error: 'GitHub authentication expired or insufficient permissions. Please sign in again.' 
      }, { status: 401 })
    }

    if (!commitsResponse.ok) {
      const errorText = await commitsResponse.text()
      console.error('GitHub API error:', errorText)
      return NextResponse.json({ 
        error: 'Failed to fetch commits from GitHub' 
      }, { status: 500 })
    }

    const commits = await commitsResponse.json()

    // Format commits for frontend
    const formattedCommits = commits.map((commit: any) => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: {
        name: commit.commit.author.name,
        email: commit.commit.author.email,
        avatar: commit.author?.avatar_url || null,
        login: commit.author?.login || null,
      },
      date: commit.commit.author.date,
      url: commit.html_url,
      stats: commit.stats || null,
    }))

    return NextResponse.json({ commits: formattedCommits })
  } catch (error) {
    console.error('Commits error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch commits' },
      { status: 500 }
    )
  }
}
