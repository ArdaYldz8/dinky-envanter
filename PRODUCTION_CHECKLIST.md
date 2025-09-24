# 🚀 Production Deployment Checklist

## ✅ Tamamlanması Gerekenler

### 🔴 Kritik (Hemen)

- [ ] **Netlify Konfigürasyonu**
  ```bash
  git add netlify.toml
  git commit -m "Add Netlify configuration with security headers"
  git push origin main
  ```

- [ ] **RLS Politikaları Doğrulama**
  - [ ] Supabase Dashboard → Authentication → Policies
  - [ ] Tüm tabloların RLS'si aktif mi kontrol et
  - [ ] Test kullanıcıları ile erişim kontrolü test et

- [ ] **Environment Variables (Netlify Dashboard)**
  ```
  Site Settings → Build & Deploy → Environment

  Eklenecekler:
  - VITE_ENV = production
  - (Opsiyonel) VITE_SUPABASE_URL = [supabase_url]
  - (Opsiyonel) VITE_SUPABASE_ANON_KEY = [anon_key]
  ```

- [ ] **Security Headers Testi**
  - [ ] https://securityheaders.com sitesinde test et
  - [ ] En az B+ rating hedefle

### 🟡 Yüksek Öncelik (Bu Hafta)

- [ ] **Login Validation Entegrasyonu**
  ```javascript
  // login.html'e ekle
  import { initializeLoginValidation } from './js/auth/login-validation.js';

  const form = document.querySelector('.login-form');
  initializeLoginValidation(form, handleLogin);
  ```

- [ ] **XSS Koruması Uygulama**
  - [ ] 75 innerHTML kullanımını güvenli hale getir
  - [ ] safeDOM.js ile replace et
  - [ ] Kritik sayfalarda: dashboard, stock, personnel

- [ ] **Error Monitoring Kurulumu**
  ```bash
  npm install @sentry/browser
  # Sentry.io hesabı oluştur
  # DSN'i environment variables'a ekle
  ```

### 🟢 Orta Öncelik (2 Hafta)

- [ ] **Build Pipeline**
  - [ ] Vite kurulumu
  - [ ] Code minification
  - [ ] Tree shaking

- [ ] **Performance Optimization**
  - [ ] Image lazy loading
  - [ ] Code splitting
  - [ ] CDN → NPM packages

- [ ] **Testing**
  - [ ] Jest/Vitest kurulumu
  - [ ] Kritik fonksiyonlar için unit testler
  - [ ] E2E testler (Playwright)

## 🔒 Güvenlik Kontrol Listesi

### Supabase
- [x] RLS aktif (11/11 tablo)
- [x] 90 RLS politikası oluşturuldu
- [ ] Service role key gizli (sadece backend'de)
- [ ] Anon key RLS ile korumalı

### Frontend
- [ ] Tüm API çağrıları authentication ile
- [ ] Input validation her formda
- [ ] XSS koruması (innerHTML → safeDOM)
- [ ] CSRF token kullanımı

### Network
- [ ] HTTPS zorunlu
- [ ] CSP headers aktif
- [ ] Cookie secure flags
- [ ] CORS doğru yapılandırılmış

## 📊 Performance Hedefleri

- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] Lighthouse Score > 90
- [ ] Bundle size < 300 KB (gzip)

## 🧪 Test Senaryoları

### Manuel Testler
- [ ] Login (admin/warehouse/accounting)
- [ ] CRUD işlemleri (her rol için)
- [ ] Session timeout (8 saat)
- [ ] Brute force koruması (5 deneme)

### Otomatik Testler
- [ ] Unit tests (%50+ coverage)
- [ ] Integration tests (API calls)
- [ ] E2E tests (user flows)

## 🚀 Deployment Adımları

### 1. Pre-deployment
```bash
# Güvenlik kontrolü
npm audit

# Linting (kurulunca)
npm run lint

# Tests (kurulunca)
npm test

# Build (kurulunca)
npm run build
```

### 2. Deployment
```bash
# Preview deploy
npm run deploy:preview

# Test preview URL
# Doğruysa production'a al

# Production deploy
npm run deploy
```

### 3. Post-deployment
```bash
# Smoke tests
- Login çalışıyor mu?
- Dashboard yükleniyor mu?
- CRUD işlemleri çalışıyor mu?

# Monitoring
- Sentry'de hata var mı?
- Performance metrics nasıl?
```

## 📝 Notlar

- **Anon Key Public**: Normal, RLS ile korunuyor ✅
- **Service Role Key**: Asla frontend'de kullanma ❌
- **Environment**: Netlify environment variables kullan
- **Headers**: netlify.toml otomatik uygulanır

## 🆘 Acil Durum

### Site Çöktüyse
1. Netlify → Site Settings → Rollback to previous deploy
2. Logları kontrol et: Netlify → Deploys → [Latest] → Deploy log
3. Supabase logları: Supabase → Logs

### Güvenlik İhlali Şüphesi
1. Supabase → Authentication → Users → Logout all
2. API keys'leri rotate et
3. Access logları incele
4. Incident raporu oluştur

---

**Son Güncelleme:** 24 Eylül 2025
**Deployment URL:** https://dinky-erp.netlify.app