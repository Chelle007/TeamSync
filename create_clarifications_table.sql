-- Create clarifications table for bidirectional questions between developers and reviewers
-- Run this SQL in Supabase Dashboard -> SQL Editor

-- First, drop the old incoming_requests table if it exists (migration)
DROP TABLE IF EXISTS public.incoming_requests CASCADE;

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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clarifications_project_id ON public.clarifications(project_id);
CREATE INDEX IF NOT EXISTS idx_clarifications_status ON public.clarifications(status);
CREATE INDEX IF NOT EXISTS idx_clarifications_asked_by ON public.clarifications(asked_by);
CREATE INDEX IF NOT EXISTS idx_clarifications_asked_to_role ON public.clarifications(asked_to_role);
CREATE INDEX IF NOT EXISTS idx_clarifications_replied_by ON public.clarifications(replied_by);

-- Enable Row Level Security (RLS)
ALTER TABLE public.clarifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clarifications
-- Users associated with a project can view its clarifications
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

-- Users can insert clarifications for projects they're part of
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

-- Users with the target role can update clarifications (change status, add reply, etc.)
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

-- Trigger to automatically update updated_at timestamp
DROP TRIGGER IF EXISTS update_clarifications_updated_at ON public.clarifications;
CREATE TRIGGER update_clarifications_updated_at
    BEFORE UPDATE ON public.clarifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
