"use client"

import { useEffect, useState, useRef, type ReactNode } from "react"
import { TabsContent } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { Eye, Loader2, MessageSquare, Pencil, Send, Sparkles, Trash2 } from "lucide-react"
import type { Update } from "@/types/database"

// ============================================================================
// Types
// ============================================================================

type PendingItem = {
  id: string
  question: string
  createdAt: string
  status: "draft" | "waiting_for_developer" | "answered"
  reason: string
  originalQuestion: string
  refinedQuestion?: string
  askedBy: "Reviewer"
  developerReply?: string
}

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
  actions?: "escalate" | "clarify" | "none"
  pendingQuestion?: string
  pendingReason?: string
  needsClarification?: boolean
  otherSide?: "developer" | "reviewer"
}

type Clarification = {
  id: string
  question: string
  refinedQuestion?: string
  reason: string
  createdAt: string
  status: "new" | "in_progress" | "replied" | "draft" | "waiting_for_developer" | "answered"
  developerDraft?: string
  developerReply?: string
  askedBy: string
  askedByRole: "developer" | "reviewer"
  askedToRole: "developer" | "reviewer"
  isAsker: boolean
  isTarget: boolean
  canReply: boolean
}

type DraftClarification = {
  id: string
  question: string
  refinedQuestion?: string
  reason: string
  createdAt: string
  status: "draft"
  askedToRole: "developer" | "reviewer"
}

type AssistantTabProps = {
  projectId: string
  isDeveloperView: boolean
  projectDetails: {
    name: string
    description: string
    progress: number
    status: "active" | "completed" | "paused"
    overview: string
    projectScope: string | null
    timeline: string
    nextMilestone: string
  }
  updates: Update[]
}

// ============================================================================
// Constants & Helpers
// ============================================================================

const ESCALATION_KEYWORDS = ["fastest way", "timeline", "estimate", "how long", "architecture"]

