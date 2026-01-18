# Project Thumbnail Setup Guide

This guide explains how to set up project thumbnails (home pictures) for TeamSync projects.

## Database Migration

1. Run the SQL migration to add the `thumbnail_url` column to the projects table:
   ```sql
   -- Run add_project_thumbnail_url.sql in Supabase Dashboard -> SQL Editor
   ```

## Storage Bucket Setup

1. Create a new storage bucket in Supabase Dashboard → Storage:
   - **Bucket Name**: `project-thumbnails`
   - **Public**: `true` (thumbnails should be publicly accessible for the home page)
   - **File size limit**: 5MB
   - **Allowed MIME types**: `image/jpeg`, `image/png`, `image/webp`, `image/gif`

2. Run the updated storage policies:
   ```sql
   -- Run storage_policies.sql in Supabase Dashboard -> SQL Editor
   -- This includes policies for the project-thumbnails bucket
   ```

## Features

### 1. Upload Thumbnail in Settings
- Project owners can upload/change/remove project thumbnails in the Settings tab
- Supports JPEG, PNG, WebP, and GIF formats
- Maximum file size: 5MB
- Thumbnails are stored in the `project-thumbnails` bucket

### 2. Upload Thumbnail When Creating Project
- Users can optionally upload a thumbnail when creating a new project
- The thumbnail is uploaded after the project is created
- Same format and size restrictions apply

### 3. Display on Home Page
- Project thumbnails are displayed on the home page project cards
- If no thumbnail is set, a placeholder with project initials is shown

## API Endpoints

### Upload Thumbnail
```
POST /api/projects/[projectId]/thumbnail
Content-Type: multipart/form-data

Body: { file: File }
```

### Delete Thumbnail
```
DELETE /api/projects/[projectId]/thumbnail
```

Both endpoints require:
- User authentication
- Project ownership (only owners can upload/delete thumbnails)

## Notes

- Thumbnails are automatically deleted from storage when replaced or removed
- The bucket should be set to **public** for optimal performance on the home page
- Old thumbnails are cleaned up automatically when new ones are uploaded
