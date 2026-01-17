// Database types for Supabase tables
// Updated to match the new schema with project_user junction table

export interface UserProfile {
  id: string
  created_at: string
  email?: string
  role: "developer" | "reviewer"
  full_name?: string
  avatar_url?: string
  github_access_token?: string
}

export interface Project {
  id: string
  created_at: string
  updated_at: string
  name: string
  github_url?: string
  live_url?: string
  summary?: string
  project_scope?: string
  status: "active" | "paused" | "completed"
  progress: number // 0-100
}

export interface ProjectUser {
  id: string
  created_at: string
  project_id: string // References projects
  user_id: string // References auth.users
  is_owner: boolean
}

export interface Update {
  id: string
  created_at: string
  project_id: string // References projects
  title: string
  video_url?: string
  doc_url?: string
  summary: string
  status: "pending" | "processing" | "completed" | "failed"
}

export interface ChatbotMessage {
  id: string
  created_at: string
  project_id: string // References projects
  user_id: string // References auth.users
  role: "user" | "assistant" | "system"
  content: string
  status?: "pending" | "approved" | "flagged"
  flagged_reason?: string
  approved_by?: string // References auth.users (owner who approved)
  approved_at?: string
}

// Database response types
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: UserProfile
        Insert: Omit<UserProfile, "id" | "created_at">
        Update: Partial<Omit<UserProfile, "id" | "created_at">>
      }
      projects: {
        Row: Project
        Insert: Omit<Project, "id" | "created_at" | "updated_at">
        Update: Partial<Omit<Project, "id" | "created_at">>
      }
      project_user: {
        Row: ProjectUser
        Insert: Omit<ProjectUser, "id" | "created_at">
        Update: Partial<Omit<ProjectUser, "id" | "created_at">>
      }
      updates: {
        Row: Update
        Insert: Omit<Update, "id" | "created_at">
        Update: Partial<Omit<Update, "id" | "created_at">>
      }
      chatbot_messages: {
        Row: ChatbotMessage
        Insert: Omit<ChatbotMessage, "id" | "created_at">
        Update: Partial<Omit<ChatbotMessage, "id" | "created_at">>
      }
    }
  }
}
