# TeamSync Setup Guide

## 1. Install Dependencies

```bash
npm install
```

## 2. Environment Variables

Create a `.env.local` file with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

## 3. Supabase Setup

### Database Tables
Run the SQL in `supabase_schema.sql` in Supabase Dashboard → SQL Editor

### Storage Buckets
Create the following storage buckets in Supabase Dashboard → Storage:

1. **project-scopes** (for PDF uploads)
   - Public: `false`
   - File size limit: 10MB
   - Allowed MIME types: `application/pdf`

2. **project-documents** (for project-related PDFs)
   - Public: `false`
   - File size limit: 10MB
   - Allowed MIME types: `application/pdf`

3. **project-videos** (for generated videos - optional for now)
   - Public: `false`
   - File size limit: 500MB
   - Allowed MIME types: `video/mp4`

### Storage Policies

Add RLS policies for `project-scopes` bucket:

```sql
-- Allow authenticated users to upload their own PDFs
CREATE POLICY "Users can upload their own PDFs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-scopes' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own PDFs
CREATE POLICY "Users can view their own PDFs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-scopes' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

Add RLS policies for `project-documents` bucket:

```sql
-- Allow users to upload documents for projects they have access to
CREATE POLICY "Users can upload documents to their projects"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT project_id::text FROM project_user
    WHERE user_id = auth.uid()
  )
);

-- Allow users to view documents for projects they have access to
CREATE POLICY "Users can view documents for their projects"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT project_id::text FROM project_user
    WHERE user_id = auth.uid()
  )
);
```

## 4. Optional: PDF Text Extraction

For PDF text extraction, install:

```bash
npm install pdf-parse @types/pdf-parse
```

Then uncomment the PDF parsing code in `app/api/projects/summarize/route.ts`

## 5. GitHub OAuth Setup

1. Go to GitHub → Settings → Developer settings → OAuth Apps
2. Create new OAuth App
3. Set Authorization callback URL: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
4. Copy Client ID and Client Secret
5. Add to Supabase Dashboard → Authentication → Providers → GitHub
6. Add scopes: `repo read:user user:email`

## 6. Run the App

```bash
npm run dev
```
