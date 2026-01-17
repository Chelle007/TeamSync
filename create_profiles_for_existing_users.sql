-- SQL script to create profiles for existing users
-- Run this in Supabase SQL Editor if you have existing users without profiles

-- Insert profiles for existing users based on their provider
INSERT INTO public.profiles (id, email, role, full_name, avatar_url)
SELECT 
    u.id,
    u.email,
    CASE 
        WHEN u.raw_app_meta_data->>'provider' = 'github' THEN 'developer'
        ELSE 'reviewer'
    END as role,
    COALESCE(
        u.raw_user_meta_data->>'full_name',
        u.raw_user_meta_data->>'name',
        u.email
    ) as full_name,
    u.raw_user_meta_data->>'avatar_url' as avatar_url
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;
