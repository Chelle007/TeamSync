-- ============================================
-- TeamSync Database Schema
-- ============================================
-- Run this SQL in Supabase Dashboard -> SQL Editor
-- This is the complete schema including all tables, functions, and policies

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Profiles table (extends auth.users with role)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    email TEXT,
    role TEXT NOT NULL CHECK (role IN ('developer', 'reviewer')),
    full_name TEXT,
    avatar_url TEXT,
    github_access_token TEXT
);

-- Projects table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    name TEXT NOT NULL,
    github_url TEXT,
    live_url TEXT,
    summary TEXT,
    project_scope TEXT,
    thumbnail_url TEXT,
    webhook_secret TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100)
);

-- Project_user junction table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.project_user (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_owner BOOLEAN NOT NULL DEFAULT false,
    UNIQUE(project_id, user_id)
);

-- Webhook events table (for GitHub PR merge events)
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    pr_number INTEGER NOT NULL,
    pr_title TEXT NOT NULL,
    pr_body TEXT,
    merged_by TEXT,
    merged_at TIMESTAMP WITH TIME ZONE,
    raw_payload JSONB NOT NULL,
    processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT
);

-- Updates table
CREATE TABLE IF NOT EXISTS public.updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    webhook_event_id UUID REFERENCES public.webhook_events(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    video_url TEXT,
    doc_url TEXT,
    summary TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Chatbot messages table
CREATE TABLE IF NOT EXISTS public.chatbot_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'approved', 'flagged')),
    flagged_reason TEXT,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE
);

-- Clarifications table (bidirectional questions between developers and reviewers)
CREATE TABLE IF NOT EXISTS public.clarifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    refined_question TEXT,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'replied')),
    developer_draft TEXT,
    developer_reply TEXT,
    asked_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    asked_to_role TEXT NOT NULL CHECK (asked_to_role IN ('developer', 'reviewer')),
    replied_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    replied_at TIMESTAMP WITH TIME ZONE
);

-- Project invitations table (for email invitations)
CREATE TABLE IF NOT EXISTS public.project_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(project_id, email, token)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_project_user_project_id ON public.project_user(project_id);
CREATE INDEX IF NOT EXISTS idx_project_user_user_id ON public.project_user(user_id);
CREATE INDEX IF NOT EXISTS idx_project_user_is_owner ON public.project_user(is_owner);
CREATE INDEX IF NOT EXISTS idx_webhook_events_project_id ON public.webhook_events(project_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processing_status ON public.webhook_events(processing_status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_pr_number ON public.webhook_events(pr_number);
CREATE INDEX IF NOT EXISTS idx_updates_project_id ON public.updates(project_id);
CREATE INDEX IF NOT EXISTS idx_updates_status ON public.updates(status);
CREATE INDEX IF NOT EXISTS idx_updates_webhook_event_id ON public.updates(webhook_event_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_messages_project_id ON public.chatbot_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_messages_user_id ON public.chatbot_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_messages_status ON public.chatbot_messages(status);
CREATE INDEX IF NOT EXISTS idx_clarifications_project_id ON public.clarifications(project_id);
CREATE INDEX IF NOT EXISTS idx_clarifications_status ON public.clarifications(status);
CREATE INDEX IF NOT EXISTS idx_clarifications_asked_by ON public.clarifications(asked_by);
CREATE INDEX IF NOT EXISTS idx_clarifications_asked_to_role ON public.clarifications(asked_to_role);
CREATE INDEX IF NOT EXISTS idx_clarifications_replied_by ON public.clarifications(replied_by);
CREATE INDEX IF NOT EXISTS idx_project_invitations_token ON public.project_invitations(token);
CREATE INDEX IF NOT EXISTS idx_project_invitations_email ON public.project_invitations(email);
CREATE INDEX IF NOT EXISTS idx_project_invitations_project_id ON public.project_invitations(project_id);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clarifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_invitations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTIONS (must be created before policies)
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper function to check project access (bypasses RLS to avoid recursion)
DROP FUNCTION IF EXISTS user_has_project_access(UUID) CASCADE;
CREATE OR REPLACE FUNCTION user_has_project_access(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.project_user
        WHERE project_id = p_project_id
        AND user_id = auth.uid()
    );
END;
$$;

-- Helper function to check if user is project owner
DROP FUNCTION IF EXISTS user_is_project_owner(UUID) CASCADE;
CREATE OR REPLACE FUNCTION user_is_project_owner(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.project_user
        WHERE project_id = p_project_id
        AND user_id = auth.uid()
        AND is_owner = true
    );
END;
$$;

-- ============================================
-- RLS POLICIES - PROFILES
-- ============================================

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ============================================
-- RLS POLICIES - PROJECTS
-- ============================================

DROP POLICY IF EXISTS "Users can view projects they're associated with" ON public.projects;
CREATE POLICY "Users can view projects they're associated with"
    ON public.projects FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.project_user
            WHERE project_user.project_id = projects.id
            AND project_user.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Authenticated users can insert projects" ON public.projects;
CREATE POLICY "Authenticated users can insert projects"
    ON public.projects FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Owners can update their projects" ON public.projects;
CREATE POLICY "Owners can update their projects"
    ON public.projects FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.project_user
            WHERE project_user.project_id = projects.id
            AND project_user.user_id = auth.uid()
            AND project_user.is_owner = true
        )
    );

DROP POLICY IF EXISTS "Owners can delete their projects" ON public.projects;
CREATE POLICY "Owners can delete their projects"
    ON public.projects FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.project_user
            WHERE project_user.project_id = projects.id
            AND project_user.user_id = auth.uid()
            AND project_user.is_owner = true
        )
    );

