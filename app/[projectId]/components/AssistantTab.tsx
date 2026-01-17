"use client"

import { TabsContent } from "@/components/ui/tabs"
import { ChatInterface } from "@/components/chat-interface"
import type { Update } from "@/types/database"

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

export function AssistantTab({ projectId, isDeveloperView }: AssistantTabProps) {
  return (
    <TabsContent value="assistant" className="mt-8">
      <div className="grid md:grid-cols-[1fr,300px] gap-6">
        <div className="bg-card border rounded-xl p-6">
          <ChatInterface projectId={projectId} isDeveloper={isDeveloperView} />
        </div>

        <div className="space-y-4">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-sm">About AI Assistant</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ask questions about this project and get instant answers based on the updates and documentation.
            </p>
            <div className="pt-2 border-t space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Example questions:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• "How does the new billing work?"</li>
                <li>• "What changed this week?"</li>
                <li>• "Show me the authentication flow"</li>
              </ul>
            </div>
          </div>

          {isDeveloperView && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-2">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Approval Mode Active
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Questions the AI isn't sure about will be flagged for your review before responding to the reviewer.
              </p>
            </div>
          )}
        </div>
      </div>
    </TabsContent>
  )
}


