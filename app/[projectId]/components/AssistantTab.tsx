"use client"

import { useState, type ReactNode } from "react"
import { TabsContent } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { Eye, MessageSquare, Pencil, Send, Sparkles } from "lucide-react"
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
  actions?: "escalate" | "none"
  pendingQuestion?: string
  pendingReason?: string
}

type IncomingRequest = {
  id: string
  from: "Reviewer"
  question: string
  refinedQuestion?: string
  reason: string
  createdAt: string
  status: "new" | "in_progress" | "replied"
  developerDraft?: string
  developerReply?: string
}

type DevChatMessage = {
  id: string
  role: "developer" | "assistant" | "system"
  content: string
  timestamp: string
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
// Constants
// ============================================================================

const ESCALATION_KEYWORDS = [
  "fastest way",
  "timeline",
  "estimate",
  "how long",
  "architecture",
] as const

const STATUS_STYLES = {
  draft: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
  waiting_for_developer: "bg-blue-500/10 text-blue-400 border border-blue-500/30",
  answered: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
} as const

const DEV_STATUS_STYLES = {
  new: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
  in_progress: "bg-blue-500/10 text-blue-400 border border-blue-500/30",
  replied: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
} as const

// ============================================================================
// API Functions
// ============================================================================

async function sendToDeveloperAPI(_pendingItem: PendingItem): Promise<void> {
  return Promise.resolve()
}

async function sendDeveloperReplyAPI(_requestId: string, _replyText: string): Promise<void> {
  return Promise.resolve()
}

// ============================================================================
// Helper Components
// ============================================================================

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-in fade-in-0">
      <div className="w-full max-w-lg rounded-2xl border border-border/50 bg-card/95 backdrop-blur-xl p-6 shadow-lg animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6 pb-4 border-b">
          <h4 className="text-lg font-semibold">{title}</h4>
          <Button size="sm" variant="ghost" onClick={onClose} className="h-8 w-8 p-0">
            ✕
          </Button>
        </div>
        {children}
      </div>
    </div>
  )
}

