import { Modal } from './Modal.js';
import { mfaManager } from '../utils/mfaManager.js';
import { Toast } from '../utils/toast.js';
import { supabase } from '../services/supabaseClient.js';

export class MFAChallengeModal {
    constructor(factor, onSuccess) {
        this.factor = factor;
        this.onSuccess = onSuccess;
        this.modal = null;
        this.challengeId = null;
        this.useBackupCode = false;
    }

    async show() {
        this.modal = new Modal({
            title: '<i class="fas fa-shield-alt"></i> İki Faktörlü Kimlik Doğrulama',
            content: this.renderChallengeForm(),
            size: 'medium',
            closeButton: false
        });

        this.modal.show();

        this.challengeId = await mfaManager.createChallenge(this.factor.id);

        const form = document.getElementById('mfaChallengeForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.verifyCode();
        });

        const toggleBackupLink = document.getElementById('toggleBackupCode');
        toggleBackupLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleBackupCodeMode();
        });

        document.getElementById('mfaChallengeCode').focus();
    }

    renderChallengeForm() {
        return `
            <div class="mfa-challenge">
                <div class="alert alert-info">
                    <i class="fas fa-mobile-alt"></i>
                    Lütfen authenticator uygulamanızdaki 6 haneli doğrulama kodunu girin.
                </div>

                <form id="mfaChallengeForm">
                    <div class="form-group">
                        <label for="mfaChallengeCode" id="mfaCodeLabel">Doğrulama Kodu:</label>
                        <input type="text"
                               class="form-control form-control-lg text-center"
                               id="mfaChallengeCode"
                               maxlength="6"
                               pattern="[0-9]{6}"
                               placeholder="000000"
                               autocomplete="off"
                               required>
                        <small class="form-text text-muted" id="mfaCodeHint">
                            Authenticator uygulamanızdaki 6 haneli kod
                        </small>
                    </div>

                    <div class="text-center mb-3">
                        <a href="#" id="toggleBackupCode" class="text-muted">
                            <small>Authenticator'a erişiminiz yok mu? Yedek kod kullanın</small>
                        </a>
                    </div>

                    <div class="modal-footer">
                        <button type="submit" class="btn btn-primary btn-block">
                            <i class="fas fa-check"></i> Doğrula
                        </button>
                    </div>
                </form>
            </div>
        `;
    }

    toggleBackupCodeMode() {
        this.useBackupCode = !this.useBackupCode;

        const codeInput = document.getElementById('mfaChallengeCode');
        const codeLabel = document.getElementById('mfaCodeLabel');
        const codeHint = document.getElementById('mfaCodeHint');
        const toggleLink = document.getElementById('toggleBackupCode');

        if (this.useBackupCode) {
            codeInput.maxLength = 8;
            codeInput.pattern = '[A-Z0-9]{8}';
            codeInput.placeholder = 'A3F7K2M9';
            codeInput.value = '';
            codeLabel.textContent = 'Yedek Kod:';
            codeHint.textContent = '8 karakterli yedek kodunuzu girin';
            toggleLink.innerHTML = '<small>Authenticator kodu kullanın</small>';
        } else {
            codeInput.maxLength = 6;
            codeInput.pattern = '[0-9]{6}';
            codeInput.placeholder = '000000';
            codeInput.value = '';
            codeLabel.textContent = 'Doğrulama Kodu:';
            codeHint.textContent = 'Authenticator uygulamanızdaki 6 haneli kod';
            toggleLink.innerHTML = '<small>Authenticator\'a erişiminiz yok mu? Yedek kod kullanın</small>';
        }

        codeInput.focus();
    }

    async verifyCode() {
        try {
            const code = document.getElementById('mfaChallengeCode').value.toUpperCase();

            if (this.useBackupCode) {
                await this.verifyBackupCode(code);
            } else {
                await this.verifyTOTPCode(code);
            }
        } catch (error) {
            console.error('Verification error:', error);
            Toast.error('Doğrulama başarısız. Lütfen tekrar deneyin.');

            document.getElementById('mfaChallengeCode').value = '';
            document.getElementById('mfaChallengeCode').focus();
        }
    }

    async verifyTOTPCode(code) {
        if (code.length !== 6) {
            Toast.error('Lütfen 6 haneli kodu girin');
            return;
        }

        const data = await mfaManager.verifyTOTP(this.factor.id, this.challengeId, code);

        await mfaManager.logMFAEvent('challenge_success', true, this.factor.id);

        Toast.success('Doğrulama başarılı!');

        this.modal.close();

        if (this.onSuccess) {
            this.onSuccess(data);
        }
    }

    async verifyBackupCode(code) {
        if (code.length !== 8) {
            Toast.error('Yedek kod 8 karakter olmalıdır');
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();

        const result = await mfaManager.verifyBackupCode(user.id, code);

        if (result.valid) {
            const { data: { session } } = await supabase.auth.getSession();

            const remainingCodes = await mfaManager.getUnusedBackupCodesCount(user.id);

            Toast.success(`Yedek kod kullanıldı! Kalan yedek kod: ${remainingCodes}`);

            if (remainingCodes < 3) {
                Toast.warning('Yedek kodlarınız azalıyor! Yeni kodlar oluşturun.', 5000);
            }

            this.modal.close();

            if (this.onSuccess) {
                this.onSuccess(session);
            }
        } else {
            await mfaManager.logMFAEvent('backup_code_failed', false, this.factor.id);
            Toast.error('Geçersiz yedek kod');

            document.getElementById('mfaChallengeCode').value = '';
            document.getElementById('mfaChallengeCode').focus();
        }
    }
}

export default MFAChallengeModal;