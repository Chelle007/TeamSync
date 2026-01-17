"use client"

import { useMemo, useState } from "react"
import { TabsContent } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { Eye, MessageSquare, Pencil, Send, Sparkles } from "lucide-react"
import type { Update } from "@/types/database"

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

function sendToDeveloperAPI(_pendingItem: PendingItem): Promise<void> {
  return Promise.resolve()
}

async function sendDeveloperReplyAPI(_requestId: string, _replyText: string): Promise<void> {
  return Promise.resolve()
}

const escalationKeywords = [
  "fastest way",
  "timeline",
  "estimate",
  "how long",
  "architecture",
]

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

  const statusStyles = useMemo(
    () => ({
      draft: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
      waiting_for_developer: "bg-blue-500/10 text-blue-400 border border-blue-500/30",
      answered: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
    }),
    []
  )

  const devStatusStyles = useMemo(
    () => ({
      new: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
      in_progress: "bg-blue-500/10 text-blue-400 border border-blue-500/30",
      replied: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
    }),
    []
  )

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
    const needsEscalation = escalationKeywords.some((keyword) => lower.includes(keyword))
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
          <Card className="border bg-card/90 min-h-[720px]">
            <CardContent className="p-6 space-y-5 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">Incoming Requests</h3>
                  <p className="text-sm text-muted-foreground">
                    Reviewer questions that need your response.
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {incomingRequests.length}
                </Badge>
              </div>

              <div className="space-y-4 flex-1 overflow-y-auto pr-2">
                {incomingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-xl border bg-muted/40 p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold line-clamp-2">
                          {request.refinedQuestion || request.question}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {request.reason}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-2">
                          From: {request.from} • {request.createdAt}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full",
                          devStatusStyles[request.status]
                        )}
                      >
                        {request.status === "new"
                          ? "New"
                          : request.status === "in_progress"
                          ? "In Progress"
                          : "Replied"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <Button
                        size="sm"
                        className="flex-1"
                        disabled={request.status === "replied"}
                        onClick={() => handleReplyOpen(request)}
                      >
                        {request.status === "replied" ? "View Reply" : "Reply"}
                      </Button>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setSelectedDevView(request)}
                          aria-label="View request"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="h-24" />
            </CardContent>
          </Card>

          <Card className="border bg-card/90 min-h-[720px]">
            <CardContent className="p-6 flex flex-col gap-6 h-full">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">AI Assistant</h3>
                  <p className="text-sm text-muted-foreground">
                    Draft responses and get suggestions for reviewer replies.
                  </p>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto pr-2">
                {devMessages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      message.role === "developer" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-3 text-sm space-y-3",
                        message.role === "developer"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-foreground border border-muted"
                      )}
                    >
                      <p className="leading-relaxed">{message.content}</p>
                      <span className="text-[10px] text-muted-foreground block">
                        {message.timestamp}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-8 space-y-3">
                <div className="flex items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <Input
                    className="border-0 bg-transparent focus-visible:ring-0"
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
                  <Button size="sm" onClick={handleDevSend}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <div className="h-8" />
              </div>
            </CardContent>
          </Card>
        </div>

        {selectedDevView && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold">Incoming Request</h4>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedDevView(null)}
                >
                  Close
                </Button>
              </div>
              <div className="space-y-4 text-sm mt-4">
                <div>
                  <p className="text-xs text-muted-foreground">Question</p>
                  <p className="font-medium">
                    {selectedDevView.refinedQuestion || selectedDevView.question}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Reason</p>
                  <p>{selectedDevView.reason}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "text-[10px] uppercase tracking-wide px-2 py-1 rounded-full",
                      devStatusStyles[selectedDevView.status]
                    )}
                  >
                    {selectedDevView.status === "new"
                      ? "New"
                      : selectedDevView.status === "in_progress"
                      ? "In Progress"
                      : "Replied"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    From {selectedDevView.from} • {selectedDevView.createdAt}
                  </span>
                </div>
                {selectedDevView.developerReply && (
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Reply</p>
                    <p className="mt-1">{selectedDevView.developerReply}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {selectedDevReply && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold">Reply to Reviewer</h4>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedDevReply(null)}
                >
                  Close
                </Button>
              </div>
              <div className="space-y-4 text-sm mt-4">
                <div>
                  <p className="text-xs text-muted-foreground">Question</p>
                  <p className="font-medium">
                    {selectedDevReply.refinedQuestion || selectedDevReply.question}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Reason</p>
                  <p>{selectedDevReply.reason}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Your reply</p>
                  <Textarea
                    value={devReplyText}
                    onChange={(event) => setDevReplyText(event.target.value)}
                    className="min-h-[140px]"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setDevReplyText(
                        "(Draft) We can share an updated timeline after confirming scope. The fastest route is shipping core flows first, then iterating weekly."
                      )
                    }
                  >
                    Generate Draft
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setSelectedDevReply(null)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSendReply}>Send Reply</Button>
                  </div>
                </div>
                {replyStatus && (
                  <p className="text-xs text-emerald-400">{replyStatus}</p>
                )}
              </div>
            </div>
          </div>
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
        <Card className="border bg-card/90 min-h-[720px]">
          <CardContent className="p-6 space-y-5 h-full flex flex-col">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">Pending Review</h3>
                <p className="text-sm text-muted-foreground">
                  Questions that need developer input before you can respond.
                </p>
              </div>
              <Badge variant="secondary" className="text-xs">
                {pendingItems.length}
              </Badge>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto pr-2">
              {pendingItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border bg-muted/40 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold line-clamp-2">
                        {item.refinedQuestion || item.originalQuestion}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.reason}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full",
                        statusStyles[item.status]
                      )}
                    >
                      {item.status === "draft"
                        ? "Draft"
                        : item.status === "waiting_for_developer"
                        ? "Waiting for Developer"
                        : "Answered"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={item.status !== "draft"}
                      onClick={() => {
                        setConfirmItem(item)
                        setConfirmStep(1)
                      }}
                    >
                      Send to Developer
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setSelectedViewItem(item)}
                        aria-label="View pending item"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={item.status !== "draft"}
                        onClick={() => handleRefineOpen(item)}
                        aria-label="Refine pending item"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="h-24" />
          </CardContent>
        </Card>

        <Card className="border bg-card/90 min-h-[720px]">
          <CardContent className="p-6 flex flex-col gap-6 h-full">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">AI Assistant</h3>
                <p className="text-sm text-muted-foreground">
                  Ask questions and get quick answers based on project context.
                </p>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto pr-2">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-3 text-sm space-y-3",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-foreground border border-muted"
                    )}
                  >
                    <p className="leading-relaxed">{message.content}</p>
                    {message.actions === "escalate" && (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleEscalationDecision(true, message)}
                        >
                          Yes, send
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEscalationDecision(false, message)}
                        >
                          No
                        </Button>
                      </div>
                    )}
                    <span className="text-[10px] text-muted-foreground block">
                      {message.timestamp}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-8 space-y-3">
              <div className="flex items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <Input
                  className="border-0 bg-transparent focus-visible:ring-0"
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
                <Button size="sm" onClick={handleSend}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <div className="h-8" />
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedViewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold">Pending Review Details</h4>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedViewItem(null)}
              >
                Close
              </Button>
            </div>
            <div className="space-y-4 text-sm mt-4">
              <div>
                <p className="text-xs text-muted-foreground">Question</p>
                <p className="font-medium">
                  {selectedViewItem.refinedQuestion || selectedViewItem.originalQuestion}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reason</p>
                <p>{selectedViewItem.reason}</p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-wide px-2 py-1 rounded-full",
                    statusStyles[selectedViewItem.status]
                  )}
                >
                  {selectedViewItem.status === "draft"
                    ? "Draft"
                    : selectedViewItem.status === "waiting_for_developer"
                    ? "Waiting for Developer"
                    : "Answered"}
                </span>
                <span className="text-xs text-muted-foreground">
                  Created {selectedViewItem.createdAt}
                </span>
              </div>
              {selectedViewItem.developerReply && (
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Developer Reply</p>
                  <p className="mt-1">{selectedViewItem.developerReply}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedRefineItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold">Refine Question</h4>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedRefineItem(null)}
              >
                Close
              </Button>
            </div>
            <div className="space-y-3 mt-4">
              <Textarea
                value={refineText}
                onChange={(event) => setRefineText(event.target.value)}
                className="min-h-[120px]"
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setSelectedRefineItem(null)}>
                Cancel
              </Button>
              <Button onClick={handleRefineApply}>Apply changes</Button>
            </div>
          </div>
        </div>
      )}

      {confirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl">
            <div className="space-y-2">
              <h4 className="text-lg font-semibold">
                {confirmStep === 1
                  ? "Send this request to developer?"
                  : "Confirm send"}
              </h4>
              <p className="text-sm text-muted-foreground">
                {confirmStep === 1
                  ? "We’ll send this question to the developer for input."
                  : "You won’t be able to edit after sending."}
              </p>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              {confirmStep === 1 ? (
                <>
                  <Button variant="outline" onClick={() => setConfirmItem(null)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setConfirmStep(2)}>Continue</Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setConfirmStep(1)}>
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
                  >
                    Send
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </TabsContent>
  )
}
