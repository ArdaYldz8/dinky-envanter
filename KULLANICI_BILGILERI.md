# 🔐 Dinky ERP Sistemi - Kullanıcı Hesapları (ÖRNEK)

## ⚠️ GÜVENLİK UYARISI
Bu dosya sadece ÖRNEK amaçlıdır. Gerçek şifreler environment variables içinde saklanmalıdır.

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