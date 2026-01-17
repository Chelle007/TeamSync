"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ChatInterface } from "@/components/chat-interface"
import { MessageSquare } from "lucide-react"

interface AssistantTabProps {
  projectId: string
  isDeveloperView: boolean
  projectDetails: {
    status: "active" | "completed" | "paused"
    progress: number
  }
  updates: Array<{ id: string }>
}

export function AssistantTab({
  projectId,
  isDeveloperView,
  projectDetails,
  updates,
}: AssistantTabProps) {
  return (
    <TabsContent value="assistant" className="mt-8">
      <div className="grid md:grid-cols-[1fr,320px] gap-6">
        <Card className="shadow-lg">
          <CardContent className="p-0">
            <ChatInterface 
              projectId={projectId} 
              isDeveloper={isDeveloperView}
            />
          </CardContent>
        </Card>
        
        {/* Sidebar info */}
        <div className="space-y-6">
          <Card className="shadow-md">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-base">About AI Assistant</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ask questions about this project and get instant answers based on the updates and documentation.
              </p>
              <div className="pt-4 border-t space-y-3">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Example questions:</p>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>"How does the new billing work?"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>"What changed this week?"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>"Show me the authentication flow"</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {isDeveloperView && (
            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-2 border-amber-500/30 shadow-md">
              <CardContent className="p-6 space-y-3">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  Approval Mode Active
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Questions the AI isn't sure about will be flagged for your review before responding to the reviewer.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Project Quick Info */}
          <Card className="shadow-md">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-bold text-base">Project Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={projectDetails.status === "active" ? "success" : "warning"} className="text-xs">
                    {projectDetails.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-semibold">{projectDetails.progress}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updates</span>
                  <span className="font-semibold">{updates.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TabsContent>
  )
}
