-- Function to get profiles for project members (bypasses RLS)
-- This allows project members to see each other's profile info
CREATE OR REPLACE FUNCTION get_member_profiles(p_user_ids UUID[])
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if caller is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Return profiles for the given user IDs
    RETURN QUERY
    SELECT 
        p.id,
        p.email,
        p.full_name,
        p.role,
        p.avatar_url
    FROM public.profiles p
    WHERE p.id = ANY(p_user_ids);
END;
$$;
