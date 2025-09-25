# 🔒 DİNKY METAL ERP - GÜVENLİK YÜKSELTMESİ v1.1.0

**Tarih**: 2025-09-25 | **Durum**: 🚀 Production Ready

## 🛡️ YENİ GÜVENLİK ÖZELLİKLERİ

### ✅ Tamamlanan İyileştirmeler
- **🔐 API Key Protection**: Server-side Netlify Functions
- **🏗️ Secure Architecture**: Environment variables
- **📡 API Proxy**: Secure server-side communication

## ⚠️ DEPLOYMENT TALİMATLARI

**Netlify Environment Variables** (Site Settings → Environment Variables):
```env
SUPABASE_URL=https://nppfutvdiwjkzxzzgfhf.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wcGZ1dHZkaXdqa3p4enpnZmhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc0NDUyNjQsImV4cCI6MjA0MzAyMTI2NH0.XqegSxpTEYBzKWUkbkMHdCJnTiUYT-a4hqKD0lBGV8E
SUPABASE_SERVICE_ROLE_KEY=[Supabase Dashboard'dan service_role key]
NODE_ENV=production
```

## Test/Demo Hesapları
```
Admin Hesabı
- Email: admin@dinky.com
- Şifre: [ENV: ADMIN_PASSWORD]
- Yetki: Admin

Yönetim Hesabı
- Email: yonetim@dinky.com
- Şifre: [ENV: MANAGEMENT_PASSWORD]
- Yetki: Admin

Depo Hesabı
- Email: depo@dinky.com
- Şifre: [ENV: WAREHOUSE_PASSWORD]
- Yetki: Warehouse

Muhasebe Hesabı
- Email: muhasebe@dinky.com
- Şifre: [ENV: ACCOUNTING_PASSWORD]
- Yetki: Accounting
```

## Kurulum
1. `.env.example` dosyasını `.env` olarak kopyalayın
2. Environment variables'ları güvenli şifrelerle doldurun
3. Production'da farklı, güçlü şifreler kullanın

---
**Not**: Gerçek şifreler asla repository'de saklanmamalıdır.