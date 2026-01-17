"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Settings, ExternalLink, GitBranch, UserPlus, Mail, X, Loader2, Trash2, Crown, Webhook, CheckCircle2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/utils/supabase/client"
import type { Project } from "@/types/database"

interface SettingsTabProps {
  project: Project | null
  projectDetails: {
    name: string
    status: "active" | "completed" | "paused"
    progress: number
  }
  projectId: string
}

interface ProjectMember {
  id: string
  is_owner: boolean
  created_at: string
  user_id: string
  profiles: {
    id: string
    email: string
    full_name: string | null
    role: "developer" | "reviewer"
    avatar_url: string | null
  } | null
}

export function SettingsTab({
  project,
  projectDetails,
  projectId,
}: SettingsTabProps) {
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(true)
  const [isInviting, setIsInviting] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [isSettingUpWebhook, setIsSettingUpWebhook] = useState(false)
  const [webhookStatus, setWebhookStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [webhookMessage, setWebhookMessage] = useState('')
  const [isReauthenticating, setIsReauthenticating] = useState(false)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }
      await fetchMembers()
    }
    fetchData()
  }, [projectId])

  async function fetchMembers() {
    try {
      setIsLoadingMembers(true)
      const response = await fetch(`/api/projects/${projectId}/members`)
      if (!response.ok) {
        throw new Error('Failed to fetch members')
      }
      const data = await response.json()
      setMembers(data.members || [])
      
      // Check if current user is owner from the members list
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const currentMember = data.members?.find((m: ProjectMember) => m.user_id === user.id)
        const ownerStatus = currentMember?.is_owner || false
        console.log('Owner check:', { userId: user.id, currentMember, ownerStatus })
        setIsOwner(ownerStatus)
      }
    } catch (error) {
      console.error('Error fetching members:', error)
      toast.error('Failed to load project members')
    } finally {
      setIsLoadingMembers(false)
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address')
      return
    }

    try {
      setIsInviting(true)
      // Add user directly if they exist in database
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add user')
      }

      toast.success('User added to project successfully!')
      setInviteEmail("")
      await fetchMembers()
    } catch (error) {
      console.error('Error adding user:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to add user')
    } finally {
      setIsInviting(false)
    }
  }

  async function handleRemoveMember(userId: string, userName: string) {
    if (!confirm(`Are you sure you want to remove ${userName} from this project?`)) {
      return
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove user')
      }

      toast.success('User removed successfully')
      await fetchMembers()
    } catch (error) {
      console.error('Error removing user:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to remove user')
    }
  }

  async function handleSetupWebhook() {
    if (!project?.github_url) {
      toast.error('No GitHub repository linked to this project')
      return
    }

    setIsSettingUpWebhook(true)
    setWebhookStatus('idle')
    setWebhookMessage('')

    try {
      const response = await fetch('/api/projects/setup-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Check if it's a permissions error
        if (response.status === 401 || response.status === 403 || 
            data.error?.includes('admin access') || data.error?.includes('authentication')) {
          setWebhookStatus('error')
          setWebhookMessage('GitHub permissions needed. Click "Re-authenticate" below.')
          toast.error('GitHub permissions needed. Please re-authenticate.')
        } else {
          throw new Error(data.error || 'Failed to setup webhook')
        }
        return
      }

      setWebhookStatus('success')
      setWebhookMessage(data.message || 'Webhook configured successfully!')
      toast.success(data.message || 'Webhook configured successfully!')
    } catch (error) {
      console.error('Error setting up webhook:', error)
      setWebhookStatus('error')
      const errorMsg = error instanceof Error ? error.message : 'Failed to setup webhook'
      setWebhookMessage(errorMsg)
      toast.error(errorMsg)
    } finally {
      setIsSettingUpWebhook(false)
    }
  }

  async function handleReauthenticate() {
    setIsReauthenticating(true)
    try {
      const supabase = createClient()
      
      // Store current project ID to return here after auth
      sessionStorage.setItem('return_to_project', projectId)
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?role=developer&return_to=project`,
          queryParams: {
            scope: 'repo read:user user:email',
          },
        },
      })

      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Re-authentication error:', error)
      toast.error('Failed to re-authenticate. Please try again.')
      setIsReauthenticating(false)
    }
  }

  return (
    <TabsContent value="settings" className="mt-8">
      <div className="max-w-3xl space-y-6">
        <Card className="shadow-md">
          <CardContent className="p-6 lg:p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Settings className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-2xl font-bold">Project Settings</h3>
            </div>
            
            <div className="space-y-6 pt-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-2">Project Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{projectDetails.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant={projectDetails.status === "active" ? "default" : "secondary"}>
                      {projectDetails.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{projectDetails.progress}%</span>
                  </div>
                </div>
              </div>

              {project && (
                <>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-semibold mb-2">Links</h4>
                    <div className="space-y-2 text-sm">
                      {project.github_url && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">GitHub Repository</span>
                          <a 
                            href={project.github_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            View <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                      {project.live_url && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Live Site</span>
                          <a 
                            href={project.live_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            Visit <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* GitHub Webhook Setup */}
                  {project.github_url && isOwner && (
                    <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold flex items-center gap-2">
                            <Webhook className="h-4 w-4" />
                            GitHub Webhook
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            Automatically receive PR updates
                          </p>
                        </div>
                        <Button
                          onClick={handleSetupWebhook}
                          disabled={isSettingUpWebhook}
                          size="sm"
                        >
                          {isSettingUpWebhook ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Setting up...
                            </>
                          ) : (
                            <>
                              <Webhook className="h-4 w-4 mr-2" />
                              Setup Webhook
                            </>
                          )}
                        </Button>
                      </div>

                      {webhookStatus === 'success' && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                              {webhookMessage}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Your project will now automatically receive updates when PRs are merged.
                            </p>
                          </div>
                        </div>
                      )}

                      {webhookStatus === 'error' && (
                        <div className="space-y-2">
                          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-destructive">
                                {webhookMessage}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Make sure you have admin access to the repository.
                              </p>
                            </div>
                          </div>
                          {webhookMessage.includes('permissions') && (
                            <Button
                              onClick={handleReauthenticate}
                              disabled={isReauthenticating}
                              variant="outline"
                              size="sm"
                              className="w-full"
                            >
                              {isReauthenticating ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Redirecting...
                                </>
                              ) : (
                                <>
                                  <GitBranch className="h-4 w-4 mr-2" />
                                  Re-authenticate with GitHub
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      )}

                      {webhookStatus === 'idle' && (
                        <p className="text-xs text-muted-foreground">
                          Click "Setup Webhook" to automatically configure GitHub to send PR updates to this project.
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Project Members */}
        <Card className="shadow-md">
          <CardContent className="p-6 lg:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <UserPlus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Project Members</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">Add members by email (must be registered users)</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleAddMember} className="flex gap-2">
              <div className="flex-1 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Enter email address to add"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="pl-9"
                    disabled={isInviting || !isOwner}
                  />
                </div>
                <Button type="submit" disabled={isInviting || !inviteEmail.trim() || !isOwner}>
                  {isInviting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Member
                    </>
                  )}
                </Button>
            </form>
            {!isOwner && !isLoadingMembers && (
              <p className="text-sm text-muted-foreground">
                Only project owners can add members to this project.
              </p>
            )}

            <div className="space-y-3">
              {isLoadingMembers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : members.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No members found
                </p>
              ) : (
                members.map((member) => {
                  const profile = member.profiles
                  const userName = profile?.full_name || profile?.email?.split('@')[0] || 'Unknown User'
                  const userEmail = profile?.email || 'No email'
                  const isCurrentUser = member.user_id === currentUserId

                  return (
                    <MemberCard
                      key={member.id}
                      member={member}
                      profile={profile}
                      userName={userName}
                      userEmail={userEmail}
                      isCurrentUser={isCurrentUser}
                      isOwner={isOwner}
                      currentUserId={currentUserId}
                      onRemove={handleRemoveMember}
                    />
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  )
}

// Separate component for member card to handle avatar state
function MemberCard({
  member,
  profile,
  userName,
  userEmail,
  isCurrentUser,
  isOwner,
  currentUserId,
  onRemove,
}: {
  member: ProjectMember
  profile: ProjectMember['profiles']
  userName: string
  userEmail: string
  isCurrentUser: boolean
  isOwner: boolean
  currentUserId: string | null
  onRemove: (userId: string, userName: string) => void
}) {
  const [avatarError, setAvatarError] = useState(false)

  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {profile?.avatar_url && !avatarError ? (
            <img
              src={profile.avatar_url}
              alt={userName}
              className="w-10 h-10 rounded-full object-cover"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <img
              src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userName)}`}
              alt={userName}
              className="w-10 h-10 rounded-full"
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm truncate">
              {userName}
              {isCurrentUser && (
                <span className="text-muted-foreground ml-1">(You)</span>
              )}
            </p>
            {member.is_owner && (
              <Crown className="h-4 w-4 text-yellow-500 flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
          {profile?.role && (
            <Badge variant="outline" className="mt-1 text-xs">
              {profile.role}
            </Badge>
          )}
        </div>
      </div>
      {isOwner && !member.is_owner && !isCurrentUser && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(member.user_id, userName)}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
