-- Function to get user profile by email (bypasses RLS for project invitations)
-- This allows project owners to look up users to add them to projects
CREATE OR REPLACE FUNCTION get_user_by_email(p_email TEXT)
RETURNS TABLE (
    id UUID,
    email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if caller is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Return user profile by email (case-insensitive)
    RETURN QUERY
    SELECT 
        p.id,
        p.email
    FROM public.profiles p
    WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(p_email))
    LIMIT 1;
END;
$$;
