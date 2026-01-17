"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Zap, 
  Globe, 
  GitBranch, 
  FileText, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft,
  Check,
  Loader2,
  Video,
  ExternalLink,
  ChevronLeft,
  FolderOpen
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// Placeholder function for backend integration
async function triggerUpdateGeneration(data: {
  projectId: string
  projectUrl: string
  githubRepo: string
  notes: string
}) {
  // TODO: Connect to Puppeteer/FFmpeg/Google Docs backend
  console.log("Triggering update generation with:", data)
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 2000))
  return { success: true, updateId: "update-" + Date.now() }
}

const steps = [
  {
    id: 1,
    title: "Project Links",
    description: "Connect your project",
    icon: Globe,
  },
  {
    id: 2,
    title: "Requirements",
    description: "What changed?",
    icon: FileText,
  },
  {
    id: 3,
    title: "Generate",
    description: "Create update",
    icon: Sparkles,
  },
]

// Mock project data (in real app, fetch from Supabase)
const getProjectData = (projectId: string) => {
  const projects: Record<string, { name: string; description?: string; projectUrl?: string; githubRepo?: string }> = {
    "batam-spa": { name: "Batam1SPA Website", description: "Wellness and spa booking platform", projectUrl: "https://batam1spa.com", githubRepo: "https://github.com/batam/spa-web" },
    "krit-design": { name: "Krit Design Club", description: "Design agency portfolio", projectUrl: "https://krit.design" },
    "demo-project": { name: "E-commerce Platform", description: "Full-stack e-commerce solution", projectUrl: "https://staging.techstart.io" },
    "fitness-app": { name: "FitTrack Mobile App", description: "Fitness tracking app" },
    "restaurant-site": { name: "Sakura Restaurant", description: "Japanese restaurant website" },
  }
  return projects[projectId] || { name: projectId.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) }
}

