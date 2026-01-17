// GitHub API utilities

/**
 * Parse a GitHub repo URL to extract owner and repo name
 * Supports formats:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo.git
 * - github.com/owner/repo
 * - owner/repo
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  if (!url) return null

  // Clean up the URL
  let cleanUrl = url.trim()
  
  // Remove .git suffix if present
  cleanUrl = cleanUrl.replace(/\.git$/, "")
  
  // Try to match various formats
  const patterns = [
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/,
    /^github\.com\/([^/]+)\/([^/]+)\/?$/,
    /^([^/]+)\/([^/]+)$/,
  ]

  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern)
    if (match) {
      return { owner: match[1], repo: match[2] }
    }
  }

  return null
}

/**
 * Verify if the user has access to a GitHub repository
 * Uses the GitHub API to check if the authenticated user can access the repo
 */
export async function verifyGitHubRepoAccess(
  repoUrl: string,
  accessToken: string
): Promise<{ success: boolean; error?: string; repoData?: GitHubRepoData }> {
  const parsed = parseGitHubUrl(repoUrl)
  
  if (!parsed) {
    return { 
      success: false, 
      error: "Invalid GitHub repository URL. Please use format: https://github.com/owner/repo" 
    }
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    )

    if (response.status === 404) {
      return { 
        success: false, 
        error: "Repository not found. Make sure the repository exists and you have access to it." 
      }
    }

    if (response.status === 401) {
      return { 
        success: false, 
        error: "GitHub authentication expired. Please sign in again." 
      }
    }

    if (response.status === 403) {
      return { 
        success: false, 
        error: "You don't have access to this repository." 
      }
    }

    if (!response.ok) {
      return { 
        success: false, 
        error: "Failed to verify repository access. Please try again." 
      }
    }

    const repoData = await response.json() as GitHubRepoData
    
    return { 
      success: true, 
      repoData: {
        id: repoData.id,
        name: repoData.name,
        full_name: repoData.full_name,
        private: repoData.private,
        html_url: repoData.html_url,
        description: repoData.description,
        default_branch: repoData.default_branch,
      }
    }
  } catch {
    return { 
      success: false, 
      error: "Network error. Please check your connection and try again." 
    }
  }
}

export interface GitHubRepoData {
  id: number
  name: string
  full_name: string
  private: boolean
  html_url: string
  description: string | null
  default_branch: string
}
