-- ⚠️ WARNING: This script will DELETE ALL DATA from your database
-- Run this in Supabase SQL Editor to clear all data
-- Make sure you have a backup if needed!

-- Disable triggers temporarily to avoid issues
SET session_replication_role = 'replica';

-- Delete data in correct order (respecting foreign key constraints)
-- Start with tables that have foreign keys

-- 1. Delete chatbot messages (references projects and users)
DELETE FROM public.chatbot_messages;
ALTER SEQUENCE IF EXISTS chatbot_messages_id_seq RESTART WITH 1;

-- 2. Delete updates (references projects)
DELETE FROM public.updates;
ALTER SEQUENCE IF EXISTS updates_id_seq RESTART WITH 1;

-- 3. Delete project_user associations (references projects and users)
DELETE FROM public.project_user;
ALTER SEQUENCE IF EXISTS project_user_id_seq RESTART WITH 1;

-- 4. Delete projects (no dependencies from our tables)
DELETE FROM public.projects;
ALTER SEQUENCE IF EXISTS projects_id_seq RESTART WITH 1;

-- 5. Delete profiles (references auth.users, but we can clear the data)
-- Note: This won't delete auth.users, just the profile data
DELETE FROM public.profiles;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Verify deletion
DO $$
DECLARE
    chatbot_count INTEGER;
    updates_count INTEGER;
    project_user_count INTEGER;
    projects_count INTEGER;
    profiles_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO chatbot_count FROM public.chatbot_messages;
    SELECT COUNT(*) INTO updates_count FROM public.updates;
    SELECT COUNT(*) INTO project_user_count FROM public.project_user;
    SELECT COUNT(*) INTO projects_count FROM public.projects;
    SELECT COUNT(*) INTO profiles_count FROM public.profiles;
    
    RAISE NOTICE 'Deletion complete. Remaining records:';
    RAISE NOTICE '  chatbot_messages: %', chatbot_count;
    RAISE NOTICE '  updates: %', updates_count;
    RAISE NOTICE '  project_user: %', project_user_count;
    RAISE NOTICE '  projects: %', projects_count;
    RAISE NOTICE '  profiles: %', profiles_count;
END $$;

-- Note: To clear storage buckets, you need to:
-- 1. Go to Supabase Dashboard → Storage
-- 2. Select each bucket (project-scopes, project-documents)
-- 3. Delete all files manually, OR
-- 4. Use the Supabase Storage API to delete files programmatically
