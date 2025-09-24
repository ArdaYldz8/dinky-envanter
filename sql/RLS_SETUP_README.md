# Row Level Security (RLS) Kurulum Kılavuzu

## 📋 Genel Bakış
Bu klasördeki SQL dosyaları Dinky ERP için Row Level Security (RLS) politikalarını kurar. RLS, veritabanı seviyesinde rol tabanlı erişim kontrolü sağlar.

## 🚀 Kurulum Adımları

### Adım 1: RLS'yi Aktifleştir
```bash
Dosya: 01_enable_rls.sql
```
- Tüm tablolarda RLS'yi etkinleştirir
- RLS durumunu doğrular

**Çalıştırma:**
1. Supabase Dashboard → SQL Editor'e gidin
2. `01_enable_rls.sql` içeriğini kopyalayıp yapıştırın
3. "Run" butonuna tıklayın

### Adım 2: Yardımcı Fonksiyonları Oluştur
```bash
Dosya: 02_create_functions.sql
```
- Kullanıcı rol kontrolü fonksiyonları
- `get_user_role()`, `is_admin()`, `is_warehouse()`, `is_accounting()`

**Çalıştırma:**
1. SQL Editor'de `02_create_functions.sql` içeriğini açın
2. "Run" butonuna tıklayın
3. Fonksiyonların oluştuğunu doğrulayın

### Adım 3: RLS Politikalarını Oluştur
```bash
Dosya: 03_create_policies.sql
```
- Tüm tablolar için rol tabanlı politikalar
- Admin, Warehouse, Accounting rolleri için erişim kuralları
- **ÖNEMLİ**: `FOR ALL` yerine her işlem için ayrı politika (SELECT, INSERT, UPDATE, DELETE)

**Çalıştırma:**
1. SQL Editor'de `03_create_policies.sql` içeriğini açın
2. "Run" butonuna tıklayın
3. Politikaların oluştuğunu kontrol edin

**Not**: PostgreSQL RLS kuralları:
- `FOR INSERT` → Sadece `WITH CHECK` kullanılır
- `FOR UPDATE/DELETE` → `USING` ve `WITH CHECK` kullanılır
- `FOR SELECT` → Sadece `USING` kullanılır

### Adım 4: Performans İndekslerini Ekle
```bash
Dosya: 04_create_indexes.sql
```
- Sık kullanılan sorgular için indeksler
- Foreign key ve filtreleme alanları

**Çalıştırma:**
1. SQL Editor'de `04_create_indexes.sql` içeriğini açın
2. "Run" butonuna tıklayın

### Adım 5: İzinleri Yapılandır
```bash
Dosya: 05_grant_permissions.sql
```
- Schema ve tablo izinleri
- Authenticated ve anon roller için yetkiler

**Çalıştırma:**
1. SQL Editor'de `05_grant_permissions.sql` içeriğini açın
2. "Run" butonuna tıklayın

## 🔐 Rol Yapısı

### Admin (`admin`)
- **Tüm tablolara tam erişim**
- Kullanıcı yönetimi
- Sistem konfigürasyonu

### Warehouse (`warehouse`)
- Ürün yönetimi (CRUD)
- Stok hareketleri (CRUD)
- Barkod işlemleri
- Çalışan görüntüleme (sadece aktif)
- Müşteri görüntüleme

### Accounting (`accounting`)
- Çalışan yönetimi (CRUD)
- Yoklama yönetimi (CRUD)
- Müşteri yönetimi (CRUD)
- Finansal işlemler (CRUD)
- Raporlama (SELECT)

## ✅ Doğrulama

### RLS Durumunu Kontrol Et
```sql
SELECT
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Politikaları Kontrol Et
```sql
SELECT
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Fonksiyonları Test Et
```sql
SELECT get_user_role() as current_role;
SELECT is_admin() as is_admin;
SELECT is_warehouse() as is_warehouse;
SELECT is_accounting() as is_accounting;
```

## 🔧 Frontend Entegrasyonu

RLS aktifleştirildikten sonra, tüm Supabase çağrıları authentication gerektir:

```javascript
// Supabase client otomatik olarak JWT token'ı ekler
const { data, error } = await supabase
  .from('products')
  .select('*');

// RLS politikaları otomatik olarak uygulanır
// Kullanıcının rolüne göre veri filtrelenir
```

## ⚠️ Önemli Notlar

1. **Authentication Zorunlu**: RLS aktifleştirildikten sonra, authentication olmadan veri erişilemez
2. **JWT Token**: Her istek JWT token ile doğrulanmalıdır
3. **Service Role**: Development için service_role key kullanabilirsiniz, production'da asla kullanmayın
4. **Test**: Her rolü ayrı ayrı test edin
5. **Backup**: Değişiklik yapmadan önce mutlaka backup alın

## 🐛 Sorun Giderme

### Hata: "permission denied for table"
- RLS politikaları doğru mu kontrol edin
- Kullanıcı authentication var mı kontrol edin
- User role doğru mu kontrol edin

### Hata: "function does not exist"
- `02_create_functions.sql` çalıştırıldı mı kontrol edin
- Function izinleri verildi mi kontrol edin

### Hata: "new row violates row-level security policy"
- WITH CHECK koşullarını kontrol edin
- Kullanıcının INSERT yetkisi var mı kontrol edin

## 📚 Ek Kaynaklar

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

## 🔄 Güncellemeler

Politikalarda değişiklik yapmak için:

```sql
-- Mevcut politikayı kaldır
DROP POLICY "policy_name" ON table_name;

-- Yeni politika oluştur
CREATE POLICY "new_policy_name" ON table_name
    FOR ALL
    USING (condition)
    WITH CHECK (condition);
```

## 📞 Destek

Sorun yaşarsanız:
1. SQL hatalarını kontrol edin
2. Supabase logs'u inceleyin
3. RLS politikalarını gözden geçirin
4. Test kullanıcıları ile doğrulayın