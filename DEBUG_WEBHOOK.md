# 🐛 Webhook Debugging Guide

## Step-by-Step Debugging

### Step 1: Check if GitHub sent the webhook
1. Go to your GitHub repo
2. Settings → Webhooks
3. Click on your webhook
4. Scroll to "Recent Deliveries"
5. Check if there's a delivery for your PR merge

**What to look for:**
- ✅ Green checkmark = Webhook sent successfully
- ❌ Red X = Webhook failed to send
- Click on a delivery to see:
  - Request headers
  - Request body
  - Response from your server

**Common issues:**
- Webhook URL is wrong
- Webhook not configured for "Pull requests" event
- Webhook is inactive

---

### Step 2: Check if your server received it
**Check server logs:**
```bash
# If running locally
# Look for console logs like:
# 🎣 Webhook received from GitHub
# 📦 Processing merged PR #X from owner/repo
```

**Check Vercel logs (if deployed):**
1. Go to Vercel Dashboard
2. Click your project
3. Go to "Logs" tab
4. Filter by `/api/webhooks/github`

**What to look for:**
- "Webhook received from GitHub"
- "Processing merged PR"
- Any error messages

---

### Step 3: Check database - webhook_events table
**Run this SQL in Supabase:**
```sql
SELECT * FROM webhook_events 
ORDER BY created_at DESC 
LIMIT 5;
```

**What to look for:**
- Is there a new row for your PR?
- What's the `processing_status`? (pending/processing/completed/failed)
- Is there an `error_message`?

**If no row exists:**
- Webhook didn't reach your server, OR
- Project matching failed, OR
- Signature verification failed

---

### Step 4: Check database - updates table
**Run this SQL:**
```sql
SELECT * FROM updates 
ORDER BY created_at DESC 
LIMIT 5;
```

**What to look for:**
- Is there a new row for your PR?
- What's the `status`? (pending/processing/completed/failed)
- Is there a `video_url`?

**If no row exists:**
- Video generation didn't start, OR
- Video generation failed before creating update

---

### Step 5: Check project configuration
**Run this SQL:**
```sql
SELECT id, name, github_url, live_url, webhook_secret 
FROM projects 
WHERE github_url LIKE '%your-repo-name%';
```

**What to check:**
- Does `github_url` match your GitHub repo?
- Is `live_url` set? (required for video recording)
- Does `webhook_secret` exist?

---

## Common Issues & Solutions

### Issue 1: "No project found for repository"
**Symptom:** GitHub webhook delivery shows 404 response

**Solution:**
1. Check your project's `github_url` in database
2. Make sure it matches the repo that sent the webhook
3. Format should be: `https://github.com/owner/repo`

**Fix:**
```sql
UPDATE projects 
SET github_url = 'https://github.com/YOUR_OWNER/YOUR_REPO'
WHERE id = 'your-project-id';
```

---

### Issue 2: "Invalid signature"
**Symptom:** GitHub webhook delivery shows 401 response

**Solution:**
1. Get your project's webhook_secret from database
2. Update GitHub webhook with the correct secret

**Get secret:**
```sql
SELECT webhook_secret FROM projects WHERE id = 'your-project-id';
```

**Update in GitHub:**
1. Repo → Settings → Webhooks
2. Click "Edit" on your webhook
3. Update "Secret" field
4. Click "Update webhook"

---

### Issue 3: Webhook received but no video generated
**Symptom:** Row in webhook_events but status stuck on "pending"

**Possible causes:**
1. Video generation endpoint not triggered
2. Video generation failed silently
3. Project has no `live_url`

**Check:**
```sql
SELECT processing_status, error_message 
FROM webhook_events 
WHERE id = 'webhook-event-id';
```

**Fix:**
```sql
-- If missing live_url
UPDATE projects 
SET live_url = 'https://your-staging-site.com'
WHERE id = 'your-project-id';
```

---

### Issue 4: Video generation fails
**Symptom:** webhook_events status = "failed"

**Check error:**
```sql
SELECT error_message FROM webhook_events 
WHERE processing_status = 'failed'
ORDER BY created_at DESC 
LIMIT 1;
```

**Common errors:**
- "Project must have a live_url" → Add live_url to project
- "Failed to fetch commits" → GitHub token issue
- "AI analysis failed" → OpenAI API issue
- "Screen recording failed" → Puppeteer/site access issue

---

## Quick Test Commands

### Test 1: Check if webhook endpoint is accessible
```bash
curl -X POST http://localhost:3000/api/webhooks/github \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=test" \
  -d '{"action":"test"}'
```

**Expected:** Should return error (signature invalid) but proves endpoint exists

---

### Test 2: Check project matching
```sql
-- Replace with your repo name
SELECT * FROM projects 
WHERE github_url LIKE '%your-repo%';
```

---

### Test 3: Manually trigger video generation
```bash
# Replace PROJECT_ID and WEBHOOK_EVENT_ID
curl -X POST http://localhost:3000/api/projects/PROJECT_ID/generate-video \
  -H "Content-Type: application/json" \
  -d '{"webhookEventId":"WEBHOOK_EVENT_ID"}'
```

---

## Environment Variables Check

Make sure these are set:
```bash
# Required
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Optional but recommended
NEXT_PUBLIC_SITE_URL=http://localhost:3000
GITHUB_TEST_TOKEN=ghp_... (fallback token)
```

---

## Enable Debug Logging

Add this to your webhook handler for more details:
```javascript
console.log('📦 Webhook payload:', JSON.stringify(webhookData, null, 2))
console.log('🔍 Looking for repo:', repoFullName)
console.log('✅ Found project:', project)
```