function StatusBadge({
  status,
  statusType = "reviewer",
}: {
  status: string
  statusType?: "reviewer" | "developer"
}) {
  const styles = statusType === "developer" ? DEV_STATUS_STYLES : STATUS_STYLES
  const label =
    statusType === "developer"
      ? status === "new"
        ? "New"
        : status === "in_progress"
        ? "In Progress"
        : "Replied"
      : status === "draft"
      ? "Draft"
      : status === "waiting_for_developer"
      ? "Waiting for Developer"
      : "Answered"

  return (
    <span
      className={cn(
        "text-[10px] font-medium uppercase tracking-wide px-2.5 py-1 rounded-full whitespace-nowrap",
        styles[status as keyof typeof styles]
      )}
    >
      {label}
    </span>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function AssistantTab({ isDeveloperView }: AssistantTabProps) {
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([
    {
      id: "pending-1",
      question: "Can you share the updated deployment timeline?",
      createdAt: "Today, 9:20 AM",
      status: "draft",
      reason: "Timeline questions require developer confirmation.",
      originalQuestion: "Can you share the updated deployment timeline?",
      askedBy: "Reviewer",
    },
    {
      id: "pending-2",
      question: "What is the fastest way to ship the MVP?",
      createdAt: "Yesterday, 4:10 PM",
      status: "draft",
      reason: "This needs product/engineering input.",
      originalQuestion: "What is the fastest way to ship the MVP?",
      askedBy: "Reviewer",
    },
    {
      id: "pending-3",
      question: "Do we have an updated architecture diagram for payments?",
      createdAt: "Yesterday, 2:34 PM",
      status: "waiting_for_developer",
      reason: "Architecture questions require developer confirmation.",
      originalQuestion: "Do we have an updated architecture diagram for payments?",
      askedBy: "Reviewer",
    },
    {
      id: "pending-4",
      question: "Which metrics are included in the new onboarding funnel?",
      createdAt: "Mon, 11:45 AM",
      status: "answered",
      reason: "Needs product input for exact metrics list.",
      originalQuestion: "Which metrics are included in the new onboarding funnel?",
      askedBy: "Reviewer",
      developerReply:
        "(Dummy reply) We track activation, completion rate, time-to-first-action, and drop-off points.",
    },
  ])
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "assistant-1",
      role: "assistant",
      content: "Hi! I can summarize project updates or answer questions based on the latest docs.",
      timestamp: "9:00 AM",
    },
    {
      id: "user-1",
      role: "user",
      content: "What changed in the last update?",
      timestamp: "9:01 AM",
    },
    {
      id: "assistant-2",
      role: "assistant",
      content:
        "The latest update covered performance improvements, a billing dashboard refresh, and mobile navigation fixes.",
      timestamp: "9:01 AM",
    },
    {
      id: "user-2",
      role: "user",
      content: "How long will the review cycle take?",
      timestamp: "9:02 AM",
    },
    {
      id: "assistant-3",
      role: "assistant",
      content:
        "That question needs developer input and isn’t documented yet. Do you want to send it to Pending Review?",
      timestamp: "9:02 AM",
      actions: "escalate",
      pendingQuestion: "How long will the review cycle take?",
      pendingReason: "Timeline/estimate requires developer confirmation.",
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [selectedViewItem, setSelectedViewItem] = useState<PendingItem | null>(null)
  const [selectedRefineItem, setSelectedRefineItem] = useState<PendingItem | null>(null)
  const [refineText, setRefineText] = useState("")
  const [confirmItem, setConfirmItem] = useState<PendingItem | null>(null)
  const [confirmStep, setConfirmStep] = useState<1 | 2>(1)

  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>([
    {
      id: "incoming-1",
      from: "Reviewer",
      question: "Can you share the updated deployment timeline?",
      reason: "Timeline not in docs; needs developer confirmation.",
      createdAt: "Today, 10:15 AM",
      status: "new",
    },
    {
      id: "incoming-2",
      from: "Reviewer",
      question: "What is the fastest way to ship the MVP?",
      reason: "Needs engineering input on scope and sequencing.",
      createdAt: "Yesterday, 5:05 PM",
      status: "in_progress",
      developerDraft: "We can ship the MVP by reusing the existing components and limiting scope to core flows.",
    },
  ])
  const [devMessages, setDevMessages] = useState<DevChatMessage[]>([
    {
      id: "dev-assistant-1",
      role: "assistant",
      content: "Hi! I can help you draft responses to reviewer requests.",
      timestamp: "9:10 AM",
    },
  ])
  const [devInputValue, setDevInputValue] = useState("")
  const [selectedDevView, setSelectedDevView] = useState<IncomingRequest | null>(null)
  const [selectedDevReply, setSelectedDevReply] = useState<IncomingRequest | null>(null)
  const [devReplyText, setDevReplyText] = useState("")
  const [sentReplies, setSentReplies] = useState<string[]>([])
  const [replyStatus, setReplyStatus] = useState<string | null>(null)

  // ============================================================================
  // Handlers - Reviewer View
  // ============================================================================

  const addMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message])
  }

  const handleSend = () => {
    const trimmed = inputValue.trim()
    if (!trimmed) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: "Just now",
    }
    addMessage(userMessage)
    setInputValue("")

    const lower = trimmed.toLowerCase()
    const needsEscalation = ESCALATION_KEYWORDS.some((keyword) => lower.includes(keyword))
    if (needsEscalation) {
      addMessage({
        id: `assistant-${Date.now() + 1}`,
        role: "assistant",
        content:
          "This looks like it needs developer input and isn’t documented yet. Do you want to send this to Pending Review?",
        timestamp: "Just now",
        actions: "escalate",
        pendingQuestion: trimmed,
        pendingReason: "Requires developer input / not in available docs.",
      })
      return
    }

    addMessage({
      id: `assistant-${Date.now() + 2}`,
      role: "assistant",
      content:
        "Here’s a quick summary: the latest update focused on polishing UX, performance improvements, and preparing the next review package.",
      timestamp: "Just now",
    })
  }

  const handleEscalationDecision = (send: boolean, message: ChatMessage) => {
    if (!send) {
      addMessage({
        id: `assistant-${Date.now() + 3}`,
        role: "assistant",
        content: "Okay — ask another question or add more context.",
        timestamp: "Just now",
      })
      return
    }

    const newItem: PendingItem = {
      id: `pending-${Date.now()}`,
      question: message.pendingQuestion || "New question",
      createdAt: "Just now",
      status: "draft",
      reason: message.pendingReason || "Needs developer input.",
      originalQuestion: message.pendingQuestion || "New question",
      askedBy: "Reviewer",
    }
    setPendingItems((prev) => [newItem, ...prev])
    addMessage({
      id: `assistant-${Date.now() + 4}`,
      role: "assistant",
      content:
        "Added to Pending Review. You can refine it before sending to the developer.",
      timestamp: "Just now",
    })
  }

  const handleRefineOpen = (item: PendingItem) => {
    setSelectedRefineItem(item)
    setRefineText(item.refinedQuestion || item.originalQuestion)
  }

  const handleRefineApply = () => {
    if (!selectedRefineItem) return
    setPendingItems((prev) =>
      prev.map((item) =>
        item.id === selectedRefineItem.id
          ? { ...item, refinedQuestion: refineText.trim() }
          : item
      )
    )
    setSelectedRefineItem(null)
  }

  const handleSendToDeveloper = async (item: PendingItem) => {
    setPendingItems((prev) =>
      prev.map((entry) =>
        entry.id === item.id ? { ...entry, status: "waiting_for_developer" } : entry
      )
    )
    await sendToDeveloperAPI(item)
    setTimeout(() => {
      setPendingItems((prev) =>
        prev.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                status: "answered",
                developerReply:
                  "(Dummy reply) Fastest approach is to reuse existing components and ship an MVP first. We can iterate on design polish after launch.",
              }
            : entry
        )
      )
    }, 2300)
  }

  // ============================================================================
  // Handlers - Developer View
  // ============================================================================

  const handleDevSend = () => {
    const trimmed = devInputValue.trim()
    if (!trimmed) return

    const devMessage: DevChatMessage = {
      id: `dev-${Date.now()}`,
      role: "developer",
      content: trimmed,
      timestamp: "Just now",
    }
    setDevMessages((prev) => [...prev, devMessage])
    setDevInputValue("")

    const lower = trimmed.toLowerCase()
    if (lower.includes("reply") || lower.includes("timeline") || lower.includes("fastest")) {
      setDevMessages((prev) => [
        ...prev,
        {
          id: `dev-assistant-${Date.now()}`,
          role: "assistant",
          content:
            "Suggested reply: We can share a revised timeline after confirming scope; fastest path is shipping core flows first and iterating weekly.",
          timestamp: "Just now",
        },
      ])
    }
  }

  const handleReplyOpen = (request: IncomingRequest) => {
    if (request.status === "new") {
      setIncomingRequests((prev) =>
        prev.map((item) =>
          item.id === request.id ? { ...item, status: "in_progress" } : item
        )
      )
    }
    setSelectedDevReply(request)
    setDevReplyText(request.developerDraft || "")
    setReplyStatus(null)
  }

  const handleSendReply = async () => {
    if (!selectedDevReply) return
    const replyText = devReplyText.trim()
    if (!replyText) return

    await sendDeveloperReplyAPI(selectedDevReply.id, replyText)
    setIncomingRequests((prev) =>
      prev.map((item) =>
        item.id === selectedDevReply.id
          ? { ...item, status: "replied", developerReply: replyText }
          : item
      )
    )
    setSentReplies((prev) => [replyText, ...prev])
    setReplyStatus("Reply sent")
    setSelectedDevReply(null)
  }

  if (isDeveloperView) {
    return (
      <TabsContent value="assistant" className="mt-8">
        <div className="grid xl:grid-cols-[1fr_1.8fr] gap-6">
          <Card className="border border-border/50 bg-card/95 backdrop-blur-sm">
            <CardContent className="p-6 space-y-6 h-[calc(100vh-12rem)] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b flex-shrink-0">
                <div className="space-y-1.5">
                  <h3 className="text-lg font-semibold tracking-tight">Incoming Requests</h3>
                  <p className="text-sm text-muted-foreground">
                    Reviewer questions that need your response.
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs font-medium h-6 px-2.5">
                  {incomingRequests.length}
                </Badge>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto pr-2 min-h-0">
                {incomingRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                      <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">No incoming requests</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">All caught up!</p>
                  </div>
                ) : (
                  incomingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors p-4 space-y-3 group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold line-clamp-2 leading-snug">
                            {request.refinedQuestion || request.question}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                            {request.reason}
                          </p>
                          <p className="text-[11px] text-muted-foreground/70 mt-2 flex items-center gap-1.5">
                            <span>From: {request.from}</span>
                            <span>•</span>
                            <span>{request.createdAt}</span>
                          </p>
                        </div>
                        <StatusBadge status={request.status} statusType="developer" />
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/30">
                        <Button
                          size="sm"
                          className="flex-1 h-9 font-medium"
                          disabled={request.status === "replied"}
                          onClick={() => handleReplyOpen(request)}
                        >
                          {request.status === "replied" ? "View Reply" : "Reply"}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9"
                          onClick={() => setSelectedDevView(request)}
                          aria-label="View request"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/50 bg-card/95 backdrop-blur-sm">
            <CardContent className="p-6 flex flex-col gap-6 h-[calc(100vh-12rem)] overflow-hidden">
              <div className="flex items-center gap-3 pb-4 border-b flex-shrink-0">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 text-primary flex items-center justify-center">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight">AI Assistant</h3>
                  <p className="text-sm text-muted-foreground">
                    Draft responses and get suggestions for reviewer replies.
                  </p>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pr-2 min-h-0">
                {devMessages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex animate-in fade-in-0 slide-in-from-bottom-2 duration-200",
                      message.role === "developer" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm space-y-1.5",
                        message.role === "developer"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted/60 text-foreground border border-border/50 rounded-bl-sm"
                      )}
                    >
                      <p className="leading-relaxed">{message.content}</p>
                      <span className="text-[10px] opacity-70 block">
                        {message.timestamp}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-3 flex-shrink-0">
                <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                  <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <Input
                    className="border-0 bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground/60 text-sm"
                    placeholder="Ask the AI assistant..."
                    value={devInputValue}
                    onChange={(event) => setDevInputValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        handleDevSend()
                      }
                    }}
                  />
                  <Button size="sm" onClick={handleDevSend} className="h-8 w-8 p-0 flex-shrink-0">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {selectedDevView && (
          <Modal title="Incoming Request" onClose={() => setSelectedDevView(null)}>
            <div className="space-y-5 text-sm">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Question</p>
                <p className="font-medium leading-relaxed text-base">
                  {selectedDevView.refinedQuestion || selectedDevView.question}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reason</p>
                <p className="leading-relaxed">{selectedDevView.reason}</p>
              </div>
              <div className="flex items-center gap-3 pt-2 border-t">
                <StatusBadge status={selectedDevView.status} statusType="developer" />
                <span className="text-xs text-muted-foreground">
                  From {selectedDevView.from} • {selectedDevView.createdAt}
                </span>
              </div>
              {selectedDevView.developerReply && (
                <div className="rounded-lg border border-border/50 bg-muted/40 p-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Reply</p>
                  <p className="leading-relaxed">{selectedDevView.developerReply}</p>
                </div>
              )}
            </div>
          </Modal>
        )}

        {selectedDevReply && (
          <Modal title="Reply to Reviewer" onClose={() => setSelectedDevReply(null)}>
            <div className="space-y-5 text-sm">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Question</p>
                <p className="font-medium leading-relaxed text-base">
                  {selectedDevReply.refinedQuestion || selectedDevReply.question}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reason</p>
                <p className="leading-relaxed">{selectedDevReply.reason}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your reply</p>
                <Textarea
                  value={devReplyText}
                  onChange={(event) => setDevReplyText(event.target.value)}
                  className="min-h-[140px] resize-none border-border/50"
                  placeholder="Type your reply here..."
                />
              </div>
              <div className="flex items-center justify-between gap-3 pt-2 border-t">
                <Button
                  variant="outline"
                  className="h-9"
                  onClick={() =>
                    setDevReplyText(
                      "(Draft) We can share an updated timeline after confirming scope. The fastest route is shipping core flows first, then iterating weekly."
                    )
                  }
                >
                  Generate Draft
                </Button>
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="h-9" onClick={() => setSelectedDevReply(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSendReply} className="h-9">Send Reply</Button>
                </div>
              </div>
              {replyStatus && (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2">
                  <p className="text-xs font-medium text-emerald-400">{replyStatus}</p>
                </div>
              )}
            </div>
          </Modal>
        )}
        {sentReplies.length > 0 && (
          <div className="sr-only" aria-live="polite">
            Reply sent
          </div>
        )}
      </TabsContent>
    )
  }

  return (
    <TabsContent value="assistant" className="mt-8">
      <div className="grid xl:grid-cols-[1fr_1.8fr] gap-6">
        <Card className="border border-border/50 bg-card/95 backdrop-blur-sm">
          <CardContent className="p-6 space-y-6 h-[calc(100vh-12rem)] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b flex-shrink-0">
              <div className="space-y-1.5">
                <h3 className="text-lg font-semibold tracking-tight">Pending Review</h3>
                <p className="text-sm text-muted-foreground">
                  Questions that need developer input before you can respond.
                </p>
              </div>
              <Badge variant="secondary" className="text-xs font-medium h-6 px-2.5">
                {pendingItems.length}
              </Badge>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pr-2 min-h-0 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
              {pendingItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No pending items</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">All questions answered!</p>
                </div>
              ) : (
                pendingItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors p-4 space-y-3 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold line-clamp-2 leading-snug">
                          {item.refinedQuestion || item.originalQuestion}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                          {item.reason}
                        </p>
                      </div>
                      <StatusBadge status={item.status} statusType="reviewer" />
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/30">
                      <Button
                        size="sm"
                        className="flex-1 h-9 font-medium"
                        disabled={item.status !== "draft"}
                        onClick={() => {
                          setConfirmItem(item)
                          setConfirmStep(1)
                        }}
                      >
                        Send to Developer
                      </Button>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9"
                          onClick={() => setSelectedViewItem(item)}
                          aria-label="View pending item"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9"
                          disabled={item.status !== "draft"}
                          onClick={() => handleRefineOpen(item)}
                          aria-label="Refine pending item"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-card/95 backdrop-blur-sm">
          <CardContent className="p-6 flex flex-col gap-6 h-[calc(100vh-12rem)] overflow-hidden">
            <div className="flex items-center gap-3 pb-4 border-b flex-shrink-0">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 text-primary flex items-center justify-center">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold tracking-tight">AI Assistant</h3>
                <p className="text-sm text-muted-foreground">
                  Ask questions and get quick answers based on project context.
                </p>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto pr-2 min-h-0">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex animate-in fade-in-0 slide-in-from-bottom-2 duration-200",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm space-y-2 shadow-sm",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted/60 text-foreground border border-border/50 rounded-bl-sm"
                    )}
                  >
                    <p className="leading-relaxed">{message.content}</p>
                    {message.actions === "escalate" && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 text-xs font-medium"
                          onClick={() => handleEscalationDecision(true, message)}
                        >
                          Yes, send
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs font-medium"
                          onClick={() => handleEscalationDecision(false, message)}
                        >
                          No
                        </Button>
                      </div>
                    )}
                    <span className="text-[10px] opacity-70 block">
                      {message.timestamp}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm px-3 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Input
                  className="border-0 bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground/60 text-sm"
                  placeholder="Ask the AI assistant..."
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      handleSend()
                    }
                  }}
                />
                <Button size="sm" onClick={handleSend} className="h-8 w-8 p-0 flex-shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedViewItem && (
        <Modal title="Pending Review Details" onClose={() => setSelectedViewItem(null)}>
          <div className="space-y-5 text-sm">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Question</p>
              <p className="font-medium leading-relaxed text-base">
                {selectedViewItem.refinedQuestion || selectedViewItem.originalQuestion}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reason</p>
              <p className="leading-relaxed">{selectedViewItem.reason}</p>
            </div>
            <div className="flex items-center gap-3 pt-2 border-t">
              <StatusBadge status={selectedViewItem.status} statusType="reviewer" />
              <span className="text-xs text-muted-foreground">
                Created {selectedViewItem.createdAt}
              </span>
            </div>
            {selectedViewItem.developerReply && (
              <div className="rounded-lg border border-border/50 bg-muted/40 p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Developer Reply</p>
                <p className="leading-relaxed">{selectedViewItem.developerReply}</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {selectedRefineItem && (
        <Modal title="Refine Question" onClose={() => setSelectedRefineItem(null)}>
          <div className="space-y-4">
            <Textarea
              value={refineText}
              onChange={(event) => setRefineText(event.target.value)}
              className="min-h-[120px] resize-none border-border/50"
              placeholder="Refine your question here..."
            />
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" className="h-9" onClick={() => setSelectedRefineItem(null)}>
                Cancel
              </Button>
              <Button onClick={handleRefineApply} className="h-9">Apply changes</Button>
            </div>
          </div>
        </Modal>
      )}

      {confirmItem && (
        <Modal
          title={
            confirmStep === 1
              ? "Send this request to developer?"
              : "Confirm send"
          }
          onClose={() => {
            setConfirmItem(null)
            setConfirmStep(1)
          }}
        >
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {confirmStep === 1
                ? "We'll send this question to the developer for input."
                : "You won't be able to edit after sending."}
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t">
              {confirmStep === 1 ? (
                <>
                  <Button variant="outline" className="h-9" onClick={() => setConfirmItem(null)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setConfirmStep(2)} className="h-9">Continue</Button>
                </>
              ) : (
                <>
                  <Button variant="outline" className="h-9" onClick={() => setConfirmStep(1)}>
                    Back
                  </Button>
                  <Button
                    onClick={() => {
                      if (confirmItem) {
                        handleSendToDeveloper(confirmItem)
                      }
                      setConfirmItem(null)
                      setConfirmStep(1)
                    }}
                    className="h-9"
                  >
                    Send
                  </Button>
                </>
              )}
            </div>
          </div>
        </Modal>
      )}
    </TabsContent>
  )
}
