// TestSayfam motoru: saf mantık (tarayıcı + sunucu ortak). UI ve API burayı kullanır.
// Sınav kuralları, net hesabı, model çıktısını doğrulama, demo testleri, istatistik.

export type SinavTipi = "lgs" | "tyt" | "ayt" | "uni" | "genel";
export type Zorluk = "kolay" | "orta" | "zor" | "karisik";
export type SoruZorluk = "kolay" | "orta" | "zor";

export interface Soru {
  id: string;
  konu: string;
  soru: string;
  siklar: string[];
  dogru: number; // siklar içindeki doğru şıkkın sırası (0'dan)
  aciklama: string;
  dayanak: string; // nottaki dayanak cümlesi
  zorluk: SoruZorluk;
}

export interface Test {
  id: string;
  baslik: string;
  ders: string;
  sinav: SinavTipi;
  zorluk: Zorluk;
  sorular: Soru[];
  olusturma: number;
  kaynak: { tur: "foto" | "metin" | "karma"; sayfa: number; ozet: string };
  demo: boolean;
  ornek?: boolean; // ilk açılışta gelen örnek veri
}

export interface Deneme {
  id: string;
  testId: string;
  tarih: number;
  mod: "ilk" | "tekrar";
  soruIds: string[];
  cevaplar: Record<string, number | null>; // soruId -> ORİJİNAL şık sırası
  sira?: Record<string, number[]>; // tekrar turunda karıştırılmış şık sırası (gösterim -> orijinal)
  sureSn: number;
}

export interface Ayarlar {
  adet: 5 | 10 | 20;
  zorluk: Zorluk;
  sinav: SinavTipi;
}

export const SINAVLAR: Record<SinavTipi, { ad: string; kisa: string; sik: number; ceza: number; dkSoru: number; not: string }> = {
  lgs: { ad: "LGS", kisa: "LGS", sik: 4, ceza: 3, dkSoru: 1.6, not: "4 şık · 3 yanlış 1 doğruyu götürür" },
  tyt: { ad: "YKS · TYT", kisa: "TYT", sik: 5, ceza: 4, dkSoru: 1.4, not: "5 şık · 4 yanlış 1 doğruyu götürür" },
  ayt: { ad: "YKS · AYT", kisa: "AYT", sik: 5, ceza: 4, dkSoru: 1.2, not: "5 şık · 4 yanlış 1 doğruyu götürür" },
  uni: { ad: "Üniversite vize / final", kisa: "Vize-final", sik: 5, ceza: 0, dkSoru: 1.5, not: "5 şık · yanlış doğruyu götürmez" },
  genel: { ad: "Genel tekrar", kisa: "Genel", sik: 4, ceza: 0, dkSoru: 1.5, not: "4 şık · yanlış doğruyu götürmez" },
};

export const ZORLUKLAR: { id: Zorluk; ad: string }[] = [
  { id: "kolay", ad: "Kolay" },
  { id: "orta", ad: "Orta" },
  { id: "zor", ad: "Zor" },
  { id: "karisik", ad: "Karışık" },
];

export const HARF = ["A", "B", "C", "D", "E"];

