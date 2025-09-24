-- CSRF Token Validation Function
-- Server-side validation for Double Submit Cookie Pattern

-- Function to validate CSRF token (called from Edge Functions or client)
CREATE OR REPLACE FUNCTION validate_csrf_token(
    cookie_token TEXT,
    request_token TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    tokens_match BOOLEAN;
BEGIN
    -- Check if both tokens exist
    IF cookie_token IS NULL OR request_token IS NULL THEN
        RAISE EXCEPTION 'CSRF tokens missing';
        RETURN FALSE;
    END IF;

    -- Check if tokens have valid length (64 chars for 256-bit token)
    IF LENGTH(cookie_token) != 64 OR LENGTH(request_token) != 64 THEN
        RAISE EXCEPTION 'CSRF token invalid length';
        RETURN FALSE;
    END IF;

    -- Constant-time comparison (prevent timing attacks)
    -- In PostgreSQL, we use encode/decode for constant-time comparison
    tokens_match := encode(digest(cookie_token, 'sha256'), 'hex') =
                    encode(digest(request_token, 'sha256'), 'hex');

    IF NOT tokens_match THEN
        RAISE EXCEPTION 'CSRF token mismatch';
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$;

-- Security event logging for CSRF violations
CREATE OR REPLACE FUNCTION log_csrf_violation(
    p_user_id UUID,
    p_ip_address INET,
    p_user_agent TEXT,
    p_action TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO security_events (
        event_type,
        user_id,
        ip_address,
        user_agent,
        action,
        status,
        severity,
        metadata,
        timestamp
    ) VALUES (
        'CSRF_VIOLATION',
        p_user_id,
        p_ip_address,
        p_user_agent,
        p_action,
        'blocked',
        'high',
        jsonb_build_object(
            'violation_type', 'csrf_token_mismatch',
            'action_attempted', p_action
        ),
        NOW()
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION validate_csrf_token(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION log_csrf_violation(UUID, INET, TEXT, TEXT) TO authenticated;

-- Create security_events table if not exists
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    action TEXT,
    resource TEXT,
    status TEXT,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    metadata JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);

-- Enable RLS on security_events
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view security events
CREATE POLICY "Admin can view all security events" ON security_events
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'admin'
        )
    );

-- System can insert security events
CREATE POLICY "System can insert security events" ON security_events
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Comment for documentation
COMMENT ON FUNCTION validate_csrf_token IS 'Validates CSRF token using constant-time comparison to prevent timing attacks';
COMMENT ON FUNCTION log_csrf_violation IS 'Logs CSRF violation attempts to security_events table';
COMMENT ON TABLE security_events IS 'Security event logging for audit trail and monitoring';