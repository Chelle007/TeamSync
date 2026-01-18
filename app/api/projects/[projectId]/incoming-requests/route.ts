import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

function checkProjectAccess(supabase: Awaited<ReturnType<typeof createClient>>, projectId: string, userId: string) {
  return supabase
    .from("project_user")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .single()
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { projectId } = await params
    const { data: access } = await checkProjectAccess(supabase, projectId, user.id)
    if (!access) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Fetch incoming requests for this project
    const { data: requests, error } = await supabase
      .from("incoming_requests")
      .select(`
        id,
        created_at,
        updated_at,
        question,
        refined_question,
        reason,
        status,
        developer_draft,
        developer_reply,
        asked_by,
        replied_by,
        replied_at
      `)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching incoming requests:", error)
      return NextResponse.json({ error: "Failed to fetch incoming requests" }, { status: 500 })
    }

    // Fetch user profiles for asked_by and replied_by
    const userIds = new Set<string>()
    requests?.forEach((req) => {
      if (req.asked_by) userIds.add(req.asked_by)
      if (req.replied_by) userIds.add(req.replied_by)
    })

    let usersMap: Record<string, { email?: string; full_name?: string }> = {}
    if (userIds.size > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", Array.from(userIds))

      profiles?.forEach((profile) => {
        usersMap[profile.id] = {
          email: profile.email,
          full_name: profile.full_name,
        }
      })
    }

    // Format response to match component expectations
    const formattedRequests = (requests || []).map((req) => ({
      id: req.id,
      from: "Reviewer" as const,
      question: req.question,
      refinedQuestion: req.refined_question || undefined,
      reason: req.reason,
      createdAt: new Date(req.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
      status: req.status as "new" | "in_progress" | "replied",
      developerDraft: req.developer_draft || undefined,
      developerReply: req.developer_reply || undefined,
      askedBy: usersMap[req.asked_by]?.full_name || usersMap[req.asked_by]?.email || "Reviewer",
    }))

    return NextResponse.json({ requests: formattedRequests })
  } catch (err) {
    console.error("Incoming requests GET error:", err)
    return NextResponse.json({ error: "Failed to load incoming requests" }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { projectId } = await params
    const { data: access } = await checkProjectAccess(supabase, projectId, user.id)
    if (!access) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const body = await request.json()
    const { question, reason, refinedQuestion } = body as {
      question?: string
      reason?: string
      refinedQuestion?: string
    }

    if (!question || !reason) {
      return NextResponse.json({ error: "question and reason are required" }, { status: 400 })
    }

    // Insert new incoming request
    const { data: newRequest, error } = await supabase
      .from("incoming_requests")
      .insert({
        project_id: projectId,
        question: question.trim(),
        refined_question: refinedQuestion?.trim() || null,
        reason: reason.trim(),
        asked_by: user.id,
        status: "new",
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating incoming request:", error)
      return NextResponse.json({ error: "Failed to create incoming request" }, { status: 500 })
    }

    return NextResponse.json({ request: newRequest })
  } catch (err) {
    console.error("Incoming requests POST error:", err)
    return NextResponse.json({ error: "Failed to create incoming request" }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { projectId } = await params
    const { data: access } = await checkProjectAccess(supabase, projectId, user.id)
    if (!access) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const body = await request.json()
    const { requestId, status, developerDraft, developerReply } = body as {
      requestId?: string
      status?: "new" | "in_progress" | "replied"
      developerDraft?: string
      developerReply?: string
    }

    if (!requestId) {
      return NextResponse.json({ error: "requestId is required" }, { status: 400 })
    }

    const updateData: {
      status?: string
      developer_draft?: string | null
      developer_reply?: string | null
      replied_by?: string | null
      replied_at?: string | null
    } = {}

    if (status !== undefined) {
      updateData.status = status
    }
    if (developerDraft !== undefined) {
      updateData.developer_draft = developerDraft || null
    }
    if (developerReply !== undefined) {
      updateData.developer_reply = developerReply || null
      if (developerReply) {
        updateData.replied_by = user.id
        updateData.replied_at = new Date().toISOString()
      }
    }

    const { data: updatedRequest, error } = await supabase
      .from("incoming_requests")
      .update(updateData)
      .eq("id", requestId)
      .eq("project_id", projectId)
      .select()
      .single()

    if (error) {
      console.error("Error updating incoming request:", error)
      return NextResponse.json({ error: "Failed to update incoming request" }, { status: 500 })
    }

    return NextResponse.json({ request: updatedRequest })
  } catch (err) {
    console.error("Incoming requests PATCH error:", err)
    return NextResponse.json({ error: "Failed to update incoming request" }, { status: 500 })
  }
}