-- ============================================
-- RLS POLICIES - PROJECT_USER
-- ============================================

DROP POLICY IF EXISTS "Users can view their own project associations" ON public.project_user;
CREATE POLICY "Users can view their own project associations"
    ON public.project_user FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view associations for their projects" ON public.project_user;
CREATE POLICY "Users can view associations for their projects"
    ON public.project_user FOR SELECT
    USING (user_has_project_access(project_id));

DROP POLICY IF EXISTS "Users can insert themselves as project owner" ON public.project_user;
CREATE POLICY "Users can insert themselves as project owner"
    ON public.project_user FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        AND is_owner = true
    );

DROP POLICY IF EXISTS "Users can be added to projects" ON public.project_user;
CREATE POLICY "Users can be added to projects"
    ON public.project_user FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can remove non-owner users" ON public.project_user;
CREATE POLICY "Owners can remove non-owner users"
    ON public.project_user FOR DELETE
    USING (
        is_owner = false
        AND user_is_project_owner(project_id)
    );

-- ============================================
-- RLS POLICIES - WEBHOOK_EVENTS
-- ============================================

DROP POLICY IF EXISTS "Users can view webhook events for their projects" ON public.webhook_events;
CREATE POLICY "Users can view webhook events for their projects"
    ON public.webhook_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.project_user
            WHERE project_user.project_id = webhook_events.project_id
            AND project_user.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Service can insert webhook events" ON public.webhook_events;
CREATE POLICY "Service can insert webhook events"
    ON public.webhook_events FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Service can update webhook events" ON public.webhook_events;
CREATE POLICY "Service can update webhook events"
    ON public.webhook_events FOR UPDATE
    USING (true);

-- ============================================
-- RLS POLICIES - UPDATES
-- ============================================

DROP POLICY IF EXISTS "Users can view updates for their projects" ON public.updates;
CREATE POLICY "Users can view updates for their projects"
    ON public.updates FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.project_user
            WHERE project_user.project_id = updates.project_id
            AND project_user.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Owners can insert updates for their projects" ON public.updates;
CREATE POLICY "Owners can insert updates for their projects"
    ON public.updates FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.project_user
            WHERE project_user.project_id = updates.project_id
            AND project_user.user_id = auth.uid()
            AND project_user.is_owner = true
        )
    );

