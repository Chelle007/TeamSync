# Fix: Webhook Permissions Error

## The Problem

You're getting: **"Failed to check existing webhooks. Make sure you have admin access to the repository."**

This happens because your GitHub OAuth token doesn't have the `repo` scope needed to manage webhooks.

## The Solution (2 Options)

### Option 1: Re-authenticate (Easiest)

1. Go to your project → **Settings** tab
2. Find the "GitHub Webhook" section
3. Click **"Setup Webhook"** (it will fail with the permissions error)
4. Click the **"Re-authenticate with GitHub"** button that appears
5. You'll be redirected to GitHub to grant permissions
6. After re-authenticating, try **"Setup Webhook"** again
7. Done! ✅

### Option 2: Sign Out and Sign In Again

1. Click your profile icon → **Sign Out**
2. Go to **Login** page
3. Select **"Developer"** role
4. Click **"Continue with GitHub"**
5. GitHub will ask you to authorize with `repo` scope
6. After signing in, go to Settings and click **"Setup Webhook"**
7. Done! ✅

## Why This Happens

When you first signed in, the app didn't request the `repo` scope (which includes webhook management permissions). I've now updated the login flow to request this scope automatically, but existing users need to re-authenticate to get the new permissions.

## What Permissions Are Needed?

The app requests these GitHub scopes:
- `repo` - Full control of private repositories (includes webhook management)
- `read:user` - Read user profile data
- `user:email` - Access user email addresses

The `repo` scope is needed to:
- Create webhooks on your repositories
- Read commit data
- Access repository information

## After Re-authenticating

Once you've re-authenticated:
1. Go to Settings → GitHub Webhook
2. Click "Setup Webhook"
3. It should work now! ✅
4. Merge a PR to test - updates should appear automatically

## Troubleshooting

### Still getting permission errors?

**Check if you're a repo admin:**
1. Go to your GitHub repo
2. Click Settings (you need to see this tab)
3. If you can't see Settings, you're not an admin

**Solution**: Ask the repo owner to:
- Make you an admin, OR
- Set up the webhook themselves

### "Repository not found" error?

This means the repo is private and you don't have access. Make sure:
- The repo exists
- You have at least read access
- The GitHub URL in your project is correct

## Manual Webhook Setup (Fallback)

If automatic setup still doesn't work, you can configure manually:

1. Get your webhook secret:
   ```sql
   SELECT webhook_secret FROM projects WHERE id = 'your-project-id';
   ```

2. Go to GitHub repo → Settings → Webhooks → Add webhook

3. Configure:
   - **Payload URL**: `https://your-app-url/api/webhooks/github`
   - **Content type**: `application/json`
   - **Secret**: (paste from step 1)
   - **Events**: Pull requests only
   - **Active**: ✓

## For New Users

New users who sign in after this fix will automatically get the correct permissions - no re-authentication needed!

## Summary

The fix is simple: **re-authenticate with GitHub** to grant the `repo` scope. After that, automatic webhook setup will work perfectly! 🎉
