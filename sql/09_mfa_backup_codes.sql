-- ====================================
-- MFA BACKUP CODES SCHEMA
-- Recovery codes for MFA authentication
-- ====================================

-- Backup codes table
CREATE TABLE IF NOT EXISTS mfa_backup_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_code_per_user UNIQUE(user_id, code_hash)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_backup_codes_user ON mfa_backup_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_backup_codes_unused ON mfa_backup_codes(user_id) WHERE used_at IS NULL;

-- RLS policies
ALTER TABLE mfa_backup_codes ENABLE ROW LEVEL SECURITY;

-- Users can only see their own backup codes
CREATE POLICY "Users can view their own backup codes"
    ON mfa_backup_codes
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can insert their own backup codes
CREATE POLICY "Users can create their own backup codes"
    ON mfa_backup_codes
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can update (mark as used) their own backup codes
CREATE POLICY "Users can mark their backup codes as used"
    ON mfa_backup_codes
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own backup codes
CREATE POLICY "Users can delete their own backup codes"
    ON mfa_backup_codes
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Function to verify backup code
CREATE OR REPLACE FUNCTION verify_backup_code(
    p_user_id UUID,
    p_code TEXT
)
RETURNS TABLE (
    valid BOOLEAN,
    code_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_code_hash TEXT;
    v_code_id UUID;
    v_used_at TIMESTAMPTZ;
BEGIN
    -- Get matching backup code
    SELECT id, code_hash, used_at
    INTO v_code_id, v_code_hash, v_used_at
    FROM mfa_backup_codes
    WHERE user_id = p_user_id
    AND used_at IS NULL
    LIMIT 1;

    -- Check if code exists and is unused
    IF v_code_id IS NULL THEN
        RETURN QUERY SELECT false, NULL::UUID;
        RETURN;
    END IF;

    -- Verify hash (using crypt extension for bcrypt)
    IF crypt(p_code, v_code_hash) = v_code_hash THEN
        RETURN QUERY SELECT true, v_code_id;
    ELSE
        RETURN QUERY SELECT false, NULL::UUID;
    END IF;
END;
$$;

-- Function to mark backup code as used
CREATE OR REPLACE FUNCTION mark_backup_code_used(
    p_code_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE mfa_backup_codes
    SET used_at = NOW()
    WHERE id = p_code_id
    AND user_id = p_user_id
    AND used_at IS NULL;

    RETURN FOUND;
END;
$$;

-- Function to get unused backup codes count
CREATE OR REPLACE FUNCTION get_unused_backup_codes_count(
    p_user_id UUID
)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT COUNT(*)::INTEGER
    FROM mfa_backup_codes
    WHERE user_id = p_user_id
    AND used_at IS NULL;
$$;

-- Function to delete all backup codes for user (regenerate scenario)
CREATE OR REPLACE FUNCTION delete_all_backup_codes(
    p_user_id UUID
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
    DELETE FROM mfa_backup_codes
    WHERE user_id = p_user_id;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION verify_backup_code(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_backup_code_used(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_unused_backup_codes_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_all_backup_codes(UUID) TO authenticated;

-- MFA audit log table
CREATE TABLE IF NOT EXISTS mfa_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    success BOOLEAN NOT NULL,
    factor_id UUID,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for audit log queries
CREATE INDEX IF NOT EXISTS idx_mfa_audit_user ON mfa_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mfa_audit_event ON mfa_audit_log(event_type, created_at DESC);

-- RLS for audit log
ALTER TABLE mfa_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own audit logs
CREATE POLICY "Users can view their own MFA audit logs"
    ON mfa_audit_log
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Admins can view all audit logs
CREATE POLICY "Admins can view all MFA audit logs"
    ON mfa_audit_log
    FOR SELECT
    TO authenticated
    USING (is_admin());

-- Function to log MFA event
CREATE OR REPLACE FUNCTION log_mfa_event(
    p_event_type TEXT,
    p_success BOOLEAN,
    p_factor_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ip_address TEXT;
    v_user_agent TEXT;
BEGIN
    -- Get request metadata (if available from headers)
    v_ip_address := current_setting('request.headers', true)::json->>'x-forwarded-for';
    v_user_agent := current_setting('request.headers', true)::json->>'user-agent';

    INSERT INTO mfa_audit_log (
        user_id,
        event_type,
        success,
        factor_id,
        ip_address,
        user_agent,
        metadata,
        created_at
    ) VALUES (
        auth.uid(),
        p_event_type,
        p_success,
        p_factor_id,
        v_ip_address::INET,
        v_user_agent,
        p_metadata,
        NOW()
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION log_mfa_event(TEXT, BOOLEAN, UUID, JSONB) TO authenticated;

-- Comments
COMMENT ON TABLE mfa_backup_codes IS 'Stores hashed backup codes for MFA recovery';
COMMENT ON TABLE mfa_audit_log IS 'Audit trail for all MFA-related events';
COMMENT ON FUNCTION verify_backup_code IS 'Verifies a backup code against stored hash';
COMMENT ON FUNCTION mark_backup_code_used IS 'Marks a backup code as used (one-time use)';
COMMENT ON FUNCTION get_unused_backup_codes_count IS 'Returns count of unused backup codes for user';
COMMENT ON FUNCTION delete_all_backup_codes IS 'Deletes all backup codes for user (regenerate scenario)';
COMMENT ON FUNCTION log_mfa_event IS 'Logs MFA events for audit trail';