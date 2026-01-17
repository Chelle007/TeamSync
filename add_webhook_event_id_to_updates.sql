-- Migration: Add webhook_events table and link it to updates table
-- This enables tracking GitHub webhook events (PR merges) and their associated updates

-- Step 1: Create webhook_events table
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

-- Create indexes for webhook_events
CREATE INDEX IF NOT EXISTS idx_webhook_events_project_id ON public.webhook_events(project_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processing_status ON public.webhook_events(processing_status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_pr_number ON public.webhook_events(pr_number);

-- Enable RLS for webhook_events
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view webhook events for their projects
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

-- RLS Policy: Service role can insert webhook events (for webhook endpoint)
DROP POLICY IF EXISTS "Service can insert webhook events" ON public.webhook_events;
CREATE POLICY "Service can insert webhook events"
    ON public.webhook_events FOR INSERT
    WITH CHECK (true);

-- RLS Policy: Service role can update webhook events (for status updates)
DROP POLICY IF EXISTS "Service can update webhook events" ON public.webhook_events;
CREATE POLICY "Service can update webhook events"
    ON public.webhook_events FOR UPDATE
    USING (true);

-- Step 2: Add webhook_event_id column to updates table
ALTER TABLE public.updates 
ADD COLUMN IF NOT EXISTS webhook_event_id UUID REFERENCES public.webhook_events(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_updates_webhook_event_id ON public.updates(webhook_event_id);

-- Add comment for documentation
COMMENT ON COLUMN public.updates.webhook_event_id IS 'Links this update to the webhook event that triggered it (e.g., GitHub PR merge)';
COMMENT ON TABLE public.webhook_events IS 'Stores GitHub webhook events (PR merges) for processing and video generation';
