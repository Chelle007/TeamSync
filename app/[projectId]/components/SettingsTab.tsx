"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Settings, ExternalLink, GitBranch } from "lucide-react"
import type { Project } from "@/types/database"

interface SettingsTabProps {
  project: Project | null
  projectDetails: {
    name: string
    status: "active" | "completed" | "paused"
    progress: number
  }
}

export function SettingsTab({
  project,
  projectDetails,
}: SettingsTabProps) {
  return (
    <TabsContent value="settings" className="mt-8">
      <div className="max-w-3xl">
        <Card className="shadow-lg">
          <CardContent className="p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Settings className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-2xl font-bold">Project Settings</h3>
            </div>
            
            <div className="space-y-6 pt-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-2">Project Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{projectDetails.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant={projectDetails.status === "active" ? "success" : "warning"}>
                      {projectDetails.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{projectDetails.progress}%</span>
                  </div>
                </div>
              </div>

              {project && (
                <div className="p-4 rounded-lg bg-muted/50">
                  <h4 className="font-semibold mb-2">Links</h4>
                  <div className="space-y-2 text-sm">
                    {project.github_url && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">GitHub Repository</span>
                        <a 
                          href={project.github_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                    {project.live_url && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Live Site</span>
                        <a 
                          href={project.live_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          Visit <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Additional settings and configuration options will be available here.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  )
}
