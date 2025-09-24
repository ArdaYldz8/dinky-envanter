-- ====================================
-- OPTIMIZED ROLE FUNCTIONS WITH JWT CLAIMS
-- Performance-optimized role checking using JWT claims
-- Prevents subquery-per-row performance issues
-- ====================================

-- Drop existing role functions
DROP FUNCTION IF EXISTS get_user_role();
DROP FUNCTION IF EXISTS is_admin();
DROP FUNCTION IF EXISTS is_warehouse();
DROP FUNCTION IF EXISTS is_accounting();
DROP FUNCTION IF EXISTS get_current_user_role();

-- ====================================
-- OPTIMIZED ROLE EXTRACTION FROM JWT
-- ====================================

-- Function to get user role from JWT claims (CACHED)
-- Uses JWT claims for performance (no database query)
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
    SELECT COALESCE(
        current_setting('request.jwt.claims', true)::json->>'role',
        (SELECT role FROM user_profiles WHERE user_id = auth.uid()),
        'anon'
    );
$$;

-- Wrapper with caching for use in RLS policies
-- The SELECT wrapper causes Postgres to cache result per-statement
CREATE OR REPLACE FUNCTION get_user_role_cached()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
    SELECT get_current_user_role();
$$;

-- ====================================
-- OPTIMIZED ROLE CHECK FUNCTIONS
-- Using STABLE (cacheable) instead of VOLATILE
-- ====================================

-- Check if current user is admin (CACHED)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT get_user_role_cached() = 'admin';
$$;

-- Check if current user has warehouse access (CACHED)
CREATE OR REPLACE FUNCTION is_warehouse()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT get_user_role_cached() IN ('admin', 'warehouse');
$$;

-- Check if current user has accounting access (CACHED)
CREATE OR REPLACE FUNCTION is_accounting()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT get_user_role_cached() IN ('admin', 'accounting');
$$;

-- ====================================
-- GRANULAR PERMISSION CHECK FUNCTION
-- For fine-grained authorization
-- ====================================

-- Check if user has specific permission
CREATE OR REPLACE FUNCTION has_permission(
    required_role TEXT,
    required_action TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    user_role TEXT;
    has_access BOOLEAN := FALSE;
BEGIN
    -- Get cached user role
    user_role := get_user_role_cached();

    -- Admin has all permissions
    IF user_role = 'admin' THEN
        RETURN TRUE;
    END IF;

    -- Role-based permission matrix
    CASE
        WHEN required_role = 'warehouse' THEN
            has_access := user_role IN ('admin', 'warehouse');
        WHEN required_role = 'accounting' THEN
            has_access := user_role IN ('admin', 'accounting');
        WHEN required_role = 'admin' THEN
            has_access := user_role = 'admin';
        ELSE
            has_access := FALSE;
    END CASE;

    -- Action-specific permissions (optional)
    IF required_action IS NOT NULL AND has_access THEN
        CASE
            -- Warehouse can't delete transactions
            WHEN user_role = 'warehouse' AND required_action = 'delete'
                AND current_setting('request.table', true) = 'transactions' THEN
                has_access := FALSE;
            -- Accounting can't manage warehouse operations
            WHEN user_role = 'accounting' AND required_action IN ('insert', 'update', 'delete')
                AND current_setting('request.table', true) = 'inventory_movements' THEN
                has_access := FALSE;
        END CASE;
    END IF;

    RETURN has_access;
END;
$$;

-- ====================================
-- AUTH.UID() CACHED WRAPPER
-- Prevents multiple calls per row
-- ====================================

-- Cached auth.uid() for use in RLS policies
CREATE OR REPLACE FUNCTION get_auth_uid()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
    SELECT auth.uid();
$$;

-- ====================================
-- GRANT PERMISSIONS
-- ====================================

GRANT EXECUTE ON FUNCTION get_current_user_role() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_role_cached() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_warehouse() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_accounting() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION has_permission(TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_auth_uid() TO authenticated, anon;

-- ====================================
-- PERFORMANCE INDEXES
-- ====================================

-- Index on user_profiles.role for faster role lookups (if JWT claims fail)
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- ====================================
-- COMMENTS FOR DOCUMENTATION
-- ====================================

COMMENT ON FUNCTION get_current_user_role() IS 'Extracts user role from JWT claims with database fallback - optimized for performance';
COMMENT ON FUNCTION get_user_role_cached() IS 'Cached wrapper for get_current_user_role() - use in RLS policies for per-statement caching';
COMMENT ON FUNCTION is_admin() IS 'Returns true if current user is admin - cached for performance';
COMMENT ON FUNCTION is_warehouse() IS 'Returns true if current user has warehouse access - cached for performance';
COMMENT ON FUNCTION is_accounting() IS 'Returns true if current user has accounting access - cached for performance';
COMMENT ON FUNCTION has_permission(TEXT, TEXT) IS 'Granular permission check with role and action validation';
COMMENT ON FUNCTION get_auth_uid() IS 'Cached auth.uid() wrapper to prevent multiple calls per row in RLS policies';

-- ====================================
-- VERIFICATION
-- ====================================

-- Test functions (run as authenticated user)
-- SELECT get_current_user_role() as role;
-- SELECT is_admin() as is_admin;
-- SELECT is_warehouse() as is_warehouse;
-- SELECT is_accounting() as is_accounting;
-- SELECT has_permission('warehouse', 'select') as has_warehouse_select;