export default function GeneratorWizard() {
  const params = useParams()
  const projectId = params.projectId as string
  const projectData = getProjectData(projectId)

  const [currentStep, setCurrentStep] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  
  // Form state - pre-fill with project data if available
  const [projectUrl, setProjectUrl] = useState(projectData.projectUrl || "")
  const [githubRepo, setGithubRepo] = useState(projectData.githubRepo || "")
  const [notes, setNotes] = useState("")

  const handleNext = () => {
    if (currentStep === 1) {
      if (!projectUrl.trim()) {
        toast.error("Please enter a project URL")
        return
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, 3))
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    toast.loading("Processing your update...", { id: "generating" })

    try {
      await triggerUpdateGeneration({
        projectId,
        projectUrl,
        githubRepo,
        notes,
      })

      toast.success("Update generated successfully!", { id: "generating" })
      setIsComplete(true)
    } catch {
      toast.error("Failed to generate update. Please try again.", { id: "generating" })
    } finally {
      setIsGenerating(false)
    }
  }

  const resetForm = () => {
    setCurrentStep(1)
    setIsComplete(false)
    setNotes("")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">TeamSync</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/portal/${projectId}`}>
                View Reviewer Portal
                <ExternalLink className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Back to projects */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Projects
        </Link>

        {/* Project Info */}
        <div className="mb-8 p-4 rounded-lg bg-muted/50 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FolderOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">{projectData.name}</h1>
              {projectData.description && (
                <p className="text-sm text-muted-foreground">{projectData.description}</p>
              )}
            </div>
            <Badge variant="secondary" className="ml-auto">
              New Update
            </Badge>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
                      currentStep > step.id
                        ? "bg-primary text-primary-foreground"
                        : currentStep === step.id
                        ? "bg-primary/10 text-primary border-2 border-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {currentStep > step.id ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <step.icon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <p className={cn(
                      "text-sm font-medium",
                      currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground hidden sm:block">
                      {step.description}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "w-full h-0.5 mx-4 mt-[-24px]",
                      currentStep > step.id ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="animate-fade-in">
          {!isComplete ? (
            <>
              {/* Step 1: Project Links */}
              {currentStep === 1 && (
                <>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-primary" />
                      Project Links
                    </CardTitle>
                    <CardDescription>
                      Enter your staging site and GitHub repository
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="projectUrl">
                        Project URL <span className="text-destructive">*</span>
                      </label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="projectUrl"
                          type="url"
                          placeholder="https://staging.yourproject.com"
                          value={projectUrl}
                          onChange={(e) => setProjectUrl(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        The live staging site to record for the video update
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="githubRepo">
                        GitHub Repository
                      </label>
                      <div className="relative">
                        <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="githubRepo"
                          type="url"
                          placeholder="https://github.com/username/repo"
                          value={githubRepo}
                          onChange={(e) => setGithubRepo(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Optional: We'll analyze recent commits for context
                      </p>
                    </div>
                  </CardContent>
                </>
              )}

              {/* Step 2: Requirements */}
              {currentStep === 2 && (
                <>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Requirements & Notes
                    </CardTitle>
                    <CardDescription>
                      Describe what changed or paste your requirements
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="notes">
                        What Changed?
                      </label>
                      <Textarea
                        id="notes"
                        placeholder={`Example:
• Added new billing dashboard
• Fixed mobile navigation bug
• Implemented user profile settings
• Updated color scheme per feedback`}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="min-h-[200px]"
                      />
                      <p className="text-xs text-muted-foreground">
                        This helps the AI create a more focused and accurate update
                      </p>
                    </div>

                    {/* Quick templates */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Quick Templates</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          "Weekly progress update",
                          "Bug fixes",
                          "New feature",
                          "Design changes",
                        ].map((template) => (
                          <Button
                            key={template}
                            variant="outline"
                            size="sm"
                            onClick={() => setNotes((prev) => prev + (prev ? "\n• " : "• ") + template)}
                          >
                            {template}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </>
              )}

              {/* Step 3: Generate */}
              {currentStep === 3 && (
                <>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Ready to Generate
                    </CardTitle>
                    <CardDescription>
                      Review your inputs and generate the update
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Summary */}
                    <div className="rounded-lg bg-muted/50 p-4 space-y-4">
                      <div className="flex items-start gap-3">
                        <Globe className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Project URL</p>
                          <p className="text-sm text-muted-foreground break-all">
                            {projectUrl || "Not provided"}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <GitBranch className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">GitHub Repository</p>
                          <p className="text-sm text-muted-foreground break-all">
                            {githubRepo || "Not provided"}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Notes</p>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {notes || "Not provided"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* What will be generated */}
                    <div className="space-y-3">
                      <p className="text-sm font-medium">This will generate:</p>
                      <div className="grid gap-2">
                        {[
                          { icon: Video, text: "Video walkthrough of changes" },
                          { icon: FileText, text: "Google Doc with technical summary" },
                          { icon: Sparkles, text: "AI-powered summary for reviewers" },
                        ].map((item) => (
                          <div key={item.text} className="flex items-center gap-2 text-sm">
                            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                              <item.icon className="h-3.5 w-3.5 text-primary" />
                            </div>
                            {item.text}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Generate button */}
                    <Button
                      size="lg"
                      className="w-full"
                      onClick={handleGenerate}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Generate Update
                        </>
                      )}
                    </Button>
                  </CardContent>
                </>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between p-6 pt-0">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                {currentStep < 3 && (
                  <Button onClick={handleNext}>
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </>
          ) : (
            /* Success State */
            <CardContent className="py-12">
              <div className="text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                  <Check className="h-10 w-10 text-emerald-500" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">Update Generated!</h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Your video update for <strong>{projectData.name}</strong> has been created and is now available in the reviewer portal.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button asChild>
                    <Link href={`/portal/${projectId}`}>
                      View in Portal
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="outline" onClick={resetForm}>
                    Generate Another
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link href="/dashboard">
                      Back to Projects
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </main>
    </div>
  )
}
