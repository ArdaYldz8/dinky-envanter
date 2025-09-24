# 🔐 Sprint 2.2: Multi-Factor Authentication - Araştırma Raporu

**Tarih:** 24 Eylül 2025
**Sprint:** 2.2 - Multi-Factor Authentication (MFA)
**Süre:** 16 saat (Tahmini)
**Durum:** 📚 Araştırma Tamamlandı

---

## 📊 Araştırma Özeti

Multi-Factor Authentication (MFA) implementasyonu için kapsamlı araştırma yapıldı. OWASP standartları, Supabase MFA özellikleri, TOTP implementasyonu ve güvenlik best practices incelendi.

---

## 🔍 OWASP MFA Best Practices (2025)

### Temel Prensipler

**Etkililik:**
- Microsoft analizi: MFA, hesap ele geçirme saldırılarının %99.9'unu önleyebilir
- **"Any MFA is better than no MFA"** - Herhangi bir MFA yoktan iyidir
- Faktörler birbirinden bağımsız olmalı ve aynı saldırı ile ele geçirilememeli

**Yanlış Yaklaşım:**
```
❌ Birden fazla aynı tip faktör (password + PIN) = MFA DEĞİLDİR
✅ Farklı faktör tipleri (password + TOTP) = Gerçek MFA
```

### Authentication Faktörleri

**3 Ana Kategori:**

1. **Knowledge (Bilgi)**
   - Şifre, PIN
   - Güvenlik soruları

2. **Possession (Sahiplik)**
   - Telefon (SMS/OTP)
   - Authenticator app
   - Hardware token
   - Passkey/FIDO2

3. **Inherence (Biyometrik)**
   - Parmak izi
   - Yüz tanıma
   - İris tarama

**Modern Yaklaşım: Passkeys (FIDO2)**
- Sahiplik (fiziksel cihaz) + Bilgi/Biyometrik (PIN/parmak izi)
- Phishing-resistant
- Kullanıcı dostu (frictionless)
- 2025'te önerilen en güvenli yöntem

### Risk-Based Authentication

**Dinamik MFA Zorunluluğu:**
```javascript
// Yüksek risk senaryoları
const requireMFA = () => {
    if (newDevice) return true;           // Yeni cihaz
    if (unusualLocation) return true;     // Alışılmadık konum
    if (outsideCorporateIP) return true;  // Kurumsal IP dışı
    if (sensitiveAction) return true;     // hassas işlem
    return false; // Düşük risk: MFA skip
};
```

### Implementation Checklist

✅ **Comprehensive Coverage**
- Tüm login yöntemlerinde MFA zorunlu (OAuth, email, password, vb.)
- Partial MFA = Güvenlik açığı

✅ **Backup and Recovery**
- Recovery mekanizmaları = Potansiyel zayıf nokta
- Backup kodlar güvenli saklanmalı
- Account recovery MFA bypass yapmamalı

✅ **Regulatory Compliance**
- Credential stuffing önleme
- Brute force koruması
- Çalıntı kimlik bilgisi koruması

---

## 📱 TOTP (Time-based One-Time Password)

### Nasıl Çalışır?

**Algoritma (RFC 6238):**
```
TOTP = HOTP(K, T)
K = Shared secret key
T = Current time / Time step (usually 30 seconds)

1. Server ve client aynı secret key'i paylaşır
2. Her 30 saniyede bir yeni kod üretilir
3. Code = HMAC-SHA1(secret, time_counter)
4. 6-8 haneli kod gösterilir
```

### JavaScript Libraries (2025)

#### 1. **otplib** (Önerilen - Supabase uyumlu)
```javascript
import { authenticator } from 'otplib';

// Secret oluştur
const secret = authenticator.generateSecret();

// TOTP token üret
const token = authenticator.generate(secret);

// Token doğrula
const isValid = authenticator.check(token, secret);

// QR kod için otpauth URL
const otpauthURL = authenticator.keyuri(
    user.email,
    'Dinky Metal ERP',
    secret
);
```

**Özellikler:**
- RFC 4226 (HOTP) ve RFC 6238 (TOTP) uyumlu
- Node.js + Browser desteği
- Google Authenticator uyumlu
- Bundle size: ~15KB

#### 2. **OTPAuth** (Alternatif)
```javascript
import { TOTP } from 'otpauth';

const totp = new TOTP({
    issuer: 'Dinky Metal',
    label: user.email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: secret
});

const token = totp.generate();
const isValid = totp.validate({ token, window: 1 });
```

