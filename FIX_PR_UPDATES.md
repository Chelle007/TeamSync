# Fix: PRs Not Showing on Updates Page

## Problem
When you merge a PR on GitHub, it's not appearing on the updates page in your app.

## Root Cause
The database is missing the `webhook_events` table and the `webhook_event_id` column in the `updates` table. When the webhook tries to create an update after processing a PR, the database insert fails because the column doesn't exist.

## Solution

### Step 1: Run the Migration
Execute the SQL migration to create the missing table and column:

```bash
# In Supabase Dashboard -> SQL Editor, run:
```

Copy and paste the contents of `add_webhook_event_id_to_updates.sql` into the SQL Editor and execute it.

### Step 2: Verify the Migration
Run this query to confirm the changes:

```sql
-- Check if webhook_events table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'webhook_events'
) as webhook_events_exists;

-- Check if webhook_event_id column exists in updates table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'updates' 
  AND column_name = 'webhook_event_id';
```

Both queries should return positive results.

### Step 3: Test the Webhook Flow
After running the migration, test the complete flow:

1. **Merge a PR** on your GitHub repository
2. **Check webhook events** in Supabase:
   ```sql
   SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT 5;
   ```
3. **Check updates** in Supabase:
   ```sql
   SELECT * FROM updates ORDER BY created_at DESC LIMIT 5;
   ```
4. **Refresh your updates page** in the app

### Step 4: Debug if Still Not Working

If PRs still aren't showing up, check these in order:

#### A. Webhook Delivery
1. Go to your GitHub repo → Settings → Webhooks
2. Click on your webhook
3. Check "Recent Deliveries" tab
4. Look for failed deliveries (red X)
5. Click on a delivery to see the error message

#### B. Webhook Secret
Make sure your webhook secret matches:
```sql
SELECT id, name, webhook_secret FROM projects WHERE github_url LIKE '%your-repo%';
```

The `webhook_secret` should match what you configured in GitHub.

#### C. Server Logs
Check your application logs for errors:
- Look for "🎣 Webhook received from GitHub"
- Look for "❌" error messages
- Check if video generation is being triggered

#### D. Database Permissions
Verify RLS policies allow inserts:
```sql
-- Test if service role can insert
SET ROLE service_role;
INSERT INTO webhook_events (project_id, event_type, pr_number, pr_title, raw_payload)
VALUES ('your-project-id', 'pull_request', 999, 'Test', '{}');
ROLLBACK;
```

## How the Flow Works

1. **GitHub sends webhook** → `/api/webhooks/github`
2. **Webhook handler**:
   - Verifies signature
   - Finds project by repo URL
   - Stores event in `webhook_events` table
   - Triggers video generation
3. **Video generation** (`/api/projects/[projectId]/generate-video`):
   - Analyzes PR with AI
   - Generates TTS audio
   - Records screen
   - Combines video + audio
   - **Creates update in `updates` table** ← This was failing
4. **Updates page** fetches from `updates` table

## Quick Test Script

Use this to test the webhook flow without GitHub:

```bash
node scripts/test-webhook-flow.js
```

This simulates a PR merge and should create an update if everything is working.
