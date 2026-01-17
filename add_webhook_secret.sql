-- Add webhook_secret column to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS webhook_secret TEXT;

-- Update the create_project_with_owner function to generate webhook secret
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
    
    -- Check if user is owner
    IF NOT EXISTS (
        SELECT 1 FROM public.project_user
        WHERE project_id = p_project_id
        AND user_id = v_user_id
        AND is_owner = true
    ) THEN
        RAISE EXCEPTION 'Only project owners can regenerate webhook secret';
    END IF;
    
    -- Generate new secret
    v_new_secret := encode(gen_random_bytes(16), 'hex');
    
    -- Update project
    UPDATE public.projects
    SET webhook_secret = v_new_secret,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = p_project_id;
    
    RETURN v_new_secret;
END;
$$;
