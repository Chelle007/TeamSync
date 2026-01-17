-- Run these queries in Supabase SQL Editor to debug

-- 1. Check if webhook event was created
SELECT 
  id,
  pr_number,
  pr_title,
  processing_status,
  error_message,
  created_at
FROM webhook_events 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. Check if update was created
SELECT 
  id,
  title,
  status,
  video_url,
  webhook_event_id,
  created_at
FROM updates 
ORDER BY created_at DESC 
LIMIT 5;

-- 3. Check your project configuration
SELECT 
  id,
  name,
  github_url,
  live_url,
  webhook_secret
FROM projects 
ORDER BY created_at DESC;

-- 4. Check if webhook_events table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'webhook_events'
) as webhook_events_exists;

-- 5. Check if realtime is enabled
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
