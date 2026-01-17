-- Migration: Add project_scope field to projects table
-- Run this SQL in Supabase Dashboard -> SQL Editor

-- Add project_scope column to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS project_scope TEXT;

-- Update the create_project_with_owner function to include project_scope
DROP FUNCTION IF EXISTS create_project_with_owner(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER);
CREATE OR REPLACE FUNCTION create_project_with_owner(
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
    INSERT INTO public.projects (name, github_url, live_url, summary, project_scope, status, progress)
    VALUES (p_name, p_github_url, p_live_url, p_summary, p_project_scope, p_status, p_progress)
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
        p.created_at,
        p.updated_at
    FROM public.projects p
    WHERE p.id = v_project_id;
END;
$$;
