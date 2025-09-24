import { Modal } from './Modal.js';
import { mfaManager } from '../utils/mfaManager.js';
import { Toast } from '../utils/toast.js';
import { supabase } from '../services/supabaseClient.js';

export class MFAEnrollmentModal {
    constructor() {
        this.modal = null;
        this.factorId = null;
        this.challengeId = null;
        this.secret = null;
        this.backupCodes = [];
    }

    async show() {
        this.modal = new Modal({
            title: '<i class="fas fa-shield-alt"></i> İki Faktörlü Kimlik Doğrulama (2FA)',
            content: this.renderStep1(),
            size: 'large',
            closeButton: true
        });

        this.modal.show();
        await this.initializeEnrollment();
    }

    renderStep1() {
        return `
            <div class="mfa-enrollment-step" id="mfaStep1">
                <div class="text-center mb-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="sr-only">Yükleniyor...</span>
                    </div>
                    <p class="mt-3">QR kod oluşturuluyor...</p>
                </div>
            </div>
        `;
    }

    renderStep2(qrCode, secret) {
        return `
            <div class="mfa-enrollment-step" id="mfaStep2">
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    <strong>Adım 1:</strong> Authenticator uygulamanızda (Google Authenticator, Microsoft Authenticator, Authy) QR kodu tarayın veya aşağıdaki kodu manuel girin.
                </div>

                <div class="row">
                    <div class="col-md-6 text-center">
                        <h5>QR Kod</h5>
                        <img src="${qrCode}" alt="QR Code" class="img-fluid mb-3" style="max-width: 250px;">
                    </div>
                    <div class="col-md-6">
                        <h5>Manuel Giriş</h5>
                        <div class="form-group">
                            <label>Secret Key:</label>
                            <div class="input-group">
                                <input type="text" class="form-control" value="${secret}" id="mfaSecret" readonly>
                                <div class="input-group-append">
                                    <button class="btn btn-outline-secondary" type="button" onclick="navigator.clipboard.writeText('${secret}'); window.showToast('Secret kopyalandı', 'success')">
                                        <i class="fas fa-copy"></i>
                                    </button>
                                </div>
                            </div>
                            <small class="form-text text-muted">Bu kodu güvenli bir yere kaydedin</small>
                        </div>
                    </div>
                </div>

                <div class="alert alert-warning mt-4">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>Adım 2:</strong> Authenticator uygulamanızda gördüğünüz 6 haneli kodu aşağıya girin.
                </div>

                <form id="mfaVerifyForm">
                    <div class="form-group">
                        <label for="mfaCode">Doğrulama Kodu:</label>
                        <input type="text" class="form-control form-control-lg text-center"
                               id="mfaCode"
                               maxlength="6"
                               pattern="[0-9]{6}"
                               placeholder="000000"
                               autocomplete="off"
                               required>
                        <small class="form-text text-muted">Authenticator uygulamanızdaki 6 haneli kodu girin</small>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').querySelector('.modal-close').click()">
                            İptal
                        </button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-check"></i> Doğrula ve Etkinleştir
                        </button>
                    </div>
                </form>
            </div>
        `;
    }

    renderStep3(backupCodes) {
        const codesHTML = backupCodes.map((code, index) =>
            `<div class="backup-code-item">
                <span class="backup-code-number">${index + 1}.</span>
                <code class="backup-code">${code}</code>
            </div>`
        ).join('');

        return `
            <div class="mfa-enrollment-step" id="mfaStep3">
                <div class="alert alert-success">
                    <i class="fas fa-check-circle"></i>
                    <strong>2FA Başarıyla Etkinleştirildi!</strong>
                </div>

                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>ÖNEMLİ:</strong> Aşağıdaki yedek kodları güvenli bir yere kaydedin. Telefonunuza erişiminiz olmadığında bu kodlarla giriş yapabilirsiniz.
                </div>

                <div class="backup-codes-container">
                    <h5 class="mb-3">Yedek Kodlar (Her kod tek kullanımlık)</h5>
                    <div class="backup-codes-grid">
                        ${codesHTML}
                    </div>
                </div>

                <div class="alert alert-info mt-4">
                    <i class="fas fa-info-circle"></i>
                    Bu kodları:
                    <ul class="mb-0 mt-2">
                        <li>Şifre yöneticinize kaydedin (1Password, Bitwarden vb.)</li>
                        <li>Güvenli bir yere yazdırın ve saklayın</li>
                        <li>Asla başkalarıyla paylaşmayın</li>
                    </ul>
                </div>

                <div class="text-center mt-4">
                    <button class="btn btn-secondary mr-2" onclick="window.printBackupCodes()">
                        <i class="fas fa-print"></i> Yazdır
                    </button>
                    <button class="btn btn-outline-secondary" onclick="window.downloadBackupCodes()">
                        <i class="fas fa-download"></i> İndir (.txt)
                    </button>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-primary" onclick="this.closest('.modal').querySelector('.modal-close').click()">
                        <i class="fas fa-check"></i> Tamam, Anladım
                    </button>
                </div>
            </div>

            <style>
                .backup-codes-container {
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 8px;
                }

                .backup-codes-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 10px;
                }

                .backup-code-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px;
                    background: white;
                    border: 1px solid #dee2e6;
                    border-radius: 4px;
                }

                .backup-code-number {
                    color: #6c757d;
                    font-size: 0.9em;
                }

                .backup-code {
                    font-family: 'Courier New', monospace;
                    font-size: 1.1em;
                    font-weight: 600;
                    color: #495057;
                    letter-spacing: 1px;
                }
            </style>
        `;
    }

