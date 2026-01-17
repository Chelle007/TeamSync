# Webhook Setup Checklist - Why PRs Aren't Showing Up

## The Issue
No webhook events are being created when you merge PRs. This means GitHub webhooks aren't reaching your app.

## Quick Diagnosis
Run this to see what's wrong:
```bash
node scripts/check-webhook-setup.js
```

## Step-by-Step Fix

### 1. Run Database Migrations (REQUIRED)

You need to run TWO migrations in Supabase Dashboard → SQL Editor:

#### Migration 1: Add webhook_secret column
File: `add_webhook_secret.sql`
- Adds `webhook_secret` column to projects table
- Auto-generates secrets for new projects

#### Migration 2: Add webhook_events table
File: `add_webhook_event_id_to_updates.sql`
- Creates `webhook_events` table
- Links it to `updates` table

**Run both of these in Supabase SQL Editor!**

### 2. Is Your App Deployed?

GitHub webhooks need a **public URL**. They can't reach `localhost:3000`.

**Options:**

#### Option A: Deploy to Vercel (Recommended)
```bash
# If not already deployed
vercel deploy

# Get your deployment URL (e.g., https://your-app.vercel.app)
# Update .env.local:
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
```

#### Option B: Use ngrok for Local Testing
```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3000

# Copy the https URL (e.g., https://abc123.ngrok.io)
# Update .env.local:
NEXT_PUBLIC_SITE_URL=https://abc123.ngrok.io
```

⚠️ **Important**: If using ngrok, you need to keep it running and update the GitHub webhook URL each time you restart it (the URL changes).

### 3. Configure GitHub Webhook

Go to your GitHub repo → Settings → Webhooks → Add webhook

**Settings:**
- **Payload URL**: `https://your-app.vercel.app/api/webhooks/github`
  - Replace with your actual deployed URL
  - Must be HTTPS (not http)
  - Must be publicly accessible
  
- **Content type**: `application/json`

- **Secret**: Get from your database
  ```sql
  -- Run in Supabase SQL Editor:
  SELECT id, name, webhook_secret FROM projects;
  ```
  Copy the `webhook_secret` value and paste it in GitHub

- **Which events**: Select "Let me select individual events"
  - ✓ Check **"Pull requests"** only
  - Uncheck everything else

- **Active**: ✓ (checked)

Click "Add webhook"

### 4. Test the Webhook

#### A. Check GitHub Webhook Delivery
1. Go to GitHub repo → Settings → Webhooks
2. Click on your webhook
3. Click "Recent Deliveries" tab
4. You should see deliveries listed

**If you see a green checkmark (✓):**
- Webhook is working! Check your database for webhook_events

**If you see a red X (✗):**
- Click on the failed delivery to see the error
- Common errors:
  - `Connection refused` → App not running or URL wrong
  - `404 Not Found` → Wrong webhook URL
  - `401 Unauthorized` → Webhook secret mismatch
  - `Timeout` → App is too slow to respond

#### B. Manually Test a PR
1. Make a small change in your repo
2. Create a PR
3. Merge the PR
4. Check GitHub webhook deliveries (should see a new delivery)
5. Check your database:
   ```sql
   SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT 5;
   ```

### 5. Common Issues & Solutions

#### Issue: "No webhook events in database"
**Cause**: GitHub webhooks aren't reaching your app

**Solutions**:
- ✓ Make sure app is deployed (not localhost)
- ✓ Check GitHub webhook "Recent Deliveries" for errors
- ✓ Verify webhook URL is correct
- ✓ Ensure webhook secret matches database

#### Issue: "Webhook secret mismatch"
**Cause**: Secret in GitHub doesn't match database

**Solution**:
```sql
-- Get your project's webhook secret:
SELECT webhook_secret FROM projects WHERE github_url LIKE '%your-repo%';

-- Copy this secret and update it in GitHub webhook settings
```

#### Issue: "Connection refused"
**Cause**: App is not running or not accessible

**Solutions**:
- Deploy to Vercel
- Or use ngrok for local testing
- Make sure dev server is running: `npm run dev`

#### Issue: "Webhook events created but no updates"
**Cause**: Video generation is failing

**Solution**:
- Check server logs for errors
- Verify `live_url` is set on your project
- Check if OpenAI API key is valid

### 6. Verify Everything Works

Run the debug script:
```bash
node scripts/check-webhook-setup.js
```

This will check:
- ✓ Database tables exist
- ✓ Projects have webhook secrets
- ✓ Environment variables are set
- ✓ Recent webhook events

### 7. Quick Test Without GitHub

If you want to test the webhook flow without GitHub:
```bash
node scripts/test-webhook-flow.js
```

This simulates a PR merge and tests the entire pipeline.

## Summary

The most common issue is that **your app needs to be publicly accessible** for GitHub webhooks to work. You can't use `localhost:3000` - you need either:
1. A deployed app (Vercel, etc.)
2. ngrok tunnel for local testing

Once your app is public and the webhook is configured in GitHub, PRs will automatically create updates!
