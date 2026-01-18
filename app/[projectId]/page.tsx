"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { UpdateCard } from "@/components/update-card"
import { ChatInterface } from "@/components/chat-interface"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { Project, Update, UserProfile } from "@/types/database"
import { DashboardTab } from "./components/DashboardTab"
import { UpdatesTab } from "./components/UpdatesTab"
import { AssistantTab } from "./components/AssistantTab"
import { SettingsTab } from "./components/SettingsTab"
import {
  Video,
  MessageSquare,
  Bell,
  User,
  LogOut,
  Edit2,
  Check,
  X,
  LayoutGrid,
  Settings,
  BarChart3,
  Loader2,
  Calendar,
  GitBranch,
  ExternalLink,
  TrendingUp,
  Upload,
  FileText,
  Trash2,
  ArrowLeft,
  Pencil,
} from "lucide-react"

// Helper function to format date
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// User Profile Dropdown Component
function UserProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<{ email?: string; name?: string } | null>(null)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    async function fetchUser() {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const userName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split("@")[0] || "User"
        setUser({
          email: authUser.email,
          name: userName
        })
        setEditedName(userName)
      }
    }
    fetchUser()
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const handleSignOut = async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error("Failed to sign out")
    } else {
      toast.success("Signed out successfully")
      router.push("/login")
    }
  }

  const handleEditName = () => {
    setIsEditingName(true)
    setEditedName(user?.name || "")
  }

  const handleCancelEdit = () => {
    setIsEditingName(false)
    setEditedName(user?.name || "")
  }

  const handleSaveName = async () => {
    if (!editedName.trim()) {
      toast.error("Name cannot be empty")
      return
    }

    setIsSaving(true)
    try {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (authUser) {
        const { error } = await supabase.auth.updateUser({
          data: {
            ...authUser.user_metadata,
            full_name: editedName.trim(),
            name: editedName.trim()
          }
        })

        if (error) throw error

        setUser({
          ...user,
          name: editedName.trim()
        })
        setIsEditingName(false)
        toast.success("Name updated successfully")
      }
    } catch (error) {
      toast.error("Failed to update name")
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button 
        variant="ghost" 
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "transition-colors",
          isOpen && "bg-muted"
        )}
      >
        <User className="h-5 w-5" />
      </Button>

      {isOpen && (
        <Card className="absolute right-0 top-12 w-64 shadow-lg border z-50 animate-slide-up">
          <CardContent className="p-4 space-y-4">
            {/* User Info */}
            <div className="space-y-3 pb-3 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  {isEditingName ? (
                    <div className="space-y-2">
                      <Input
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="h-8 text-sm"
                        disabled={isSaving}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveName()
                          if (e.key === "Escape") handleCancelEdit()
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 px-2"
                          onClick={handleSaveName}
                          disabled={isSaving}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm truncate">
                        {user?.name || "User"}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={handleEditName}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email || ""}
                  </p>
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function ReviewerPortal() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = params.projectId as string
  const [activeTab, setActiveTab] = useState("dashboard")
  
  // Check URL for tab parameter
  useEffect(() => {
    const tabParam = searchParams.get("tab")
    if (tabParam && ["dashboard", "updates", "assistant", "settings"].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [searchParams])
  const [userRole, setUserRole] = useState<"developer" | "reviewer" | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [updates, setUpdates] = useState<Update[]>([])
  const [documents, setDocuments] = useState<Array<{ name: string; size: number; created_at: string; url: string }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingUpdates, setIsLoadingUpdates] = useState(true)
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [editingFileName, setEditingFileName] = useState<string | null>(null)
  const [editedFileName, setEditedFileName] = useState<string>("")
  const [isRenaming, setIsRenaming] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isDeletingProject, setIsDeletingProject] = useState(false)
  const [deleteProjectDialogOpen, setDeleteProjectDialogOpen] = useState(false)
  
  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      
      // Check authentication
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }

      // Check if returning from re-authentication
      const returnToProject = sessionStorage.getItem('return_to_project')
      if (returnToProject === projectId) {
        sessionStorage.removeItem('return_to_project')
        toast.success('Re-authenticated successfully! You can now setup the webhook.')
      }

      // Fetch user role from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle()

      const role = (profile?.role || user.user_metadata?.role || "reviewer") as "developer" | "reviewer"
      setUserRole(role)

      // Fetch project data
      try {
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select("*")
          .eq("id", projectId)
          .single()

        if (projectError) {
          console.error("Error fetching project:", projectError)
          toast.error("Failed to load project")
          setIsLoading(false)
          return
        }

        if (!projectData) {
          toast.error("Project not found")
          router.push("/")
          return
        }

        setProject(projectData)

        // Check if user is project owner
        const { data: projectUser } = await supabase
          .from("project_user")
          .select("is_owner")
          .eq("project_id", projectId)
          .eq("user_id", user.id)
          .maybeSingle()

        setIsProjectOwner(projectUser?.is_owner || false)
      } catch (error) {
        console.error("Error:", error)
        toast.error("Failed to load project")
      } finally {
        setIsLoading(false)
      }

      // Fetch updates
      try {
        const { data: updatesData, error: updatesError } = await supabase
          .from("updates")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })

        if (updatesError) {
          console.error("Error fetching updates:", updatesError)
          toast.error("Failed to load updates")
        } else {
          setUpdates(updatesData || [])
        }
      } catch (error) {
        console.error("Error:", error)
        toast.error("Failed to load updates")
      } finally {
        setIsLoadingUpdates(false)
      }

      // Fetch documents
      fetchDocuments()
    }

    fetchData()
  }, [projectId, router])

  // Real-time subscription for updates
  useEffect(() => {
    const supabase = createClient()

    // Subscribe to updates for this project
    const channel = supabase
      .channel(`project-${projectId}-updates`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'updates',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          console.log('🔔 Real-time update received:', payload)

          if (payload.eventType === 'INSERT') {
            // New update created (from webhook)
            setUpdates((prev) => [payload.new as Update, ...prev])
            toast.success('New update available!', {
              description: (payload.new as Update).title,
            })
          } else if (payload.eventType === 'UPDATE') {
            // Update modified (status change, etc.)
            setUpdates((prev) =>
              prev.map((update) =>
                update.id === payload.new.id ? (payload.new as Update) : update
              )
            )
            
            // Show toast if status changed to completed
            const oldStatus = (payload.old as Update)?.status
            const newStatus = (payload.new as Update)?.status
            if (oldStatus !== 'completed' && newStatus === 'completed') {
              toast.success('Video generation completed!', {
                description: (payload.new as Update).title,
              })
            }
          } else if (payload.eventType === 'DELETE') {
            // Update deleted
            setUpdates((prev) => prev.filter((update) => update.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId])

  const fetchDocuments = async () => {
    setIsLoadingDocuments(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/documents`)
      if (!response.ok) {
        throw new Error("Failed to fetch documents")
      }
      const data = await response.json()
      setDocuments(data.documents || [])
    } catch (error) {
      console.error("Error fetching documents:", error)
      toast.error("Failed to load documents")
    } finally {
      setIsLoadingDocuments(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== "application/pdf") {
        toast.error("Please upload a PDF file")
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("PDF file size must be less than 10MB")
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
      formData.append("file", selectedFile)

      const response = await fetch(`/api/projects/${projectId}/documents`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to upload document")
      }

      toast.success("Document uploaded successfully!")
      setSelectedFile(null)
      // Reset file input
      const fileInput = document.getElementById("file-upload") as HTMLInputElement
      if (fileInput) fileInput.value = ""
      
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
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i]
  }

  const handleStartRename = (fileName: string) => {
    setEditingFileName(fileName)
    setEditedFileName(fileName.replace(/\.pdf$/i, ""))
  }

  const handleCancelRename = () => {
    setEditingFileName(null)
    setEditedFileName("")
  }

  const handleSaveRename = async (oldFileName: string) => {
    if (!editedFileName.trim()) {
      toast.error("File name cannot be empty")
      return
    }

    const newFileName = editedFileName.trim().endsWith(".pdf") 
      ? editedFileName.trim() 
      : `${editedFileName.trim()}.pdf`

    if (newFileName === oldFileName) {
      handleCancelRename()
      return
    }

    setIsRenaming(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/documents`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          oldFileName,
          newFileName,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to rename file")
      }

      toast.success("File renamed successfully!")
      setEditingFileName(null)
      setEditedFileName("")
      fetchDocuments()
    } catch (error) {
      console.error("Rename error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to rename file")
    } finally {
      setIsRenaming(false)
    }
  }

  const handleDelete = async (fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) {
      return
    }

    setIsDeleting(fileName)
    try {
      const response = await fetch(`/api/projects/${projectId}/documents?fileName=${encodeURIComponent(fileName)}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete file")
      }

      toast.success("File deleted successfully!")
      fetchDocuments()
    } catch (error) {
      console.error("Delete error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete file")
    } finally {
      setIsDeleting(null)
    }
  }

  const handleDeleteProject = async () => {
    setIsDeletingProject(true)
    try {
      const supabase = createClient()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Please sign in to delete projects")
        return
      }

      // Delete project_user relationship first
      const { error: projectUserError } = await supabase
        .from("project_user")
        .delete()
        .eq("project_id", projectId)

      if (projectUserError) {
        console.error("Error deleting project_user:", projectUserError)
        // Continue anyway
      }

      // Delete the project
      const { error: deleteError } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId)

      if (deleteError) {
        throw deleteError
      }

      toast.success("Project deleted successfully")
      
      // Redirect to home page
      router.push("/")
    } catch (error) {
      console.error("Error deleting project:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete project")
    } finally {
      setIsDeletingProject(false)
      setDeleteProjectDialogOpen(false)
    }
  }

  // Extract repo name from GitHub URL
  const getRepoName = (url: string | undefined) => {
    if (!url) return null
    try {
      // Handle various GitHub URL formats:
      // https://github.com/owner/repo
      // https://github.com/owner/repo/
      // https://github.com/owner/repo.git
      // git@github.com:owner/repo.git
      const match = url.match(/(?:github\.com\/|github\.com:)([^\/\s]+)\/([^\/\s\.]+)/)
      if (match) {
        return `${match[1]}/${match[2]}`
      }
      return null
    } catch {
      return null
    }
  }
  
  const isDeveloperView = userRole === "developer"

  // Format project details for display
  const projectDetails = project ? {
    name: project.name,
    description: project.summary || "No description available.",
    progress: project.progress || 0,
    status: project.status,
    overview: project.summary || "This project is still being set up. Share goals, timeline, and requirements here.",
    projectScope: project.project_scope || null,
    timeline: project.created_at 
      ? `${formatDate(project.created_at)} → ${project.updated_at ? formatDate(project.updated_at) : "Ongoing"}`
      : "Timeline pending",
    nextMilestone: "Continue development",
  } : {
    name: projectId.replace(/-/g, " "),
    description: "Loading project...",
    progress: 0,
    status: "active" as const,
    overview: "Loading...",
    projectScope: null,
    timeline: "Loading...",
    nextMilestone: "Loading...",
  }

  // Updates are now handled directly in UpdatesTab component

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 border-r bg-background/95 backdrop-blur-sm flex-col justify-between shadow-sm z-30">
        <div className="p-6 space-y-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-primary to-primary/80 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
              <img src="/logo.png" alt="TeamSync" className="h-13 w-13" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              TeamSync
            </span>
          </Link>

          <nav className="space-y-1.5">
            {[
              { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
              { id: "updates", label: "Updates", icon: Video },
              { id: "assistant", label: "AI Assistant", icon: MessageSquare },
              { id: "settings", label: "Settings", icon: Settings },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                  activeTab === item.id
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <item.icon className={cn("h-4 w-4", activeTab === item.id && "scale-110")} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <main className="flex-1 flex flex-col lg:ml-64">
        {/* Top Bar */}
        <header className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">Back to home</span>
            </Link>

            <div className="flex items-center gap-3">
              {userRole && (
                <span className="text-sm font-medium text-muted-foreground capitalize">
                  {userRole}
                </span>
              )}
              {project?.live_url && (
                <Button variant="ghost" size="icon" asChild>
                  <a href={project.live_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-5 w-5" />
                  </a>
                </Button>
              )}
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {updates.filter(u => u.status === "processing").length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-[10px] font-bold flex items-center justify-center text-primary-foreground">
                    {updates.filter(u => u.status === "processing").length}
                  </span>
                )}
              </Button>

              <UserProfileDropdown />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
              <TabsList className="lg:hidden w-full grid grid-cols-4">
                <TabsTrigger value="dashboard" className="gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </TabsTrigger>
                <TabsTrigger value="updates" className="gap-2">
                  <Video className="h-4 w-4" />
                  <span className="hidden sm:inline">Updates</span>
                </TabsTrigger>
                <TabsTrigger value="assistant" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">Assistant</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="gap-2">
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Settings</span>
                </TabsTrigger>
              </TabsList>

              {/* Dashboard */}
              <TabsContent value="dashboard" className="space-y-8 mt-4">
                <DashboardTab
                  project={project}
                  projectDetails={projectDetails}
                  updates={updates}
                  documents={documents}
                  isDeveloperView={isDeveloperView}
                  isLoadingDocuments={isLoadingDocuments}
                  selectedFile={selectedFile}
                  isUploading={isUploading}
                  editingFileName={editingFileName}
                  editedFileName={editedFileName}
                  isRenaming={isRenaming}
                  isDeleting={isDeleting}
                  onFileSelect={handleFileSelect}
                  onUpload={handleUpload}
                  onCancelFile={() => setSelectedFile(null)}
                  onStartRename={handleStartRename}
                  onCancelRename={handleCancelRename}
                  onSaveRename={handleSaveRename}
                  onDelete={handleDelete}
                  onSetEditedFileName={setEditedFileName}
                  getRepoName={getRepoName}
                  formatFileSize={formatFileSize}
                  formatDate={formatDate}
                />
              </TabsContent>

            {/* Updates Feed */}
            <UpdatesTab
              isLoadingUpdates={isLoadingUpdates}
              updates={updates}
              isDeveloperView={isDeveloperView}
              projectId={projectId}
            />

          {/* AI Assistant Chat */}
          <AssistantTab
            projectId={projectId}
            isDeveloperView={isDeveloperView}
            projectDetails={projectDetails}
            updates={updates}
          />

          <SettingsTab
            project={project}
            projectDetails={projectDetails}
            projectId={projectId}
            onDeleteProject={() => setDeleteProjectDialogOpen(true)}
            isDeletingProject={isDeletingProject}
          />
        </Tabs>
          </div>
        </div>
      </main>

      {/* Delete Project Confirmation Dialog */}
      <Dialog open={deleteProjectDialogOpen} onOpenChange={setDeleteProjectDialogOpen}>
        <DialogContent onClose={() => setDeleteProjectDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to delete <strong>{project?.name}</strong>? This action cannot be undone and will permanently delete the project, all updates, and all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteProjectDialogOpen(false)}
              disabled={isDeletingProject}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProject}
              disabled={isDeletingProject}
            >
              {isDeletingProject ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Project
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
