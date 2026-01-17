import { createClient } from "@/utils/supabase/server";

/**
 * Extract owner and repo from GitHub URL
 * Examples:
 * - "https://github.com/owner/repo" -> { owner: "owner", repo: "repo" }
 * - "https://github.com/owner/repo.git" -> { owner: "owner", repo: "repo" }
 */
export function parseGitHubRepoUrl(
  url: string,
): { owner: string; repo: string } | null {
  try {
    const match = url.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)(\.git)?/);
    if (!match) return null;
    return {
      owner: match[1],
      repo: match[2],
    };
  } catch {
    return null;
  }
}

/**
 * Find project by matching repository URL
 */
export async function findProjectByRepo(repoFullName: string) {
  const supabase = await createClient();

  // Get all projects with github_url
  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, name, github_url, webhook_secret")
    .not("github_url", "is", null);

  if (error || !projects) {
    console.error("Error fetching projects:", error);
    return null;
  }

  // Find matching project
  for (const project of projects) {
    if (!project.github_url) continue;

    const parsed = parseGitHubRepoUrl(project.github_url);
    if (!parsed) continue;

    const projectRepoFullName = `${parsed.owner}/${parsed.repo}`;
    if (projectRepoFullName.toLowerCase() === repoFullName.toLowerCase()) {
      return project;
    }
  }

  return null;
}

/**
 * Get user's GitHub token from their profile
 */
export async function getUserGitHubToken(userId: string) {
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("github_access_token")
    .eq("id", userId)
    .single();

  if (error || !profile?.github_access_token) {
    return null;
  }

  return profile.github_access_token;
}

/**
 * Get project owner's GitHub token
 */
export async function getProjectOwnerGitHubToken(projectId: string) {
  const supabase = await createClient();

  // Find project owner
  const { data: projectUser, error: projectUserError } = await supabase
    .from("project_user")
    .select("user_id")
    .eq("project_id", projectId)
    .eq("is_owner", true)
    .single();

  if (projectUserError || !projectUser) {
    console.error("Error finding project owner:", projectUserError);
    return null;
  }

  // Get owner's GitHub token
  return getUserGitHubToken(projectUser.user_id);
}

/**
 * Store webhook event in database
 */
export async function storeWebhookEvent(data: {
  projectId: string;
  eventType: string;
  prNumber: number;
  prTitle: string;
  prBody: string;
  mergedBy: string;
  mergedAt: string;
  rawPayload: any;
}) {
  const supabase = await createClient();

  const { data: event, error } = await supabase
    .from("webhook_events")
    .insert({
      project_id: data.projectId,
      event_type: data.eventType,
      pr_number: data.prNumber,
      pr_title: data.prTitle,
      pr_body: data.prBody,
      merged_by: data.mergedBy,
      merged_at: data.mergedAt,
      raw_payload: data.rawPayload,
      processing_status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("Error storing webhook event:", error);
    return null;
  }

  return event;
}

/**
 * Update webhook event status
 */
export async function updateWebhookEventStatus(
  eventId: string,
  status: "pending" | "processing" | "completed" | "failed",
  errorMessage?: string,
) {
  const supabase = await createClient();

  const updateData: any = {
    processing_status: status,
  };

  if (errorMessage) {
    updateData.error_message = errorMessage;
  }

  const { error } = await supabase
    .from("webhook_events")
    .update(updateData)
    .eq("id", eventId);

  if (error) {
    console.error("Error updating webhook event status:", error);
  }
}

/**
 * Trigger video generation asynchronously (fire and forget)
 */
export async function triggerVideoGeneration(
  projectId: string,
  webhookEventId: string,
) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // Fire and forget - don't await
  fetch(`${baseUrl}/api/projects/${projectId}/generate-video`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ webhookEventId }),
  }).catch((error) => {
    console.error("Error triggering video generation:", error);
  });
}
