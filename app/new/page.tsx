"use client"

import { useState, useEffect } from "react"
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
  Lock,
  Upload,
  FileText,
  X
} from "lucide-react"
import { toast } from "sonner"
import { parseGitHubUrl, verifyGitHubRepoAccess, type GitHubRepoData } from "@/lib/github"
import { createClient } from "@/utils/supabase/client"

type RepoVerificationStatus = "idle" | "verifying" | "verified" | "error"

export default function NewProjectPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    projectScope: "",
    projectUrl: "",
    githubRepo: "",
  })
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [scopeInputType, setScopeInputType] = useState<"text" | "pdf">("text")
  
  // GitHub verification state
  const [repoStatus, setRepoStatus] = useState<RepoVerificationStatus>("idle")
  const [repoError, setRepoError] = useState<string>("")
  const [repoData, setRepoData] = useState<GitHubRepoData | null>(null)

  // Check if we have a pending verification after OAuth redirect
  useEffect(() => {
    const pendingRepo = sessionStorage.getItem("pending_verify_repo")
    if (pendingRepo && formData.githubRepo !== pendingRepo) {
      setFormData(prev => ({ ...prev, githubRepo: pendingRepo }))
      sessionStorage.removeItem("pending_verify_repo")
      // Auto-trigger verification after a short delay
      setTimeout(() => {
        verifyRepo()
      }, 500)
    }
  }, [])

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

      // First, try to verify with current token
      let result = await verifyGitHubRepoAccess(formData.githubRepo, session.provider_token)
      
      // If verification failed, check if it might be a private repo that needs repo scope
      if (!result.success) {
        // The error could be:
        // 1. Repo truly doesn't exist (404)
        // 2. Private repo we can't access without repo scope (404)
        // 3. We don't have access (403)
        
        // Check if we can access the repo endpoint at all
        const repoCheckResponse = await fetch(
          `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
          {
            headers: {
              Authorization: `Bearer ${session.provider_token}`,
              Accept: "application/vnd.github.v3+json",
            },
          }
        )

        // If we can access the repo info, check if it's private
        if (repoCheckResponse.ok) {
          const repoData = await repoCheckResponse.json()
          if (repoData.private) {
            // It's a private repo - we need repo scope to fully access it
            // Store the repo URL in sessionStorage for after OAuth redirect
            sessionStorage.setItem("pending_verify_repo", formData.githubRepo)
            
            // Request additional scopes via OAuth
            const { error: oauthError } = await supabase.auth.signInWithOAuth({
              provider: "github",
              options: {
                redirectTo: `${window.location.origin}/auth/callback?role=developer&verify_repo=true`,
                queryParams: {
                  scope: "repo read:user user:email",
                },
              },
            })

            if (oauthError) {
              setRepoStatus("error")
              setRepoError("Failed to request repository access. Please try again.")
              setRepoData(null)
            }
            // OAuth will redirect, so we don't need to update status here
            return
          } else {
            // Repo exists and is public, but verification still failed
            // This shouldn't happen, but show the error
            setRepoStatus("error")
            setRepoError(result.error || "Failed to verify repository")
            setRepoData(null)
            return
          }
        } else if (repoCheckResponse.status === 404) {
          // Repo endpoint returns 404 - could be:
          // 1. Repo truly doesn't exist
          // 2. Private repo we have no access to (GitHub returns 404 for private repos without repo scope)
          
          // For private repos, GitHub returns 404 when you don't have repo scope
          // So we should offer to request repo scope as a possibility
          // Store the repo URL in sessionStorage for after OAuth redirect
          sessionStorage.setItem("pending_verify_repo", formData.githubRepo)
          
          // Request additional scopes via OAuth
          const { error: oauthError } = await supabase.auth.signInWithOAuth({
            provider: "github",
            options: {
              redirectTo: `${window.location.origin}/auth/callback?role=developer&verify_repo=true`,
              queryParams: {
                scope: "repo read:user user:email",
              },
            },
          })

          if (oauthError) {
            setRepoStatus("error")
            setRepoError("Failed to request repository access. Please try again.")
            setRepoData(null)
          }
          // OAuth will redirect, so we don't need to update status here
          return
        } else {
          // Some other error (401, 403, etc.)
          setRepoStatus("error")
          setRepoError(result.error || "Failed to verify repository")
          setRepoData(null)
          return
        }
      }
      
      // If verification succeeded
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
        
        // Auto-fill project scope if empty (from GitHub repo description)
        if (!formData.projectScope.trim() && result.repoData.description) {
          setFormData(prev => ({
            ...prev,
            projectScope: result.repoData!.description || ""
          }))
        }
      } else {
        setRepoStatus("error")
        setRepoError(result.error || "Failed to verify repository")
        setRepoData(null)
      }
    } catch (error) {
      console.error("Verify error:", error)
      setRepoStatus("error")
      setRepoError("Failed to verify repository. Please try again.")
      setRepoData(null)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Please upload a PDF file')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('PDF file size must be less than 10MB')
        return
      }
      setPdfFile(file)
      setScopeInputType('pdf')
    }
  }

  const handleRemovePdf = () => {
    setPdfFile(null)
    setScopeInputType('text')
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

    // Check if project scope is provided
    if (scopeInputType === 'text' && !formData.projectScope.trim() && !pdfFile) {
      toast.error("Please provide a project scope (text or PDF)")
      return
    }

    setIsLoading(true)
    setIsSummarizing(true)

    try {
      const supabase = createClient()
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        toast.error("Please sign in to create a project")
        router.push("/login")
        return
      }

      // Generate summary and project scope using OpenAI
      let summary = ''
      let projectScope = ''
      let pdfPath: string | null = null

      if (scopeInputType === 'pdf' && pdfFile) {
        // Upload PDF and get summary + project scope
        const summarizeFormData = new FormData()
        summarizeFormData.append('pdfFile', pdfFile)

        const summarizeResponse = await fetch('/api/projects/summarize', {
          method: 'POST',
          body: summarizeFormData,
        })

        if (!summarizeResponse.ok) {
          const error = await summarizeResponse.json()
          throw new Error(error.error || 'Failed to generate summary')
        }

        const summarizeData = await summarizeResponse.json()
        summary = summarizeData.summary
        projectScope = summarizeData.project_scope || ''
        pdfPath = summarizeData.pdfPath
      } else if (formData.projectScope.trim()) {
        // Get summary and project scope from text
        const summarizeFormData = new FormData()
        summarizeFormData.append('projectScope', formData.projectScope.trim())

        const summarizeResponse = await fetch('/api/projects/summarize', {
          method: 'POST',
          body: summarizeFormData,
        })

        if (!summarizeResponse.ok) {
          const error = await summarizeResponse.json()
          throw new Error(error.error || 'Failed to generate summary')
        }

        const summarizeData = await summarizeResponse.json()
        summary = summarizeData.summary
        projectScope = summarizeData.project_scope || formData.projectScope.trim()
      }

      setIsSummarizing(false)

      // Create project using database function (handles both project and project_user in one transaction)
      const { data: newProject, error: projectError } = await supabase
        .rpc('create_project_with_owner', {
          p_name: formData.name.trim(),
          p_github_url: formData.githubRepo.trim() || null,
          p_live_url: formData.projectUrl.trim() || null,
          p_summary: summary || null,
          p_project_scope: projectScope || null,
          p_status: 'active',
          p_progress: 0,
        })

      if (projectError) {
        console.error("Error creating project:", projectError)
        toast.error(projectError.message || "Failed to create project. Please try again.")
        return
      }

      // The function returns an array, get the first result
      const project = Array.isArray(newProject) ? newProject[0] : newProject
      
      if (!project || !project.id) {
        toast.error("Failed to create project. Please try again.")
        return
      }

      toast.success("Project created successfully!")
      
      // If PDF was uploaded to temp folder, move it to project folder
      if (pdfPath && pdfPath.startsWith('temp/')) {
        try {
          const supabase = createClient()
          
          // Download from temp location
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('project-documents')
            .download(pdfPath)

          if (!downloadError && fileData) {
            // Extract filename from temp path
            const fileName = pdfPath.split('/').pop() || `project-scope-${Date.now()}.pdf`
            const newPath = `${project.id}/${fileName}`

            // Upload to project folder
            const { error: uploadError } = await supabase.storage
              .from('project-documents')
              .upload(newPath, fileData, {
                contentType: 'application/pdf',
                upsert: false,
              })

            if (!uploadError) {
              // Delete temp file
              await supabase.storage
                .from('project-documents')
                .remove([pdfPath])
            }
          }
        } catch (error) {
          console.error('Error moving PDF file:', error)
          // Don't block project creation if file move fails
        }
      }
      
      // Automatically generate Update 1 if GitHub repo is linked
      if (formData.githubRepo.trim()) {
        // Generate Update 1 in the background (don't wait for it)
        fetch(`/api/projects/${project.id}/updates`, {
          method: 'POST',
        })
          .then(async (response) => {
            if (response.ok) {
              toast.success("Update 1 generated successfully!")
            } else {
              const data = await response.json()
              console.error('Failed to generate Update 1:', data.error)
              // Don't show error toast - it's not critical, user can generate manually
            }
          })
          .catch((error) => {
            console.error('Error generating Update 1:', error)
            // Don't show error toast - it's not critical
          })
      }
      
      // Redirect to project page
      router.push(`/${project.id}`)
    } catch (error) {
      console.error("Error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to create project. Please try again.")
    } finally {
      setIsLoading(false)
      setIsSummarizing(false)
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
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">New Project</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        {/* Back link */}
        <Link
          href="/"
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

              {/* Project Scope */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Project Scope
                </label>
                
                {/* Input Type Toggle */}
                <div className="flex gap-2 mb-2">
                  <Button
                    type="button"
                    variant={scopeInputType === "text" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setScopeInputType("text")
                      setPdfFile(null)
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Paste Text
                  </Button>
                  <Button
                    type="button"
                    variant={scopeInputType === "pdf" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setScopeInputType("pdf")}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload PDF
                  </Button>
                </div>

                {/* Text Input */}
                {scopeInputType === "text" && (
                  <Textarea
                    id="projectScope"
                    placeholder="Paste your project scope here... (e.g., features, requirements, goals, etc.)"
                    value={formData.projectScope}
                    onChange={(e) => setFormData({ ...formData, projectScope: e.target.value })}
                    className="min-h-[150px]"
                  />
                )}

                {/* PDF Upload */}
                {scopeInputType === "pdf" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="pdf-upload"
                        className="flex-1 cursor-pointer"
                      >
                        <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                          {pdfFile ? (
                            <div className="space-y-2">
                              <FileText className="h-8 w-8 mx-auto text-primary" />
                              <p className="text-sm font-medium">{pdfFile.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                              <p className="text-sm font-medium">
                                Click to upload PDF
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Max 10MB
                              </p>
                            </div>
                          )}
                        </div>
                      </label>
                      <input
                        id="pdf-upload"
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      {pdfFile && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={handleRemovePdf}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      AI will extract and summarize the project scope from your PDF
                    </p>
                  </div>
                )}
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
                  <Link href="/">Cancel</Link>
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={isLoading || isSummarizing || (formData.githubRepo.trim() && repoStatus !== "verified")}
                >
                  {isLoading || isSummarizing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {isSummarizing ? "Generating summary..." : "Creating..."}
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
