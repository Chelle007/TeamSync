"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UpdateCard } from "@/components/update-card"
import { ChatInterface } from "@/components/chat-interface"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Zap,
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
} from "lucide-react"

// Mock data for demo
const mockUpdates = [
  {
    id: "1",
    title: "Week 3: Billing Dashboard & Mobile Fixes",
    date: "Jan 15, 2026",
    videoUrl: "", // Empty for demo - will show placeholder
    docUrl: "https://docs.google.com/document/d/example",
    summary: "This week we implemented the new billing dashboard with subscription management features. Users can now view their payment history, update payment methods, and manage their subscription tier. We also fixed several mobile navigation issues reported in the last feedback session.",
    status: "completed" as const,
  },
  {
    id: "2",
    title: "Week 2: User Authentication & Profile",
    date: "Jan 8, 2026",
    videoUrl: "",
    docUrl: "https://docs.google.com/document/d/example2",
    summary: "Completed the OAuth 2.0 integration allowing users to sign in with Google, GitHub, or email. The user profile section now includes avatar upload, notification preferences, and account settings. Security improvements include 2FA support and session management.",
    status: "completed" as const,
  },
  {
    id: "3",
    title: "Week 4: Performance Optimization",
    date: "Jan 17, 2026",
    videoUrl: "",
    docUrl: "",
    summary: "Currently generating video update...",
    status: "processing" as const,
  },
]

const mockProjectDetails: Record<
  string,
  {
    name: string
    description: string
    progress: number
    status: "active" | "completed" | "paused"
    overview: string
    timeline: string
    nextMilestone: string
  }
> = {
  "batam-spa": {
    name: "Batam1SPA Website",
    description: "Wellness and spa booking platform",
    progress: 95,
    status: "active",
    overview:
      "A concierge-level booking experience for spa clients with a focus on wellness journeys, service discovery, and smooth checkout.",
    timeline: "Nov 1, 2024 → Jan 30, 2026",
    nextMilestone: "Finalize payment confirmation emails",
  },
  "krit-design": {
    name: "Krit Design Club",
    description: "Design agency portfolio site",
    progress: 70,
    status: "active",
    overview:
      "Showcase studio work, case studies, and a booking flow with a polished editorial presentation.",
    timeline: "Dec 10, 2024 → Mar 5, 2026",
    nextMilestone: "Approve the case study layout",
  },
  "demo-project": {
    name: "E-commerce Platform",
    description: "Full-stack e-commerce solution",
    progress: 45,
    status: "active",
    overview:
      "Unified storefront with subscriptions, purchase history, and a streamlined checkout experience.",
    timeline: "Jan 1, 2025 → Apr 18, 2026",
    nextMilestone: "Review subscription management screens",
  },
}