export function uid(p = "t"): string {
  return p + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

/* ---------------- Net ve değerlendirme ---------------- */

export function netHesapla(sinav: SinavTipi, dogru: number, yanlis: number): number {
  const c = SINAVLAR[sinav].ceza;
  const n = c ? dogru - yanlis / c : dogru;
  return Math.round(n * 100) / 100;
}

export interface Degerlendirme {
  dogru: number;
  yanlis: number;
  bos: number;
  net: number;
  toplam: number;
  yuzde: number;
  hatalilar: string[]; // yanlış + boş soru id'leri
}

export function degerlendir(test: Test, d: Deneme): Degerlendirme {
  let dogru = 0, yanlis = 0, bos = 0;
  const hatalilar: string[] = [];
  for (const id of d.soruIds) {
    const s = test.sorular.find((x) => x.id === id);
    if (!s) continue;
    const c = d.cevaplar[id];
    if (c === null || c === undefined) { bos++; hatalilar.push(id); }
    else if (c === s.dogru) dogru++;
    else { yanlis++; hatalilar.push(id); }
  }
  const toplam = dogru + yanlis + bos;
  return { dogru, yanlis, bos, toplam, net: netHesapla(test.sinav, dogru, yanlis), yuzde: toplam ? Math.round((dogru / toplam) * 100) : 0, hatalilar };
}

export function sureYaz(sn: number): string {
  const m = Math.floor(sn / 60), s = sn % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function netYaz(n: number): string {
  return n.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
}

/* ---------------- Konu başına başarı ---------------- */

export interface KonuSatir { konu: string; ders: string; dogru: number; toplam: number; yuzde: number }

export function konuIstatistik(testler: Test[], denemeler: Deneme[]): KonuSatir[] {
  const m = new Map<string, KonuSatir>();
  for (const d of denemeler) {
    const t = testler.find((x) => x.id === d.testId);
    if (!t) continue;
    for (const id of d.soruIds) {
      const s = t.sorular.find((x) => x.id === id);
      if (!s) continue;
      const key = `${t.ders}|${s.konu}`;
      const row = m.get(key) || { konu: s.konu, ders: t.ders, dogru: 0, toplam: 0, yuzde: 0 };
      row.toplam++;
      if (d.cevaplar[id] === s.dogru) row.dogru++;
      m.set(key, row);
    }
  }
  return [...m.values()]
    .map((r) => ({ ...r, yuzde: Math.round((r.dogru / r.toplam) * 100) }))
    .sort((a, b) => a.yuzde - b.yuzde);
}

/* ---------------- Karıştırma (tekrar turu + B kitapçığı) ---------------- */

export function tohumluRastgele(tohum: number) {
  let a = tohum >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function karistir<T>(dizi: T[], rnd: () => number = Math.random): T[] {
  const a = [...dizi];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Tekrar turu: yanlış/boş sorular, şık sırası karıştırılır (konum ezberi kırılır). */
export function tekrarDenemesi(test: Test, ids: string[]): Deneme {
  const sira: Record<string, number[]> = {};
  for (const id of ids) {
    const s = test.sorular.find((x) => x.id === id);
    if (!s) continue;
    const idx = s.siklar.map((_, i) => i);
    let k = karistir(idx);
    if (k.every((v, i) => v === i) && idx.length > 1) k = [...idx.slice(1), idx[0]];
    sira[id] = k;
  }
  return { id: uid("d"), testId: test.id, tarih: Date.now(), mod: "tekrar", soruIds: ids, cevaplar: {}, sira, sureSn: 0 };
}

/** Öğretmen modu B kitapçığı: soru sırası ve şıklar tohumla karışır; cevap anahtarı buna göre üretilir. */
export function kitapcik(test: Test, tur: "A" | "B"): { soru: Soru; no: number }[] {
  if (tur === "A") return test.sorular.map((soru, i) => ({ soru, no: i + 1 }));
  const rnd = tohumluRastgele(test.id.split("").reduce((a, c) => a + c.charCodeAt(0), 7));
  const sorular = karistir(test.sorular, rnd).map((s) => {
    const perm = karistir(s.siklar.map((_, i) => i), rnd);
    return { ...s, siklar: perm.map((p) => s.siklar[p]), dogru: perm.indexOf(s.dogru) };
  });
  return sorular.map((soru, i) => ({ soru, no: i + 1 }));
}

/* ---------------- Model çıktısını doğrulama ---------------- */

const temizSik = (s: string) => s.replace(/^\s*[A-Ea-e][\)\.\-:]\s+/, "").trim();

/** Claude'dan gelen ham soruları sıkı biçimde doğrular; bozuk soruyu atar, asla uydurma doldurmaz. */
export function sorulariDogrula(ham: unknown, sikSayisi: number): Soru[] {
  if (!Array.isArray(ham)) return [];
  const out: Soru[] = [];
  for (const h of ham) {
    if (!h || typeof h !== "object") continue;
    const r = h as Record<string, unknown>;
    const soru = typeof r.soru === "string" ? r.soru.trim() : "";
    const siklar = Array.isArray(r.siklar) ? r.siklar.filter((x): x is string => typeof x === "string").map(temizSik).filter(Boolean) : [];
    const dogru = typeof r.dogru === "number" ? Math.round(r.dogru) : typeof r.dogru === "string" ? HARF.indexOf(r.dogru.trim().toUpperCase()) : -1;
    if (!soru || siklar.length < 3 || siklar.length > 5) continue;
    if (new Set(siklar.map((x) => x.toLocaleLowerCase("tr"))).size !== siklar.length) continue;
    if (dogru < 0 || dogru >= siklar.length) continue;
    if (siklar.length !== sikSayisi && siklar.length < 4) continue;
    const z = r.zorluk === "kolay" || r.zorluk === "zor" ? r.zorluk : "orta";
    out.push({
      id: uid("s"),
      konu: (typeof r.konu === "string" && r.konu.trim()) || "Genel",
      soru,
      siklar,
      dogru,
      aciklama: typeof r.aciklama === "string" ? r.aciklama.trim() : "",
      dayanak: typeof r.dayanak === "string" ? r.dayanak.trim().replace(/^["“]|["”]$/g, "") : "",
      zorluk: z,
    });
  }
  return out;
}

/** Claude structured output şeması (output_config.format). */
export const SORU_SEMASI = {
  type: "object",
  additionalProperties: false,
  required: ["baslik", "ders", "uyari", "sorular"],
  properties: {
    baslik: { type: "string", description: "Testin kısa başlığı, notun konusu" },
    ders: { type: "string", description: "Ders adı: Fen Bilimleri, Tarih, Biyoloji, Matematik..." },
    uyari: { type: "string", description: "Kaynak okunamadıysa veya yetersizse kısa Türkçe uyarı, yoksa boş metin" },
    sorular: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["konu", "soru", "siklar", "dogru", "aciklama", "dayanak", "zorluk"],
        properties: {
          konu: { type: "string" },
          soru: { type: "string" },
          siklar: { type: "array", items: { type: "string" } },
          dogru: { type: "integer" },
          aciklama: { type: "string" },
          dayanak: { type: "string" },
          zorluk: { type: "string", enum: ["kolay", "orta", "zor"] },
        },
      },
    },
  },
} as const;

export function sistemTalimati(a: Ayarlar): string {
  const s = SINAVLAR[a.sinav];
  const zorluk = a.zorluk === "karisik" ? "kolay, orta ve zor soruları dengeli karıştır" : `soruların çoğu ${a.zorluk} düzeyde olsun`;
  const stil: Record<SinavTipi, string> = {
    lgs: "LGS tarzı: beceri temelli, kısa bir durum veya öğrenci ifadesiyle başlayan, yorum isteyen sorular. 8. sınıf düzeyinde sade dil.",
    tyt: "YKS TYT tarzı: temel kavram bilgisi ve kısa yorum. Lise düzeyi.",
    ayt: "YKS AYT tarzı: alan bilgisi derinliği, kavramlar arası ilişki, öncül (I, II, III) yapısı kullanılabilir.",
    uni: "Üniversite vize/final tarzı: kavram tanımı, ilişki ve uygulama.",
    genel: "Genel tekrar: notun ana fikirlerini ölçen açık ve net sorular.",
  };
  return [
    "Sen Türkiye'deki sınav sistemini iyi bilen bir ölçme-değerlendirme öğretmenisin.",
    `Görevin: verilen ders notundan TAM OLARAK ${a.adet} adet çoktan seçmeli soru üretmek.`,
    `Her soruda TAM OLARAK ${s.sik} şık olsun (${HARF.slice(0, s.sik).join(", ")}). Tek doğru cevap olsun. "dogru" alanı doğru şıkkın 0'dan başlayan sırasıdır.`,
    "Kurallar:",
    "1) Soruları SADECE nottaki bilgiden üret. Notta olmayan bilgiyi doğru cevap yapma.",
    "2) 'dayanak' alanına, doğru cevabı destekleyen cümleyi nottan KELİMESİ KELİMESİNE kopyala.",
    "3) Çeldiriciler makul olsun: aynı konudan, yaygın öğrenci hatalarından seçilsin. 'Hepsi' / 'Hiçbiri' şıkkı kullanma.",
    "4) Doğru şıkkın yerini sorular arasında dağıt; hep aynı harfte toplanmasın.",
    "5) 'aciklama' en fazla iki cümle: doğru cevabın neden doğru olduğunu ve tipik hatayı söyle.",
    "6) 'konu' 2-4 kelimelik alt konu adıdır; aynı alt konuya ait sorularda aynı adı kullan.",
    `7) Zorluk: ${zorluk}. ${stil[a.sinav]}`,
    "8) Şık metinlerinin başına harf yazma. Dil: doğru Türkçe karakterlerle Türkçe.",
    "9) Fotoğraf okunaksızsa veya not soru üretmeye yetmiyorsa üretebildiğin kadar soru üret ve 'uyari' alanına nedenini yaz.",
    "Çıktı yalnızca şemaya uyan JSON olsun.",
  ].join("\n");
}

/* ---------------- Demo: hazır notlar ve testler ---------------- */

export interface DemoNot { id: "fen" | "tarih"; etiket: string; baslik: string; ders: string; sinav: SinavTipi; metin: string; anahtar: string[]; sorular: Omit<Soru, "id">[] }

const q = (konu: string, zorluk: SoruZorluk, soru: string, siklar: string[], dogru: number, aciklama: string, dayanak: string): Omit<Soru, "id"> =>
  ({ konu, zorluk, soru, siklar, dogru, aciklama, dayanak });

export const DEMO_NOTLAR: DemoNot[] = [
  {
    id: "fen",
    etiket: "8. sınıf Fen · Mevsimler ve İklim",
    baslik: "Mevsimler ve İklim",
    ders: "Fen Bilimleri",
    sinav: "lgs",
    anahtar: ["mevsim", "iklim", "eksen", "dönence", "donence", "ekinoks", "hava durumu", "güneş ışın", "rüzgâr", "rüzgar"],
    metin: `MEVSİMLER VE İKLİM (8. Sınıf Fen, 1. Ünite)

Dünya, Güneş etrafında bir yılda dolanır; bu harekete yıllık hareket denir.
Dünya'nın dönme ekseni yörünge düzlemine göre yaklaşık 23° 27' eğiktir. Mevsimlerin oluşmasının asıl nedeni bu eksen eğikliğidir.
Eksen eğikliği nedeniyle Güneş ışınlarının bir yere düşme açısı yıl içinde değişir. Işınlar dik açıya yakın geldiğinde birim yüzeye düşen enerji artar ve sıcaklık yükselir.
Güneş ışınları eğik geldiğinde aynı miktar enerji daha geniş bir alana yayılır, birim alana düşen enerji azalır.

21 Haziran: Güneş ışınları Yengeç Dönencesi'ne dik gelir. Kuzey Yarım Küre'de yaz başlar ve en uzun gündüz yaşanır. Güney Yarım Küre'de kış başlar.
21 Aralık: Işınlar Oğlak Dönencesi'ne dik gelir. Kuzey Yarım Küre'de kış başlar ve en uzun gece yaşanır. Bu tarihte Güney Yarım Küre'de yaz başlar.
21 Mart ve 23 Eylül: Işınlar Ekvator'a dik gelir. Tüm dünyada gece ve gündüz süreleri eşittir.
Dünya'nın Güneş'e uzaklığı mevsimlerin nedeni değildir. Kuzey Yarım Küre kışı yaşarken Dünya Güneş'e daha yakındır.

Hava durumu: kısa süreli ve dar bir alanda görülen atmosfer olaylarıdır (sıcaklık, nem, rüzgâr, yağış).
İklim: geniş bir bölgede uzun yıllar boyunca gözlenen hava olaylarının ortalamasıdır.
Hava olaylarını inceleyen bilim dalı meteorolojidir, uzmanına meteorolog denir. İklimi inceleyen bilim dalı klimatolojidir, uzmanına klimatolog denir.
Rüzgâr, yüksek basınç alanından alçak basınç alanına doğru hareket eden havadır. Isınan hava genişler, yükselir ve alçak basınç oluşturur.`,
    sorular: [
      q("Mevsimlerin oluşumu", "kolay", "Mevsimlerin oluşmasının asıl nedeni aşağıdakilerden hangisidir?",
        ["Dünya'nın Güneş'e olan uzaklığının değişmesi", "Dünya'nın dönme ekseninin eğik olması", "Ay'ın Dünya etrafında dolanması", "Dünya'nın kendi ekseni etrafında dönmesi"], 1,
        "Eksen eğikliği ışınların geliş açısını yıl içinde değiştirir; mevsimler bundan oluşur. Uzaklık değişimi en sık yapılan hatadır.",
        "Mevsimlerin oluşmasının asıl nedeni bu eksen eğikliğidir."),
      q("Mevsimlerin oluşumu", "orta", "Güneş ışınlarının bir yüzeye dik açıya yakın geldiği durum için aşağıdakilerden hangisi doğrudur?",
        ["Işınlar daha geniş bir alana yayılır", "Sıcaklık değişmez", "Birim alana düşen enerji azalır", "Birim yüzeye düşen enerji artar"], 3,
        "Dik gelen ışın aynı enerjiyi daha küçük bir alana toplar, bu yüzden sıcaklık yükselir.",
        "Işınlar dik açıya yakın geldiğinde birim yüzeye düşen enerji artar ve sıcaklık yükselir."),
      q("Gündüz ve gece süreleri", "kolay", "21 Haziran'da Güneş ışınları hangi paralele dik gelir?",
        ["Ekvator", "Oğlak Dönencesi", "Yengeç Dönencesi", "Kuzey Kutup Dairesi"], 2,
        "21 Haziran'da ışınlar Yengeç Dönencesi'ne dik gelir; Oğlak Dönencesi 21 Aralık'tır.",
        "21 Haziran: Güneş ışınları Yengeç Dönencesi'ne dik gelir."),
      q("Gündüz ve gece süreleri", "orta", "21 Haziran tarihinde Kuzey Yarım Küre'de aşağıdakilerden hangisi yaşanır?",
        ["En uzun gece", "Kış mevsiminin başlangıcı", "Gece ve gündüzün eşitlenmesi", "En uzun gündüz"], 3,
        "21 Haziran Kuzey Yarım Küre'de yazın başlangıcıdır ve yılın en uzun gündüzü yaşanır.",
        "Kuzey Yarım Küre'de yaz başlar ve en uzun gündüz yaşanır."),
      q("Gündüz ve gece süreleri", "orta", "Tüm dünyada gece ve gündüz sürelerinin eşit olduğu tarihler hangi seçenekte birlikte verilmiştir?",
        ["21 Mart ve 23 Eylül", "21 Haziran ve 21 Aralık", "21 Mart ve 21 Haziran", "23 Eylül ve 21 Aralık"], 0,
        "Bu iki tarihte ışınlar Ekvator'a dik gelir ve aydınlanma çizgisi kutuplardan geçer.",
        "21 Mart ve 23 Eylül: Işınlar Ekvator'a dik gelir. Tüm dünyada gece ve gündüz süreleri eşittir."),
      q("Mevsimlerin oluşumu", "zor", "Elif, \"Kışın havanın soğuk olmasının nedeni Dünya'nın Güneş'ten uzaklaşmasıdır.\" diyor. Elif'in ifadesi için aşağıdakilerden hangisi doğrudur?",
        ["Doğrudur, uzaklık arttıkça sıcaklık düşer", "Yanlıştır, Kuzey Yarım Küre kışı yaşarken Dünya Güneş'e daha yakındır", "Doğrudur ama yalnızca Güney Yarım Küre için geçerlidir", "Yanlıştır, kışın nedeni Ay'ın konumudur"], 1,
        "Uzaklık mevsimleri belirlemez; kışın Kuzey Yarım Küre'de ışınlar eğik geldiği için hava soğuktur.",
        "Kuzey Yarım Küre kışı yaşarken Dünya Güneş'e daha yakındır."),
      q("Gündüz ve gece süreleri", "zor", "21 Aralık'ta Kuzey Yarım Küre'de kış başlarken Güney Yarım Küre'de hangi mevsim başlar?",
        ["İlkbahar", "Sonbahar", "Yaz", "Kış"], 2,
        "Yarım küreler eksen eğikliği nedeniyle zıt mevsimleri yaşar; kuzeyde kış başlarken güneyde yaz başlar.",
        "Bu tarihte Güney Yarım Küre'de yaz başlar."),
      q("Hava durumu ve iklim", "kolay", "Kısa süreli ve dar bir alanda görülen atmosfer olaylarına ne ad verilir?",
        ["Hava durumu", "İklim", "Mevsim", "Klimatoloji"], 0,
        "Hava durumu kısa süreli ve dar alanlıdır; iklim ise uzun yılların ortalamasıdır.",
        "Hava durumu: kısa süreli ve dar bir alanda görülen atmosfer olaylarıdır (sıcaklık, nem, rüzgâr, yağış)."),
      q("Hava durumu ve iklim", "orta", "İklimi inceleyen bilim dalı ve bu alandaki uzman hangi seçenekte doğru eşleştirilmiştir?",
        ["Meteoroloji, meteorolog", "Klimatoloji, meteorolog", "Klimatoloji, klimatolog", "Meteoroloji, klimatolog"], 2,
        "İklimi klimatoloji, hava olaylarını meteoroloji inceler. Uzman adları da bilim dalına göre değişir.",
        "İklimi inceleyen bilim dalı klimatolojidir, uzmanına klimatolog denir."),
      q("Hava durumu ve iklim", "zor", "Aşağıdaki ifadelerden hangisi iklim ile ilgilidir?",
        ["Yarın Ankara'da kar yağışı bekleniyor", "Bu akşam rüzgâr kuzeyden esecek", "Hafta sonu sıcaklık 5 derece düşecek", "Akdeniz kıyılarında yazlar uzun yıllardır sıcak ve kurak geçer"], 3,
        "Uzun yılların ortalamasını anlatan ifade iklimdir; diğerleri kısa süreli hava durumu tahminleridir.",
        "İklim: geniş bir bölgede uzun yıllar boyunca gözlenen hava olaylarının ortalamasıdır."),
      q("Rüzgâr ve basınç", "orta", "Rüzgârın oluşumu ile ilgili aşağıdakilerden hangisi doğrudur?",
        ["Alçak basınçtan yüksek basınca doğru eser", "Yüksek basınçtan alçak basınca doğru eser", "Basınç farkıyla ilgisi yoktur", "Yalnızca deniz kıyılarında oluşur"], 1,
        "Hava, basıncın yüksek olduğu yerden alçak olduğu yere doğru hareket eder; bu harekete rüzgâr denir.",
        "Rüzgâr, yüksek basınç alanından alçak basınç alanına doğru hareket eden havadır."),
      q("Rüzgâr ve basınç", "zor", "Isınan hava için aşağıdakilerden hangisi doğrudur?",
        ["Genişler, yükselir ve alçak basınç oluşturur", "Soğur, çöker ve yüksek basınç oluşturur", "Yoğunluğu artar ve yere çöker", "Basıncı değişmez"], 0,
        "Isınan havanın yoğunluğu azalır, yükselir ve yerde alçak basınç alanı oluşur.",
        "Isınan hava genişler, yükselir ve alçak basınç oluşturur."),
    ],
  },
  {
    id: "tarih",
    etiket: "TYT Tarih · Osmanlı Kuruluş Dönemi",
    baslik: "Osmanlı Kuruluş Dönemi",
    ders: "Tarih",
    sinav: "tyt",
    anahtar: ["osmanlı", "osmanli", "osman bey", "orhan", "fetret", "kosova", "bizans", "beylik", "murat", "bayezid"],
    metin: `OSMANLI KURULUŞ DÖNEMİ (1299-1453) · TYT Tarih

Osmanlı Beyliği, Kayı boyuna mensup Osman Bey tarafından Söğüt ve Domaniç çevresinde kuruldu. Kuruluş tarihi olarak 1299 kabul edilir.
Beyliğin Bizans sınırında (uç bölgede) kurulması, gaza ve cihat anlayışıyla hızlı büyümesini sağladı.
Osman Bey 1302'de Koyunhisar (Bafeus) Savaşı'nı kazandı. Bu, Osmanlıların Bizans ile yaptığı ilk önemli savaştır.

Orhan Bey döneminde Bursa alındı (1326) ve başkent yapıldı. İlk düzenli ordu (yaya ve müsellem) kuruldu, ilk Osmanlı parası akçe bastırıldı. İlk medrese İznik'te açıldı.
Karesi Beyliği'nin alınmasıyla Osmanlılar donanma gücü kazandı ve Rumeli'ye geçiş kolaylaştı.
1353'te Çimpe Kalesi'nin alınmasıyla Osmanlılar Rumeli'ye geçti.

I. Murat döneminde Edirne alındı ve başkent yapıldı. Devşirme sistemi ve Yeniçeri Ocağı kuruldu.
Sırp Sındığı Savaşı (1364), Osmanlılar ile Haçlılar arasındaki ilk savaştır. I. Kosova Savaşı (1389) kazanıldı.
I. Bayezid (Yıldırım) döneminde İstanbul Osmanlılar tarafından ilk kez kuşatıldı ve Anadolu Hisarı (Güzelce Hisar) yaptırıldı. Niğbolu Savaşı (1396) kazanıldı.

1402 Ankara Savaşı'nda Timur'a yenilmesinin ardından Osmanlı Devleti'nde Fetret Devri (1402-1413) yaşandı. Bayezid'in oğulları arasındaki taht kavgası on bir yıl sürdü.
Çelebi Mehmet Fetret Devri'ni sona erdirdi ve devletin dağılmasını önledi; bu yüzden Osmanlı'nın ikinci kurucusu sayılır.
II. Murat döneminde Varna (1444) ve II. Kosova (1448) savaşları kazanıldı. II. Kosova Savaşı ile Haçlılar, Türkleri Balkanlardan atma düşüncesinden vazgeçti.`,
    sorular: [
      q("Kuruluş ve coğrafya", "kolay", "Osmanlı Beyliği'nin kuruluşu için kabul edilen tarih aşağıdakilerden hangisidir?",
        ["1071", "1243", "1299", "1326", "1402"], 2,
        "Kuruluş tarihi 1299 kabul edilir. 1326 Bursa'nın alınması, 1402 Ankara Savaşı'dır.",
        "Kuruluş tarihi olarak 1299 kabul edilir."),
      q("Kuruluş ve coğrafya", "orta", "Osmanlı Beyliği'nin kısa sürede büyümesinde aşağıdakilerden hangisi etkili olmuştur?",
        ["Bizans sınırında kurulup gaza anlayışıyla hareket etmesi", "Akdeniz ticaretini ele geçirmesi", "Moğollarla ittifak kurması", "Mısır'ı fethetmesi", "Haçlılarla kalıcı barış yapması"], 0,
        "Uç bölgede, Bizans sınırında kurulmak beyliğe genişleme alanı ve gaza motivasyonu sağladı.",
        "Beyliğin Bizans sınırında (uç bölgede) kurulması, gaza ve cihat anlayışıyla hızlı büyümesini sağladı."),
      q("Kuruluş ve coğrafya", "kolay", "Osmanlıların Bizans ile yaptığı ilk önemli savaş aşağıdakilerden hangisidir?",
        ["Sırp Sındığı", "Koyunhisar (Bafeus)", "Niğbolu", "Varna", "Ankara"], 1,
        "Koyunhisar (1302) Bizans'la ilk önemli savaştır. Sırp Sındığı ise Haçlılarla ilk savaştır, karıştırılır.",
        "Osman Bey 1302'de Koyunhisar (Bafeus) Savaşı'nı kazandı. Bu, Osmanlıların Bizans ile yaptığı ilk önemli savaştır."),
      q("Orhan Bey dönemi", "orta", "Aşağıdakilerden hangisi Orhan Bey döneminde gerçekleşmemiştir?",
        ["Bursa'nın alınması", "İlk düzenli ordunun kurulması", "İlk akçenin bastırılması", "Edirne'nin başkent yapılması", "İznik'te ilk medresenin açılması"], 3,
        "Edirne I. Murat döneminde alınıp başkent yapıldı. Diğerlerinin hepsi Orhan Bey dönemidir.",
        "I. Murat döneminde Edirne alındı ve başkent yapıldı."),
      q("Orhan Bey dönemi", "orta", "Karesi Beyliği'nin alınmasının Osmanlılara en önemli katkısı aşağıdakilerden hangisidir?",
        ["Donanma gücü kazanılması", "Doğu ticaret yollarının ele geçirilmesi", "İstanbul'un kuşatılması", "Yeniçeri Ocağı'nın kurulması", "Fetret Devri'nin sona ermesi"], 0,
        "Karesi denizci bir beylikti; alınmasıyla Osmanlılar donanma kazandı ve Rumeli'ye geçiş kolaylaştı.",
        "Karesi Beyliği'nin alınmasıyla Osmanlılar donanma gücü kazandı ve Rumeli'ye geçiş kolaylaştı."),
      q("Orhan Bey dönemi", "kolay", "Osmanlıların Rumeli'ye geçmesini sağlayan kale aşağıdakilerden hangisidir?",
        ["Anadolu Hisarı", "Rumeli Hisarı", "Koyunhisar", "Edirne", "Çimpe Kalesi"], 4,
        "1353'te Çimpe Kalesi'nin alınması Rumeli'ye geçişin ilk adımıdır.",
        "1353'te Çimpe Kalesi'nin alınmasıyla Osmanlılar Rumeli'ye geçti."),
      q("I. Murat ve Yıldırım", "orta", "Osmanlılar ile Haçlılar arasındaki ilk savaş aşağıdakilerden hangisidir?",
        ["I. Kosova", "Niğbolu", "Varna", "Sırp Sındığı", "II. Kosova"], 3,
        "Sırp Sındığı (1364) Haçlılarla yapılan ilk savaştır; Koyunhisar ile karıştırma.",
        "Sırp Sındığı Savaşı (1364), Osmanlılar ile Haçlılar arasındaki ilk savaştır."),
      q("I. Murat ve Yıldırım", "orta", "Devşirme sistemi ve Yeniçeri Ocağı hangi hükümdar döneminde kurulmuştur?",
        ["Osman Bey", "Orhan Bey", "I. Murat", "I. Bayezid", "Çelebi Mehmet"], 2,
        "Orhan Bey ilk düzenli orduyu (yaya ve müsellem) kurdu; Yeniçeri Ocağı I. Murat dönemindedir.",
        "Devşirme sistemi ve Yeniçeri Ocağı kuruldu."),
      q("I. Murat ve Yıldırım", "zor", "İstanbul'un Osmanlılar tarafından ilk kez kuşatılması ve Anadolu Hisarı'nın yaptırılması hangi hükümdar döneminde olmuştur?",
        ["Orhan Bey", "I. Bayezid", "I. Murat", "II. Murat", "Çelebi Mehmet"], 1,
        "Yıldırım Bayezid İstanbul'u ilk kez kuşattı ve Anadolu Hisarı'nı yaptırdı. Rumeli Hisarı ise Fatih dönemindedir.",
        "I. Bayezid (Yıldırım) döneminde İstanbul Osmanlılar tarafından ilk kez kuşatıldı ve Anadolu Hisarı (Güzelce Hisar) yaptırıldı."),
      q("Fetret Devri", "orta", "Osmanlı Devleti'nde Fetret Devri'ne yol açan gelişme aşağıdakilerden hangisidir?",
        ["Niğbolu Savaşı", "Varna Savaşı", "Bursa'nın alınması", "Koyunhisar Savaşı", "Ankara Savaşı'nda Timur'a yenilmek"], 4,
        "1402 Ankara yenilgisinden sonra Bayezid'in oğulları taht için on bir yıl mücadele etti.",
        "1402 Ankara Savaşı'nda Timur'a yenilmesinin ardından Osmanlı Devleti'nde Fetret Devri (1402-1413) yaşandı."),
      q("Fetret Devri", "zor", "Çelebi Mehmet'in Osmanlı'nın ikinci kurucusu sayılmasının nedeni aşağıdakilerden hangisidir?",
        ["İstanbul'u fethetmesi", "Fetret Devri'ni sona erdirip devletin dağılmasını önlemesi", "İlk akçeyi bastırması", "Yeniçeri Ocağı'nı kurması", "Rumeli'ye geçişi sağlaması"], 1,
        "Devleti taht kavgasından kurtarıp yeniden birleştirdiği için ikinci kurucu sayılır.",
        "Çelebi Mehmet Fetret Devri'ni sona erdirdi ve devletin dağılmasını önledi; bu yüzden Osmanlı'nın ikinci kurucusu sayılır."),
      q("II. Murat dönemi", "zor", "Haçlıların Türkleri Balkanlardan atma düşüncesinden vazgeçmesine yol açan savaş aşağıdakilerden hangisidir?",
        ["Varna", "Niğbolu", "I. Kosova", "II. Kosova", "Sırp Sındığı"], 3,
        "1448 II. Kosova zaferi Balkanlarda Türk varlığını kesinleştirdi. Varna (1444) da kazanıldı ama bu sonucu II. Kosova getirdi.",
        "II. Kosova Savaşı ile Haçlılar, Türkleri Balkanlardan atma düşüncesinden vazgeçti."),
    ],
  },
];

/** Demo modda kaynak metne göre hazır testi seçer; eşleşme yoksa sırayla döner. */
export function demoSec(metin: string, sira: number): DemoNot {
  const m = metin.toLocaleLowerCase("tr");
  const puan = DEMO_NOTLAR.map((n) => n.anahtar.filter((k) => m.includes(k)).length);
  const en = Math.max(...puan);
  if (en > 0) return DEMO_NOTLAR[puan.indexOf(en)];
  return DEMO_NOTLAR[Math.abs(sira) % DEMO_NOTLAR.length];
}

/** Hazır bankadan, istenen zorluğu öne alarak soru seçer (sıra notun akışına göre korunur). */
export function demoSorular(not: DemoNot, adet: number, zorluk: Zorluk): Soru[] {
  const hepsi = not.sorular.map((s, i) => ({ s, i }));
  const oncelik = (z: SoruZorluk) => (zorluk === "karisik" ? 0 : z === zorluk ? 0 : 1);
  const secilen = [...hepsi].sort((a, b) => oncelik(a.s.zorluk) - oncelik(b.s.zorluk) || a.i - b.i).slice(0, adet);
  return secilen.sort((a, b) => a.i - b.i).map(({ s }) => ({ ...s, id: uid("s") }));
}

export function demoTesti(not: DemoNot, adet: number, zorluk: Zorluk, kaynak: Test["kaynak"]): Test {
  return {
    id: uid("t"),
    baslik: not.baslik,
    ders: not.ders,
    sinav: not.sinav,
    zorluk,
    sorular: demoSorular(not, adet, zorluk),
    olusturma: Date.now(),
    kaynak,
    demo: true,
  };
}

/* ---------------- İlk açılış örnek verisi ---------------- */

export interface Durum { testler: Test[]; denemeler: Deneme[]; demoSira: number }

export function ornekDurum(): Durum {
  const gun = 86400000;
  const simdi = Date.now();
  const fenNot = DEMO_NOTLAR[0], tarihNot = DEMO_NOTLAR[1];
  const fen: Test = { ...demoTesti(fenNot, 10, "karisik", { tur: "foto", sayfa: 2, ozet: "Defter fotoğrafı, 2 sayfa" }), olusturma: simdi - 3 * gun, ornek: true, demo: true };
  const tarih: Test = { ...demoTesti(tarihNot, 10, "karisik", { tur: "metin", sayfa: 1, ozet: "Yapıştırılan metin" }), olusturma: simdi - gun, ornek: true, demo: true };
  // Gerçekçi bir öğrenci geçmişi: fen ilk deneme 7D 2Y 1B, tekrar turunda 2/3; tarih 6D 3Y 1B.
  const cevapla = (t: Test, plan: ("d" | "y" | "b")[]) => {
    const c: Record<string, number | null> = {};
    t.sorular.forEach((s, i) => {
      const p = plan[i] || "d";
      c[s.id] = p === "d" ? s.dogru : p === "b" ? null : (s.dogru + 1) % s.siklar.length;
    });
    return c;
  };
  const fenPlan: ("d" | "y" | "b")[] = ["d", "d", "d", "y", "d", "y", "b", "d", "d", "d"];
  const fenIlk: Deneme = { id: uid("d"), testId: fen.id, tarih: simdi - 3 * gun + 3600000, mod: "ilk", soruIds: fen.sorular.map((s) => s.id), cevaplar: cevapla(fen, fenPlan), sureSn: 812 };
  const hatali = fen.sorular.filter((_, i) => fenPlan[i] !== "d");
  const fenTekrar: Deneme = {
    ...tekrarDenemesi(fen, hatali.map((s) => s.id)),
    tarih: simdi - 2 * gun,
    cevaplar: Object.fromEntries(hatali.map((s, i) => [s.id, i < 2 ? s.dogru : (s.dogru + 1) % s.siklar.length])),
    sureSn: 205,
  };
  const tarihPlan: ("d" | "y" | "b")[] = ["d", "d", "y", "d", "d", "y", "d", "b", "y", "d"];
  const tarihIlk: Deneme = { id: uid("d"), testId: tarih.id, tarih: simdi - gun + 5400000, mod: "ilk", soruIds: tarih.sorular.map((s) => s.id), cevaplar: cevapla(tarih, tarihPlan), sureSn: 774 };
  return { testler: [tarih, fen], denemeler: [fenIlk, fenTekrar, tarihIlk], demoSira: 0 };
}
