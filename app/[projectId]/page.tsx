"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
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
  LogOut
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

export default function ReviewerPortal() {
  const params = useParams()
  const projectId = params.projectId as string
  const [activeTab, setActiveTab] = useState("updates")
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
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
                2
              </span>
            </Button>
            
            <UserProfileDropdown />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Project Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold capitalize">
                  {projectId.replace(/-/g, " ")}
                </h1>
                <Badge variant="success">Active</Badge>
              </div>
              <p className="text-muted-foreground">
                {isDeveloperView 
                  ? "Manage updates and review reviewer questions" 
                  : "View project updates and ask questions"}
              </p>
            </div>
            
            {isDeveloperView && (
              <Button asChild>
                <Link href="/generate">
                  Generate New Update
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="updates" className="gap-2">
              <Video className="h-4 w-4" />
              Updates Feed
              <Badge variant="secondary" className="ml-1 text-[10px] py-0 px-1.5">
                {mockUpdates.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              AI Assistant
              {isDeveloperView && (
                <Badge variant="warning" className="ml-1 text-[10px] py-0 px-1.5">
                  1
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

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
          <TabsContent value="chat">
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
        </Tabs>
      </main>
    </div>
  )
}
