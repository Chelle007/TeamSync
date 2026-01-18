-- Add thumbnail_url column to projects table
-- Run this SQL in Supabase Dashboard -> SQL Editor

ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.projects.thumbnail_url IS 'URL to the project home/thumbnail picture stored in Supabase Storage';