    async initializeEnrollment() {
        try {
            const enrollData = await mfaManager.enrollTOTP();

            this.factorId = enrollData.factorId;
            this.secret = enrollData.secret;

            const qrCode = await mfaManager.generateQRCode(enrollData.uri);

            const modalContent = document.getElementById('mfaStep1');
            if (modalContent) {
                modalContent.innerHTML = this.renderStep2(qrCode, this.secret);

                const form = document.getElementById('mfaVerifyForm');
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await this.verifyCode();
                });

                document.getElementById('mfaCode').focus();
            }
        } catch (error) {
            console.error('Enrollment initialization error:', error);
            Toast.error('2FA kurulumu başlatılırken hata oluştu');
            this.modal.close();
        }
    }

    async verifyCode() {
        try {
            const code = document.getElementById('mfaCode').value;

            if (code.length !== 6) {
                Toast.error('Lütfen 6 haneli kodu girin');
                return;
            }

            this.challengeId = await mfaManager.createChallenge(this.factorId);

            await mfaManager.verifyTOTP(this.factorId, this.challengeId, code);

            const { data: { user } } = await supabase.auth.getUser();

            this.backupCodes = await mfaManager.generateBackupCodes(10);

            await mfaManager.storeBackupCodes(user.id, this.backupCodes);

            const modalContent = document.getElementById('mfaStep2');
            if (modalContent) {
                modalContent.innerHTML = this.renderStep3(this.backupCodes);
            }

            window.backupCodesForDownload = this.backupCodes;

            Toast.success('2FA başarıyla etkinleştirildi!');
        } catch (error) {
            console.error('Code verification error:', error);
            Toast.error('Geçersiz kod. Lütfen tekrar deneyin.');

            document.getElementById('mfaCode').value = '';
            document.getElementById('mfaCode').focus();
        }
    }
}

window.printBackupCodes = function() {
    const codes = window.backupCodesForDownload;
    if (!codes) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Dinky Metal ERP - Yedek Kodlar</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; }
                h1 { color: #333; }
                .warning { color: #d32f2f; margin: 20px 0; }
                .codes { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 20px 0; }
                .code { font-family: 'Courier New', monospace; font-size: 14px; padding: 5px; }
            </style>
        </head>
        <body>
            <h1>Dinky Metal ERP - 2FA Yedek Kodlar</h1>
            <p class="warning"><strong>⚠️ ÖNEMLİ:</strong> Bu kodları güvenli bir yerde saklayın. Her kod tek kullanımlıktır.</p>
            <div class="codes">
                ${codes.map((code, i) => `<div class="code">${i + 1}. ${code}</div>`).join('')}
            </div>
            <p><small>Oluşturma Tarihi: ${new Date().toLocaleString('tr-TR')}</small></p>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
};

window.downloadBackupCodes = function() {
    const codes = window.backupCodesForDownload;
    if (!codes) return;

    const content = `Dinky Metal ERP - 2FA Yedek Kodlar
========================================

⚠️ ÖNEMLİ: Bu kodları güvenli bir yerde saklayın. Her kod tek kullanımlıktır.

${codes.map((code, i) => `${i + 1}. ${code}`).join('\n')}

Oluşturma Tarihi: ${new Date().toLocaleString('tr-TR')}
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dinky-mfa-backup-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
};

window.showToast = function(message, type = 'info') {
    Toast[type](message);
};

export default MFAEnrollmentModal;