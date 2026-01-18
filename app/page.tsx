"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Video,
  Calendar,
  TrendingUp,
  FolderOpen,
  User,
  Bell,
  GitBranch,
  LogOut,
  Loader2,
  Edit2,
  Check,
  X,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Helper function to format date
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

type ProjectStatus = "active" | "completed" | "paused"

interface Project {
  id: string
  name: string
  description?: string
  githubRepo?: string
  thumbnail: string | null
  progress: number
  status: ProjectStatus
  updatesCount: number
  lastUpdate: string
  createdAt: string
  latestUpdateId?: string
}

function ProjectCard({
  project,
  canGenerate,
  onDelete,
  isDeleting,
  onDeleteClick,
}: {
  project: Project
  canGenerate: boolean
  onDelete?: (projectId: string) => void
  isDeleting?: boolean
  onDeleteClick?: (projectId: string) => void
}) {
  const statusColors = {
    active: "bg-emerald-500",
    completed: "bg-blue-500",
    paused: "bg-amber-500",
  }

  const statusLabels = {
    active: "In Progress",
    completed: "Completed",
    paused: "Paused",
  }

  // Navigate to dashboard when clicking thumbnail
  const thumbnailLink = `/${project.id}?tab=dashboard`

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden">
      {/* Thumbnail */}
      <Link 
        href={thumbnailLink}
        className="block aspect-[16/10] bg-gradient-to-br from-zinc-800 to-zinc-900 relative overflow-hidden cursor-pointer"
      >
        {project.thumbnail ? (
          <img
            src={project.thumbnail}
            alt={project.name}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-4xl font-bold text-zinc-700">
              {project.name.substring(0, 2).toUpperCase()}
            </div>
          </div>
        )}
      </Link>

      <CardContent className="p-4 space-y-3">
        {/* Title & Menu */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link 
              href={`/${project.id}`}
              className="font-semibold text-sm hover:text-primary transition-colors line-clamp-1"
            >
              {project.name}
            </Link>
            {project.githubRepo ? (
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                <GitBranch className="h-3 w-3" />
                {project.githubRepo}
              </p>
            ) : project.description ? (
              <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>
            ) : null}
          </div>
          {canGenerate && onDeleteClick && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10" 
              onClick={() => onDeleteClick(project.id)}
              disabled={isDeleting}
              title="Delete project"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{project.progress}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>

        {/* Status & Stats */}
        <div className="flex items-center justify-between">
          <Badge
            variant="secondary"
            className="gap-1 text-[10px] font-medium"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusColors[project.status]}`} />
            {statusLabels[project.status]}
          </Badge>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Video className="h-3 w-3" />
              {project.updatesCount}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {project.lastUpdate}
            </span>
          </div>
        </div>

      </CardContent>
    </Card>
  )
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

export default function ProjectsDashboard() {
  const [searchQuery, setSearchQuery] = useState("")
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const router = useRouter()

  // Fetch projects from Supabase
  useEffect(() => {
    async function fetchProjects() {
      try {
        const supabase = createClient()

        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push("/login")
          setIsLoading(false)
          return
        }

        let role = user.user_metadata?.role as string | undefined
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle()

        if (profile?.role) {
          role = profile.role
        }
        setUserRole(role || "developer")

        // Fetch projects for this user (via project_user junction table)
        const { data: userProjects, error: userProjectsError } = await supabase
          .from("project_user")
          .select("project_id")
          .eq("user_id", user.id)

        if (userProjectsError) {
          console.error("Error fetching user projects:", userProjectsError)
          toast.error("Failed to load projects")
          setIsLoading(false)
          return
        }

        if (!userProjects || userProjects.length === 0) {
          setProjects([])
          setIsLoading(false)
          return
        }

        const projectIds = userProjects.map((up) => up.project_id)

        // Then fetch the actual projects
        const { data: projectsData, error } = await supabase
          .from("projects")
          .select("*")
          .in("id", projectIds)
          .order("created_at", { ascending: false })

        if (error) {
          console.error("Error fetching projects:", error)
          toast.error("Failed to load projects")
          setIsLoading(false)
          return
        }

        // Fetch update counts and latest update for each project
        const projectsWithCounts = await Promise.all(
          (projectsData || []).map(async (project) => {
            const { count } = await supabase
              .from("updates")
              .select("*", { count: "exact", head: true })
              .eq("project_id", project.id)

            const { data: latestUpdate } = await supabase
              .from("updates")
              .select("id, created_at")
              .eq("project_id", project.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle()

            return {
              id: project.id,
              name: project.name,
              description: project.summary || undefined,
              githubRepo: project.github_url || undefined,
              thumbnail: project.thumbnail_url || null,
              progress: project.progress || 0,
              status: project.status,
              updatesCount: count || 0,
              lastUpdate: latestUpdate?.created_at
                ? formatDate(latestUpdate.created_at)
                : formatDate(project.created_at),
              createdAt: formatDate(project.created_at),
              latestUpdateId: latestUpdate?.id,
            }
          })
        )

        setProjects(projectsWithCounts)
        setIsLoading(false)
      } catch (error) {
        console.error("Error:", error)
        toast.error("Failed to load projects")
        setIsLoading(false)
      }
    }

    fetchProjects()
  }, [router])

  const activeProjects = projects.filter((p) => p.status === "active")
  const completedProjects = projects.filter((p) => p.status === "completed")
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null)

  const filterProjects = (projects: Project[]) => {
    if (!searchQuery) return projects
    const query = searchQuery.toLowerCase()
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.githubRepo?.toLowerCase().includes(query)
    )
  }

  const handleDeleteClick = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId)
    if (project) {
      setProjectToDelete({ id: projectId, name: project.name })
      setDeleteDialogOpen(true)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return

    setDeleteDialogOpen(false)
    setDeletingProjectId(projectToDelete.id)
    try {
      const supabase = createClient()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Please sign in to delete projects")
        return
      }

      // Delete project_user relationship first (if exists)
      const { error: projectUserError } = await supabase
        .from("project_user")
        .delete()
        .eq("project_id", projectToDelete.id)
        .eq("user_id", user.id)

      if (projectUserError) {
        console.error("Error deleting project_user:", projectUserError)
        // Continue anyway - might not be the owner
      }

      // Delete the project (this should cascade delete related records if foreign keys are set up)
      const { error: deleteError } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectToDelete.id)

      if (deleteError) {
        throw deleteError
      }

      toast.success("Project deleted successfully")
      
      // Remove from local state
      setProjects(projects.filter((p) => p.id !== projectToDelete.id))
    } catch (error) {
      console.error("Error deleting project:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete project")
    } finally {
      setDeletingProjectId(null)
      setProjectToDelete(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md">
              <img src="/logo.png" alt="TeamSync" className="h-13 w-13" />
            </div>
            <span className="text-xl font-bold tracking-tight">TeamSync</span>
          </Link>

          <div className="flex items-center gap-3">
            {userRole && (
              <span className="text-sm font-medium text-muted-foreground capitalize">
                {userRole}
              </span>
            )}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent text-[10px] font-bold flex items-center justify-center text-accent-foreground">
                3
              </span>
            </Button>
            <UserProfileDropdown />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Projects</h1>
            <p className="text-muted-foreground mt-1">
              Manage your projects and generate updates
            </p>
          </div>
          {userRole === "developer" && (
            <Button asChild className="whitespace-nowrap">
              <Link href="/new" className="flex items-center gap-3">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-emerald-950">
                  <Plus className="h-4 w-4" />
                </span>
                <span className="font-semibold">New Project</span>
              </Link>
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: "Active Projects", value: activeProjects.length, icon: FolderOpen, color: "text-emerald-500" },
            { label: "Total Updates", value: projects.reduce((acc, p) => acc + p.updatesCount, 0), icon: Video, color: "text-blue-500" },
            { label: "Completed", value: completedProjects.length, icon: TrendingUp, color: "text-violet-500" },
          ].map((stat) => (
            <Card key={stat.label} className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="active" className="space-y-6">
          {/* Filters & Search */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <TabsList>
              <TabsTrigger value="active" className="gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Active
                <Badge variant="secondary" className="ml-1 text-[10px] py-0 px-1.5">
                  {activeProjects.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Completed
                <Badge variant="secondary" className="ml-1 text-[10px] py-0 px-1.5">
                  {completedProjects.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="all" className="gap-2">
                All Projects
              </TabsTrigger>
            </TabsList>
            <div className="relative w-full lg:max-w-sm">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-11 rounded-full bg-muted/40 border border-border/60 focus-visible:ring-2 focus-visible:ring-primary/30"
              />
            </div>
          </div>

          <TabsContent value="active">
            {isLoading ? (
              <div className="text-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading projects...</p>
              </div>
            ) : filterProjects(activeProjects).length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filterProjects(activeProjects).map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    canGenerate={userRole === "developer"}
                    onDelete={handleDeleteConfirm}
                    onDeleteClick={handleDeleteClick}
                    isDeleting={deletingProjectId === project.id}
                  />
                ))}
              </div>
            ) : (
              <EmptyState type="active" />
            )}
          </TabsContent>

          <TabsContent value="completed">
            {isLoading ? (
              <div className="text-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading projects...</p>
              </div>
            ) : filterProjects(completedProjects).length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filterProjects(completedProjects).map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    canGenerate={userRole === "developer"}
                    onDelete={handleDeleteConfirm}
                    onDeleteClick={handleDeleteClick}
                    isDeleting={deletingProjectId === project.id}
                  />
                ))}
              </div>
            ) : (
              <EmptyState type="completed" />
            )}
          </TabsContent>

          <TabsContent value="all">
            {isLoading ? (
              <div className="text-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading projects...</p>
              </div>
            ) : filterProjects(projects).length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filterProjects(projects).map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    canGenerate={userRole === "developer"}
                    onDelete={handleDeleteConfirm}
                    onDeleteClick={handleDeleteClick}
                    isDeleting={deletingProjectId === project.id}
                  />
                ))}
              </div>
            ) : (
              <EmptyState type="all" />
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent onClose={() => setDeleteDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to delete <strong>{projectToDelete?.name}</strong>? This action cannot be undone and will permanently delete the project and all its updates.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setProjectToDelete(null)
              }}
              disabled={deletingProjectId !== null}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deletingProjectId !== null}
            >
              {deletingProjectId ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete Project"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EmptyState({ type }: { type: "active" | "completed" | "all" }) {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
        <FolderOpen className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No {type} projects</h3>
      <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
        {type === "active"
          ? "Start a new project to begin generating updates."
          : type === "completed"
          ? "Completed projects will appear here."
          : "No projects match your search."}
      </p>
      {type === "active" && (
        <Button asChild className="whitespace-nowrap">
          <Link href="/new" className="flex items-center gap-2">
            <Plus className="h-4 w-4 shrink-0" />
            <span>Create Project</span>
          </Link>
        </Button>
      )}
    </div>
  )
}
