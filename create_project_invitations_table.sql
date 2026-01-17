-- Create project_invitations table for email invitations
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

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_invitations_token ON public.project_invitations(token);
CREATE INDEX IF NOT EXISTS idx_project_invitations_email ON public.project_invitations(email);
CREATE INDEX IF NOT EXISTS idx_project_invitations_project_id ON public.project_invitations(project_id);

-- Enable RLS
ALTER TABLE public.project_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_invitations
-- Project owners can view invitations for their projects
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

-- Anyone can view invitations sent to their email (for accepting)
DROP POLICY IF EXISTS "Users can view invitations sent to their email" ON public.project_invitations;
CREATE POLICY "Users can view invitations sent to their email"
    ON public.project_invitations FOR SELECT
    USING (
        email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    );

-- Project owners can create invitations
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

-- Function to generate secure invitation token
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    token TEXT;
BEGIN
    -- Generate a secure random token
    token := encode(gen_random_bytes(32), 'base64url');
    RETURN token;
END;
$$;
