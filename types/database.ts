// Database types for Supabase tables
// These match the assumed schema: projects, updates, messages

export interface Project {
  id: string
  created_at: string
  updated_at: string
  name: string
  description?: string
  developer_id: string // References auth.users
  project_url?: string
  github_repo?: string
  status: "active" | "paused" | "completed"
}

export interface Update {
  id: string
  created_at: string
  project_id: string // References projects
  title: string
  video_url?: string
  doc_url?: string
  summary: string
  notes?: string
  status: "pending" | "processing" | "completed" | "failed"
}

export interface Message {
  id: string
  created_at: string
  project_id: string // References projects
  user_id: string // References auth.users
  role: "user" | "assistant" | "system"
  content: string
  status?: "pending" | "approved" | "flagged"
  flagged_reason?: string
  approved_by?: string // References auth.users (developer who approved)
  approved_at?: string
}

export interface UserProfile {
  id: string
  created_at: string
  email: string
  full_name?: string
  avatar_url?: string
  github_access_token?: string // For GitHub API calls
}

// Database response types
export type Database = {
  public: {
    Tables: {
      projects: {
        Row: Project
        Insert: Omit<Project, "id" | "created_at" | "updated_at">
        Update: Partial<Omit<Project, "id" | "created_at">>
      }
      updates: {
        Row: Update
        Insert: Omit<Update, "id" | "created_at">
        Update: Partial<Omit<Update, "id" | "created_at">>
      }
      messages: {
        Row: Message
        Insert: Omit<Message, "id" | "created_at">
        Update: Partial<Omit<Message, "id" | "created_at">>
      }
      profiles: {
        Row: UserProfile
        Insert: Omit<UserProfile, "id" | "created_at">
        Update: Partial<Omit<UserProfile, "id" | "created_at">>
      }
    }
  }
}
