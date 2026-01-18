"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { TabsContent } from "@/components/ui/tabs"
import { Calendar, FileText, Video, Loader2, Clock, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import type { Update } from "@/types/database"

type UpdatesTabProps = {
  isLoadingUpdates: boolean
  updates: Update[]
}

export function UpdatesTab({
  isLoadingUpdates,
  updates,
}: UpdatesTabProps) {
  const [activeStep, setActiveStep] = useState(0)
  const stepRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const observerOptions = {
      root: null,
      // Trigger zone is exactly the middle of the viewport
      rootMargin: '-50% 0px -50% 0px', 
      threshold: 0
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = Number(entry.target.getAttribute('data-index'));
          setActiveStep(index);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    stepRefs.current.forEach((ref) => { if (ref) observer.observe(ref); });

    return () => observer.disconnect();
  }, [updates]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 }
  }

  return (
    <TabsContent value="updates" className="space-y-8 mt-4">
      {/* --- Header Section --- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-3xl font-bold">Project Updates</h2>
          </div>
          {updates.length > 0 && !isLoadingUpdates && (
            <p className="text-sm text-muted-foreground ml-13">
              {updates.length} {updates.length === 1 ? 'update' : 'updates'} total
            </p>
          )}
        </div>
      </div>

      {isLoadingUpdates ? (
        <Card className="shadow-md">
          <CardContent className="p-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading updates...</p>
          </CardContent>
        </Card>
      ) : updates.length === 0 ? (
        <Card className="shadow-md">
          <CardContent className="p-16 text-center">
            <div className="space-y-6 max-w-md mx-auto">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <FileText className="h-10 w-10 text-primary/60" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">No updates yet</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Generate your first update to track project progress.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* --- Timeline Layout --- */
        <div className="relative">
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {updates.map((update, index) => {
              const isCompleted = update.status === "completed"
              const isProcessing = update.status === "processing"
              
              // Determine active states
              const isActive = index <= activeStep; // We have reached this card
              const isPast = index < activeStep;    // We have scrolled PAST this card
              const isCurrent = index === activeStep; // This is the specific card in view

              return (
                <motion.div 
                  key={update.id} 
                  variants={itemVariants} 
                  ref={el => { stepRefs.current[index] = el }}
                  data-index={index}
                  // Increased Left Padding (pl-12 sm:pl-24) to push card away from line
                  className="relative group pb-12 pl-12 sm:pl-24 last:pb-0" 
                >
                  {/* --- 1. UPPER LINE (Top to Center) --- */}
                  {/* Connects from previous card to this dot. Visible on all except first item */}
                  {index !== 0 && (
                    <div 
                      className={cn(
                        "absolute left-4 sm:left-8 top-0 h-[50%] w-1 -translate-x-1/2 transition-colors duration-500",
                        isActive ? "bg-primary" : "bg-slate-200 dark:bg-slate-800"
                      )} 
                    />
                  )}

                  {/* --- 2. LOWER LINE (Center to Bottom) --- */}
                  {/* Connects this dot to next card. Visible on all except last item */}
                  {index !== updates.length - 1 && (
                    <div 
                      className={cn(
                        "absolute left-4 sm:left-8 bottom-0 h-[50%] w-1 -translate-x-1/2 transition-colors duration-500",
                        // Only colored if we have passed this stage (isPast)
                        isPast ? "bg-primary" : "bg-slate-200 dark:bg-slate-800"
                      )} 
                    />
                  )}

                  {/* --- 3. CENTERED DOT --- */}
                  <div className={cn(
                    "absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 flex items-center justify-center",
                  )}>
                    <div className={cn(
                      "h-6 w-6 rounded-full border-4 flex items-center justify-center transition-all duration-300",
                      isActive 
                        ? "border-primary/20 bg-primary shadow-[0_0_10px_rgba(var(--primary),0.3)] scale-110" 
                        : "border-slate-100 bg-slate-300 dark:border-slate-800 dark:bg-slate-700"
                    )}>
                      {isCurrent && (
                         <motion.div 
                           initial={{ scale: 0 }} animate={{ scale: 1 }}
                           className="h-2 w-2 bg-white rounded-full"
                         />
                      )}
                    </div>
                  </div>

                  <Card 
                    className={cn(
                      "shadow-md hover:shadow-lg transition-all duration-500 border overflow-hidden",
                      isCurrent 
                        ? "ring-1 ring-primary/40 -translate-y-1 shadow-primary/10" 
                        : "opacity-80 hover:opacity-100"
                    )}
                  >
                    <CardContent className="p-6 lg:p-8 space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-4 border-b">
                        <div className="space-y-3 flex-1">
                          <h3 className={cn("text-2xl font-bold leading-tight transition-colors", isCurrent ? "text-primary" : "text-foreground")}>
                            {update.title}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(update.created_at)}</span>
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-sm px-4 py-1.5 font-medium flex items-center gap-2 h-fit rounded-lg",
                            isCompleted ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                          )}
                        >
                          {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                          {update.status === "completed" ? "Completed" : "Pending"}
                        </Badge>
                      </div>

                      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-8">
                        <div className="space-y-4">
                            {update.video_url ? (
                            <div className="aspect-video rounded-xl bg-muted/30 border overflow-hidden shadow-lg group/video relative">
                              <video src={update.video_url} controls className="w-full h-full object-contain" preload="metadata" />
                            </div>
                          ) : (
                            <div className="aspect-video rounded-xl bg-gradient-to-br from-muted/60 to-muted/30 border flex items-center justify-center">
                              <Video className="h-10 w-10 text-muted-foreground/50 mx-auto" />
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col h-full gap-6">
                          <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="h-1 w-8 rounded-full bg-gradient-to-r from-primary to-primary/60" />
                              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Summary</h4>
                            </div>
                            <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">{update.summary}</p>
                          </div>
                          
                          {update.doc_url && (
                            <div className="mt-auto pt-4 border-t border-border/40">
                              <Button variant="outline" className="w-full justify-between hover:bg-primary/5" asChild>
                                <Link href={update.doc_url} target="_blank">
                                  <span className="flex items-center gap-3">
                                    <FileText className="h-4 w-4 text-primary" />
                                    <span className="font-medium">Read Documentation</span>
                                  </span>
                                  <span>→</span>
                                </Link>
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      )}
    </TabsContent>
  )
}