**Özellikler:**
- Cross-platform (Node, Deno, Bun, Browser)
- Bundle size: 9.73KB (minified + gzipped)
- QR kod demo uygulaması mevcut

#### 3. **totp-generator** (Lightweight)
```javascript
import totp from 'totp-generator';

const token = totp(secret, {
    period: 30,
    digits: 6,
    algorithm: 'SHA-512' // SHA-1, SHA-256, SHA-512
});
```

**Özellikler:**
- Minimalist API
- Özelleştirilebilir algoritma
- 102 proje kullanıyor

### QR Code Generation

**Library: qrcode.js**
```javascript
import QRCode from 'qrcode';

// otpauth URL format
const otpauthURL = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;

// QR kod oluştur
const qrCodeDataURL = await QRCode.toDataURL(otpauthURL);

// HTML'de göster
imgElement.src = qrCodeDataURL;
```

**Güvenlik Notu:**
⚠️ Google Charts API gibi third-party servislere gönderme
✅ Client-side QR kod üretimi kullan (güvenlik)

---

## 📧 SMS OTP (Security Concerns 2025)

### Kritik Güvenlik Zafiyetleri

**1. SIM Swapping**
```
Saldırgan → Operatörü arar → Kendini siz olarak tanıtır
→ Numaranız saldırganın SIM'ine taşınır
→ Tüm SMS'ler (OTP dahil) saldırgana gider
```

**2. SS7 Protocol Exploits**
```
SMS taşıyan networkler → SS7 protokolü (eski teknoloji)
→ Hackerlar SS7 exploit'lerini biliyor
→ SMS'leri telefona dokunmadan intercept edebiliyorlar
```

**3. Lack of Encryption**
```
SMS → Plain text (şifresiz)
→ Network trafiğini izleyen herkes görebilir
→ Man-in-the-middle saldırıları kolay
```

### 2025 Düzenlemeleri

**Global Regulatory Changes:**
- 🇸🇬 **Singapur**: SMS OTP yasak
- 🇮🇳 **Hindistan**: SMS OTP yasak
- 🇲🇾 **Malezya**: SMS OTP yasak
- 🇺🇸 **ABD**: FINRA ve USPTO 2025'te SMS OTP kabul etmiyor
- 🇦🇪 **UAE**: Merkez Bankası Haziran 2025 direktifi → Mart 2026'da tam yasak

**Sonuç:** SMS OTP artık güvenli authentication yöntemi olarak kabul edilmiyor

### Best Practices (Eğer SMS zorunluysa)

```javascript
const smsBestPractices = {
    validity: '5 dakika',           // Kısa süre
    maxAttempts: 3,                 // Deneme limiti
    encryption: 'TLS 1.3',          // İletimde şifreleme
    rateLimit: '1 SMS / 1 dakika', // Rate limiting
    additionalFactor: true          // Başka MFA ile kombine
};
```

### Güvenli Alternatifler

**1. Passkeys (FIDO2/WebAuthn)** ⭐ En Güvenli
```javascript
// WebAuthn ile passwordless + MFA
const credential = await navigator.credentials.create({
    publicKey: {
        challenge: new Uint8Array(32),
        rp: { name: "Dinky Metal ERP" },
        user: {
            id: userIdBuffer,
            name: user.email,
            displayName: user.name
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }]
    }
});
```

**2. Authenticator Apps (TOTP)** ⭐ Önerilen
- Google Authenticator
- Microsoft Authenticator
- Authy
- SIM swap'e karşı güvenli
- Carrier vulnerability'den etkilenmiyor

