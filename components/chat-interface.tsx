"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { 
  Send, 
  Bot, 
  User, 
  AlertTriangle, 
  Clock,
  CheckCircle2,
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  status?: "pending" | "approved" | "flagged"
  flaggedReason?: string
}

interface ChatInterfaceProps {
  projectId: string
  isDeveloper?: boolean
}

export function ChatInterface({ projectId, isDeveloper = false }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hi! I'm your AI Project Assistant. I can answer questions about this project based on the updates and documentation. How can I help you today?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Demo flagged messages for developer review
  const [flaggedMessages, setFlaggedMessages] = useState<Message[]>([
    {
      id: "flagged-1",
      role: "user",
      content: "What's the expected delivery date for the mobile app feature?",
      timestamp: new Date(Date.now() - 3600000),
      status: "flagged",
      flaggedReason: "Question about timeline not found in project documentation",
    },
  ])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const responses = [
        "Based on the latest update, the new billing system allows users to manage subscriptions directly from their dashboard. The implementation includes automatic invoice generation and payment reminders.",
        "The authentication flow was updated last week to include OAuth 2.0 support. Users can now sign in with Google, GitHub, or their email address.",
        "I found relevant information in the project documentation. The API rate limits are set to 1000 requests per minute for authenticated users.",
      ]

      // Randomly flag some responses for demo
      const shouldFlag = Math.random() > 0.7

      if (shouldFlag) {
        const flaggedMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "I'm not entirely sure about this. Let me flag this question for the developer to review and provide an accurate answer.",
          timestamp: new Date(),
          status: "pending",
        }
        setMessages((prev) => [...prev, flaggedMessage])

        // Add to flagged queue for developer
        setFlaggedMessages((prev) => [
          ...prev,
          {
            ...userMessage,
            status: "flagged",
            flaggedReason: "AI confidence below threshold",
          },
        ])
      } else {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: responses[Math.floor(Math.random() * responses.length)],
          timestamp: new Date(),
          status: "approved",
        }
        setMessages((prev) => [...prev, aiMessage])
      }

      setIsLoading(false)
    }, 1500)
  }

  const handleApprove = (messageId: string, response: string) => {
    // Remove from flagged
    setFlaggedMessages((prev) => prev.filter((m) => m.id !== messageId))
    
    // Add approved response to chat
    const approvedMessage: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: response,
      timestamp: new Date(),
      status: "approved",
    }
    setMessages((prev) => [...prev, approvedMessage])
  }

  return (
    <div className="flex flex-col h-[600px]">
      {/* Developer: Flagged Messages Panel */}
      {isDeveloper && flaggedMessages.length > 0 && (
        <div className="mb-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span>Flagged Questions ({flaggedMessages.length})</span>
          </div>
          {flaggedMessages.map((msg) => (
            <Card key={msg.id} className="p-4 border-amber-500/30 bg-amber-500/5">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{msg.content}</p>
                    <p className="text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {msg.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  <Badge variant="warning">Needs Review</Badge>
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {msg.flaggedReason}
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Type your response..."
                    className="text-sm"
                    id={`response-${msg.id}`}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      const input = document.getElementById(
                        `response-${msg.id}`
                      ) as HTMLInputElement
                      if (input?.value) {
                        handleApprove(msg.id, input.value)
                      }
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3 animate-slide-up",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {message.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2.5",
                message.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted rounded-bl-md"
              )}
            >
              <p className="text-sm leading-relaxed">{message.content}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] opacity-60">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {message.status === "pending" && (
                  <Badge variant="warning" className="text-[10px] py-0 px-1.5">
                    Pending Review
                  </Badge>
                )}
                {message.status === "approved" && message.role === "assistant" && (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                )}
              </div>
            </div>
            {message.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-secondary-foreground" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 justify-start animate-slide-up">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="pt-4 border-t mt-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about this project..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          AI responses are based on project updates and documentation
        </p>
      </div>
    </div>
  )
}
