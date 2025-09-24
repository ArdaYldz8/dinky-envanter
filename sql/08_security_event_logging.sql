-- ====================================
-- SECURITY EVENT LOGGING FUNCTIONS
-- Enhanced logging for authorization violations
-- ====================================

-- Function to log security events (general purpose)
CREATE OR REPLACE FUNCTION log_security_event(
    p_event_type TEXT,
    p_user_id UUID DEFAULT NULL,
    p_action TEXT DEFAULT NULL,
    p_resource TEXT DEFAULT NULL,
    p_status TEXT DEFAULT 'success',
    p_severity TEXT DEFAULT 'low',
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO security_events (
        event_type,
        user_id,
        action,
        resource,
        status,
        severity,
        metadata,
        timestamp
    ) VALUES (
        p_event_type,
        COALESCE(p_user_id, auth.uid()),
        p_action,
        p_resource,
        p_status,
        p_severity,
        p_metadata,
        NOW()
    );
END;
$$;

-- Function to log permission denied attempts
CREATE OR REPLACE FUNCTION log_permission_denied(
    p_resource TEXT,
    p_action TEXT,
    p_user_role TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_user_email TEXT;
    v_user_role TEXT;
BEGIN
    -- Get current user info
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RETURN; -- Anonymous user, skip logging
    END IF;

    -- Get user details
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = v_user_id;

    -- Get user role (parameter or from profile)
    v_user_role := COALESCE(
        p_user_role,
        get_user_role_cached()
    );

    -- Log the violation
    INSERT INTO security_events (
        event_type,
        user_id,
        action,
        resource,
        status,
        severity,
        metadata,
        timestamp
    ) VALUES (
        'PERMISSION_DENIED',
        v_user_id,
        p_action,
        p_resource,
        'blocked',
        'medium',
        jsonb_build_object(
            'user_email', v_user_email,
            'user_role', v_user_role,
            'attempted_action', p_action,
            'resource', p_resource,
            'timestamp', NOW()
        ),
        NOW()
    );
END;
$$;

-- Function to log role violations
CREATE OR REPLACE FUNCTION log_role_violation(
    p_required_role TEXT,
    p_actual_role TEXT,
    p_resource TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO security_events (
        event_type,
        user_id,
        action,
        resource,
        status,
        severity,
        metadata,
        timestamp
    ) VALUES (
        'ROLE_VIOLATION',
        auth.uid(),
        'access_attempt',
        p_resource,
        'blocked',
        'high',
        jsonb_build_object(
            'required_role', p_required_role,
            'actual_role', p_actual_role,
            'resource', p_resource
        ),
        NOW()
    );
END;
$$;

-- Function to log successful authorization
CREATE OR REPLACE FUNCTION log_authorized_action(
    p_action TEXT,
    p_resource TEXT,
    p_record_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only log sensitive operations (create, update, delete)
    IF p_action NOT IN ('create', 'update', 'delete') THEN
        RETURN;
    END IF;

    INSERT INTO security_events (
        event_type,
        user_id,
        action,
        resource,
        status,
        severity,
        metadata,
        timestamp
    ) VALUES (
        'AUTHORIZED_ACTION',
        auth.uid(),
        p_action,
        p_resource,
        'success',
        'low',
        jsonb_build_object(
            'action', p_action,
            'resource', p_resource,
            'record_id', p_record_id,
            'user_role', get_user_role_cached()
        ),
        NOW()
    );
END;
$$;

-- Function to get security event summary
CREATE OR REPLACE FUNCTION get_security_event_summary(
    p_hours INTEGER DEFAULT 24,
    p_event_type TEXT DEFAULT NULL
)
RETURNS TABLE (
    event_type TEXT,
    count BIGINT,
    severity TEXT,
    last_occurrence TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT
        se.event_type,
        COUNT(*) as count,
        se.severity,
        MAX(se.timestamp) as last_occurrence
    FROM security_events se
    WHERE se.timestamp >= NOW() - (p_hours || ' hours')::INTERVAL
        AND (p_event_type IS NULL OR se.event_type = p_event_type)
    GROUP BY se.event_type, se.severity
    ORDER BY count DESC, last_occurrence DESC;
$$;

-- Function to get user's recent security events
CREATE OR REPLACE FUNCTION get_user_security_events(
    p_user_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    event_type TEXT,
    action TEXT,
    resource TEXT,
    status TEXT,
    severity TEXT,
    metadata JSONB,
    timestamp TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT
        id,
        event_type,
        action,
        resource,
        status,
        severity,
        metadata,
        timestamp
    FROM security_events
    WHERE user_id = COALESCE(p_user_id, auth.uid())
    ORDER BY timestamp DESC
    LIMIT p_limit;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION log_security_event(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION log_permission_denied(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION log_role_violation(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION log_authorized_action(TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_security_event_summary(INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_security_events(UUID, INTEGER) TO authenticated;

-- Create view for admin security dashboard
CREATE OR REPLACE VIEW security_dashboard AS
SELECT
    DATE_TRUNC('hour', timestamp) as hour,
    event_type,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as unique_users,
    severity,
    status
FROM security_events
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', timestamp), event_type, severity, status
ORDER BY hour DESC, event_count DESC;

-- Grant view access to admins only
GRANT SELECT ON security_dashboard TO authenticated;

-- RLS policy for security_dashboard (admin only)
CREATE POLICY "Admin can view security dashboard" ON security_events
    FOR SELECT
    TO authenticated
    USING (
        is_admin()
        OR user_id = auth.uid() -- Users can see their own events
    );

-- Comments for documentation
COMMENT ON FUNCTION log_security_event IS 'General purpose security event logging function';
COMMENT ON FUNCTION log_permission_denied IS 'Logs permission denied attempts with user and role information';
COMMENT ON FUNCTION log_role_violation IS 'Logs role-based access violations';
COMMENT ON FUNCTION log_authorized_action IS 'Logs successful authorized actions (create, update, delete only)';
COMMENT ON FUNCTION get_security_event_summary IS 'Returns summary of security events for specified time period';
COMMENT ON FUNCTION get_user_security_events IS 'Returns recent security events for specific user';
COMMENT ON VIEW security_dashboard IS 'Admin dashboard view showing security event trends';