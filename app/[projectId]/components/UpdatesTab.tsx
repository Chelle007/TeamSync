"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { TabsContent } from "@/components/ui/tabs"
import { Calendar, FileText, Video } from "lucide-react"
import { cn } from "@/lib/utils"

type UpdateItem = {
  id: string
  title: string
  date: string
  videoUrl: string
  docUrl: string
  summary: string
  status: "completed" | "processing" | "pending"
}

type UpdatesTabProps = {
  isLoadingUpdates: boolean
  transformedUpdates: UpdateItem[]
  isDeveloperView: boolean
  projectId: string
}

export function UpdatesTab({
  isLoadingUpdates,
  transformedUpdates,
}: UpdatesTabProps) {
  const placeholderUpdates: UpdateItem[] = [
    {
      id: "placeholder-1",
      title: "Week 4: Performance Optimization",
      date: "Jan 17, 2026",
      videoUrl: "",
      docUrl: "https://docs.google.com/document/d/example",
      summary:
        "We optimized file upload processing by 25%, restructured the codebase for stronger data security, and added caching for faster repeated queries.",
      status: "pending",
    },
    {
      id: "placeholder-2",
      title: "Week 3: Billing Dashboard & Mobile Improvements",
      date: "Jan 15, 2026",
      videoUrl: "",
      docUrl: "https://docs.google.com/document/d/example2",
      summary:
        "Launched subscription management, improved payment history visibility, and resolved key mobile navigation issues.",
      status: "completed",
    },
  ]

  const displayUpdates =
    transformedUpdates.length > 0 ? transformedUpdates : placeholderUpdates
  const [statusMap, setStatusMap] = useState<Record<string, "pending_review" | "completed">>({})

  useEffect(() => {
    const nextStatuses = Object.fromEntries(
      displayUpdates.map((update) => [
        update.id,
        update.status === "completed" ? "completed" : "pending_review",
      ])
    )
    setStatusMap(nextStatuses)
  }, [displayUpdates])

  const completedCount = Object.values(statusMap).filter(
    (status) => status === "completed"
  ).length

  const toggleStatus = (updateId: string) => {
    setStatusMap((prev) => ({
      ...prev,
      [updateId]: prev[updateId] === "completed" ? "pending_review" : "completed",
    }))
  }

  return (
    <TabsContent value="updates" className="space-y-8 mt-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold">Recent Updates</h2>
          <div className="text-sm text-muted-foreground">
            {completedCount}/{displayUpdates.length} updates completed
          </div>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{
              width: `${(completedCount / Math.max(displayUpdates.length, 1)) * 100}%`,
            }}
          />
        </div>
      </div>

      {isLoadingUpdates ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading updates...
        </div>
      ) : (
        <div className="space-y-6">
          {displayUpdates.map((update) => {
            const status = statusMap[update.id] || "pending_review"
            const isCompleted = status === "completed"
            return (
              <Card key={update.id} className="p-0 overflow-hidden border bg-card">
                <CardContent className="p-6 space-y-5">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold">{update.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {update.date}
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-xs px-2.5 py-1",
                        isCompleted
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                      )}
                    >
                      {isCompleted ? "Completed" : "Pending Review"}
                    </Badge>
                  </div>

                  <div className="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-6">
                    <div className="space-y-3">
                      <div className="aspect-video rounded-xl bg-muted/60 border flex items-center justify-center relative overflow-hidden">
                        <Video className="h-8 w-8 text-muted-foreground" />
                        <span className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/10" />
                      </div>
                      <Button variant="secondary" className="w-full justify-start gap-10" asChild>
                        <Link href={update.docUrl || "#"}>
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary">
                            <FileText className="h-4 w-4" />
                          </span>
                          View Google Doc
                        </Link>
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {update.summary}
                      </p>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <Button
                          variant={isCompleted ? "outline" : "default"}
                          onClick={() => toggleStatus(update.id)}
                        >
                          {isCompleted ? "Mark as Pending" : "Mark as Completed"}
                        </Button>
                      </div>
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