DROP POLICY IF EXISTS "Owners can update updates for their projects" ON public.updates;
CREATE POLICY "Owners can update updates for their projects"
    ON public.updates FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.project_user
            WHERE project_user.project_id = updates.project_id
            AND project_user.user_id = auth.uid()
            AND project_user.is_owner = true
        )
    );

-- ============================================
-- RLS POLICIES - CHATBOT_MESSAGES
-- ============================================

DROP POLICY IF EXISTS "Users can view chatbot messages for their projects" ON public.chatbot_messages;
CREATE POLICY "Users can view chatbot messages for their projects"
    ON public.chatbot_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.project_user
            WHERE project_user.project_id = chatbot_messages.project_id
            AND project_user.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert chatbot messages for their projects" ON public.chatbot_messages;
CREATE POLICY "Users can insert chatbot messages for their projects"
    ON public.chatbot_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.project_user
            WHERE project_user.project_id = chatbot_messages.project_id
            AND project_user.user_id = auth.uid()
        )
        AND auth.uid() = user_id
    );

DROP POLICY IF EXISTS "Owners can update chatbot messages" ON public.chatbot_messages;
CREATE POLICY "Owners can update chatbot messages"
    ON public.chatbot_messages FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.project_user
            WHERE project_user.project_id = chatbot_messages.project_id
            AND project_user.user_id = auth.uid()
            AND project_user.is_owner = true
        )
    );

-- ============================================
-- RLS POLICIES - CLARIFICATIONS
-- ============================================

DROP POLICY IF EXISTS "Users can view clarifications for their projects" ON public.clarifications;
CREATE POLICY "Users can view clarifications for their projects"
    ON public.clarifications FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.project_user
            WHERE project_user.project_id = clarifications.project_id
            AND project_user.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert clarifications" ON public.clarifications;
CREATE POLICY "Users can insert clarifications"
    ON public.clarifications FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.project_user
            WHERE project_user.project_id = clarifications.project_id
            AND project_user.user_id = auth.uid()
        )
        AND auth.uid() = asked_by
    );

DROP POLICY IF EXISTS "Target role users can update clarifications" ON public.clarifications;
CREATE POLICY "Target role users can update clarifications"
    ON public.clarifications FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.project_user pu
            JOIN public.profiles p ON p.id = auth.uid()
            WHERE pu.project_id = clarifications.project_id
            AND pu.user_id = auth.uid()
            AND p.role = clarifications.asked_to_role
        )
    );

-- ============================================
-- RLS POLICIES - PROJECT_INVITATIONS
-- ============================================

DROP POLICY IF EXISTS "Owners can view invitations for their projects" ON public.project_invitations;
CREATE POLICY "Owners can view invitations for their projects"
    ON public.project_invitations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.project_user
            WHERE project_user.project_id = project_invitations.project_id
            AND project_user.user_id = auth.uid()
            AND project_user.is_owner = true
        )
    );

DROP POLICY IF EXISTS "Users can view invitations sent to their email" ON public.project_invitations;
CREATE POLICY "Users can view invitations sent to their email"
    ON public.project_invitations FOR SELECT
    USING (
        email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Owners can create invitations" ON public.project_invitations;
CREATE POLICY "Owners can create invitations"
    ON public.project_invitations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.project_user
            WHERE project_user.project_id = project_invitations.project_id
            AND project_user.user_id = auth.uid()
            AND project_user.is_owner = true
        )
        AND invited_by = auth.uid()
    );

-- ============================================
-- TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clarifications_updated_at ON public.clarifications;
CREATE TRIGGER update_clarifications_updated_at
    BEFORE UPDATE ON public.clarifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DATABASE FUNCTIONS
-- ============================================

