-- Fix function cache issue by dropping all versions and recreating
-- Run this in Supabase SQL Editor

-- Drop all possible versions of the function
DROP FUNCTION IF EXISTS public.create_project_with_owner(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.create_project_with_owner(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.create_project_with_owner(p_github_url TEXT, p_live_url TEXT, p_name TEXT, p_progress INTEGER, p_project_scope TEXT, p_status TEXT, p_summary TEXT);

-- Recreate the function with correct signature
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
