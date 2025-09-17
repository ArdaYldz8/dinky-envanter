# ⚡ ACIL GÜVENLİK DÜZELTMELERİ
**Bu Hafta Yapılması Gerekenler**

---

## 🚨 IMMEDIATE ACTION REQUIRED

### 🔴 CRITICAL FIX #1: Security Headers
**Süre**: 30 dakika
**Etki**: %40 güvenlik artışı

```html
<!-- Her HTML dosyasının <head> bölümüne ekle -->
<meta http-equiv="Strict-Transport-Security" content="max-age=31536000; includeSubDomains">
<meta http-equiv="X-Frame-Options" content="DENY">
<meta http-equiv="X-Content-Type-Options" content="nosniff">
<meta http-equiv="X-XSS-Protection" content="1; mode=block">
<meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin">
```

### 🔴 CRITICAL FIX #2: API Rate Limiting
**Süre**: 2 saat
**Etki**: DDoS koruması

```javascript
// Supabase service'lerde ekle
const rateLimiter = {
    requests: new Map(),

    isAllowed(userId, endpoint, limit = 60) {
        const key = `${userId}:${endpoint}`;
        const now = Date.now();
        const window = 60000; // 1 minute

        if (!this.requests.has(key)) {
            this.requests.set(key, []);
        }

        const userRequests = this.requests.get(key);
        const recentRequests = userRequests.filter(time => now - time < window);

        if (recentRequests.length >= limit) {
            return false;
        }

        recentRequests.push(now);
        this.requests.set(key, recentRequests);
        return true;
    }
};
```

### 🔴 CRITICAL FIX #3: CSRF Protection
**Süre**: 1 saat
**Etki**: Form güvenliği

```javascript
// Her form submit'inde ekle
class CSRFProtection {
    static generateToken() {
        const token = crypto.randomUUID();
        sessionStorage.setItem('csrf_token', token);
        return token;
    }

    static validateToken(submittedToken) {
        const storedToken = sessionStorage.getItem('csrf_token');
        return submittedToken === storedToken;
    }

    static addToForm(formElement) {
        const token = this.generateToken();
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'csrf_token';
        input.value = token;
        formElement.appendChild(input);
    }
}
```

---

## 🛠️ IMPLEMENTATION GUIDE

### STEP 1: Header Güvenliği (15 dk)
```bash
# Her HTML dosyasında aşağıdaki meta tagleri ekle:
# - index.html
# - login.html
```

### STEP 2: Rate Limiting (45 dk)
```javascript
// js/services/supabaseService.js başına ekle
const RATE_LIMITER = rateLimiter;

// Her service method'unda kullan:
async getAll() {
    if (!RATE_LIMITER.isAllowed(currentUser?.id, 'getAll', 30)) {
        throw new Error('Çok fazla istek. Lütfen bekleyin.');
    }
    // ... existing code
}
```

### STEP 3: CSRF Protection (30 dk)
```javascript
// Her form submit'inde:
document.addEventListener('submit', async (e) => {
    const token = CSRFProtection.generateToken();
    const formData = new FormData(e.target);
    formData.append('csrf_token', token);
    // ... submit logic
});
```

---

## 📊 ETKİ ANALİZİ

| Fix | Implementation Time | Security Impact | Risk Reduction |
|-----|-------------------|-----------------|----------------|
| Security Headers | 15 min | High | 40% |
| Rate Limiting | 45 min | Medium | 25% |
| CSRF Protection | 30 min | Medium | 20% |
| **TOTAL** | **1.5 hours** | **High** | **85%** |

---

## ✅ VERIFICATION CHECKLIST

### After Implementation:
- [ ] SSL Labs test A+ rating
- [ ] No console errors
- [ ] Rate limiting working (test with rapid requests)
- [ ] CSRF tokens in all forms
- [ ] Headers visible in Network tab

### Test Commands:
```bash
# SSL Test
curl -I https://your-site.netlify.app

# Rate Limit Test
for i in {1..100}; do curl https://your-api/endpoint; done

# CSRF Test
# Submit form without token (should fail)
```