const STATUS_CONFIG = {
  draft: { label: "Draft", style: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800" },
  waiting_for_developer: { label: "Waiting for Developer", style: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800" },
  waiting_for_reviewer: { label: "Waiting for Reviewer", style: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800" },
  answered: { label: "Answered", style: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800" },
} as const

const formatTimestamp = (iso: string): string => {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60_000) return "Just now"
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday, " + d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) + ", " + d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

const getStatusKey = (status: string, isDev: boolean): keyof typeof STATUS_CONFIG => {
  if (status === "draft") return "draft"
  if (status === "answered" || status === "replied") return "answered"
  return isDev ? "waiting_for_reviewer" : "waiting_for_developer"
}

// ============================================================================
// Reusable Components
// ============================================================================

const Modal = ({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-in fade-in-0">
    <div className="w-full max-w-lg rounded-2xl border border-border/40 bg-gradient-to-br from-card/98 to-card/95 backdrop-blur-xl p-6 shadow-2xl animate-in zoom-in-95">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/30">
        <h4 className="text-lg font-semibold">{title}</h4>
        <Button size="sm" variant="ghost" onClick={onClose} className="size-8 p-0 hover:bg-muted/60">✕</Button>
      </div>
      {children}
    </div>
  </div>
)

const StatusBadge = ({ status, isDev = false }: { status: string; isDev?: boolean }) => {
  const key = getStatusKey(status, isDev)
  const { label, style } = STATUS_CONFIG[key]
  // Updated: Added inline-flex and items-center for better vertical alignment
  return <span className={cn("inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-md border whitespace-nowrap", style)}>{label}</span>
}

const MarkdownContent = ({ content }: { content: string }) => {
  const parts: (string | { bold: string })[] = []
  const re = /\*\*(.+?)\*\*/g
  let lastEnd = 0, m
  while ((m = re.exec(content)) !== null) {
    if (m.index > lastEnd) parts.push(content.slice(lastEnd, m.index))
    parts.push({ bold: m[1] })
    lastEnd = re.lastIndex
  }
  if (lastEnd < content.length) parts.push(content.slice(lastEnd))
  return <span className="whitespace-pre-wrap">{parts.map((p, i) => typeof p === "string" ? p : <strong key={i}>{p.bold}</strong>)}</span>
}

const EmptyState = ({ icon: Icon, title, subtitle }: { icon: typeof MessageSquare; title: string; subtitle: string }) => (
  <div className="flex flex-col items-center justify-center h-full py-12 text-center">
    <div className="size-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
      <Icon className="size-8 text-slate-400 dark:text-slate-500" />
    </div>
    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{title}</p>
    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>
  </div>
)

const CardActions = ({ children }: { children: ReactNode }) => (
  <div className="flex items-center gap-2 pt-3 border-t border-border/30">{children}</div>
)

const IconBtn = ({ icon: Icon, onClick, variant = "default", label }: { icon: typeof Eye; onClick: () => void; variant?: "default" | "danger"; label: string }) => (
  <Button
    size="icon"
    variant="ghost"
    className={cn("size-10 rounded-lg transition-colors", variant === "danger" ? "hover:bg-red-50 dark:hover:bg-red-950/30" : "hover:bg-slate-100 dark:hover:bg-slate-800")}
    onClick={onClick}
    aria-label={label}
  >
    <Icon className={cn("size-4 text-slate-500", variant === "danger" && "hover:text-red-500")} />
  </Button>
)

const ClarificationCard = ({ question, reason, status, isDev, meta, actions }: {
  question: string
  reason: string
  status: string
  isDev: boolean
  meta?: ReactNode
  actions: ReactNode
}) => (
  <div className="rounded-2xl bg-gradient-to-br from-muted/70 to-muted/50 border border-border/40 hover:border-border/60 hover:shadow-md transition-all p-5 space-y-3">
    <div className="space-y-3">
      {/* Updated: Nested div to group Badge and Question closer together */}
      <div className="space-y-1.5">
        <StatusBadge status={status} isDev={isDev} />
        <p className="text-[15px] font-semibold leading-relaxed text-slate-900 dark:text-slate-100">{question}</p>
      </div>
      <p className="text-sm text-slate-500 leading-relaxed dark:text-slate-400">{reason}</p>
      {meta}
    </div>
    <CardActions>{actions}</CardActions>
  </div>
)

const ChatBubble = ({ message, onAction }: { message: ChatMessage; onAction?: (send: boolean, msg: ChatMessage) => void }) => (
  <div className={cn("flex animate-in fade-in-0 slide-in-from-bottom-2", message.role === "user" ? "justify-end" : "justify-start")}>
    <div className={cn(
      "max-w-[80%] rounded-2xl px-4 py-3 text-sm space-y-2 shadow-sm",
      message.role === "user"
        ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-sm shadow-md shadow-primary/20"
        : "bg-gradient-to-br from-muted/70 to-muted/50 border border-border/40 rounded-bl-sm"
    )}>
      <p className="leading-relaxed">{message.role === "assistant" ? <MarkdownContent content={message.content} /> : message.content}</p>
      {onAction && (message.actions === "escalate" || message.actions === "clarify") && (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" className="h-7 text-xs font-medium" onClick={() => onAction(true, message)}>
            {message.actions === "clarify" ? `Yes, ask ${message.otherSide}` : "Yes, send"}
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs font-medium" onClick={() => onAction(false, message)}>No</Button>
        </div>
      )}
      <span className="text-[10px] opacity-70 block">{message.timestamp}</span>
    </div>
  </div>
)

const ChatInput = ({ value, onChange, onSend, isLoading, placeholder }: {
  value: string
  onChange: (v: string) => void
  onSend: () => void
  isLoading: boolean
  placeholder: string
}) => (
  <div className="border-t pt-4 shrink-0">
    <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-gradient-to-br from-background/80 to-background/60 backdrop-blur-sm px-3.5 py-3 shadow-sm focus-within:ring-2 focus-within:ring-primary/30 transition-all">
      <MessageSquare className="size-4 text-muted-foreground/70 shrink-0" />
      <Input
        className="border-0 bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground/60 text-sm"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), onSend())}
        disabled={isLoading}
      />
      <Button size="sm" onClick={onSend} disabled={isLoading || !value.trim()} className="size-8 p-0 shrink-0 shadow-sm hover:shadow">
        <Send className="size-4" />
      </Button>
    </div>
  </div>
)

// ============================================================================
// Main Component
// ============================================================================

export function AssistantTab({ isDeveloperView, projectId }: AssistantTabProps) {
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(true)
  const [inputValue, setInputValue] = useState("")
  const [clarifications, setClarifications] = useState<Clarification[]>([])
  const [draftClarifications, setDraftClarifications] = useState<DraftClarification[]>([])
  const [isLoadingClarifications, setIsLoadingClarifications] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isRewriting, setIsRewriting] = useState(false)
  
  // Modal states
  const [viewModal, setViewModal] = useState<{ type: "pending" | "draft" | "clarification"; item: PendingItem | DraftClarification | Clarification } | null>(null)
  const [refineModal, setRefineModal] = useState<{ type: "pending" | "draft"; item: PendingItem | DraftClarification; text: string } | null>(null)
  const [replyModal, setReplyModal] = useState<{ item: Clarification; text: string; original: string } | null>(null)
  const [confirmModal, setConfirmModal] = useState<{ item: PendingItem; step: 1 | 2 } | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load chat history
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setIsHistoryLoading(true)
      try {
        const res = await fetch(`/api/projects/${projectId}/assistant`)
        const data = await res.json()
        if (cancelled || !res.ok) return
        setMessages((data.messages || []).map((m: { id: string; role: string; content: string; created_at: string }) => ({
          id: m.id, role: m.role as "user" | "assistant", content: m.content, timestamp: formatTimestamp(m.created_at)
        })))
      } finally { if (!cancelled) setIsHistoryLoading(false) }
    })()
    return () => { cancelled = true }
  }, [projectId])

  // Load clarifications
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setIsLoadingClarifications(true)
      try {
        const res = await fetch(`/api/projects/${projectId}/clarifications`)
        const data = await res.json()
        if (cancelled || !res.ok) return
        setClarifications(data.clarifications || [])
      } finally { if (!cancelled) setIsLoadingClarifications(false) }
    })()
    return () => { cancelled = true }
  }, [projectId])

  // Auto-scroll
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  const addMessage = (msg: ChatMessage) => setMessages(prev => [...prev, msg])

  // Handle sending messages
  const handleSend = async () => {
    const trimmed = inputValue.trim()
    if (!trimmed || isLoading) return

    addMessage({ id: `user-${Date.now()}`, role: "user", content: trimmed, timestamp: "Just now" })
    setInputValue("")

    // Check for escalation keywords (reviewer only)
    if (!isDeveloperView && ESCALATION_KEYWORDS.some(k => trimmed.toLowerCase().includes(k))) {
      addMessage({
        id: `assistant-${Date.now()}`, role: "assistant", timestamp: "Just now",
        content: "This looks like it needs developer input and isn't documented yet. Do you want to send this to Pending Review?",
        actions: "escalate", pendingQuestion: trimmed, pendingReason: "Requires developer input / not in available docs."
      })
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/assistant`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: trimmed })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to get response")

      const noContext = !data.hasContext || /don't have|do not have|don't know|not available|no information|cannot find/i.test(data.content || "")
      
      if (noContext && data.otherSide) {
        addMessage({
          id: `assistant-${Date.now()}`, role: "assistant", timestamp: "Just now",
          content: `I don't have this information, would you like to ask the ${data.otherSide}?`,
          actions: "clarify", pendingQuestion: trimmed, pendingReason: "AI assistant doesn't have this information.", needsClarification: true, otherSide: data.otherSide
        })
      } else {
        addMessage({ id: `assistant-${Date.now()}`, role: "assistant", content: data.content ?? "I couldn't generate a response.", timestamp: "Just now" })
      }
    } catch (err) {
      addMessage({ id: `assistant-${Date.now()}`, role: "assistant", content: err instanceof Error ? err.message : "Something went wrong.", timestamp: "Just now" })
    } finally { setIsLoading(false) }
  }

  // Handle action decisions
  const handleAction = async (send: boolean, message: ChatMessage) => {
    if (!send) {
      addMessage({ id: `assistant-${Date.now()}`, role: "assistant", content: "Okay — ask another question or add more context.", timestamp: "Just now" })
      return
    }

    if (message.actions === "escalate") {
      setPendingItems(prev => [{ id: `pending-${Date.now()}`, question: message.pendingQuestion!, createdAt: "Just now", status: "draft", reason: message.pendingReason!, originalQuestion: message.pendingQuestion!, askedBy: "Reviewer" }, ...prev])
      addMessage({ id: `assistant-${Date.now()}`, role: "assistant", content: "Added to Pending Review. You can refine it before sending to the developer.", timestamp: "Just now" })
    } else if (message.actions === "clarify" && message.pendingQuestion && message.otherSide) {
      setDraftClarifications(prev => [{ id: `draft-${Date.now()}`, question: message.pendingQuestion!, reason: message.pendingReason!, createdAt: "Just now", status: "draft", askedToRole: message.otherSide! }, ...prev])
      addMessage({ id: `assistant-${Date.now()}`, role: "assistant", content: `Added to **Clarification** as draft. You can refine it before sending to the ${message.otherSide}.`, timestamp: "Just now" })
    }
  }

  // Draft clarification handlers
  const handleSendDraft = async (draft: DraftClarification) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/clarifications`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: draft.refinedQuestion || draft.question, refinedQuestion: draft.refinedQuestion, reason: draft.reason })
      })
      if (!res.ok) throw new Error((await res.json()).error || "Failed")
      setDraftClarifications(prev => prev.filter(d => d.id !== draft.id))
      const updated = await fetch(`/api/projects/${projectId}/clarifications`)
      if (updated.ok) setClarifications((await updated.json()).clarifications || [])
      addMessage({ id: `assistant-${Date.now()}`, role: "assistant", content: `Clarification sent to ${draft.askedToRole}.`, timestamp: "Just now" })
    } catch (err) {
      addMessage({ id: `assistant-${Date.now()}`, role: "assistant", content: err instanceof Error ? err.message : "Failed to send.", timestamp: "Just now" })
    }
  }

  // Reply handlers
  const handleReplyOpen = async (c: Clarification) => {
    if (c.status === "new") {
      try {
        await fetch(`/api/projects/${projectId}/clarifications`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clarificationId: c.id, status: "in_progress" }) })
        setClarifications(prev => prev.map(item => item.id === c.id ? { ...item, status: "in_progress" } : item))
      } catch {}
    }
    setReplyModal({ item: c, text: c.developerDraft || "", original: "" })
  }

  const handleSendReply = async () => {
    if (!replyModal?.text.trim()) return
    try {
      const res = await fetch(`/api/projects/${projectId}/clarifications`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clarificationId: replyModal.item.id, status: "replied", developerReply: replyModal.text })
      })
      if (!res.ok) throw new Error((await res.json()).error || "Failed")
      setClarifications(prev => prev.map(item => item.id === replyModal.item.id ? { ...item, status: "replied", developerReply: replyModal.text } : item))
      setReplyModal(null)
    } catch (err) { console.error(err) }
  }

  const handleMagicRewrite = () => {
    if (!replyModal || isRewriting) return
    setReplyModal({ ...replyModal, original: replyModal.text })
    setIsRewriting(true)
    setTimeout(() => {
      const lower = replyModal.text.toLowerCase()
      const polished = lower.includes("money") || lower.includes("cost")
        ? "To accommodate this request, we would need to review the project budget as this falls outside the initial scope."
        : lower.includes("no") || lower.includes("busy")
        ? "Unfortunately, I do not have the bandwidth to address this immediately, but I can prioritize it for next week."
        : "Thank you for the update. I will proceed with this accordingly."
      setReplyModal(r => r ? { ...r, text: polished } : null)
      setIsRewriting(false)
    }, 1500)
  }

  // Get clarifications to display in sidebar (both views show their relevant clarifications)
  const relevantClarifications = clarifications.filter(c => c.canReply || c.isAsker)
  const itemCount = draftClarifications.length + relevantClarifications.length + pendingItems.length

  return (
    <TabsContent value="assistant" className="mt-8">
      <div className="grid xl:grid-cols-[1fr_1.8fr] gap-6">
        {/* Sidebar */}
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-8 space-y-6 h-[calc(100vh-12rem)] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="space-y-1">
                <h3 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Clarification</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Questions from team members that need your response.</p>
              </div>
              <div className="flex items-center justify-center size-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm font-semibold text-slate-600 dark:text-slate-300">{itemCount}</div>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pr-2 min-h-0">
              {isLoadingClarifications ? (
                <div className="flex items-center justify-center h-full py-12"><Loader2 className="size-6 animate-spin text-primary" /></div>
              ) : itemCount === 0 ? (
                <EmptyState icon={MessageSquare} title="No clarifications" subtitle="All caught up!" />
              ) : (
                <>
                  {/* Draft clarifications (local, not yet sent) */}
                  {draftClarifications.map(draft => (
                    <ClarificationCard
                      key={draft.id}
                      question={draft.refinedQuestion || draft.question}
                      reason={draft.reason}
                      status="draft"
                      isDev={isDeveloperView}
                      actions={<>
                        <Button size="sm" className="flex-1 h-10 font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm" onClick={() => handleSendDraft(draft)}>Send to {draft.askedToRole === "developer" ? "Developer" : "Reviewer"}</Button>
                        <IconBtn icon={Eye} onClick={() => setViewModal({ type: "draft", item: draft })} label="View" />
                        <IconBtn icon={Pencil} onClick={() => setRefineModal({ type: "draft", item: draft, text: draft.refinedQuestion || draft.question })} label="Refine" />
                        <IconBtn icon={Trash2} onClick={() => setDraftClarifications(prev => prev.filter(d => d.id !== draft.id))} variant="danger" label="Delete" />
                      </>}
                    />
                  ))}
                  {/* Real clarifications from database */}
                  {relevantClarifications.map(c => (
                    <ClarificationCard
                      key={c.id}
                      question={c.refinedQuestion || c.question}
                      reason={c.reason}
                      status={c.status}
                      isDev={isDeveloperView}
                      meta={<div className="flex items-center gap-1.5 text-xs text-slate-400"><span className="font-medium text-slate-600 dark:text-slate-300">{c.askedBy}</span><span>·</span><span>{c.askedByRole}</span><span>·</span><span>{c.createdAt}</span></div>}
                      actions={<>
                        {c.canReply ? (
                          <Button size="sm" className={cn("flex-1 h-10 font-medium rounded-lg shadow-sm", c.status === "replied" ? "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800" : "bg-teal-600 hover:bg-teal-700 text-white")} disabled={c.status === "replied"} onClick={() => handleReplyOpen(c)}>
                            {c.status === "replied" ? "View Reply" : "Reply"}
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className={cn("flex-1 h-10 font-medium rounded-lg", c.status === "replied" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-400 cursor-not-allowed")} disabled={c.status !== "replied"} onClick={() => c.status === "replied" && setViewModal({ type: "clarification", item: c })}>
                            {c.status === "replied" ? "View Reply" : "Waiting for Reply"}
                          </Button>
                        )}
                        <IconBtn icon={Eye} onClick={() => setViewModal({ type: "clarification", item: c })} label="View" />
                        <IconBtn icon={Trash2} onClick={async () => {
                          try { await fetch(`/api/projects/${projectId}/clarifications`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clarificationId: c.id }) }); setClarifications(prev => prev.filter(x => x.id !== c.id)) } catch {}
                        }} variant="danger" label="Delete" />
                      </>}
                    />
                  ))}
                  {/* Pending items for escalation (reviewer only) */}
                  {pendingItems.map(item => (
                    <ClarificationCard
                      key={item.id}
                      question={item.refinedQuestion || item.originalQuestion}
                      reason={item.reason}
                      status={item.status}
                      isDev={isDeveloperView}
                      actions={<>
                        <Button size="sm" className={cn("flex-1 h-10 font-medium rounded-lg shadow-sm", item.status === "draft" ? "bg-teal-600 hover:bg-teal-700 text-white" : "bg-slate-100 text-slate-400 cursor-not-allowed")} disabled={item.status !== "draft"} onClick={() => setConfirmModal({ item, step: 1 })}>Send to Developer</Button>
                        <IconBtn icon={Eye} onClick={() => setViewModal({ type: "pending", item })} label="View" />
                        <IconBtn icon={Pencil} onClick={() => item.status === "draft" && setRefineModal({ type: "pending", item, text: item.refinedQuestion || item.originalQuestion })} label="Refine" />
                        <IconBtn icon={Trash2} onClick={() => setPendingItems(prev => prev.filter(p => p.id !== item.id))} variant="danger" label="Delete" />
                      </>}
                    />
                  ))}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Chat Panel */}
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-8 flex flex-col gap-6 h-[calc(100vh-12rem)] overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-gradient-to-br from-teal-100 to-teal-50 text-teal-600 flex items-center justify-center dark:from-teal-900/50 dark:to-teal-800/30 dark:text-teal-400">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">AI Assistant</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{isDeveloperView ? "Draft responses and get suggestions for reviewer replies." : "Ask questions and get quick answers based on project context."}</p>
                </div>
              </div>
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    if (confirm("Are you sure you want to clear all chat history?")) {
                      try {
                        const res = await fetch(`/api/projects/${projectId}/assistant`, { method: "DELETE" })
                        if (res.ok) {
                          setMessages([])
                        }
                      } catch (err) {
                        console.error("Failed to clear messages:", err)
                      }
                    }
                  }}
                  className="h-8 px-2 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <Trash2 className="size-3.5 mr-1.5" />
                  Clear
                </Button>
              )}
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto pr-2 min-h-0">
              {!isHistoryLoading && messages.length === 0 && (
                <ChatBubble message={{ id: "welcome", role: "assistant", content: isDeveloperView ? "Hi! I can help you draft responses to reviewer requests." : "Hi! I can answer questions about this project using the summary, scope, related files, and updates. What would you like to know?", timestamp: "AI Assistant" }} />
              )}
              {messages.map(msg => <ChatBubble key={msg.id} message={msg} onAction={handleAction} />)}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-sm px-4 py-3 bg-gradient-to-br from-muted/70 to-muted/50 border border-border/40 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />Thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <ChatInput value={inputValue} onChange={setInputValue} onSend={handleSend} isLoading={isLoading} placeholder="Ask the AI assistant..." />
          </CardContent>
        </Card>
      </div>

      {/* View Modal */}
      {viewModal && (
        <Modal title={viewModal.type === "draft" ? "Draft Clarification" : viewModal.type === "clarification" ? "Clarification" : "Pending Review Details"} onClose={() => setViewModal(null)}>
          <div className="space-y-5 text-sm">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Question</p>
              <p className="font-medium leading-relaxed text-base">
                {viewModal.type === "pending" ? ((viewModal.item as PendingItem).refinedQuestion || (viewModal.item as PendingItem).originalQuestion) : ((viewModal.item as DraftClarification | Clarification).refinedQuestion || viewModal.item.question)}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reason</p>
              <p className="leading-relaxed">{viewModal.item.reason}</p>
            </div>
            <div className="flex items-center gap-3 pt-2 border-t">
              <StatusBadge status={viewModal.item.status} isDev={isDeveloperView} />
              <span className="text-xs text-muted-foreground">
                {viewModal.type === "draft" ? `To: ${(viewModal.item as DraftClarification).askedToRole} • ` : ""}
                {viewModal.item.createdAt}
              </span>
            </div>
            {viewModal.type === "clarification" && (viewModal.item as Clarification).developerReply && (
              <div className="rounded-lg border border-border/50 bg-muted/40 p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Reply</p>
                <p className="leading-relaxed">{(viewModal.item as Clarification).developerReply}</p>
              </div>
            )}
            {viewModal.type === "pending" && (viewModal.item as PendingItem).developerReply && (
              <div className="rounded-lg border border-border/50 bg-muted/40 p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Developer Reply</p>
                <p className="leading-relaxed">{(viewModal.item as PendingItem).developerReply}</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Refine Modal */}
      {refineModal && (
        <Modal title={refineModal.type === "draft" ? "Refine Draft Clarification" : "Refine Question"} onClose={() => setRefineModal(null)}>
          <div className="space-y-4">
            <Textarea value={refineModal.text} onChange={(e) => setRefineModal({ ...refineModal, text: e.target.value })} className="min-h-[120px] resize-none border-border/50" placeholder="Refine your question here..." />
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" className="h-9" onClick={() => setRefineModal(null)}>Cancel</Button>
              <Button className="h-9" onClick={() => {
                if (refineModal.type === "draft") {
                  setDraftClarifications(prev => prev.map(d => d.id === refineModal.item.id ? { ...d, refinedQuestion: refineModal.text.trim() } : d))
                } else {
                  setPendingItems(prev => prev.map(p => p.id === refineModal.item.id ? { ...p, refinedQuestion: refineModal.text.trim() } : p))
                }
                setRefineModal(null)
              }}>Apply changes</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reply Modal */}
      {replyModal && (
        <Modal title="Reply to Clarification" onClose={() => setReplyModal(null)}>
          <div className="space-y-5 text-sm">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Question</p>
              <p className="font-medium leading-relaxed text-base">{replyModal.item.refinedQuestion || replyModal.item.question}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reason</p>
              <p className="leading-relaxed">{replyModal.item.reason}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your reply</p>
              <div className="relative">
                <Textarea value={replyModal.text} onChange={(e) => setReplyModal({ ...replyModal, text: e.target.value })} className={cn("min-h-[140px] resize-none border-border/50", isRewriting && "opacity-60 pointer-events-none")} placeholder="Type your rough draft here..." disabled={isRewriting} />
                {isRewriting && <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-lg"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Polishing your draft...</div></div>}
                {replyModal.original && !isRewriting && <Button type="button" variant="ghost" size="sm" onClick={() => setReplyModal({ ...replyModal, text: replyModal.original, original: "" })} className="absolute top-2 right-2 h-7 px-2 text-xs text-muted-foreground hover:text-foreground">Undo</Button>}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button onClick={handleMagicRewrite} disabled={!replyModal.text.trim() || isRewriting} className="h-9 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-sm"><Sparkles className="size-4 mr-1.5" />Magic Rewrite</Button>
              <Button onClick={handleSendReply} className="h-9">Send Reply</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <Modal title={confirmModal.step === 1 ? "Send this request to developer?" : "Confirm send"} onClose={() => setConfirmModal(null)}>
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground leading-relaxed">{confirmModal.step === 1 ? "We'll send this question to the developer for input." : "You won't be able to edit after sending."}</p>
            <div className="flex justify-end gap-2 pt-2 border-t">
              {confirmModal.step === 1 ? (
                <>
                  <Button variant="outline" className="h-9" onClick={() => setConfirmModal(null)}>Cancel</Button>
                  <Button className="h-9" onClick={() => setConfirmModal({ ...confirmModal, step: 2 })}>Continue</Button>
                </>
              ) : (
                <>
                  <Button variant="outline" className="h-9" onClick={() => setConfirmModal({ ...confirmModal, step: 1 })}>Back</Button>
                  <Button className="h-9" onClick={() => {
                    setPendingItems(prev => prev.map(p => p.id === confirmModal.item.id ? { ...p, status: "waiting_for_developer" } : p))
                    setTimeout(() => setPendingItems(prev => prev.map(p => p.id === confirmModal.item.id ? { ...p, status: "answered", developerReply: "(Dummy reply) Fastest approach is to reuse existing components and ship an MVP first." } : p)), 2300)
                    setConfirmModal(null)
                  }}>Send</Button>
                </>
              )}
            </div>
          </div>
        </Modal>
      )}
    </TabsContent>
  )
}