# 🎣 Webhook-to-Video Implementation

## Overview
Automated video generation triggered by GitHub PR merges.

## Architecture

### Flow Diagram
```
GitHub PR Merged
    ↓
GitHub Webhook → /api/webhooks/github
    ↓
Find Project (by repo URL)
    ↓
Verify Signature (project's webhook_secret)
    ↓
Store webhook_events (status: pending)
    ↓
Trigger /api/projects/[projectId]/generate-video (async)
    ↓
Return 200 OK to GitHub
    ↓
[Background Processing]
    ↓
/api/webhooks/analyze (AI analyzes PR)
    ↓
/api/generate-tts (create audio)
    ↓
/api/record-screen (record video)
    ↓
/api/combine-video-audio (merge)
    ↓
Store in updates table
    ↓
Update webhook_events (status: completed)
    ↓
User sees video in dashboard! 🎉
```

## API Endpoints

### 1. `/api/webhooks/github` (POST)
**Purpose:** Receive GitHub webhooks
**Input:** GitHub webhook payload
**Output:** 200 OK (immediate response)

**What it does:**
- Verifies webhook signature
- Finds project by repository URL
- Stores webhook event in database
- Triggers video generation (fire-and-forget)
- Returns immediately (doesn't wait for video)

### 2. `/api/webhooks/analyze` (POST)
**Purpose:** Analyze PR data and generate video script
**Input:** 
```json
{
  "webhookPayload": { /* GitHub PR data */ },
  "liveUrl": "https://your-site.com"
}
```
**Output:**
```json
{
  "summary": "Brief summary of changes",
  "script": "Narration script for video",
  "changes": [
    {
      "title": "Change title",
      "description": "What changed",
      "page_url": "/",
      "selector": ".hero-section",
      "duration_seconds": 6
    }
  ]
}
```

### 3. `/api/projects/[projectId]/generate-video` (POST)
**Purpose:** Orchestrate complete video generation
**Input:**
```json
{
  "webhookEventId": "uuid"
}
```
**Output:** Video generation result with URLs

**What it does:**
1. Get webhook event data
2. Call `/api/webhooks/analyze` for AI analysis
3. Call `/api/generate-tts` for audio
4. Call `/api/record-screen` for video
5. Call `/api/combine-video-audio` to merge
6. Store update in database
7. Update webhook event status

### 4. `/api/projects/summarize` (POST)
**Purpose:** Generate project scope summary (for project creation only)
**Input:** Form data with projectScope or PDF
**Output:** Summary and formatted project scope

**Note:** This is separate from webhook analysis!

## Database Schema

### webhook_events
```sql
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  event_type TEXT,
  pr_number INTEGER,
  pr_title TEXT,
  pr_body TEXT,
  merged_by TEXT,
  merged_at TIMESTAMP,
  raw_payload JSONB,
  processing_status TEXT, -- 'pending', 'processing', 'completed', 'failed'
  error_message TEXT,
  created_at TIMESTAMP
);
```

### updates (modified)
```sql
ALTER TABLE updates 
ADD COLUMN webhook_event_id UUID REFERENCES webhook_events(id);
```

### projects (modified)
```sql
ALTER TABLE projects 
ADD COLUMN webhook_secret TEXT;
```

## Helper Functions

### `lib/webhook-processor.ts`
- `findProjectByRepo()` - Match webhook to project
- `getProjectOwnerGitHubToken()` - Get user's GitHub token
- `storeWebhookEvent()` - Save webhook to database
- `updateWebhookEventStatus()` - Update processing status
- `triggerVideoGeneration()` - Fire-and-forget video generation

## Setup Instructions

### 1. Database Setup
Run these SQL migrations in Supabase:
```sql
-- From add_webhook_events.sql (Phase 1)
-- From add_webhook_secret.sql
-- From add_error_message_column.sql
```

### 2. Environment Variables
```bash
OPENAI_API_KEY=your_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
GITHUB_TEST_TOKEN=your_token (fallback)
```

### 3. Create Project
1. Go to `/new`
2. Add GitHub repository URL
3. Verify repository access
4. Create project (webhook_secret auto-generated)

### 4. Configure GitHub Webhook
1. Go to project settings (Phase 8 - coming soon)
2. Copy webhook URL and secret
3. Add to GitHub repo:
   - Settings → Webhooks → Add webhook
   - Payload URL: `https://yourapp.com/api/webhooks/github`
   - Content type: `application/json`
   - Secret: (paste from project settings)
   - Events: "Pull requests" only
   - Active: ✓

### 5. Test
1. Merge a PR in your GitHub repo
2. Check webhook_events table for new entry
3. Wait 30-120 seconds for video generation
4. Check updates table for completed video
5. View video in project dashboard

## Security

### Webhook Signature Verification
- Each project has unique `webhook_secret`
- GitHub signs webhook with HMAC-SHA256
- We verify signature before processing
- Invalid signatures are rejected (401)

### Authentication
- Webhook endpoint is public (GitHub needs access)
- Internal endpoints use Supabase auth
- Project ownership verified before actions

## Error Handling

### Webhook Event Statuses
- `pending` - Received, waiting to process
- `processing` - Video generation in progress
- `completed` - Video generated successfully
- `failed` - Error occurred (see error_message)

### Failure Scenarios
1. **Project not found** - No project with matching repo URL
2. **Invalid signature** - Webhook secret doesn't match
3. **No live_url** - Project needs staging URL for recording
4. **AI analysis fails** - OpenAI API error
5. **Video generation fails** - Puppeteer/FFmpeg error

All errors are logged to `webhook_events.error_message`

## Testing

### Test Script
```bash
node scripts/test-webhook-flow.js
```

### Manual Test
```bash
curl -X POST http://localhost:3000/api/webhooks/github \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=..." \
  -d @test-webhook.json
```

## Performance

### Timing
- Webhook response: <1 second (immediate)
- AI analysis: 5-15 seconds
- TTS generation: 3-8 seconds
- Screen recording: 20-60 seconds
- Video combination: 5-15 seconds
- **Total: 30-120 seconds**

### Optimization
- Webhook returns immediately (doesn't block)
- Video generation runs in background
- User can continue working while video generates
- Status updates in real-time (via database polling)

## Next Steps

### Phase 6: Storage
- Move videos to Supabase Storage
- Generate public URLs
- Clean up local files

### Phase 8: Settings UI
- Show webhook configuration
- Display webhook secret
- Regenerate secret button
- Setup instructions
- Recent webhook events log

## Troubleshooting

### Webhook not received
- Check GitHub webhook delivery logs
- Verify webhook URL is correct
- Check firewall/network settings

### Signature verification fails
- Verify webhook_secret matches GitHub
- Check project has correct github_url
- Ensure raw body is used for verification

### Video generation fails
- Check live_url is accessible
- Verify OpenAI API key is valid
- Check Puppeteer can access site
- Review error_message in webhook_events

### No visual changes detected
- AI will create generic homepage overview
- Check if diff contains UI changes
- Review raw_payload in webhook_events
