# Dinky Metal ERP - Personel ve Stok Yönetim Sistemi

## Proje Hakkında

Dinky Metal ERP, metal işleme atölyeleri için tasarlanmış modern bir web uygulamasıdır. Personel takibi, puantaj yönetimi, stok kontrolü ve finansal raporlama özelliklerini içerir.

## Özellikler

### ✅ Personel Yönetimi
- Personel kayıtları (ad, günlük ücret, başlama tarihi)
- Avans ve kesinti takibi
- Personel detay görüntüleme

### ✅ Puantaj Sistemi
- Günlük puantaj girişi (Tam Gün, Yarım Gün, Gelmedi)
- Proje bazlı çalışma takibi
- Toplu puantaj güncelleme

### ✅ Stok Yönetimi
- Ürün/stok kartları yönetimi
- Stok giriş/çıkış hareketleri
- Minimum stok seviyesi uyarıları
- Hareket geçmişi görüntüleme

### ✅ Raporlama
- Aylık bordro raporu
- Excel'e aktarım
- Yazdırılabilir raporlar

### ✅ Dashboard
- Aktif personel sayısı
- Stok durumu özeti
- Kritik stok seviyeleri
- Son stok hareketleri

## Teknoloji Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Backend**: Supabase (PostgreSQL)
- **Styling**: Custom CSS with responsive design
- **Icons**: Font Awesome

## Kurulum

### 1. Veritabanı Kurulumu

Supabase SQL Editor'de `database_schema.sql` dosyasındaki SQL komutlarını çalıştırın.

### 2. Uygulamayı Başlatma

```bash
# Python ile basit HTTP sunucu başlatma
python3 -m http.server 8080

# Alternatif: Node.js http-server kullanma
npx http-server -p 8080
```

### 3. Tarayıcıda Açma

Tarayıcınızda `http://localhost:8080` adresini açın.

## Supabase Bağlantısı

Uygulama, önceden yapılandırılmış Supabase proje bilgileriyle gelir. Kendi Supabase projenizi kullanmak için:

1. [Supabase](https://supabase.com) üzerinde yeni bir proje oluşturun
2. `js/services/supabaseClient.js` dosyasındaki URL ve API Key bilgilerini güncelleyin
3. `database_schema.sql` dosyasını Supabase SQL Editor'de çalıştırın

## Kullanım

### Personel İşlemleri
1. Sol menüden "Personel" sekmesine tıklayın
2. "Yeni Personel" butonu ile personel ekleyin
3. "Avans/Kesinti Ekle" ile finansal işlemler girin

### Puantaj Girişi
1. "Puantaj" sekmesine gidin
2. Tarih seçin
3. Her personel için durum ve proje seçin
4. "Kaydet" butonuna tıklayın

### Stok İşlemleri
1. "Stok Yönetimi" sekmesine gidin
2. "Stok Hareketi" ile giriş/çıkış yapın
3. "Yeni Ürün" ile ürün tanımlayın

### Bordro Raporu
1. "Raporlar" sekmesine gidin
2. Ay ve yıl seçin
3. "Bordro Oluştur" butonuna tıklayın
4. Excel'e aktarın veya yazdırın

## Güvenlik

- Supabase Row Level Security (RLS) özelliği kullanılabilir
- API anahtarları client-side'da bulunduğu için production'da ek güvenlik önlemleri alınmalıdır
- Kullanıcı authentication sistemi eklenebilir

## Geliştirme

Proje modüler bir yapıda geliştirilmiştir:

```
dinky-metal-erp/
├── index.html              # Ana HTML dosyası
├── css/
│   └── style.css          # Stil dosyası
├── js/
│   ├── main.js            # Ana router ve controller
│   ├── services/          # Supabase servisleri
│   ├── pages/             # Sayfa modülleri
│   ├── components/        # UI bileşenleri
│   └── utils/             # Yardımcı fonksiyonlar
└── database_schema.sql    # Veritabanı şeması
```

## Lisans

MIT

## Destek

Sorularınız için issue açabilir veya pull request gönderebilirsiniz.