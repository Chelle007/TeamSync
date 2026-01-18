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

    // Get user's role to filter clarifications
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    const userRole = profile?.role || "reviewer"

    // Fetch clarifications where the user is either the asker or the target role
    const { data: clarifications, error } = await supabase
      .from("clarifications")
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
        asked_to_role,
        replied_by,
        replied_at
      `)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[Clarifications API] Error fetching clarifications:", {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      // Check if table doesn't exist
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        return NextResponse.json({ 
          error: "Clarifications table not found. Please run the database migration: create_clarifications_table.sql" 
        }, { status: 500 })
      }
      return NextResponse.json({ 
        error: error.message || "Failed to fetch clarifications",
        details: error.details || error.hint 
      }, { status: 500 })
    }

    // Filter: show clarifications where user asked OR where user is the target role
    const filteredClarifications = (clarifications || []).filter(
      (clarification) => 
        clarification.asked_by === user.id || 
        clarification.asked_to_role === userRole
    )

    // Fetch user profiles for asked_by and replied_by
    const userIds = new Set<string>()
    filteredClarifications.forEach((clar) => {
      if (clar.asked_by) userIds.add(clar.asked_by)
      if (clar.replied_by) userIds.add(clar.replied_by)
    })

    let usersMap: Record<string, { email?: string; full_name?: string; role?: string }> = {}
    if (userIds.size > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name, role")
        .in("id", Array.from(userIds))

      profiles?.forEach((profile) => {
        usersMap[profile.id] = {
          email: profile.email,
          full_name: profile.full_name,
          role: profile.role,
        }
      })
    }

    // Format response to match component expectations
    const formattedClarifications = filteredClarifications.map((clar) => {
      const askedByUser = usersMap[clar.asked_by]
      const isAsker = clar.asked_by === user.id
      const isTarget = clar.asked_to_role === userRole

      return {
        id: clar.id,
        question: clar.question,
        refinedQuestion: clar.refined_question || undefined,
        reason: clar.reason,
        createdAt: new Date(clar.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }),
        status: clar.status as "new" | "in_progress" | "replied",
        developerDraft: clar.developer_draft || undefined,
        developerReply: clar.developer_reply || undefined,
        askedBy: askedByUser?.full_name || askedByUser?.email || "User",
        askedByRole: askedByUser?.role || clar.asked_to_role === "developer" ? "reviewer" : "developer",
        askedToRole: clar.asked_to_role,
        isAsker,
        isTarget,
        canReply: isTarget && clar.status !== "replied",
      }
    })

    return NextResponse.json({ clarifications: formattedClarifications })
  } catch (err) {
    console.error("[Clarifications API] GET error:", err)
    const errorMessage = err instanceof Error ? err.message : "Failed to load clarifications"
    return NextResponse.json({ 
      error: errorMessage,
      details: err instanceof Error ? err.stack : undefined 
    }, { status: 500 })
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

    // Get user's role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    const userRole = profile?.role || "reviewer"
    const askedToRole = userRole === "developer" ? "reviewer" : "developer"

    const body = await request.json()
    const { question, reason, refinedQuestion } = body as {
      question?: string
      reason?: string
      refinedQuestion?: string
    }

    if (!question || !reason) {
      return NextResponse.json({ error: "question and reason are required" }, { status: 400 })
    }

    // Insert new clarification
    const { data: newClarification, error } = await supabase
      .from("clarifications")
      .insert({
        project_id: projectId,
        question: question.trim(),
        refined_question: refinedQuestion?.trim() || null,
        reason: reason.trim(),
        asked_by: user.id,
        asked_to_role: askedToRole,
        status: "new",
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating clarification:", error)
      return NextResponse.json({ error: "Failed to create clarification" }, { status: 500 })
    }

    return NextResponse.json({ clarification: newClarification })
  } catch (err) {
    console.error("Clarifications POST error:", err)
    return NextResponse.json({ error: "Failed to create clarification" }, { status: 500 })
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
    const { clarificationId, status, developerDraft, developerReply } = body as {
      clarificationId?: string
      status?: "new" | "in_progress" | "replied"
      developerDraft?: string
      developerReply?: string
    }

    if (!clarificationId) {
      return NextResponse.json({ error: "clarificationId is required" }, { status: 400 })
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

    const { data: updatedClarification, error } = await supabase
      .from("clarifications")
      .update(updateData)
      .eq("id", clarificationId)
      .eq("project_id", projectId)
      .select()
      .single()

    if (error) {
      console.error("Error updating clarification:", error)
      return NextResponse.json({ error: "Failed to update clarification" }, { status: 500 })
    }

    return NextResponse.json({ clarification: updatedClarification })
  } catch (err) {
    console.error("Clarifications PATCH error:", err)
    return NextResponse.json({ error: "Failed to update clarification" }, { status: 500 })
  }
}