-- Function to create a project with owner link
DROP FUNCTION IF EXISTS public.create_project_with_owner(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER);
CREATE OR REPLACE FUNCTION public.create_project_with_owner(
    p_name TEXT,
    p_github_url TEXT DEFAULT NULL,
    p_live_url TEXT DEFAULT NULL,
    p_summary TEXT DEFAULT NULL,
    p_project_scope TEXT DEFAULT NULL,
    p_status TEXT DEFAULT 'active',
    p_progress INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    github_url TEXT,
    live_url TEXT,
    summary TEXT,
    project_scope TEXT,
    status TEXT,
    progress INTEGER,
    webhook_secret TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_project_id UUID;
    v_user_id UUID;
    v_webhook_secret TEXT;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Generate a random webhook secret (32 character hex string)
    v_webhook_secret := encode(gen_random_bytes(16), 'hex');
    
    -- Insert project
    INSERT INTO public.projects (name, github_url, live_url, summary, project_scope, status, progress, webhook_secret)
    VALUES (p_name, p_github_url, p_live_url, p_summary, p_project_scope, p_status, p_progress, v_webhook_secret)
    RETURNING projects.id INTO v_project_id;
    
    -- Link user as owner
    INSERT INTO public.project_user (project_id, user_id, is_owner)
    VALUES (v_project_id, v_user_id, true)
    ON CONFLICT (project_id, user_id) DO NOTHING;
    
    -- Return the created project
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.github_url,
        p.live_url,
        p.summary,
        p.project_scope,
        p.status,
        p.progress,
        p.webhook_secret,
        p.created_at,
        p.updated_at
    FROM public.projects p
    WHERE p.id = v_project_id;
END;
$$;

-- Function to add user to project (for owners adding other users)
DROP FUNCTION IF EXISTS add_user_to_project(UUID, UUID, BOOLEAN);
CREATE OR REPLACE FUNCTION add_user_to_project(
    p_project_id UUID,
    p_user_id UUID,
    p_is_owner BOOLEAN DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.project_user
        WHERE project_id = p_project_id
        AND user_id = auth.uid()
        AND is_owner = true
    ) THEN
        RAISE EXCEPTION 'Only project owners can add users';
    END IF;
    
    INSERT INTO public.project_user (project_id, user_id, is_owner)
    VALUES (p_project_id, p_user_id, p_is_owner)
    ON CONFLICT (project_id, user_id) DO NOTHING;
END;
$$;

-- Function to regenerate webhook secret
CREATE OR REPLACE FUNCTION public.regenerate_webhook_secret(p_project_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_new_secret TEXT;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM public.project_user
        WHERE project_id = p_project_id
        AND user_id = v_user_id
        AND is_owner = true
    ) THEN
        RAISE EXCEPTION 'Only project owners can regenerate webhook secret';
    END IF;
    
    v_new_secret := encode(gen_random_bytes(16), 'hex');
    
    UPDATE public.projects
    SET webhook_secret = v_new_secret,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = p_project_id;
    
    RETURN v_new_secret;
END;
$$;

-- Function to get user by email (for project invitations)
CREATE OR REPLACE FUNCTION get_user_by_email(p_email TEXT)
RETURNS TABLE (
    id UUID,
    email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    RETURN QUERY
    SELECT 
        p.id,
        p.email
    FROM public.profiles p
    WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(p_email))
    LIMIT 1;
END;
$$;

-- Function to get member profiles (bypasses RLS)
CREATE OR REPLACE FUNCTION get_member_profiles(p_user_ids UUID[])
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    RETURN QUERY
    SELECT 
        p.id,
        p.email,
        p.full_name,
        p.role,
        p.avatar_url
    FROM public.profiles p
    WHERE p.id = ANY(p_user_ids);
END;
$$;

-- Function to generate secure invitation token
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    token TEXT;
BEGIN
    token := encode(gen_random_bytes(32), 'base64url');
    RETURN token;
END;
$$;

-- Function to create profile for email (for existing users without profile)
CREATE OR REPLACE FUNCTION create_profile_for_email(p_email TEXT)
RETURNS TABLE (
    id UUID,
    email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_user_email TEXT;
    v_role TEXT;
    v_full_name TEXT;
    v_avatar_url TEXT;
BEGIN
    SELECT u.id, u.email, 
           COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', u.email),
           u.raw_user_meta_data->>'avatar_url'
    INTO v_user_id, v_user_email, v_full_name, v_avatar_url
    FROM auth.users u
    WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(p_email))
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RETURN;
    END IF;

    SELECT CASE 
        WHEN raw_app_meta_data->>'provider' = 'github' THEN 'developer'
        ELSE 'reviewer'
    END INTO v_role
    FROM auth.users
    WHERE id = v_user_id;

    INSERT INTO public.profiles (id, email, role, full_name, avatar_url)
    VALUES (
        v_user_id,
        v_user_email,
        v_role,
        v_full_name,
        v_avatar_url
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email
    RETURNING profiles.id, profiles.email INTO v_user_id, v_user_email;

    RETURN QUERY
    SELECT v_user_id, v_user_email;
END;
$$;

-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role TEXT;
BEGIN
    IF NEW.raw_app_meta_data->>'provider' = 'github' THEN
        v_role := 'developer';
    ELSE
        v_role := 'reviewer';
    END IF;
    
    INSERT INTO public.profiles (id, email, role, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        v_role,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-creating profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- REALTIME
-- ============================================

-- Enable realtime for updates table
ALTER PUBLICATION supabase_realtime ADD TABLE public.updates;

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Helper function for storage access
CREATE OR REPLACE FUNCTION user_has_project_access_for_storage(p_project_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.project_user
        WHERE project_id::text = p_project_id
        AND user_id = auth.uid()
    );
END;
$$;

-- Helper function to check if user is project owner for storage
CREATE OR REPLACE FUNCTION user_is_project_owner_for_storage(p_project_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.project_user
        WHERE project_id::text = p_project_id
        AND user_id = auth.uid()
        AND is_owner = true
    );
END;
$$;

-- Storage policies for project-scopes bucket
DROP POLICY IF EXISTS "Users can upload their own PDFs" ON storage.objects;
CREATE POLICY "Users can upload their own PDFs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-scopes' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can view their own PDFs" ON storage.objects;
CREATE POLICY "Users can view their own PDFs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-scopes' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage policies for project-documents bucket
DROP POLICY IF EXISTS "Users can upload documents to their projects" ON storage.objects;
CREATE POLICY "Users can upload documents to their projects"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-documents' AND
  (
    user_has_project_access_for_storage((storage.foldername(name))[1])
    OR
    (storage.foldername(name))[1] = 'temp' AND
    (storage.foldername(name))[2] = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Users can view documents for their projects" ON storage.objects;
CREATE POLICY "Users can view documents for their projects"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-documents' AND
  (
    user_has_project_access_for_storage((storage.foldername(name))[1])
    OR
    (storage.foldername(name))[1] = 'temp' AND
    (storage.foldername(name))[2] = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Users can delete documents from their projects" ON storage.objects;
CREATE POLICY "Users can delete documents from their projects"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-documents' AND
  (
    user_has_project_access_for_storage((storage.foldername(name))[1])
    OR
    (storage.foldername(name))[1] = 'temp' AND
    (storage.foldername(name))[2] = auth.uid()::text
  )
);

-- Storage policies for project-thumbnails bucket
DROP POLICY IF EXISTS "Project owners can upload thumbnails" ON storage.objects;
CREATE POLICY "Project owners can upload thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-thumbnails' AND
  user_is_project_owner_for_storage((storage.foldername(name))[1])
);

DROP POLICY IF EXISTS "Anyone can view thumbnails" ON storage.objects;
CREATE POLICY "Anyone can view thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-thumbnails');

DROP POLICY IF EXISTS "Project owners can delete thumbnails" ON storage.objects;
CREATE POLICY "Project owners can delete thumbnails"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-thumbnails' AND
  user_is_project_owner_for_storage((storage.foldername(name))[1])
);

-- ============================================
-- TABLE COMMENTS
-- ============================================

COMMENT ON TABLE public.webhook_events IS 'Stores GitHub webhook events (PR merges) for processing and video generation';
COMMENT ON COLUMN public.updates.webhook_event_id IS 'Links this update to the webhook event that triggered it (e.g., GitHub PR merge)';
COMMENT ON COLUMN public.projects.thumbnail_url IS 'URL to the project home/thumbnail picture stored in Supabase Storage';
