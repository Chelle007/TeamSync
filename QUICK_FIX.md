# Quick Fix: PRs Not Showing on Updates Page

## The Problem
Your PRs aren't appearing on the updates page because the database is missing required tables/columns.

## The Solution (3 Steps)

### Step 1: Run the Migration
1. Open **Supabase Dashboard**
2. Go to **SQL Editor**
3. Copy the contents of `add_webhook_event_id_to_updates.sql`
4. Paste and click **Run**

### Step 2: Verify It Worked
Run the debug script:
```bash
node scripts/debug-pr-updates.js
```

This will tell you exactly what's wrong (if anything).

### Step 3: Test with a New PR
1. Make a small change in your repo
2. Create and merge a PR
3. Check the updates page - it should appear!

## What Was Wrong?

The webhook flow was:
1. ✅ GitHub sends webhook
2. ✅ Webhook is received and stored in `webhook_events`
3. ✅ Video generation starts
4. ❌ **Video generation tries to create update but fails** (missing column)
5. ❌ No update appears on the page

After the migration:
1. ✅ GitHub sends webhook
2. ✅ Webhook is received and stored in `webhook_events`
3. ✅ Video generation starts
4. ✅ **Update is created successfully**
5. ✅ Update appears on the page (via real-time subscription)

## Still Not Working?

Run the debug script and it will tell you exactly what to check:
```bash
node scripts/debug-pr-updates.js
```

Common issues:
- Webhook secret doesn't match
- GitHub webhook not configured
- Video generation failing (check server logs)
- RLS policies blocking inserts

See `FIX_PR_UPDATES.md` for detailed debugging steps.
