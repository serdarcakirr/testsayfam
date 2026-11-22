import { NextResponse } from "next/server";
import { SINAVLAR, SORU_SEMASI, sistemTalimati, sorulariDogrula, demoSec, demoTesti, uid, type Ayarlar, type SinavTipi, type Zorluk, type Test } from "../../lib/motor";

export const maxDuration = 60;

/** Arayüz, "Demo mod" etiketini göstermek için anahtar olup olmadığını sorar (anahtarın kendisi asla dönmez). */
export async function GET() {
  return NextResponse.json({ demo: !process.env.ANTHROPIC_API_KEY });
}

type Gorsel = { media_type: string; data: string };
type Istek = { gorseller?: Gorsel[]; metin?: string; ayarlar?: Partial<Ayarlar>; demoSira?: number };

const SINAV_IDS: SinavTipi[] = ["lgs", "tyt", "ayt", "uni", "genel"];
const ZORLUK_IDS: Zorluk[] = ["kolay", "orta", "zor", "karisik"];
const IZINLI = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req: Request) {
  let body: Istek;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "İstek okunamadı." }, { status: 400 }); }

  const gorseller = (body.gorseller || []).filter((g) => g && IZINLI.includes(g.media_type) && typeof g.data === "string" && g.data.length > 100).slice(0, 8);
  const metin = (body.metin || "").slice(0, 30000).trim();
  const a: Ayarlar = {
    adet: ([5, 10, 20] as const).includes(body.ayarlar?.adet as 5) ? (body.ayarlar!.adet as Ayarlar["adet"]) : 10,
    zorluk: ZORLUK_IDS.includes(body.ayarlar?.zorluk as Zorluk) ? (body.ayarlar!.zorluk as Zorluk) : "karisik",
    sinav: SINAV_IDS.includes(body.ayarlar?.sinav as SinavTipi) ? (body.ayarlar!.sinav as SinavTipi) : "genel",
  };
  if (!gorseller.length && metin.length < 40) {
    return NextResponse.json({ error: "Kaynak çok kısa. En az bir fotoğraf ya da birkaç cümlelik not ekle." }, { status: 400 });
  }
  const kaynak: Test["kaynak"] = {
    tur: gorseller.length && metin ? "karma" : gorseller.length ? "foto" : "metin",
    sayfa: gorseller.length || 1,
    ozet: gorseller.length ? `${gorseller.length} sayfa fotoğraf${metin ? " + metin" : ""}` : `Yapıştırılan metin, ${metin.split(/\s+/).length} kelime`,
  };

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    // Anahtarsız demo: kaynağa göre hazır testlerden biri döner.
    const not = demoSec(metin, body.demoSira || 0);
    return NextResponse.json({ demo: true, test: demoTesti(not, a.adet, a.zorluk, kaynak), uyari: "" });
  }

  const content: unknown[] = gorseller.map((g) => ({ type: "image", source: { type: "base64", media_type: g.media_type, data: g.data } }));
  content.push({
    type: "text",
    text: `${metin ? `DERS NOTU (metin):\n"""\n${metin}\n"""\n\n` : ""}${gorseller.length ? `Yukarıdaki ${gorseller.length} fotoğraf ders notunun sayfalarıdır. El yazısını dikkatle oku.\n\n` : ""}Sınav tipi: ${SINAVLAR[a.sinav].ad}. Soru sayısı: ${a.adet}. Testi oluştur.`,
  });

  const istek = (yapisal: boolean) =>
    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5",
        max_tokens: a.adet === 20 ? 12000 : 7000,
        system: sistemTalimati(a) + (yapisal ? "" : "\nSADECE JSON dön, başka metin yazma. Şema: {baslik, ders, uyari, sorular:[{konu, soru, siklar:[...], dogru, aciklama, dayanak, zorluk}]}"),
        messages: [{ role: "user", content }],
        ...(yapisal ? { output_config: { format: { type: "json_schema", schema: SORU_SEMASI } } } : {}),
      }),
    });

  let r = await istek(true);
  // Yapısal çıktıyı desteklemeyen bir model/ağ geçidi seçildiyse düz JSON talimatıyla bir kez daha dene.
  if (r.status === 400) r = await istek(false);
  if (!r.ok) {
    const detay = await r.text().catch(() => "");
    console.error("claude hata", r.status, detay.slice(0, 300));
    const mesaj = r.status === 401 || r.status === 403 ? "Yapay zeka anahtarı geçersiz. ANTHROPIC_API_KEY değerini kontrol et." : `Yapay zeka servisi yanıt vermedi (${r.status}). Biraz sonra tekrar dene.`;
    return NextResponse.json({ error: mesaj }, { status: 502 });
  }
  const out = await r.json();
  if (out?.stop_reason === "refusal") return NextResponse.json({ error: "Bu kaynak için test üretilemedi." }, { status: 422 });
  const text: string = out?.content?.find((b: { type: string }) => b.type === "text")?.text || "{}";

  let ham: { baslik?: string; ders?: string; uyari?: string; sorular?: unknown };
  try {
    const temiz = text.replace(/```json|```/g, "").trim();
    ham = JSON.parse(temiz.slice(temiz.indexOf("{"), temiz.lastIndexOf("}") + 1));
  } catch {
    return NextResponse.json({ error: "Üretilen test okunamadı. Tekrar dene." }, { status: 502 });
  }
  const sorular = sorulariDogrula(ham.sorular, SINAVLAR[a.sinav].sik).slice(0, a.adet);
  if (!sorular.length) {
    return NextResponse.json({ error: ham.uyari || "Nottan soru çıkarılamadı. Fotoğraf daha net olabilir ya da metin daha uzun olmalı." }, { status: 422 });
  }
  const test: Test = {
    id: uid("t"),
    baslik: (ham.baslik || "Ders notu testi").slice(0, 80),
    ders: (ham.ders || "Genel").slice(0, 40),
    sinav: a.sinav,
    zorluk: a.zorluk,
    sorular,
    olusturma: Date.now(),
    kaynak,
    demo: false,
  };
  const eksik = sorular.length < a.adet ? `${a.adet} soru istendi, notun içeriği ${sorular.length} sağlam soruya yetti.` : "";
  return NextResponse.json({ demo: false, test, uyari: [ham.uyari, eksik].filter(Boolean).join(" ") });
}
