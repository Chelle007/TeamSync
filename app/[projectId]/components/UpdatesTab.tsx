"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { TabsContent } from "@/components/ui/tabs"
import { Calendar, FileText, Video, Loader2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { Update } from "@/types/database"

type UpdatesTabProps = {
  isLoadingUpdates: boolean
  updates: Update[]
  isDeveloperView: boolean
  projectId: string
}

export function UpdatesTab({
  isLoadingUpdates,
  updates,
  isDeveloperView,
  projectId,
}: UpdatesTabProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const handleGenerateUpdate = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/updates`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate update')
      }

      toast.success('Update generated successfully!')
      // Refresh the page to show the new update
      window.location.reload()
    } catch (error) {
      console.error('Error generating update:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate update')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <TabsContent value="updates" className="space-y-8 mt-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold">Project Updates</h2>
          {isDeveloperView && (
            <Button
              onClick={handleGenerateUpdate}
              disabled={isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Update
                </>
              )}
            </Button>
          )}
        </div>
        {updates.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {updates.length} {updates.length === 1 ? 'update' : 'updates'}
          </div>
        )}
      </div>

      {isLoadingUpdates ? (
        <div className="text-center py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          Loading updates...
        </div>
      ) : updates.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">No updates yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {isDeveloperView
                    ? 'Generate your first update to track project progress.'
                    : 'Updates will appear here once the developer generates them.'}
                </p>
                {isDeveloperView && (
                  <Button onClick={handleGenerateUpdate} disabled={isGenerating}>
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate First Update
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {updates.map((update) => {
            const isCompleted = update.status === "completed"
            return (
              <Card key={update.id} className="p-0 overflow-hidden border bg-card">
                <CardContent className="p-6 space-y-5">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold">{update.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {formatDate(update.created_at)}
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-xs px-2.5 py-1",
                        isCompleted
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : update.status === "processing"
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                      )}
                    >
                      {update.status === "completed"
                        ? "Completed"
                        : update.status === "processing"
                        ? "Processing"
                        : "Pending"}
                    </Badge>
                  </div>

                  <div className="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-6">
                    <div className="space-y-3">
                      {update.status === "processing" ? (
                        <div className="aspect-video rounded-xl bg-muted/60 border flex flex-col items-center justify-center gap-3">
                          <Loader2 className="h-8 w-8 text-primary animate-spin" />
                          <p className="text-sm text-muted-foreground">Generating video...</p>
                        </div>
                      ) : update.video_url ? (
                        <div className="aspect-video rounded-xl bg-muted/60 border flex items-center justify-center relative overflow-hidden group cursor-pointer">
                          <video
                            src={update.video_url}
                            controls
                            className="w-full h-full object-contain"
                            preload="metadata"
                          >
                            Your browser does not support the video tag.
                          </video>
                        </div>
                      ) : (
                        <div className="aspect-video rounded-xl bg-muted/60 border flex items-center justify-center">
                          <Video className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      {update.doc_url && (
                        <Button variant="secondary" className="w-full justify-start gap-10" asChild>
                          <Link href={update.doc_url} target="_blank" rel="noopener noreferrer">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary">
                              <FileText className="h-4 w-4" />
                            </span>
                            View Document
                          </Link>
                        </Button>
                      )}
                    </div>

                    <div className="space-y-4">
                      <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                        {update.summary}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </TabsContent>
  )
}
