-- Function to create a profile for a user by email (if they exist in auth.users but not in profiles)
-- This is useful for users who signed up before the profile trigger was set up
CREATE OR REPLACE FUNCTION create_profile_for_email(p_email TEXT)
RETURNS TABLE (
    id UUID,
    email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_user_email TEXT;
    v_role TEXT;
    v_full_name TEXT;
    v_avatar_url TEXT;
BEGIN
    -- Find user in auth.users by email
    SELECT u.id, u.email, 
           COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', u.email),
           u.raw_user_meta_data->>'avatar_url'
    INTO v_user_id, v_user_email, v_full_name, v_avatar_url
    FROM auth.users u
    WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(p_email))
    LIMIT 1;

    -- If user not found, return empty
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;

    -- Determine role based on provider
    SELECT CASE 
        WHEN raw_app_meta_data->>'provider' = 'github' THEN 'developer'
        ELSE 'reviewer'
    END INTO v_role
    FROM auth.users
    WHERE id = v_user_id;

    -- Create profile if it doesn't exist
    INSERT INTO public.profiles (id, email, role, full_name, avatar_url)
    VALUES (
        v_user_id,
        v_user_email,
        v_role,
        v_full_name,
        v_avatar_url
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email
    RETURNING profiles.id, profiles.email INTO v_user_id, v_user_email;

    -- Return the profile
    RETURN QUERY
    SELECT v_user_id, v_user_email;
END;
$$;
