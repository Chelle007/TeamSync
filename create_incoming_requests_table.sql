-- Create incoming_requests table for storing reviewer questions and developer replies
-- Run this SQL in Supabase Dashboard -> SQL Editor

CREATE TABLE IF NOT EXISTS public.incoming_requests (
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
    replied_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    replied_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_incoming_requests_project_id ON public.incoming_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_incoming_requests_status ON public.incoming_requests(status);
CREATE INDEX IF NOT EXISTS idx_incoming_requests_asked_by ON public.incoming_requests(asked_by);
CREATE INDEX IF NOT EXISTS idx_incoming_requests_replied_by ON public.incoming_requests(replied_by);

-- Enable Row Level Security (RLS)
ALTER TABLE public.incoming_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for incoming_requests
-- Users associated with a project can view its incoming requests
DROP POLICY IF EXISTS "Users can view incoming requests for their projects" ON public.incoming_requests;
CREATE POLICY "Users can view incoming requests for their projects"
    ON public.incoming_requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.project_user
            WHERE project_user.project_id = incoming_requests.project_id
            AND project_user.user_id = auth.uid()
        )
    );

-- Reviewers can insert incoming requests for projects they're part of
DROP POLICY IF EXISTS "Reviewers can insert incoming requests" ON public.incoming_requests;
CREATE POLICY "Reviewers can insert incoming requests"
    ON public.incoming_requests FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.project_user
            WHERE project_user.project_id = incoming_requests.project_id
            AND project_user.user_id = auth.uid()
        )
        AND auth.uid() = asked_by
    );

-- Developers can update incoming requests (change status, add reply, etc.)
DROP POLICY IF EXISTS "Developers can update incoming requests" ON public.incoming_requests;
CREATE POLICY "Developers can update incoming requests"
    ON public.incoming_requests FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.project_user pu
            JOIN public.profiles p ON p.id = auth.uid()
            WHERE pu.project_id = incoming_requests.project_id
            AND pu.user_id = auth.uid()
            AND p.role = 'developer'
        )
    );

-- Trigger to automatically update updated_at timestamp
DROP TRIGGER IF EXISTS update_incoming_requests_updated_at ON public.incoming_requests;
CREATE TRIGGER update_incoming_requests_updated_at
    BEFORE UPDATE ON public.incoming_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
