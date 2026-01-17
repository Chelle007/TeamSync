# Setting Up Google OAuth in Supabase

The error "Unsupported provider: provider is not enabled" means Google OAuth needs to be enabled in your Supabase project dashboard.

## Steps to Enable Google OAuth

### 1. Go to Supabase Dashboard
- Navigate to [https://supabase.com/dashboard](https://supabase.com/dashboard)
- Select your project

### 2. Enable Google Provider
1. Go to **Authentication** → **Providers** in the left sidebar
2. Find **Google** in the list of providers
3. Toggle it **ON** (enable it)

### 3. Configure Google OAuth Credentials

You'll need to create OAuth credentials in Google Cloud Console:

#### A. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API** (if not already enabled)

#### B. Create OAuth 2.0 Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Choose **Web application** as the application type
4. Add authorized redirect URIs:
   - For development: `http://localhost:3000/auth/callback`
   - For production: `https://yourdomain.com/auth/callback`
   - Supabase redirect: `https://[your-project-ref].supabase.co/auth/v1/callback`
5. Copy the **Client ID** and **Client Secret**

#### C. Add Credentials to Supabase
1. Go back to Supabase Dashboard → **Authentication** → **Providers** → **Google**
2. Paste your **Client ID** and **Client Secret** from Google Cloud Console
3. Click **Save**

### 4. Test the Integration
1. Restart your development server if it's running
2. Try signing in with Google again
3. You should be redirected to Google's consent screen

## Troubleshooting

### Error: "redirect_uri_mismatch"
- Make sure you've added the correct redirect URIs in Google Cloud Console
- The redirect URI must match exactly (including http vs https, trailing slashes, etc.)

### Error: "invalid_client"
- Double-check that your Client ID and Client Secret are correct in Supabase
- Make sure there are no extra spaces when copying/pasting

### Error: "provider is not enabled"
- Verify that Google provider is toggled ON in Supabase dashboard
- Try refreshing the page and checking again

## Additional Notes

- The redirect URI format for Supabase is: `https://[your-project-ref].supabase.co/auth/v1/callback`
- You can find your project reference in your Supabase project settings
- Make sure to add both your local development URL and production URL to Google Cloud Console