const overviewParagraph = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer facilisis, erat vel consequat luctus, mi neque accumsan ipsum, sed finibus turpis massa sed ante. Vestibulum sed pretium purus, sit amet finibus tellus. Aliquam erat volutpat. Maecenas et neque sed lorem viverra laoreet. Donec quis consequat augue. Proin fringilla, mauris a iaculis fermentum, sapien risus tempus odio, et tempus dolor libero sit amet purus. Nulla facilisi. Duis vitae sem nec nulla cursus vestibulum. Nunc a massa non nulla posuere aliquam. Cras in purus ac urna varius congue. Fusce at hendrerit eros."

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
  const projectId = params.projectId as string
  const [activeTab, setActiveTab] = useState("dashboard")
  const [userRole, setUserRole] = useState<"developer" | "reviewer" | null>(null)
  
  useEffect(() => {
    async function fetchUserRole() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const role = user.user_metadata?.role || "reviewer"
        setUserRole(role === "developer" ? "developer" : "reviewer")
      }
    }
    fetchUserRole()
  }, [])
  
  const isDeveloperView = userRole === "developer"

  const projectDetails = mockProjectDetails[projectId] || {
    name: projectId.replace(/-/g, " "),
    description: "Project overview not available yet.",
    progress: 0,
    status: "active" as const,
    overview:
      "This project is still being set up. Share goals, timeline, and requirements here.",
    timeline: "Timeline pending",
    nextMilestone: "Kickoff checklist",
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 border-r bg-background/80 backdrop-blur-sm flex-col justify-between">
        <div className="p-6 space-y-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">TeamSync</span>
          </Link>

          <nav className="space-y-2">
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
                  "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  activeTab === item.id
                    ? "bg-muted text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="border-t p-4 text-xs text-muted-foreground">
          Project access is managed by your developer.
        </div>
      </aside>

      <main className="flex-1">
        {/* Top Bar */}
        <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="lg:hidden">
                <Link href="/" className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md">
                    <Zap className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span className="text-lg font-bold tracking-tight">TeamSync</span>
                </Link>
              </div>
              <div className="hidden lg:block">
                <p className="text-sm text-muted-foreground">Project</p>
                <h1 className="text-lg font-semibold capitalize">
                  {projectDetails.name}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {userRole && (
                <span className="text-sm font-medium text-muted-foreground capitalize">
                  {userRole}
                </span>
              )}
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent text-[10px] font-bold flex items-center justify-center text-accent-foreground">
                  2
                </span>
              </Button>

              <UserProfileDropdown />
            </div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="lg:hidden">
              <TabsTrigger value="dashboard" className="gap-2">
                <LayoutGrid className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="updates" className="gap-2">
                <Video className="h-4 w-4" />
                Updates
              </TabsTrigger>
              <TabsTrigger value="assistant" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                AI Assistant
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Dashboard */}
            <TabsContent value="dashboard" className="space-y-8">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-bold">{projectDetails.name}</h2>
                    <Badge variant="success">Active</Badge>
                  </div>
                  <p className="text-muted-foreground max-w-2xl">
                    {projectDetails.description}
                  </p>
                </div>
                <div className="bg-card border rounded-xl p-4 w-full lg:max-w-sm space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-semibold">{projectDetails.progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${projectDetails.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Timeline</span>
                    <span>{projectDetails.timeline}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-6 max-w-4xl mx-auto">
                <Card className="p-6 lg:p-7">
                  <CardContent className="p-0 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      Project Overview
                    </div>
                    <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                      <p>{projectDetails.overview}</p>
                      {Array.from({ length: 17 }).map((_, index) => (
                        <p key={index}>{overviewParagraph}</p>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="p-5">
                  <CardContent className="p-0 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      Last Update
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {mockUpdates[0]?.title || "No updates yet"}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Updates Feed */}
            <TabsContent value="updates" className="space-y-6">
            <div className="grid gap-6">
              {/* Timeline */}
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[19px] top-8 bottom-8 w-0.5 bg-border hidden md:block" />
                
                <div className="space-y-6">
                  {mockUpdates.map((update, index) => (
                    <div key={update.id} className="flex gap-6">
                      {/* Timeline dot */}
                      <div className="hidden md:flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 ${
                          update.status === "completed" 
                            ? "bg-primary text-primary-foreground" 
                            : update.status === "processing"
                            ? "bg-amber-500 text-white animate-pulse-subtle"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          <Video className="h-4 w-4" />
                        </div>
                      </div>
                      
                      {/* Card */}
                      <div className="flex-1 animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
                        <UpdateCard update={update} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Empty state placeholder */}
              {mockUpdates.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Video className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No updates yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Updates will appear here once generated
                  </p>
                  {isDeveloperView && (
                    <Button asChild>
                      <Link href="/generate">Generate First Update</Link>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* AI Assistant Chat */}
          <TabsContent value="assistant">
            <div className="grid md:grid-cols-[1fr,300px] gap-6">
              <div className="bg-card border rounded-xl p-6">
                <ChatInterface 
                  projectId={projectId} 
                  isDeveloper={isDeveloperView}
                />
              </div>
              
              {/* Sidebar info */}
              <div className="space-y-4">
                <div className="bg-card border rounded-xl p-4 space-y-3">
                  <h3 className="font-semibold text-sm">About AI Assistant</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Ask questions about this project and get instant answers based on the updates and documentation.
                  </p>
                  <div className="pt-2 border-t space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Example questions:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• "How does the new billing work?"</li>
                      <li>• "What changed this week?"</li>
                      <li>• "Show me the authentication flow"</li>
                    </ul>
                  </div>
                </div>

                {isDeveloperView && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-2">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Approval Mode Active
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Questions the AI isn't sure about will be flagged for your review before responding to the reviewer.
                    </p>
                  </div>
                )}
              </div>
            </div>
            </TabsContent>

            <TabsContent value="settings">
              <div className="bg-card border rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-2">Settings</h3>
                <p className="text-sm text-muted-foreground">
                  Settings for this project will live here.
                </p>
              </div>
            </TabsContent>
        </Tabs>
        </div>
      </main>
    </div>
  )
}
