# TestSayfam

Defterinin, fotokopinin ya da kitabının sayfasını çek → LGS / YKS kurallarıyla sana özel çoktan seçmeli test.
Çöz, netini gör, yanlışlarını tekrar et. Öğretmenler testi yazdırılabilir A/B kitapçığa çevirebilir.

## Kurulum

```bash
npm install
npm run dev   # http://localhost:3000
```

API anahtarı olmadan **demo modda** çalışır (yüklenen her sayfa için hazır fen veya tarih testi gelir).
Gerçek test üretimi için proje klasörüne `.env.local` dosyası oluştur:

```
ANTHROPIC_API_KEY=sk-ant-...
# isteğe bağlı: ANTHROPIC_MODEL=claude-haiku-4-5
```

## Klasör yapısı

| Yol | Ne var |
|---|---|
| `app/page.tsx` | Tanıtım (landing) sayfası |
| `app/app/page.tsx` | Uygulama: Testlerim, Yeni test, Çöz, Sonuç, Sınav kağıdı |
| `app/api/test-uret/route.ts` | Fotoğraf + metni Claude'a gönderip soruları alan sunucu ucu |
| `app/lib/motor.ts` | Motor: sınav kuralları, net hesabı, soru doğrulama, demo testler |
| `app/_parcalar/Logo.tsx` | Logo ve sayfa ikonu |
| `app/globals.css` | Renkler ve bileşen stilleri (kareli defter teması) |
| `_ekranlar/` | Güncel ekran görüntüleri |

## Yayına almadan önce yapılacaklar
- [ ] Kullanıcı başına kullanım limiti (şu an sınır yok, API faturası açık!)
- [ ] Üyelik + veritabanı (şu an veriler tarayıcıda, `localStorage`)
- [ ] KVKK aydınlatma metni, gizlilik politikası, kullanım şartları
- [ ] Ödeme (iyzico / PayTR)
- [ ] Alan adı + Vercel'e deploy
