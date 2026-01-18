import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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

    const { data: rows } = await supabase
      .from("chatbot_messages")
      .select("id, role, content, created_at")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })

    return NextResponse.json({ messages: rows || [] })
  } catch (err) {
    console.error("Assistant GET error:", err)
    return NextResponse.json({ error: "Failed to load chat history" }, { status: 500 })
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
    const { content } = body as { content?: string }
    if (typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "content string is required" }, { status: 400 })
    }

    const trimmed = content.trim()

    // Fetch conversation history
    const { data: history } = await supabase
      .from("chatbot_messages")
      .select("role, content")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })

    const historyMessages = (history || []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))
    const messagesForOpenAI = [...historyMessages, { role: "user" as const, content: trimmed }]

    // Fetch full project
    const { data: project } = await supabase
      .from("projects")
      .select("name, summary, project_scope, github_url, live_url, status, progress, created_at, updated_at")
      .eq("id", projectId)
      .single()

    // Fetch updates (title, summary, status, doc_url, video_url, created_at)
    const { data: updates } = await supabase
      .from("updates")
      .select("title, summary, status, doc_url, video_url, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(50)

    // List document file names from storage
    const { data: files } = await supabase.storage
      .from("project-documents")
      .list(projectId, { limit: 100 })
    const documentNames = (files || [])
      .filter((f) => f.name && !f.name.startsWith("."))
      .map((f) => f.name)

    const projectName = project?.name || "This project"
    const summary = project?.summary || "(No summary set)"
    const projectScope = project?.project_scope || "(No project scope set)"
    const status = project?.status ?? "active"
    const progress = project?.progress ?? 0
    const githubUrl = project?.github_url || "(Not linked)"
    const liveUrl = project?.live_url || "(Not linked)"
    const createdStr = project?.created_at
      ? new Date(project.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "(Unknown)"
    const updatedStr = project?.updated_at
      ? new Date(project.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "(Unknown)"

    const updatesBlock =
      updates && updates.length > 0
        ? updates
            .map((u) => {
              let line = `- **${u.title}** (${u.status}): ${u.summary || "(no summary)"}`
              if (u.doc_url) line += ` [doc: ${u.doc_url}]`
              if (u.video_url) line += ` [video: ${u.video_url}]`
              return line + ` (${new Date(u.created_at).toLocaleDateString()})`
            })
            .join("\n")
        : "(No updates yet)"

    const filesBlock =
      documentNames.length > 0 ? documentNames.join(", ") : "(No related files uploaded)"

    const systemContent = `You are a helpful AI assistant for the project "${projectName}". Use ONLY the following project context to answer questions.

CRITICAL INSTRUCTIONS:
1. First, determine if you have sufficient context to answer the question from the provided project information below.
2. If you have context: Answer the question directly and naturally.
3. If you DON'T have context: Clearly state that you don't have that information in the available project context. Be helpful but honest about what you know.

## Project summary
${summary}

## Project scope
${projectScope}

## Project metadata
- **Status:** ${status}
- **Progress:** ${progress}%
- **GitHub:** ${githubUrl}
- **Live site:** ${liveUrl}
- **Created:** ${createdStr}
- **Last updated:** ${updatedStr}

## Related files (names only; you do not have file contents)
${filesBlock}

## Updates
${updatesBlock}

Answer the user's questions based on this context. Be concise and accurate. Always determine first whether you have the information needed to answer before responding.`

    // First, check if AI has context to answer the question
    console.log("[Assistant API] Checking context for question:", trimmed.substring(0, 50))
    const contextCheckCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: `You are analyzing whether sufficient context exists to answer a question about the project "${projectName}". 

Available context:
- Project summary: ${summary}
- Project scope: ${projectScope}
- Status: ${status}, Progress: ${progress}%
- Files: ${filesBlock}
- Updates: ${updatesBlock}

Determine if you have sufficient information in this context to answer the user's question. Respond with ONLY "YES" if you have enough context, or "NO" if you don't.` 
        },
        { role: "user", content: trimmed },
      ],
      max_tokens: 10,
      temperature: 0.3,
    })

    const contextCheck = contextCheckCompletion.choices[0]?.message?.content?.trim().toUpperCase()
    // Check if response is "YES" - anything else (NO, empty, error) means no context
    const hasContext = contextCheck === "YES"
    console.log("[Assistant API] Context check result:", { contextCheck, hasContext })

    // Now generate the full response based on context availability
    const apiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemContent },
      ...messagesForOpenAI.map((m) => ({ role: m.role, content: m.content })),
    ]

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: apiMessages,
      max_tokens: 1024,
      temperature: 0.6,
    })

    const assistantContent =
      completion.choices[0]?.message?.content ??
      "I couldn't generate a response. Please try again."

    // Get user role to determine who to ask if context is missing
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    const userRole = profile?.role || "reviewer"
    const otherSide = userRole === "developer" ? "reviewer" : "developer"

    // Double-check: if the response content indicates no context, override hasContext
    const responseIndicatesNoContext = assistantContent.toLowerCase().includes("don't have") ||
      assistantContent.toLowerCase().includes("do not have") ||
      assistantContent.toLowerCase().includes("don't know") ||
      assistantContent.toLowerCase().includes("do not know") ||
      assistantContent.toLowerCase().includes("not have this information") ||
      assistantContent.toLowerCase().includes("not available in") ||
      assistantContent.toLowerCase().includes("no information") ||
      assistantContent.toLowerCase().includes("cannot find") ||
      assistantContent.toLowerCase().includes("not found in") ||
      assistantContent.toLowerCase().includes("not in the available")
    
    // Final hasContext: false if either context check failed OR response indicates no context
    const finalHasContext = hasContext && !responseIndicatesNoContext

    // Persist user message and assistant reply
    await supabase.from("chatbot_messages").insert([
      { project_id: projectId, user_id: user.id, role: "user", content: trimmed },
      { project_id: projectId, user_id: user.id, role: "assistant", content: assistantContent },
    ])

    const responseData = {
      content: assistantContent,
      hasContext: finalHasContext,
      otherSide: finalHasContext ? undefined : otherSide,
    }
    console.log("[Assistant API] Returning response:", { 
      hasContext: responseData.hasContext, 
      otherSide: responseData.otherSide,
      contentPreview: responseData.content.substring(0, 50) 
    })

    return NextResponse.json(responseData)
  } catch (err) {
    console.error("Assistant POST error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to get assistant response" },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Delete all messages for this user and project
    const { error } = await supabase
      .from("chatbot_messages")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", user.id)

    if (error) {
      console.error("Assistant DELETE error:", error)
      return NextResponse.json({ error: "Failed to clear chat history" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Assistant DELETE error:", err)
    return NextResponse.json({ error: "Failed to clear chat history" }, { status: 500 })
  }
}
