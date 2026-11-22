# TestSayfam: proje rehberi

Ürün: ders notu / defter sayfası fotoğrafından LGS-YKS kurallı çoktan seçmeli test üreten B2C web uygulaması. Hedef kitle önce öğrenci (LGS, TYT, AYT); öğretmen tarafı şimdilik sadece "yazdırılabilir sınav kağıdı" özelliği.

## Tasarım dili (kareli defter)
- Renkler `app/globals.css` `:root` içinde: zemin `--bg` + kareli `--grid`, metin/çerçeve lacivert `--ink #15204a`, ana buton tükenmez mavisi `--primary #2d4fe0`, vurgu fosforlu yeşil `--accent #c9f25c`, kırmızı kalem `--bad`.
- Fontlar `app/layout.tsx`: Bricolage Grotesque (başlık, `.font-display`), Plus Jakarta Sans (gövde), Caveat (el yazısı süs, `.el`), JetBrains Mono (soru no, süre, optik form).
- Başlıktaki `<em>` italik değildir: fosforlu kalemle altı çizilmiş görünür.
- Butonlar ve öne çıkan kartlar "çıkartma" stilinde: 2px lacivert çerçeve + düz kayık gölge (`.btn`, `.sticker`, `.card-lift`).
- Logo: `app/_parcalar/Logo.tsx` (kıvrık köşeli sayfa ikonu + "Test" lacivert, "Sayfam" mavi).
- Mobil öncelikli; her değişiklikten sonra 390px genişlikte yatay kaydırma olmadığını kontrol et.

## Kurallar
- Motor (`app/lib/motor.ts`: sınav kuralları, `netHesapla`, `sorulariDogrula`, `SORU_SEMASI`, `sistemTalimati`) dikkatle değiştirilir. Net kuralı: LGS 3 yanlış, TYT/AYT 4 yanlış 1 doğruyu götürür.
- "Her soru nottaki dayanak cümlesine bağlıdır" vaadi korunur.
- Sahte kullanıcı sayısı, sahte yorum, uydurma istatistik eklenmez. Landing'deki rakamlar motorun demo verisinden hesaplanır.
- Metinler samimi, öğrenciye "sen" diye hitap eden Türkçe.

## Teknik
- Next.js 15 (App Router), React 19, Tailwind 4.
- `/api/test-uret`: görselleri (tarayıcıda 1400px JPEG'e küçültülmüş) + metni Claude'a yollar, json_schema ile yapılandırılmış çıktı alır, sunucuda doğrular. Model `ANTHROPIC_MODEL` ile değişir.
- Kalıcılık şimdilik localStorage (`testsayfam:v1`). Sırada: Supabase ile üyelik + veritabanı, kullanım limiti, ödeme.
