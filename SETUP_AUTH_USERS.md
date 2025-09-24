# 🔐 Supabase Auth Setup - Production Ready

## ⚠️ ÖNEMLI: Auth Hook Aktivasyonu

**ÖNCE BUNU YAP:**

1. Supabase Dashboard'a git: https://supabase.com/dashboard/project/spmtwsxrnclkxmqwsxdf
2. **Authentication → Hooks (Beta)**
3. **Custom Access Token** hook'unu seç
4. Dropdown'dan **`custom_access_token_hook`** fonksiyonunu seç
5. **Save** butonuna tıkla

## 📋 Demo Kullanıcıları Oluştur

Supabase Dashboard → Authentication → Users → "Add User" ile manuel olarak ekle:

### 1. Admin Kullanıcı
- **Email:** admin@dinky.com
- **Password:** Dinky2025!
- **Auto Confirm User:** ✅ (işaretle)

### 2. Yönetim Kullanıcısı
- **Email:** yonetim@dinky.com
- **Password:** Yonetim2025!
- **Auto Confirm User:** ✅

### 3. Depo Kullanıcısı
- **Email:** depo@dinky.com
- **Password:** Depo2025!
- **Auto Confirm User:** ✅

### 4. Muhasebe Kullanıcısı
- **Email:** muhasebe@dinky.com
- **Password:** Muhasebe2025!
- **Auto Confirm User:** ✅

## 🎯 Rolleri Atama

Kullanıcılar oluşturulduktan sonra, Supabase → SQL Editor'da çalıştır:

```sql
-- Get user IDs first
SELECT id, email FROM auth.users;

-- Then assign roles (replace UUIDs with actual user IDs)
INSERT INTO public.user_roles (user_id, role) VALUES
  ('<admin_user_id>', 'admin'),
  ('<yonetim_user_id>', 'admin'),
  ('<depo_user_id>', 'warehouse'),
  ('<muhasebe_user_id>', 'accounting');
```

## ✅ Test Etme

1. Logout yap (eğer giriş yaptıysan)
2. admin@dinky.com ile giriş yap
3. Çalışanları ve ürünleri görebiliyor musun?
4. Ekleme/silme/güncelleme yapabiliyor musun?

## 🔒 Güvenlik Notları

- ✅ RLS aktif (11 tablo)
- ✅ JWT-based role authentication
- ✅ Auth Hook ile custom claims
- ✅ Role-based policies
- ❌ Public policies kaldırıldı
- ✅ Production-ready architecture

## 📝 Şifreler

**ÜRETİM ORTAMINDA:**
- Bu şifreleri gerçek, güçlü şifrelerle değiştir
- Şifre politikası: en az 12 karakter, büyük/küçük harf, rakam, özel karakter
- MFA (Multi-Factor Authentication) aktifleştir (Supabase Dashboard → Auth → Policies)