-- Storage RLS Policies for TeamSync
-- Run this SQL in Supabase Dashboard -> SQL Editor

-- Storage policies for project-scopes bucket
DROP POLICY IF EXISTS "Users can upload their own PDFs" ON storage.objects;
CREATE POLICY "Users can upload their own PDFs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-scopes' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can view their own PDFs" ON storage.objects;
CREATE POLICY "Users can view their own PDFs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-scopes' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage policies for project-documents bucket
-- Helper function to check project access (avoids recursion)
CREATE OR REPLACE FUNCTION user_has_project_access_for_storage(p_project_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.project_user
        WHERE project_id::text = p_project_id
        AND user_id = auth.uid()
    );
END;
$$;

DROP POLICY IF EXISTS "Users can upload documents to their projects" ON storage.objects;
CREATE POLICY "Users can upload documents to their projects"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-documents' AND
  (
    -- Allow uploads to project folders if user has access
    user_has_project_access_for_storage((storage.foldername(name))[1])
    OR
    -- Allow uploads to temp folder for project creation
    (storage.foldername(name))[1] = 'temp' AND
    (storage.foldername(name))[2] = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Users can view documents for their projects" ON storage.objects;
CREATE POLICY "Users can view documents for their projects"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-documents' AND
  (
    -- Allow viewing documents in project folders if user has access
    user_has_project_access_for_storage((storage.foldername(name))[1])
    OR
    -- Allow viewing files in temp folder that belong to the user
    (storage.foldername(name))[1] = 'temp' AND
    (storage.foldername(name))[2] = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Users can delete documents from their projects" ON storage.objects;
CREATE POLICY "Users can delete documents from their projects"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-documents' AND
  (
    -- Allow deleting documents in project folders if user has access
    user_has_project_access_for_storage((storage.foldername(name))[1])
    OR
    -- Allow deleting files in temp folder that belong to the user
    (storage.foldername(name))[1] = 'temp' AND
    (storage.foldername(name))[2] = auth.uid()::text
  )
);

-- Storage policies for project-thumbnails bucket
-- Helper function to check if user is project owner
CREATE OR REPLACE FUNCTION user_is_project_owner_for_storage(p_project_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.project_user
        WHERE project_id::text = p_project_id
        AND user_id = auth.uid()
        AND is_owner = true
    );
END;
$$;

-- Allow project owners to upload thumbnails to their projects
DROP POLICY IF EXISTS "Project owners can upload thumbnails" ON storage.objects;
CREATE POLICY "Project owners can upload thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-thumbnails' AND
  user_is_project_owner_for_storage((storage.foldername(name))[1])
);

-- Allow everyone to view thumbnails (public bucket)
DROP POLICY IF EXISTS "Anyone can view thumbnails" ON storage.objects;
CREATE POLICY "Anyone can view thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-thumbnails');

-- Allow project owners to delete thumbnails from their projects
DROP POLICY IF EXISTS "Project owners can delete thumbnails" ON storage.objects;
CREATE POLICY "Project owners can delete thumbnails"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-thumbnails' AND
  user_is_project_owner_for_storage((storage.foldername(name))[1])
);
