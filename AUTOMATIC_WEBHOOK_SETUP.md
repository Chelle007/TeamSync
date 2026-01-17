# Automatic Webhook Setup - Fixed! 🎉

## What Changed

Your app now **automatically creates GitHub webhooks** when you create a project! No more manual configuration needed.

## How It Works

### When Creating a New Project

1. Enter your GitHub repository URL
2. Click "Verify" to check access
3. Fill in project details
4. Click "Create Project"
5. **Webhook is automatically configured!** ✨

The app will:
- Create the project
- Generate a webhook secret
- Automatically create the webhook on GitHub
- Show you a success message

### For Existing Projects

If you already have projects without webhooks configured:

1. Go to your project
2. Click the **Settings** tab
3. Find the "GitHub Webhook" section
4. Click **"Setup Webhook"**
5. Done! ✅

## Requirements

For automatic webhook setup to work, you need:

1. **Admin access** to the GitHub repository
   - You must be the repo owner or have admin permissions
   - The app needs this to create webhooks

2. **GitHub OAuth with repo scope**
   - When you sign in with GitHub, grant "repo" access
   - This allows the app to manage webhooks

3. **Public URL** (for webhooks to reach your app)
   - Production: Your deployed URL (e.g., Vercel)
   - Development: Use ngrok to expose localhost

## What If It Fails?

If automatic setup fails, you'll see an error message. Common reasons:

### "Make sure you have admin access to the repository"
**Solution**: You need to be a repo admin. Ask the repo owner to:
- Add you as an admin, OR
- Run the webhook setup themselves

### "GitHub authentication required"
**Solution**: Sign out and sign in again with GitHub, making sure to grant "repo" access

### "Failed to check existing webhooks"
**Solution**: 
- Check your internet connection
- Verify the GitHub URL is correct
- Make sure the repo exists and you have access

## Manual Fallback

If automatic setup doesn't work, you can still configure manually:

1. Get your webhook secret:
   ```sql
   SELECT webhook_secret FROM projects WHERE id = 'your-project-id';
   ```

2. Go to GitHub repo → Settings → Webhooks → Add webhook

3. Configure:
   - **Payload URL**: `https://your-app.vercel.app/api/webhooks/github`
   - **Content type**: `application/json`
   - **Secret**: (paste from step 1)
   - **Events**: Pull requests only
   - **Active**: ✓

## Testing

After webhook is set up (automatically or manually):

1. Make a small change in your repo
2. Create and merge a PR
3. Check your project's Updates page
4. You should see the update appear automatically!

## Troubleshooting

### Webhook created but no updates appearing

Run the debug script:
```bash
node scripts/check-webhook-setup.js
```

This will check:
- Database tables exist
- Webhook secret is configured
- Recent webhook events

### Check GitHub webhook deliveries

1. Go to GitHub repo → Settings → Webhooks
2. Click on your webhook
3. Click "Recent Deliveries"
4. Look for green ✓ (success) or red ✗ (failed)
5. Click on a delivery to see details

## Benefits

✅ **One-click setup** - No more manual configuration
✅ **Automatic updates** - PRs automatically create updates
✅ **Better UX** - Users don't need to know about webhooks
✅ **Error handling** - Clear messages if something goes wrong
✅ **Existing projects** - Can setup webhooks anytime from Settings

## Environment Variables

Make sure these are set in your `.env.local`:

```bash
# Your deployed app URL (required for webhooks)
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app

# Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI for video generation
OPENAI_API_KEY=your-openai-key
```

For local development with ngrok:
```bash
NEXT_PUBLIC_SITE_URL=https://your-ngrok-url.ngrok-free.app
```

## Summary

You no longer need to manually configure webhooks! The app does it automatically when you create a project. For existing projects, just click "Setup Webhook" in Settings. Much better UX! 🚀
