"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  ArrowLeft,
  FileText,
  Upload,
  ExternalLink,
  GitBranch,
  Globe,
  Calendar,
  X,
  Download,
  Loader2,
  FolderOpen,
  CheckCircle2,
  GitCommit,
  User,
  Clock,
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface Project {
  id: string
  name: string
  github_url?: string
  live_url?: string
  summary?: string
  status: "active" | "paused" | "completed"
  progress: number
  created_at: string
  updated_at: string
}

interface Document {
  name: string
  size: number
  created_at: string
  updated_at: string
  url: string
}

interface Commit {
  sha: string
  message: string
  author: {
    name: string
    email: string
    avatar: string | null
    login: string | null
  }
  date: string
  url: string
  stats: {
    additions?: number
    deletions?: number
    total?: number
  } | null
}

export default function ProjectSummaryPage() {
  const params = useParams()
  const projectId = params.projectId as string
  
  const [project, setProject] = useState<Project | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [commits, setCommits] = useState<Commit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingCommits, setIsLoadingCommits] = useState(false)
  const [needsRepoScope, setNeedsRepoScope] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    fetchProject()
    fetchDocuments()
  }, [projectId])

  useEffect(() => {
    if (project?.github_url) {
      fetchCommits()
    }
  }, [project?.github_url])

  // Check if we need to request repo scope after OAuth redirect
  useEffect(() => {
    const pendingRepoScope = sessionStorage.getItem("pending_repo_scope_project")
    if (pendingRepoScope === projectId) {
      sessionStorage.removeItem("pending_repo_scope_project")
      // Retry fetching commits after a short delay
      setTimeout(() => {
        fetchCommits()
      }, 500)
    }
  }, [projectId])

  const fetchProject = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single()

      if (error) throw error
      setProject(data)
    } catch (error) {
      console.error("Error fetching project:", error)
      toast.error("Failed to load project")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/documents`)
      if (!response.ok) throw new Error("Failed to fetch documents")
      
      const data = await response.json()
      setDocuments(data.documents || [])
    } catch (error) {
      console.error("Error fetching documents:", error)
      toast.error("Failed to load documents")
    }
  }

  const fetchCommits = async () => {
    if (!project?.github_url) return
    
    setIsLoadingCommits(true)
    setNeedsRepoScope(false)
    try {
      const response = await fetch(`/api/projects/${projectId}/commits`)
      if (!response.ok) {
        const error = await response.json() as { error?: string; message?: string }
        
        // Check if we need repo scope for private repos
        if (error.error === 'REPO_SCOPE_REQUIRED') {
          setNeedsRepoScope(true)
          return
        }
        
        // Handle 404 - could be private repo without access or actually not found
        if (response.status === 404) {
          // Check if the error message suggests it might need repo scope
          if (error.error === 'REPOSITORY_NOT_FOUND' || error.message?.includes('private')) {
            // Try to check if it's a private repo that needs repo scope
            const supabase = createClient()
            const { data: { session } } = await supabase.auth.getSession()
            
            if (session?.provider_token) {
              // Check if repo exists and is private
              try {
                const repoUrl = project.github_url
                const repoMatch = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/)
                if (repoMatch) {
                  const [, owner, repo] = repoMatch
                  const repoCheck = await fetch(
                    `https://api.github.com/repos/${owner}/${repo}`,
                    {
                      headers: {
                        Authorization: `Bearer ${session.provider_token}`,
                        Accept: 'application/vnd.github.v3+json',
                      },
                    }
                  )
                  
                  if (repoCheck.ok) {
                    const repoData = await repoCheck.json()
                    if (repoData.private) {
                      // It's a private repo, we need repo scope
                      setNeedsRepoScope(true)
                      return
                    }
                  }
                }
              } catch (checkError) {
                // If check fails, just show the not found message
                console.error("Error checking repo:", checkError)
              }
            }
          }
          
          // If we get here, it's likely actually not found or no access
          // Don't throw error, just show empty state
          setCommits([])
          return
        }
        
        // Don't show error toast if it's just missing GitHub auth or invalid format
        if (response.status !== 400 && response.status !== 401) {
          // Log but don't throw - commits are optional
          console.error("Error fetching commits:", error.error || "Unknown error")
        }
        return
      }
      
      const data = await response.json()
      setCommits(data.commits || [])
      setNeedsRepoScope(false)
    } catch (error) {
      console.error("Error fetching commits:", error)
      // Silently fail - commits are optional
      setCommits([])
    } finally {
      setIsLoadingCommits(false)
    }
  }

  const requestRepoScope = async () => {
    try {
      const supabase = createClient()
      
      // Store project ID in sessionStorage for after OAuth redirect
      sessionStorage.setItem("pending_repo_scope_project", projectId)
      
      // Request repo scope via OAuth
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?role=developer&redirect_to=${encodeURIComponent(`/${projectId}/summary`)}`,
          queryParams: {
            scope: "repo read:user user:email",
          },
        },
      })

      if (oauthError) {
        toast.error("Failed to request repository access. Please try again.")
        console.error("OAuth error:", oauthError)
      }
      // OAuth will redirect, so we don't need to update state here
    } catch (error) {
      console.error("Error requesting repo scope:", error)
      toast.error("Failed to request repository access. Please try again.")
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch(`/api/projects/${projectId}/documents`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload document')
      }

      toast.success("Document uploaded successfully!")
      setSelectedFile(null)
      // Reset file input
      const fileInput = document.getElementById('pdf-upload') as HTMLInputElement
      if (fileInput) fileInput.value = ''
      
      // Refresh documents list
      fetchDocuments()
    } catch (error) {
      console.error("Upload error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to upload document")
    } finally {
      setIsUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric", 
      year: "numeric" 
    })
  }

  const formatCommitDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "just now"
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
    
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric", 
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined
    })
  }

  const truncateCommitMessage = (message: string, maxLength: number = 80) => {
    if (message.length <= maxLength) return message
    const truncated = message.substring(0, maxLength)
    const lastNewline = truncated.lastIndexOf('\n')
    if (lastNewline > 0) {
      return truncated.substring(0, lastNewline) + '...'
    }
    return truncated + '...'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Project not found</p>
          <Button asChild className="mt-4">
            <Link href="/">Back to Projects</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md">
              <img src="/logo.png" alt="TeamSync" className="h-13 w-13" />
            </div>
            <span className="text-xl font-bold tracking-tight">TeamSync</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${projectId}`}>
                View Portal
                <ExternalLink className="h-3 w-3 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Back link */}
        <Link
          href={`/${projectId}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Project
        </Link>

        {/* Project Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FolderOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{project.name}</CardTitle>
                  <CardDescription className="mt-1">
                    Created {formatDate(project.created_at)}
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant={project.status === "active" ? "default" : "secondary"}
                className="text-sm"
              >
                {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Project Summary */}
            {project.summary && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Project Summary</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {project.summary}
                </p>
              </div>
            )}

            {/* Project Links */}
            <div className="grid sm:grid-cols-2 gap-4">
              {project.github_url && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                  <GitBranch className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">GitHub Repository</p>
                    <a
                      href={project.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium hover:text-primary transition-colors truncate block"
                    >
                      {project.github_url}
                      <ExternalLink className="h-3 w-3 inline ml-1" />
                    </a>
                  </div>
                </div>
              )}

              {project.live_url && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Live URL</p>
                    <a
                      href={project.live_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium hover:text-primary transition-colors truncate block"
                    >
                      {project.live_url}
                      <ExternalLink className="h-3 w-3 inline ml-1" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{project.progress}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Commit History Section */}
        {project.github_url && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <GitCommit className="h-5 w-5" />
                    Commit History
                  </CardTitle>
                  <CardDescription>
                    Recent commits from the GitHub repository
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingCommits ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : needsRepoScope ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <GitCommit className="h-8 w-8 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Private Repository Access Required</p>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                      This is a private repository. Please grant TeamSync access to view commit history.
                    </p>
                  </div>
                  <Button onClick={requestRepoScope} className="mt-4">
                    <GitBranch className="h-4 w-4 mr-2" />
                    Grant Repository Access
                  </Button>
                </div>
              ) : commits.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <GitCommit className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No commits found or unable to fetch commits</p>
                  <p className="text-xs mt-1">Make sure you're signed in with GitHub and have access to the repository</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {commits.map((commit) => (
                    <div
                      key={commit.sha}
                      className="flex gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors group relative"
                    >
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {commit.author.avatar ? (
                          <img
                            src={commit.author.avatar}
                            alt={commit.author.name}
                            className="w-8 h-8 rounded-full border-2 border-background"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border-2 border-background">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                        )}
                      </div>

                      {/* Commit details */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <a
                              href={commit.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium hover:text-primary transition-colors line-clamp-2 group-hover:underline"
                            >
                              {truncateCommitMessage(commit.message)}
                            </a>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                {commit.author.login || commit.author.name}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatCommitDate(commit.date)}
                              </span>
                              {commit.stats && (
                                <>
                                  <span>•</span>
                                  <span className="text-green-600 dark:text-green-400">
                                    +{commit.stats.additions || 0}
                                  </span>
                                  <span className="text-red-600 dark:text-red-400">
                                    -{commit.stats.deletions || 0}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <a
                            href={commit.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary" />
                          </a>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <code className="text-xs px-2 py-0.5 rounded bg-muted font-mono">
                            {commit.sha.substring(0, 7)}
                          </code>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Documents Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Project Documents</CardTitle>
                <CardDescription>
                  Upload and manage PDF documents related to this project
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Upload Section */}
            <div className="space-y-4 p-4 rounded-lg border-2 border-dashed">
              <div className="flex items-center gap-4">
                <label
                  htmlFor="pdf-upload"
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    {selectedFile ? (
                      <>
                        <FileText className="h-5 w-5 text-primary" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(selectedFile.size)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault()
                            setSelectedFile(null)
                            const fileInput = document.getElementById('pdf-upload') as HTMLInputElement
                            if (fileInput) fileInput.value = ''
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Upload className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Click to upload PDF</p>
                          <p className="text-xs text-muted-foreground">
                            Max 10MB
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </label>
                <input
                  id="pdf-upload"
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {selectedFile && (
                  <Button
                    onClick={handleUpload}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Documents List */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Uploaded Documents</h3>
              {documents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No documents uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.name}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <FileText className="h-5 w-5 text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.name}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span>{formatFileSize(doc.size)}</span>
                          <span>•</span>
                          <span>Uploaded {formatDate(doc.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                        >
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View document"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                        >
                          <a
                            href={doc.url}
                            download
                            title="Download document"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
