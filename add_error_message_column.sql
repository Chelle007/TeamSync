-- Add error_message column to webhook_events table for storing error details
ALTER TABLE public.webhook_events 
ADD COLUMN IF NOT EXISTS error_message TEXT;