**3. WhatsApp OTP** (SMS'e göre daha güvenli)
- End-to-end encryption
- %50-70 daha ucuz
- Daha yüksek delivery rate
- WhatsApp Business API gerekli

**4. Push Notifications**
- Real-time approval request
- Encrypted communication
- Reduced attack surface
- Mobil uygulama gerekli

---

## 🔑 Supabase MFA Implementation

### Desteklenen Yöntemler

**1. TOTP (Time-based One-Time Password)** ✅ Ücretsiz
- Tüm Supabase projelerinde varsayılan aktif
- Offline çalışır
- Google Authenticator uyumlu

**2. Phone MFA** 💰 Ücretli
- SMS via Twilio/MessageBird
- WhatsApp via Twilio

### Authentication Assurance Levels (AAL)

**AAL1 (Level 1):**
- Conventional login (email+password, OAuth)
- Tek faktör authentication

**AAL2 (Level 2):**
- En az bir ikinci faktör gerekli
- TOTP veya Phone OTP
- Yüksek güvenlikli işlemler için zorunlu

```javascript
// AAL kontrolü
const { data: { session } } = await supabase.auth.getSession();

if (session.authenticator_assurance_level === 'aal1') {
    // Kullanıcı sadece password ile giriş yaptı
    // MFA challenge göster
}

if (session.authenticator_assurance_level === 'aal2') {
    // Kullanıcı MFA'yı tamamladı
    // Hassas işlemlere izin ver
}
```

### Enrollment Flow (3 Adım)

**Adım 1: Enroll**
```javascript
const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'Dinky Metal ERP'
});

// Returns:
// - data.id: Factor ID
// - data.type: 'totp'
// - data.totp.qr_code: QR kod (data URL)
// - data.totp.secret: Shared secret
// - data.totp.uri: otpauth:// URI
```

**Adım 2: Challenge**
```javascript
const { data, error } = await supabase.auth.mfa.challenge({
    factorId: data.id
});

// Returns:
// - data.id: Challenge ID (verification için gerekli)
```

**Adım 3: Verify**
```javascript
const { data, error } = await supabase.auth.mfa.verify({
    factorId: factorId,
    challengeId: challengeId,
    code: userEnteredCode // 6 haneli TOTP kod
});

// Success: AAL2 seviyesine yükseltir
```

### Login Flow (MFA Aktif Kullanıcı)

**Adım 1: Normal Login**
```javascript
const { data, error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: user.password
});

// Session AAL1 seviyesinde
```

**Adım 2: List Factors**
```javascript
const { data: { factors } } = await supabase.auth.mfa.listFactors();

// Kullanıcının kayıtlı MFA faktörlerini göster
```

**Adım 3: Challenge + Verify**
```javascript
// Challenge oluştur
const { data: challengeData } = await supabase.auth.mfa.challenge({
    factorId: factors[0].id
});

// Kullanıcıdan kod al ve verify et
const { data: verifyData } = await supabase.auth.mfa.verify({
    factorId: factors[0].id,
    challengeId: challengeData.id,
    code: userCode
});

// Session artık AAL2 seviyesinde
```

### Enforcement Strategies

**1. Tüm Kullanıcılar İçin Zorunlu**
```javascript
// Login sonrası kontrol
if (session.aal === 'aal1') {
    // Kullanıcının MFA'sı yok
    const { data: factors } = await supabase.auth.mfa.listFactors();

    if (factors.length === 0) {
        // MFA enrollment'a yönlendir (zorunlu)
        redirectToMFASetup();
    } else {
        // MFA challenge göster
        showMFAChallenge();
    }
}
```

**2. Sadece Yeni Kullanıcılar**
```javascript
// Signup sonrası
const isNewUser = user.created_at > '2025-09-24'; // MFA activation date

if (isNewUser) {
    redirectToMFASetup(); // Zorunlu
} else {
    showMFAPrompt(); // İsteğe bağlı
}
```

**3. Opt-in (Kullanıcı Tercihi)**
```javascript
// Settings sayfasında
<button onClick={() => setupMFA()}>
    Enable Two-Factor Authentication
</button>
```

### UI Integration Points

**1. Login Sonrası (Immediate Setup)**
```
Login Success → Check MFA status → Enrollment modal göster
```

**2. Settings Sayfası (User Preference)**
```
Settings → Security → Two-Factor Authentication
→ Enable/Disable/Reset MFA
```

---

## 🔐 Backup Codes (Recovery Codes)

### Best Practices 2025

**Generation:**
```javascript
// Cryptographically secure random generation
const generateBackupCodes = (count = 10) => {
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
};

// Example output: ["A3F7K2M9", "B8N1P4Q6", ...]
```

**Format:**
- 5-10 kod üret
- 8-12 karakter uzunluğunda
- Harf + rakam kombinasyonu
- Tek kullanımlık (kullanıldıktan sonra invalid)

**Storage (Database):**
```sql
CREATE TABLE mfa_backup_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL, -- bcrypt hash (NOT plain text)
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX idx_backup_codes_user ON mfa_backup_codes(user_id);
CREATE INDEX idx_backup_codes_unused ON mfa_backup_codes(user_id) WHERE used_at IS NULL;
```

**Security Rules:**
- ❌ Plain text saklanmamalı
- ✅ bcrypt/argon2 hash ile sakla
- ✅ Her kod tek kullanımlık
- ✅ Kullanılmayan kodları listele
- ✅ Regenerate = tüm eski kodlar invalid

**User Storage Recommendations:**
```
1. Password manager (1Password, Bitwarden) ✅ Önerilen
2. Secure offline location (encrypted USB, safe) ✅ İyi
3. Cloud storage with encryption ✅ Kabul edilebilir
4. Physical copy (hidden location) ✅ Backup olarak
5. Desktop file / Email ❌ ASLA
```

### Recovery Flow

**Backup Code ile Login:**
```javascript
// MFA challenge ekranında
const useBackupCode = async (backupCode) => {
    // Supabase custom RPC function
    const { data, error } = await supabase.rpc('verify_backup_code', {
        p_user_id: user.id,
        p_code: backupCode
    });

    if (data.valid) {
        // Code'u kullanıldı olarak işaretle
        await supabase.rpc('mark_backup_code_used', {
            p_user_id: user.id,
            p_code: backupCode
        });

        // Session oluştur (AAL2)
        return { success: true };
    }

    return { success: false, error: 'Invalid backup code' };
};
```

**Recovery Security:**
```javascript
// Waiting period for sensitive accounts
const recoveryWithWaitingPeriod = async (backupCode) => {
    // Backup code verify
    const codeValid = await verifyBackupCode(backupCode);

    if (codeValid && user.role === 'admin') {
        // Admin için 24 saat bekleme
        await createRecoveryRequest({
            user_id: user.id,
            approved_at: null,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });

        return {
            message: 'Recovery request created. Admin approval required within 24h.'
        };
    }
};
```

**Best Practices:**
- ✅ MFA'yı recovery sırasında devre dışı bırakma
- ✅ Backup code kullanımını log'la
- ✅ Hassas hesaplar için waiting period ekle
- ✅ Recovery sonrası MFA reset'i öner

---

## 📱 Trusted Devices (Remember Device)

### 2025 Deprecation Warning

⚠️ **September 30, 2025**: Microsoft legacy MFA yöntemlerini kaldırıyor
- "Remember MFA on trusted devices" → Deprecated
- Conditional Access Sign-in Frequency'ye geç

### Nasıl Çalışır?

**Cookie-based Approach:**
```javascript
// User MFA'yı tamamladıktan sonra
const trustDevice = (days = 30) => {
    const trustedToken = crypto.randomUUID();

    // Database'e kaydet
    await supabase.from('trusted_devices').insert({
        user_id: user.id,
        device_token: trustedToken,
        device_fingerprint: getDeviceFingerprint(),
        expires_at: new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    });

    // Cookie set et
    document.cookie = `trusted_device=${trustedToken}; Max-Age=${days * 86400}; Secure; HttpOnly; SameSite=Strict`;
};
```

**Device Fingerprinting:**
```javascript
const getDeviceFingerprint = () => {
    return btoa(JSON.stringify({
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }));
};
```

### Güvenlik Riskleri

**Zero Trust İlkesine Aykırı:**
```
Zero Trust: "Never trust, always verify"
Remember Device: "Trust for X days"
→ Çelişki! ❌
```

**Compromised Device Scenarios:**
```
1. Cihaz çalınırsa → Hırsız 30 gün boyunca erişebilir
2. Shared computer → Diğer kullanıcılar erişebilir
3. Malware → Session hijacking riski
```

### Modern Alternatif: Conditional Access

**Risk-based Decision:**
```javascript
const shouldRequireMFA = (context) => {
    const riskFactors = {
        newDevice: !isTrustedDevice(context.deviceId),
        unusualLocation: isUnusualLocation(context.ipAddress),
        highRiskAction: context.action === 'delete_all_data',
        suspiciousActivity: detectSuspiciousBehavior(context.userId)
    };

    const riskScore = Object.values(riskFactors).filter(Boolean).length;

    // Risk score 2+ ise MFA iste
    return riskScore >= 2;
};
```

**Önerilen Yaklaşım (2025):**
```javascript
// Per-session MFA (her oturum için)
// + Risk-based re-authentication (yüksek risk işlemler için)

if (sensitiveAction || riskDetected) {
    await challengeMFA(); // MFA tekrar iste
}
```

---

## 🎯 Implementation Önerileri

### Dinky Metal ERP için MFA Strategy

**Phase 1: TOTP Implementation (Sprint 2.2)**
```javascript
✅ Supabase MFA API kullan (ücretsiz TOTP)
✅ otplib + qrcode.js ile QR kod üret
✅ Backup codes (10 adet, bcrypt hash)
✅ Settings sayfasında MFA enrollment
✅ Login flow'a MFA challenge ekle
```

**Phase 2: Enforcement (Sonraki Sprint)**
```javascript
✅ Yeni kullanıcılar için zorunlu MFA
✅ Admin rolü için zorunlu MFA
✅ Eski kullanıcılar için opt-in (teşvik)
```

**Phase 3: Advanced Features (Gelecek)**
```javascript
⏳ Risk-based authentication
⏳ Multiple TOTP devices support
⏳ WebAuthn/Passkey integration
```

### Teknik Stack

**Libraries:**
```json
{
  "dependencies": {
    "otplib": "^12.0.1",        // TOTP generation/verification
    "qrcode": "^1.5.3",         // QR code generation
    "@supabase/supabase-js": "^2.39.0" // MFA API
  }
}
```

**Database Schema:**
```sql
-- Backup codes table
CREATE TABLE mfa_backup_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MFA audit log
CREATE TABLE mfa_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    event_type TEXT NOT NULL, -- 'enrollment', 'challenge', 'verify', 'backup_used'
    success BOOLEAN NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Security Checklist

**OWASP Compliance:**
- ✅ Independent factors (password + TOTP)
- ✅ Backup recovery (secure backup codes)
- ✅ Comprehensive coverage (all login methods)
- ✅ Audit logging (MFA events)
- ✅ User education (setup guide, best practices)

**Implementation Quality:**
- ✅ Cryptographically secure random (crypto.getRandomValues)
- ✅ Rate limiting (3 attempts, lockout)
- ✅ Session security (AAL2 enforcement)
- ✅ Error handling (user-friendly messages)
- ✅ Accessibility (ARIA labels, keyboard navigation)

---

## 📚 Referanslar

### OWASP Resources
- [OWASP MFA Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP MFA Testing Guide](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/04-Authentication_Testing/11-Testing_Multi-Factor_Authentication)

### Supabase Documentation
- [Supabase MFA Guide](https://supabase.com/docs/guides/auth/auth-mfa)
- [Supabase TOTP Implementation](https://supabase.com/docs/guides/auth/auth-mfa/totp)
- [MFA via RLS Enforcement](https://supabase.com/blog/mfa-auth-via-rls)

### Libraries & Tools
- [otplib GitHub](https://github.com/yeojz/otplib)
- [OTPAuth](https://github.com/hectorm/otpauth)
- [qrcode.js](https://github.com/soldair/node-qrcode)

### Industry Insights
- [SMS OTP Replacement 2025](https://www.authsignal.com/blog/articles/sms-otp-replacement-in-2025-what-leading-companies-are-implementing)
- [MFA Backup Codes Best Practices](https://workos.com/blog/how-backup-mfa-codes-work)
- [Trusted Device Security 2025](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-mfa-mfasettings)

---

## 🎯 Sonraki Adımlar

### Sprint 2.2 Implementation Plan

**Süre:** 16 saat

**Görevler:**
1. ✅ Supabase MFA setup ve test (2 saat)
2. ✅ TOTP enrollment UI (QR kod + manuel entry) (3 saat)
3. ✅ Login flow MFA challenge (3 saat)
4. ✅ Backup codes generation ve storage (2 saat)
5. ✅ Settings sayfası MFA yönetimi (2 saat)
6. ✅ MFA audit logging (2 saat)
7. ✅ Test ve documentation (2 saat)

**Beklenen Çıktılar:**
- ✅ TOTP-based MFA working end-to-end
- ✅ QR code enrollment flow
- ✅ 10 backup codes per user
- ✅ MFA optional (opt-in) for existing users
- ✅ MFA mandatory for new users (settings flag)
- ✅ Comprehensive audit trail

**Güvenlik Skoru Beklentisi:**
- **Önce:** 82/100
- **Sonra:** 87/100 (**+5 puan**)

---

*Araştırma Tamamlanma: 24 Eylül 2025*
*Hazırlayan: Security Implementation Team*
*Sonraki Aşama: Implementation (Sprint 2.2)*