-- TeamSync Database Schema
-- Run this SQL in Supabase Dashboard -> SQL Editor

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends auth.users with role)
-- Note: Supabase already has auth.users, so we'll use profiles for role storage
-- or you can add role directly to auth.users metadata
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

-- Updates table
CREATE TABLE IF NOT EXISTS public.updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    video_url TEXT,
    doc_url TEXT,
    summary TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Chatbot messages table (renamed from messages)
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_project_user_project_id ON public.project_user(project_id);
CREATE INDEX IF NOT EXISTS idx_project_user_user_id ON public.project_user(user_id);
CREATE INDEX IF NOT EXISTS idx_project_user_is_owner ON public.project_user(is_owner);
CREATE INDEX IF NOT EXISTS idx_updates_project_id ON public.updates(project_id);
CREATE INDEX IF NOT EXISTS idx_updates_status ON public.updates(status);
CREATE INDEX IF NOT EXISTS idx_chatbot_messages_project_id ON public.chatbot_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_messages_user_id ON public.chatbot_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_messages_status ON public.chatbot_messages(status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
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

-- RLS Policies for projects
-- Users can view projects they're associated with (via project_user)
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

-- Authenticated users can insert projects (they'll be linked as owner via project_user)
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON public.projects;
CREATE POLICY "Authenticated users can insert projects"
    ON public.projects FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL); -- Any authenticated user can create a project

-- Only owners can update their projects
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

-- Only owners can delete their projects
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

-- RLS Policies for project_user
-- Users can view their own associations or associations for projects they're part of
-- Note: We check user_id directly to avoid recursion
DROP POLICY IF EXISTS "Users can view their own project associations" ON public.project_user;
CREATE POLICY "Users can view their own project associations"
    ON public.project_user FOR SELECT
    USING (user_id = auth.uid());

-- Helper function to check project access (bypasses RLS to avoid recursion)
-- Drop policy first (it depends on the function)
DROP POLICY IF EXISTS "Users can view associations for their projects" ON public.project_user;
-- Then drop and recreate the function
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

-- Users can view associations for projects they're associated with
CREATE POLICY "Users can view associations for their projects"
    ON public.project_user FOR SELECT
    USING (user_has_project_access(project_id));

-- Users can insert themselves into projects (when creating a new project)
DROP POLICY IF EXISTS "Users can insert themselves as project owner" ON public.project_user;
CREATE POLICY "Users can insert themselves as project owner"
    ON public.project_user FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        AND is_owner = true
    );

-- Users can insert themselves into projects (when being added by owner)
DROP POLICY IF EXISTS "Users can be added to projects" ON public.project_user;
CREATE POLICY "Users can be added to projects"
    ON public.project_user FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Note: For owners adding other users, we'll use a database function with SECURITY DEFINER
-- This avoids the recursion issue
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
    -- Check if the caller is an owner of the project
    IF NOT EXISTS (
        SELECT 1 FROM public.project_user
        WHERE project_id = p_project_id
        AND user_id = auth.uid()
        AND is_owner = true
    ) THEN
        RAISE EXCEPTION 'Only project owners can add users';
    END IF;
    
    -- Insert the user
    INSERT INTO public.project_user (project_id, user_id, is_owner)
    VALUES (p_project_id, p_user_id, p_is_owner)
    ON CONFLICT (project_id, user_id) DO NOTHING;
END;
$$;

-- Helper function to check if user is project owner
-- Drop policy first (it depends on the function)
DROP POLICY IF EXISTS "Owners can remove non-owner users" ON public.project_user;
-- Then drop and recreate the function
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

-- Only owners can remove non-owner users from their projects
CREATE POLICY "Owners can remove non-owner users"
    ON public.project_user FOR DELETE
    USING (
        is_owner = false
        AND user_is_project_owner(project_id)
    );

-- RLS Policies for updates
-- Users associated with a project can view its updates
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

-- Only owners can insert updates
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

-- Only owners can update updates
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

-- RLS Policies for chatbot_messages
-- Users associated with a project can view its messages
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

-- Users can insert their own messages
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

-- Only owners can approve/flag messages
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

-- Function to create a project with owner link (bypasses RLS for insertion)
DROP FUNCTION IF EXISTS create_project_with_owner(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER);
CREATE OR REPLACE FUNCTION create_project_with_owner(
    p_name TEXT,
    p_github_url TEXT DEFAULT NULL,
    p_live_url TEXT DEFAULT NULL,
    p_summary TEXT DEFAULT NULL,
    p_status TEXT DEFAULT 'active',
    p_progress INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    github_url TEXT,
    live_url TEXT,
    summary TEXT,
    status TEXT,
    progress INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_project_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Insert project
    INSERT INTO public.projects (name, github_url, live_url, summary, status, progress)
    VALUES (p_name, p_github_url, p_live_url, p_summary, p_status, p_progress)
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
        p.status,
        p.progress,
        p.created_at,
        p.updated_at
    FROM public.projects p
    WHERE p.id = v_project_id;
END;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on projects
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role TEXT;
BEGIN
    -- Determine role based on provider
    -- GitHub = developer, Google/Email = reviewer
    IF NEW.raw_app_meta_data->>'provider' = 'github' THEN
        v_role := 'developer';
    ELSE
        v_role := 'reviewer';
    END IF;
    
    -- Insert into profiles table
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

-- Trigger to call the function when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
