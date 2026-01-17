"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import {
  Zap,
  Plus,
  Search,
  LayoutGrid,
  List,
  ExternalLink,
  MoreHorizontal,
  Video,
  Calendar,
  TrendingUp,
  FolderOpen,
  User,
  Bell,
  GitBranch,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Mock data for projects
const mockProjects = [
  {
    id: "batam-spa",
    name: "Batam1SPA Website",
    description: "Wellness and spa booking platform",
    githubRepo: "batam/spa-website",
    thumbnail: null,
    progress: 95,
    status: "active" as const,
    updatesCount: 8,
    lastUpdate: "Jan 15, 2026",
    createdAt: "Nov 1, 2024",
  },
  {
    id: "krit-design",
    name: "Krit Design Club",
    description: "Design agency portfolio site",
    githubRepo: "krit/design-club",
    thumbnail: null,
    progress: 70,
    status: "active" as const,
    updatesCount: 5,
    lastUpdate: "Jan 12, 2026",
    createdAt: "Dec 10, 2024",
  },
  {
    id: "demo-project",
    name: "E-commerce Platform",
    description: "Full-stack e-commerce solution",
    githubRepo: "techstart/ecommerce",
    thumbnail: null,
    progress: 45,
    status: "active" as const,
    updatesCount: 3,
    lastUpdate: "Jan 10, 2026",
    createdAt: "Jan 1, 2025",
  },
  {
    id: "fitness-app",
    name: "FitTrack Mobile App",
    description: "Fitness tracking and workout app",
    githubRepo: "fitlife/fittrack-app",
    thumbnail: null,
    progress: 100,
    status: "completed" as const,
    updatesCount: 12,
    lastUpdate: "Dec 20, 2024",
    createdAt: "Aug 15, 2024",
  },
  {
    id: "restaurant-site",
    name: "Sakura Restaurant",
    description: "Japanese restaurant website",
    githubRepo: "sakura/website",
    thumbnail: null,
    progress: 100,
    status: "completed" as const,
    updatesCount: 6,
    lastUpdate: "Nov 30, 2024",
    createdAt: "Sep 1, 2024",
  },
]

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
}

function ProjectCard({ project }: { project: Project }) {
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

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden">
      {/* Thumbnail */}
      <div className="aspect-[16/10] bg-gradient-to-br from-zinc-800 to-zinc-900 relative overflow-hidden">
        {project.thumbnail ? (
          <img
            src={project.thumbnail}
            alt={project.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-4xl font-bold text-zinc-700">
              {project.name.substring(0, 2).toUpperCase()}
            </div>
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button size="sm" variant="secondary" asChild>
            <Link href={`/${project.id}/generate`}>
              <Video className="h-4 w-4" />
              Generate Update
            </Link>
          </Button>
        </div>
      </div>

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
              <p className="text-xs text-muted-foreground truncate">{project.description}</p>
            ) : null}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
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

        {/* Quick Actions */}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" className="flex-1 text-xs h-8" asChild>
            <Link href={`/${project.id}`}>
              View Portal
              <ExternalLink className="h-3 w-3" />
            </Link>
          </Button>
          <Button size="sm" className="flex-1 text-xs h-8" asChild>
            <Link href={`/${project.id}/generate`}>
              New Update
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// User Profile Dropdown Component
function UserProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<{ email?: string; name?: string } | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    async function fetchUser() {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        setUser({
          email: authUser.email,
          name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split("@")[0] || "User"
        })
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
            <div className="space-y-1 pb-3 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">
                    {user?.name || "User"}
                  </p>
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
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [userRole, setUserRole] = useState<"developer" | "reviewer" | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function fetchUserRole() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const role = user.user_metadata?.role || "developer"
        setUserRole(role === "reviewer" ? "reviewer" : "developer")
        
        // If reviewer, redirect to reviewer dashboard (fallback if middleware didn't catch it)
        if (role === "reviewer" && window.location.pathname === "/") {
          router.replace("/demo-project")
          return
        }
      } else {
        // If not logged in, redirect to login
        router.replace("/login")
      }
    }
    fetchUserRole()
  }, [router])

  const activeProjects = mockProjects.filter((p) => p.status === "active")
  const completedProjects = mockProjects.filter((p) => p.status === "completed")

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md">
              <Zap className="h-5 w-5 text-primary-foreground" />
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
          <Button asChild>
            <Link href="/new">
              <Plus className="h-4 w-4" />
              New Project
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Active Projects", value: activeProjects.length, icon: FolderOpen, color: "text-emerald-500" },
            { label: "Total Updates", value: mockProjects.reduce((acc, p) => acc + p.updatesCount, 0), icon: Video, color: "text-blue-500" },
            { label: "Completed", value: completedProjects.length, icon: TrendingUp, color: "text-violet-500" },
            { label: "This Month", value: 12, icon: Calendar, color: "text-amber-500" },
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

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="active" className="space-y-6">
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

          <TabsContent value="active">
            {filterProjects(activeProjects).length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filterProjects(activeProjects).map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <EmptyState type="active" />
            )}
          </TabsContent>

          <TabsContent value="completed">
            {filterProjects(completedProjects).length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filterProjects(completedProjects).map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <EmptyState type="completed" />
            )}
          </TabsContent>

          <TabsContent value="all">
            {filterProjects(mockProjects).length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filterProjects(mockProjects).map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <EmptyState type="all" />
            )}
          </TabsContent>
        </Tabs>
      </main>
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
        <Button asChild>
          <Link href="/new">
            <Plus className="h-4 w-4" />
            Create Project
          </Link>
        </Button>
      )}
    </div>
  )
}
