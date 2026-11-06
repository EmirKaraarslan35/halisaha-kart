# Halı Saha Kart & Kadro Uygulaması (FIFA / FUT Konseptli PWA)

Bu proje, her hafta halı saha maçı yapan arkadaş grupları için geliştirilmiş, EA Sports FC / FIFA Ultimate Team (FUT) kalkan kartı formatında kadro, maç ve lig yönetim PWA uygulamasıdır.

## 🚀 Öne Çıkan Özellikler

1. **FIFA / FUT Kalkan Kartları (Pointed Shield):**
   - Altı sivri, üst köşeleri pahlı kalkan geometrisi.
   - Güce göre otomatik renk geçişi: **85+ Özel/Holografik**, **75-84 Altın**, **65-74 Gümüş**, **<65 Bronz**.
   - Fotoğrafsız oyuncular için otomatik 2 harfli avatar (fotoğraf yüklenince şablon bozulmadan vesikalık oturur).
2. **Dikey Stadyum Sahası & Canlı Ortalama:**
   - Tek ekranda Takım A ve Takım B karşılıklı dizilir.
   - Sahadaki oyuncuların anlık güç ortalaması (OVR) otomatik hesaplanır.
   - Dokun-değiştir (mobilde) ve sürükle-bırak mantığı.
   - Sahada olmayan oyuncular alt ekstra şeritte durur.
3. **Kadro Kilidi & Maç Akışı:**
   - Maç başlatıldığında kadro kopyalanır (`match_players`) ve kilitlenir.
   - Skor ve gol sayısı birebir tutarlılık kontrolü.
   - Kendi kalesine (K.K.) goller rakibe yazılır, atan oyuncunun gol krallığına eklenmez.
   - Maçın adamı (MVP) seçimi ve isteğe bağlı **+1 Güç Artışı** önerisi.
4. **Gizli Güç Geçmişi (`power_history`):**
   - Arkadaş ortamında güç tartışmalarını engellemek için güç değişim geçmişi ve zaman grafiği (`recharts`) **sadece yöneticiye açıktır**.
   - Ziyaretçiler sadece güncel kart gücünü görür.
5. **Dinamik Lig Tablosu:**
   - O, G, B, M, AG, YG, Averaj ve Puan tablosu.
   - Gol Krallığı, Asist Krallığı ve MVP tablosu.
6. **Yedek İndirme (JSON):**
   - Yönetici tek tıkla tüm oyuncuları, maçları, ligleri ve güç geçmişini tarihli `.json` olarak indirebilir.

---

## 🛠️ Kurulum ve Supabase Adımları

### 1. Supabase Hesabı & Veritabanı Kurulumu (2 Dakika)
1. [supabase.com](https://supabase.com) adresine gidip ücretsiz bir hesap açın ve yeni bir proje oluşturun.
2. Sol menüden **SQL Editor** bölümüne girin.
3. Proje klasöründeki `supabase_schema.sql` dosyasının tüm içeriğini kopyalayıp buraya yapıştırın ve **Run** butonuna basın.
   - *Bu işlem tüm tabloları, RLS güvenlik kurallarını, derived view'ları, storage bucket'ı ve başlangıç verilerini tek seferde oluşturur.*
4. Sol menüden **Authentication -> Users** bölümüne gidin ve yönetici olmak istediğiniz e-posta ve şifreyle bir kullanıcı oluşturun.

### 2. Ortam Değişkenleri (.env)
Proje kök dizininde `.env` dosyası oluşturup Supabase bilgilerinizi girin:
```env
VITE_SUPABASE_URL=https://proje-id.supabase.co
VITE_SUPABASE_ANON_KEY=anon-key-buraya
```

### 3. Uygulamayı Başlatma
```bash
npm install
npm run dev
```

---

## 📱 PWA Olarak Telefona Ekleme
Tarayıcıdan (Safari veya Chrome) uygulamayı açtıktan sonra:
- **iOS:** Paylaş (Share) butonuna basıp **"Ana Ekrana Ekle"** seçeneğini seçin.
- **Android:** Seçenekler menüsünden **"Uygulamayı Yükle"** veya **"Ana Ekrana Ekle"** seçeneğini seçin.
Uygulama tam ekran, adres çubuğu olmadan yerel bir uygulama gibi çalışacaktır.
