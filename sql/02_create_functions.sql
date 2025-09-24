-- ====================================
-- STEP 2: Create Helper Functions
-- Run this after enabling RLS
-- ====================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_user_profile();
DROP FUNCTION IF EXISTS get_user_role();
DROP FUNCTION IF EXISTS is_admin();
DROP FUNCTION IF EXISTS is_warehouse();
DROP FUNCTION IF EXISTS is_accounting();

-- Function to get current user's profile
CREATE OR REPLACE FUNCTION get_user_profile()
RETURNS JSONB AS $$
DECLARE
    profile JSONB;
BEGIN
    SELECT to_jsonb(user_profiles.*) INTO profile
    FROM user_profiles
    WHERE user_id = auth.uid();

    RETURN COALESCE(profile, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user role from profile
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(
        (SELECT role FROM user_profiles WHERE user_id = auth.uid()),
        'anon'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has warehouse access
CREATE OR REPLACE FUNCTION is_warehouse()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() IN ('admin', 'warehouse');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has accounting access
CREATE OR REPLACE FUNCTION is_accounting()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() IN ('admin', 'accounting');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_warehouse() TO authenticated;
GRANT EXECUTE ON FUNCTION is_accounting() TO authenticated;

-- Test the functions (optional)
SELECT get_user_role() as current_role;
SELECT is_admin() as is_admin;
SELECT is_warehouse() as is_warehouse;
SELECT is_accounting() as is_accounting;