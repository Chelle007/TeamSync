"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Play, FileText, Calendar, ExternalLink } from "lucide-react"
import { useState, useRef } from "react"

interface Update {
  id: string
  title: string
  date: string
  videoUrl?: string
  docUrl?: string
  summary: string
  status: "completed" | "processing" | "pending"
}

interface UpdateCardProps {
  update: Update
}

export function UpdateCard({ update }: UpdateCardProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const statusVariant = {
    completed: "success",
    processing: "warning",
    pending: "secondary",
  } as const

  return (
    <Card className="group hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-lg">{update.title}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{update.date}</span>
            </div>
          </div>
          <Badge variant={statusVariant[update.status]}>
            {update.status === "processing" ? "Processing..." : update.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Video Player */}
        {update.videoUrl && (
          <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
            <video
              ref={videoRef}
              src={update.videoUrl}
              className="w-full h-full object-cover"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              controls
            />
            {!isPlaying && (
              <button
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors cursor-pointer"
              >
                <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                  <Play className="h-7 w-7 text-primary-foreground ml-1" fill="currentColor" />
                </div>
              </button>
            )}
          </div>
        )}

        {/* Placeholder for processing/pending */}
        {!update.videoUrl && (
          <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
            <div className="text-center space-y-2">
              {update.status === "processing" ? (
                <>
                  <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground">Generating video...</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Video pending</p>
              )}
            </div>
          </div>
        )}

        {/* AI Summary */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">AI Summary</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {update.summary}
          </p>
        </div>

        {/* Doc Link */}
        {update.docUrl && (
          <Button variant="outline" className="w-full" asChild>
            <a href={update.docUrl} target="_blank" rel="noopener noreferrer">
              <FileText className="h-4 w-4" />
              View Full Documentation
              <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
