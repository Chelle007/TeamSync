"use client"

import { Button } from "@/components/ui/button"
import { TabsContent } from "@/components/ui/tabs"
import { UpdateCard } from "@/components/update-card"
import { Video, Loader2 } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface Update {
  id: string
  title: string
  date: string
  videoUrl: string
  docUrl: string
  summary: string
  status: "completed" | "processing" | "pending"
}

interface UpdatesTabProps {
  isLoadingUpdates: boolean
  transformedUpdates: Update[]
  isDeveloperView: boolean
  projectId: string
}

export function UpdatesTab({
  isLoadingUpdates,
  transformedUpdates,
  isDeveloperView,
  projectId,
}: UpdatesTabProps) {
  return (
    <TabsContent value="updates" className="space-y-6 mt-8">
      {isLoadingUpdates ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Loading updates...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Timeline */}
          {transformedUpdates.length > 0 ? (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[19px] top-8 bottom-8 w-0.5 bg-gradient-to-b from-primary/20 via-primary/40 to-primary/20 hidden md:block" />
              
              <div className="space-y-8">
                {transformedUpdates.map((update, index) => (
                  <div key={update.id} className="flex gap-6 group">
                    {/* Timeline dot */}
                    <div className="hidden md:flex flex-col items-center">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center z-10 transition-all duration-300 shadow-lg",
                        update.status === "completed" 
                          ? "bg-primary text-primary-foreground group-hover:scale-110" 
                          : update.status === "processing"
                          ? "bg-amber-500 text-white animate-pulse shadow-amber-500/50"
                          : "bg-muted text-muted-foreground"
                      )}>
                        <Video className="h-4 w-4" />
                      </div>
                    </div>
                    
                    {/* Card */}
                    <div className="flex-1 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${index * 100}ms` }}>
                      <UpdateCard update={update} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Empty state placeholder */
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Video className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-bold mb-2">No updates yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Updates will appear here once generated. Start by creating your first project update.
              </p>
              {isDeveloperView && (
                <div className="flex gap-3 justify-center">
                  <Button asChild size="lg">
                    <Link href={`/${projectId}/summary`}>
                      <Video className="h-4 w-4 mr-2" />
                      Generate Update
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </TabsContent>
  )
}
