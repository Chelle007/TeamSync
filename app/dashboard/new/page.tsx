"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Zap, 
  ArrowLeft, 
  Loader2, 
  FolderPlus, 
  Globe, 
  GitBranch,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Lock
} from "lucide-react"
import { toast } from "sonner"
import { parseGitHubUrl, verifyGitHubRepoAccess, type GitHubRepoData } from "@/lib/github"
import { createClient } from "@/utils/supabase/client"

type RepoVerificationStatus = "idle" | "verifying" | "verified" | "error"

export default function NewProjectPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    projectUrl: "",
    githubRepo: "",
  })
  
  // GitHub verification state
  const [repoStatus, setRepoStatus] = useState<RepoVerificationStatus>("idle")
  const [repoError, setRepoError] = useState<string>("")
  const [repoData, setRepoData] = useState<GitHubRepoData | null>(null)

  const verifyRepo = async () => {
    if (!formData.githubRepo.trim()) {
      setRepoStatus("idle")
      setRepoError("")
      setRepoData(null)
      return
    }

    // Quick validation before API call
    const parsed = parseGitHubUrl(formData.githubRepo)
    if (!parsed) {
      setRepoStatus("error")
      setRepoError("Invalid GitHub URL format. Use: https://github.com/owner/repo")
      setRepoData(null)
      return
    }

    setRepoStatus("verifying")
    setRepoError("")

    try {
      // Get the user's GitHub access token from Supabase session
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.provider_token) {
        setRepoStatus("error")
        setRepoError("Please sign in with GitHub to verify repository access.")
        return
      }

      const result = await verifyGitHubRepoAccess(formData.githubRepo, session.provider_token)
      
      if (result.success && result.repoData) {
        setRepoStatus("verified")
        setRepoData(result.repoData)
        setRepoError("")
        
        // Auto-fill project name if empty
        if (!formData.name.trim() && result.repoData.name) {
          setFormData(prev => ({
            ...prev,
            name: result.repoData!.name.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())
          }))
        }
        
        // Auto-fill description if empty
        if (!formData.description.trim() && result.repoData.description) {
          setFormData(prev => ({
            ...prev,
            description: result.repoData!.description || ""
          }))
        }
      } else {
        setRepoStatus("error")
        setRepoError(result.error || "Failed to verify repository")
        setRepoData(null)
      }
    } catch {
      setRepoStatus("error")
      setRepoError("Failed to verify repository. Please try again.")
      setRepoData(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error("Please enter a project name")
      return
    }

    // If GitHub repo is provided, it must be verified
    if (formData.githubRepo.trim() && repoStatus !== "verified") {
      toast.error("Please verify your GitHub repository access first")
      return
    }

    setIsLoading(true)

    try {
      // TODO: Save to Supabase
      // const supabase = createClient()
      // const { data, error } = await supabase.from('projects').insert({...})
      
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast.success("Project created successfully!")
      
      // Generate a slug from the project name
      const slug = formData.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
      router.push(`/dashboard/${slug}/generate`)
    } catch {
      toast.error("Failed to create project. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">TeamSync</span>
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FolderPlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Create New Project</CardTitle>
                <CardDescription>
                  Set up a new project to start generating updates
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* GitHub Repo - First, for auto-fill */}
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="githubRepo">
                  GitHub Repository
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="githubRepo"
                      type="text"
                      placeholder="https://github.com/username/repo"
                      value={formData.githubRepo}
                      onChange={(e) => {
                        setFormData({ ...formData, githubRepo: e.target.value })
                        setRepoStatus("idle")
                        setRepoError("")
                        setRepoData(null)
                      }}
                      className="pl-10"
                    />
                  </div>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={verifyRepo}
                    disabled={!formData.githubRepo.trim() || repoStatus === "verifying"}
                  >
                    {repoStatus === "verifying" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : repoStatus === "verified" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      "Verify"
                    )}
                  </Button>
                </div>
                
                {/* Verification Status */}
                {repoStatus === "verified" && repoData && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                        Repository verified
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {repoData.full_name}
                        {repoData.private && (
                          <Badge variant="secondary" className="ml-2 text-[10px] py-0">
                            <Lock className="h-2.5 w-2.5 mr-1" />
                            Private
                          </Badge>
                        )}
                      </p>
                    </div>
                  </div>
                )}
                
                {repoStatus === "error" && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">{repoError}</p>
                  </div>
                )}

                {repoStatus === "idle" && formData.githubRepo.trim() && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Click "Verify" to check repository access
                  </p>
                )}
                
                {!formData.githubRepo.trim() && (
                  <p className="text-xs text-muted-foreground">
                    Link your GitHub repo to auto-fill project details and analyze commits
                  </p>
                )}
              </div>

              {/* Project Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="name">
                  Project Name <span className="text-destructive">*</span>
                </label>
                <Input
                  id="name"
                  placeholder="e.g., E-commerce Website Redesign"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="description">
                  Description
                </label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the project..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="min-h-[100px]"
                />
              </div>

              {/* Project URL */}
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="projectUrl">
                  Staging/Preview URL
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="projectUrl"
                    type="url"
                    placeholder="https://staging.example.com"
                    value={formData.projectUrl}
                    onChange={(e) => setFormData({ ...formData, projectUrl: e.target.value })}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  The live site URL for video recordings
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" className="flex-1" asChild>
                  <Link href="/dashboard">Cancel</Link>
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={isLoading || (formData.githubRepo.trim() && repoStatus !== "verified")}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <FolderPlus className="h-4 w-4" />
                      Create Project
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
