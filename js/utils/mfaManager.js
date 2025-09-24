import { supabase } from '../services/supabaseClient.js';

export const mfaManager = {
    async enrollTOTP(friendlyName = 'Dinky Metal ERP') {
        try {
            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp',
                friendlyName
            });

            if (error) throw error;

            return {
                factorId: data.id,
                qrCode: data.totp.qr_code,
                secret: data.totp.secret,
                uri: data.totp.uri
            };
        } catch (error) {
            console.error('MFA enrollment error:', error);
            throw error;
        }
    },

    async generateQRCode(otpauthUri) {
        try {
            // Use the Supabase provided QR code or generate using Canvas API
            // Since we can't use npm packages in browser, we'll use a CDN service
            const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(otpauthUri)}`;
            return qrApiUrl;
        } catch (error) {
            console.error('QR code generation error:', error);
            throw error;
        }
    },

    async verifyTOTP(factorId, challengeId, code) {
        try {
            const { data, error } = await supabase.auth.mfa.verify({
                factorId,
                challengeId,
                code
            });

            if (error) throw error;

            await this.logMFAEvent('enrollment_verify', true, factorId);

            return data;
        } catch (error) {
            await this.logMFAEvent('enrollment_verify', false, factorId);
            console.error('TOTP verification error:', error);
            throw error;
        }
    },

    async createChallenge(factorId) {
        try {
            const { data, error } = await supabase.auth.mfa.challenge({
                factorId
            });

            if (error) throw error;

            return data.id;
        } catch (error) {
            console.error('Challenge creation error:', error);
            throw error;
        }
    },

    async listFactors() {
        try {
            const { data, error } = await supabase.auth.mfa.listFactors();

            if (error) throw error;

            return data.totp || [];
        } catch (error) {
            console.error('List factors error:', error);
            throw error;
        }
    },

    async unenroll(factorId) {
        try {
            const { data, error } = await supabase.auth.mfa.unenroll({
                factorId
            });

            if (error) throw error;

            await this.logMFAEvent('unenroll', true, factorId);

            return data;
        } catch (error) {
            await this.logMFAEvent('unenroll', false, factorId);
            console.error('Unenroll error:', error);
            throw error;
        }
    },

    async getAuthenticationAssuranceLevel() {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error) throw error;

            return {
                level: session?.aal || 'aal1',
                nextLevel: session?.aal === 'aal1' ? 'aal2' : null
            };
        } catch (error) {
            console.error('AAL check error:', error);
            return { level: 'aal1', nextLevel: 'aal2' };
        }
    },

    async generateBackupCodes(count = 10) {
        const codes = [];

        for (let i = 0; i < count; i++) {
            const bytes = new Uint8Array(6);
            crypto.getRandomValues(bytes);

            const code = Array.from(bytes)
                .map(b => b.toString(36).padStart(2, '0'))
                .join('')
                .toUpperCase()
                .slice(0, 8);

            codes.push(code);
        }

        return codes;
    },

    async storeBackupCodes(userId, codes) {
        try {
            const codesToStore = codes.map(code => ({
                user_id: userId,
                code_hash: code
            }));

            const { error } = await supabase
                .from('mfa_backup_codes')
                .insert(codesToStore);

            if (error) throw error;

            await this.logMFAEvent('backup_codes_generated', true, null, {
                count: codes.length
            });

            return true;
        } catch (error) {
            await this.logMFAEvent('backup_codes_generated', false, null);
            console.error('Store backup codes error:', error);
            throw error;
        }
    },

    async verifyBackupCode(userId, code) {
        try {
            const { data, error } = await supabase.rpc('verify_backup_code', {
                p_user_id: userId,
                p_code: code
            });

            if (error) throw error;

            if (data && data.length > 0 && data[0].valid) {
                await supabase.rpc('mark_backup_code_used', {
                    p_code_id: data[0].code_id,
                    p_user_id: userId
                });

                await this.logMFAEvent('backup_code_used', true, null);

                return { valid: true, codeId: data[0].code_id };
            }

            await this.logMFAEvent('backup_code_used', false, null);

            return { valid: false };
        } catch (error) {
            await this.logMFAEvent('backup_code_used', false, null);
            console.error('Verify backup code error:', error);
            throw error;
        }
    },

    async getUnusedBackupCodesCount(userId) {
        try {
            const { data, error } = await supabase.rpc('get_unused_backup_codes_count', {
                p_user_id: userId
            });

            if (error) throw error;

            return data || 0;
        } catch (error) {
            console.error('Get backup codes count error:', error);
            return 0;
        }
    },

    async regenerateBackupCodes(userId) {
        try {
            await supabase.rpc('delete_all_backup_codes', {
                p_user_id: userId
            });

            const newCodes = await this.generateBackupCodes(10);

            await this.storeBackupCodes(userId, newCodes);

            return newCodes;
        } catch (error) {
            console.error('Regenerate backup codes error:', error);
            throw error;
        }
    },

    async logMFAEvent(eventType, success, factorId = null, metadata = {}) {
        try {
            await supabase.rpc('log_mfa_event', {
                p_event_type: eventType,
                p_success: success,
                p_factor_id: factorId,
                p_metadata: metadata
            });
        } catch (error) {
            console.error('MFA event logging error:', error);
        }
    },

    async getMFAAuditLog(userId, limit = 50) {
        try {
            const { data, error } = await supabase
                .from('mfa_audit_log')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Get MFA audit log error:', error);
            return [];
        }
    },

    formatEventType(eventType) {
        const eventMap = {
            'enrollment_verify': 'MFA Etkinleştirildi',
            'challenge_success': 'MFA Doğrulama Başarılı',
            'challenge_failed': 'MFA Doğrulama Başarısız',
            'backup_code_used': 'Yedek Kod Kullanıldı',
            'backup_codes_generated': 'Yedek Kodlar Oluşturuldu',
            'unenroll': 'MFA Devre Dışı Bırakıldı'
        };

        return eventMap[eventType] || eventType;
    }
};

export default mfaManager;