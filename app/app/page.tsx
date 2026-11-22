"use client";

import Logo from "../_parcalar/Logo";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEMO_NOTLAR, HARF, SINAVLAR, ZORLUKLAR, degerlendir, kitapcik, konuIstatistik, netYaz, ornekDurum, sureYaz, tekrarDenemesi, uid,
  type Ayarlar, type Deneme, type Durum, type SinavTipi, type Test,
} from "../lib/motor";

const ANAHTAR = "testsayfam:v1";
type Gorunum = "masa" | "olustur" | "coz" | "sonuc" | "kagit";
type Gorsel = { id: string; url: string; media_type: string; data: string };

function yukle(): Durum {
  try {
    const raw = localStorage.getItem(ANAHTAR);
    if (raw) return JSON.parse(raw) as Durum;
  } catch {}
  return ornekDurum();
}

/** Fotoğrafı tarayıcıda küçültür (uzun kenar 1400px, JPEG): hızlı yükleme, düşük maliyet. */
function kucult(file: File): Promise<Gorsel> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const src = URL.createObjectURL(file);
    img.onload = () => {
      const max = 1400;
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      const url = c.toDataURL("image/jpeg", 0.8);
      URL.revokeObjectURL(src);
      resolve({ id: uid("g"), url, media_type: "image/jpeg", data: url.split(",")[1] });
    };
    img.onerror = () => { URL.revokeObjectURL(src); reject(new Error("okunamadı")); };
    img.src = src;
  });
}

const tarihYaz = (t: number) => new Date(t).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });

export default function Uygulama() {
  const [durum, setDurum] = useState<Durum | null>(null);
  const [gorunum, setGorunum] = useState<Gorunum>("masa");
  const [testId, setTestId] = useState<string | null>(null);
  const [deneme, setDeneme] = useState<Deneme | null>(null);
  const [sonucId, setSonucId] = useState<string | null>(null);
  const [demoMod, setDemoMod] = useState<boolean | null>(null);

  useEffect(() => {
    setDurum(yukle());
    fetch("/api/test-uret").then((r) => r.json()).then((j) => setDemoMod(!!j.demo)).catch(() => setDemoMod(true));
  }, []);

  const kaydet = useCallback((f: (d: Durum) => Durum) => {
    setDurum((onceki) => {
      if (!onceki) return onceki;
      const yeni = f(onceki);
      try { localStorage.setItem(ANAHTAR, JSON.stringify(yeni)); } catch {}
      return yeni;
    });
  }, []);

  const test = durum?.testler.find((t) => t.id === testId) || null;
  const git = (g: Gorunum) => { setGorunum(g); window.scrollTo({ top: 0 }); };

  const testiBaslat = (t: Test) => {
    setTestId(t.id);
    setDeneme({ id: uid("d"), testId: t.id, tarih: Date.now(), mod: "ilk", soruIds: t.sorular.map((s) => s.id), cevaplar: {}, sureSn: 0 });
    git("coz");
  };
  const tekrarBaslat = (t: Test, ids: string[]) => {
    setTestId(t.id);
    setDeneme(tekrarDenemesi(t, ids));
    git("coz");
  };
  const bitir = (d: Deneme) => {
    kaydet((x) => ({ ...x, denemeler: [...x.denemeler, { ...d, tarih: Date.now() }] }));
    setSonucId(d.id);
    setDeneme(null);
    git("sonuc");
  };

  if (!durum) return <main className="min-h-screen" />;

  return (
    <main className="min-h-screen pb-20">
      <header className="no-print sticky top-0 z-30 border-b-2 border-[var(--ink)] bg-[var(--paper)]">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2.5 sm:gap-3 md:px-6">
          <Logo kucuk />
          {demoMod && <span className="chip chip-accent !px-2 text-[11.5px] sm:!px-2.5 sm:text-[12.5px]">Demo</span>}
          <nav className="seg ml-auto !flex-nowrap [&>button]:px-3 sm:[&>button]:px-[14px]">
            <button onClick={() => git("masa")} className={gorunum === "masa" ? "on" : ""}>Testlerim</button>
            <button onClick={() => git("olustur")} className={gorunum === "olustur" ? "on" : ""}>Yeni test</button>
          </nav>
          <button onClick={() => git("olustur")} className="btn btn-sm hidden md:inline-flex">+ Sayfa ekle</button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pt-8 md:px-6 md:pt-12">
        {gorunum === "masa" && (
          <Masa durum={durum} onYeni={() => git("olustur")} onCoz={testiBaslat}
            onKagit={(t) => { setTestId(t.id); git("kagit"); }}
            onSonuc={(t, d) => { setTestId(t.id); setSonucId(d.id); git("sonuc"); }}
            onSil={(id) => kaydet((x) => ({ ...x, testler: x.testler.filter((t) => t.id !== id), denemeler: x.denemeler.filter((d) => d.testId !== id) }))}
            onOrnekTemizle={() => kaydet((x) => {
              const ornekIds = new Set(x.testler.filter((t) => t.ornek).map((t) => t.id));
              return { ...x, testler: x.testler.filter((t) => !t.ornek), denemeler: x.denemeler.filter((d) => !ornekIds.has(d.testId)) };
            })}
          />
        )}
        {gorunum === "olustur" && (
          <Olustur demoMod={!!demoMod} demoSira={durum.demoSira}
            onHazir={(t, demo) => {
              kaydet((x) => ({ ...x, testler: [t, ...x.testler], demoSira: x.demoSira + 1 }));
              if (demo) setDemoMod(true);
              testiBaslat(t);
            }}
          />
        )}
        {gorunum === "coz" && test && deneme && <Coz key={deneme.id} test={test} deneme={deneme} onBitir={bitir} onVazgec={() => git("masa")} />}
        {gorunum === "sonuc" && test && (() => {
          const d = durum.denemeler.find((x) => x.id === sonucId);
          return d ? <Sonuc test={test} deneme={d} onTekrar={(ids) => tekrarBaslat(test, ids)} onBastan={() => testiBaslat(test)} onMasa={() => git("masa")} onKagit={() => git("kagit")} /> : null;
        })()}
        {gorunum === "kagit" && test && <Kagit test={test} onGeri={() => git("masa")} />}
      </div>
    </main>
  );
}

/* ================= MASA: kütüphane + konu başına başarı ================= */

function Masa({ durum, onYeni, onCoz, onKagit, onSonuc, onSil, onOrnekTemizle }: {
  durum: Durum; onYeni: () => void; onCoz: (t: Test) => void; onKagit: (t: Test) => void;
  onSonuc: (t: Test, d: Deneme) => void; onSil: (id: string) => void; onOrnekTemizle: () => void;
}) {
  const konular = useMemo(() => konuIstatistik(durum.testler, durum.denemeler), [durum]);
  const toplamSoru = durum.denemeler.reduce((a, d) => a + d.soruIds.length, 0);
  const dogru = konular.reduce((a, k) => a + k.dogru, 0);
  const toplam = konular.reduce((a, k) => a + k.toplam, 0);
  const ornekVar = durum.testler.some((t) => t.ornek);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="tag">Testlerim</div>
          <h1 className="font-display mt-2 text-[34px] leading-[1.1] md:text-[46px]">Sayfaların, <em>netlerin</em></h1>
        </div>
        <button onClick={onYeni} className="btn">+ Yeni sayfa, yeni test</button>
      </div>

      <div className="mt-7 grid grid-cols-3 gap-3 md:gap-4">
        {[
          { k: "Test", v: String(durum.testler.length), bg: "var(--paper)" },
          { k: "Çözülen soru", v: String(toplamSoru), bg: "var(--accent)" },
          { k: "Ortalama başarı", v: toplam ? `%${Math.round((dogru / toplam) * 100)}` : "-", bg: "var(--primary-soft)" },
        ].map((x) => (
          <div key={x.k} className="flex min-h-[112px] flex-col justify-between rounded-2xl border-2 border-[var(--ink)] p-3.5 shadow-[var(--shadow-sm)] md:min-h-[140px] md:p-5" style={{ background: x.bg }}>
            <div className="font-light-num text-[34px] leading-none md:text-[56px]">{x.v}</div>
            <div className="mt-2 w-fit text-[12px] font-semibold md:text-[14px]">{x.k}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <section className="min-w-0">
          <h2 className="font-display text-[24px]">Test kütüphanem</h2>
          {durum.testler.length === 0 && (
            <div className="card mt-3 p-6 text-[var(--muted)]">Burası şimdilik boş. Bir defter sayfası ekle, ilk testin birkaç saniyede hazır.</div>
          )}
          <ul className="mt-3 space-y-3">
            {durum.testler.map((t) => {
              const ds = durum.denemeler.filter((d) => d.testId === t.id).sort((a, b) => b.tarih - a.tarih);
              const ilk = ds.find((d) => d.mod === "ilk");
              const e = ilk ? degerlendir(t, ilk) : null;
              return (
                <li key={t.id} className="card p-4 md:p-5">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[var(--muted)]">
                        <span className="chip">{SINAVLAR[t.sinav].kisa}</span>
                        <span>{t.ders}</span><span aria-hidden>·</span><span>{t.sorular.length} soru</span><span aria-hidden>·</span><span>{tarihYaz(t.olusturma)}</span>
                        {t.ornek && <span className="chip chip-accent">örnek</span>}
                      </div>
                      <div className="font-display mt-2 truncate text-[22px]">{t.baslik}</div>
                      <div className="mt-0.5 text-sm text-[var(--muted)]">{t.kaynak.ozet}</div>
                    </div>
                    {e && (
                      <button onClick={() => onSonuc(t, ilk!)} className="shrink-0 text-right" title="Sonucu aç">
                        <div className="font-light-num text-[40px] leading-none">{netYaz(e.net)}</div>
                        <div className="mt-1 text-[12px] font-medium text-[var(--muted)]">net</div>
                      </button>
                    )}
                  </div>
                  {e && (
                    <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-[var(--sand)]" aria-label={`${e.dogru} doğru, ${e.yanlis} yanlış, ${e.bos} boş`}>
                      <span style={{ width: `${(e.dogru / e.toplam) * 100}%`, background: "var(--ok)" }} />
                      <span style={{ width: `${(e.yanlis / e.toplam) * 100}%`, background: "var(--bad)" }} />
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button onClick={() => onCoz(t)} className="btn btn-sm">{ilk ? "Yeniden çöz" : "Çöz"}</button>
                    <button onClick={() => onKagit(t)} className="btn btn-ghost btn-sm">Sınav kağıdı</button>
                    <span className="ml-auto text-xs text-[var(--muted)]">{ds.length ? `${ds.length} deneme` : "çözülmedi"}</span>
                    <button onClick={() => { if (confirm("Bu test ve denemeleri silinsin mi?")) onSil(t.id); }} className="text-xs font-medium text-[var(--muted)] underline-offset-2 hover:underline">Sil</button>
                  </div>
                </li>
              );
            })}
          </ul>
          {ornekVar && (
            <button onClick={onOrnekTemizle} className="mt-3 text-sm font-medium text-[var(--muted)] underline underline-offset-2">Örnek testleri kaldır</button>
          )}

          {durum.denemeler.length > 0 && (
            <>
              <h2 className="font-display mt-10 text-[24px]">Son çözdüklerim</h2>
              <ul className="card mt-3 divide-y divide-[var(--line)] overflow-hidden">
                {[...durum.denemeler].sort((a, b) => b.tarih - a.tarih).slice(0, 6).map((d) => {
                  const t = durum.testler.find((x) => x.id === d.testId);
                  if (!t) return null;
                  const e = degerlendir(t, d);
                  return (
                    <li key={d.id}>
                      <button onClick={() => onSonuc(t, d)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[var(--bg)]">
                        <span className="font-mono w-14 shrink-0 text-xs text-[var(--muted)]">{tarihYaz(d.tarih)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{t.baslik}</span>
                          <span className="block text-xs text-[var(--muted)]">{d.mod === "tekrar" ? "Tekrar turu" : "İlk çözüm"} · {sureYaz(d.sureSn)}</span>
                        </span>
                        <span className="font-mono shrink-0 text-xs">
                          <span className="text-[var(--ok)]">{e.dogru}D</span> <span className="text-[var(--bad)]">{e.yanlis}Y</span> <span className="text-[var(--muted)]">{e.bos}B</span>
                        </span>
                        <span className="font-mono w-12 shrink-0 text-right font-semibold">{netYaz(e.net)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>

        <section className="card h-fit min-w-0 p-5 md:p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-[24px]">Konu karnem</h2>
            <span className="text-xs text-[var(--muted)]">tüm denemeler</span>
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">Zayıf konuların en üstte. Kesikli çizginin (%50) solunda kalanlar tekrar listende.</p>
          {konular.length === 0 ? (
            <p className="mt-6 text-sm text-[var(--muted)]">İlk testini çözdüğünde konu konu başarın burada görünür.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {konular.map((k) => (
                <li key={k.ders + k.konu}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate"><b>{k.konu}</b> <span className="text-[var(--muted)]">· {k.ders}</span></span>
                    <span className="font-mono shrink-0 text-[13px]">%{k.yuzde} <span className="text-[var(--muted)]">({k.dogru}/{k.toplam})</span></span>
                  </div>
                  <svg className="mt-1.5 block w-full" height="12" viewBox="0 0 100 12" preserveAspectRatio="none" role="img" aria-label={`${k.konu} yüzde ${k.yuzde}`}>
                    <rect x="0" y="2" width="100" height="8" rx="4" fill="var(--sand)" />
                    <rect x="0" y="2" width={Math.max(k.yuzde, 1.5)} height="8" rx="4" fill={k.yuzde < 50 ? "var(--bad)" : "var(--ink)"} />
                    <line x1="50" y1="0" x2="50" y2="12" stroke="var(--ink)" strokeDasharray="2 2" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                  </svg>
                </li>
              ))}
            </ul>
          )}
          {konular.some((k) => k.yuzde < 50) && (
            <div className="mt-5 rounded-xl border-2 border-[var(--ink)] bg-[var(--accent)] px-4 py-3 text-sm">
              <b>Bu hafta tekrar et:</b> {konular.filter((k) => k.yuzde < 50).map((k) => k.konu).join(", ")}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* ================= OLUŞTUR: kaynak + ayarlar ================= */

function Olustur({ demoMod, demoSira, onHazir }: { demoMod: boolean; demoSira: number; onHazir: (t: Test, demo: boolean) => void }) {
  const [sekme, setSekme] = useState<"foto" | "metin">("foto");
  const [gorseller, setGorseller] = useState<Gorsel[]>([]);
  const [metin, setMetin] = useState("");
  const [ayar, setAyar] = useState<Ayarlar>({ adet: 10, zorluk: "karisik", sinav: "lgs" });
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState("");
  const dosyaRef = useRef<HTMLInputElement>(null);

  const ekle = async (files: FileList | null) => {
    if (!files) return;
    setHata("");
    const yeni: Gorsel[] = [];
    for (const f of Array.from(files).slice(0, 8 - gorseller.length)) {
      if (!f.type.startsWith("image/")) continue;
      try { yeni.push(await kucult(f)); } catch { setHata("Bir fotoğraf okunamadı. JPG veya PNG dene."); }
    }
    setGorseller((g) => [...g, ...yeni].slice(0, 8));
  };

  const hazirKaynak = gorseller.length > 0 || metin.trim().length >= 40;

  const olustur = async () => {
    setYukleniyor(true);
    setHata("");
    try {
      const r = await fetch("/api/test-uret", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ gorseller: gorseller.map((g) => ({ media_type: g.media_type, data: g.data })), metin, ayarlar: ayar, demoSira }),
      });
      const j = await r.json();
      if (!r.ok || !j.test) throw new Error(j.error || "Test oluşturulamadı.");
      if (j.uyari) alert(j.uyari);
      onHazir(j.test as Test, !!j.demo);
    } catch (e) {
      setHata(e instanceof Error ? e.message : "Test oluşturulamadı.");
      setYukleniyor(false);
    }
  };

  return (
    <div>
      <div className="tag">Yeni test</div>
      <h1 className="font-display mt-2 text-[34px] leading-[1.1] md:text-[46px]">Sayfanı ekle, <em>testin</em> hazırlansın</h1>
      {demoMod && (
        <p className="mt-4 max-w-2xl rounded-xl border-[1.5px] border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-sm text-[var(--muted)]">
          <b className="text-[var(--ink)]">Demo:</b> API anahtarı tanımlı olmadığı için yüklediğin sayfa yerine hazır örnek testlerden biri (fen ya da tarih) gelir. Gerçek test için <span className="font-mono">.env.local</span> dosyasına <span className="font-mono">ANTHROPIC_API_KEY</span> ekle.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="card p-4 md:p-6">
          <div className="seg">
            <button className={sekme === "foto" ? "on" : ""} onClick={() => setSekme("foto")}>📷 Fotoğraf</button>
            <button className={sekme === "metin" ? "on" : ""} onClick={() => setSekme("metin")}>📝 Metin yapıştır</button>
          </div>

          {sekme === "foto" ? (
            <div className="mt-4">
              <button
                onClick={() => dosyaRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); ekle(e.dataTransfer.files); }}
                className="flex min-h-52 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--faint)] bg-[var(--sand)] px-4 py-6 text-center transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]"
              >
                <span aria-hidden className="text-[34px]">📸</span>
                <span className="font-display text-[21px]">Sayfanın <em>fotoğrafını çek</em> ya da galeriden seç</span>
                <span className="text-sm text-[var(--muted)]">8 sayfaya kadar ekleyebilirsin. Düz ve aydınlık çekilmiş fotoğraf en iyi sonucu verir.</span>
              </button>
              <input ref={dosyaRef} type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={(e) => { ekle(e.target.files); e.target.value = ""; }} />
              {gorseller.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-3">
                  {gorseller.map((g, i) => (
                    <li key={g.id} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={g.url} alt={`Sayfa ${i + 1}`} className="h-28 w-20 rounded-xl border border-[var(--line)] object-cover" />
                      <span className="font-mono absolute left-1 top-1 rounded-full bg-[var(--ink)] px-1.5 text-[10px] text-[var(--bg)]">{i + 1}</span>
                      <button onClick={() => setGorseller((x) => x.filter((y) => y.id !== g.id))} aria-label={`Sayfa ${i + 1} kaldır`} className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full border border-[var(--ink)] bg-[var(--paper)] text-xs font-bold">×</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="mt-4">
              <textarea value={metin} onChange={(e) => setMetin(e.target.value)} rows={12} placeholder="Ders notunu, konu özetini ya da kitaptan bir bölümü buraya yapıştır..." className="field lined !leading-7" />
              <div className="mt-1 text-right text-xs text-[var(--muted)]">{metin.trim() ? metin.trim().split(/\s+/).length : 0} kelime</div>
            </div>
          )}

          <div className="mt-4 border-t border-[var(--line)] pt-4">
            <div className="tag">Elinde not yok mu? Örnekle dene</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {DEMO_NOTLAR.map((n) => (
                <button key={n.id} onClick={() => { setSekme("metin"); setMetin(n.metin); setAyar((a) => ({ ...a, sinav: n.sinav })); }} className="btn btn-ghost btn-sm">{n.etiket}</button>
              ))}
            </div>
          </div>
        </section>

        <section className="card h-fit p-4 md:p-6">
          <h2 className="font-display text-[24px]">Test ayarları</h2>
          <div className="mt-4">
            <div className="text-sm font-medium">Soru sayısı</div>
            <div className="seg mt-2">
              {([5, 10, 20] as const).map((n) => <button key={n} className={ayar.adet === n ? "on" : ""} onClick={() => setAyar({ ...ayar, adet: n })}><span className="font-mono">{n}</span></button>)}
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm font-medium">Zorluk</div>
            <div className="seg mt-2">
              {ZORLUKLAR.map((z) => <button key={z.id} className={ayar.zorluk === z.id ? "on" : ""} onClick={() => setAyar({ ...ayar, zorluk: z.id })}>{z.ad}</button>)}
            </div>
          </div>
          <fieldset className="mt-4">
            <legend className="text-sm font-medium">Sınav tipi</legend>
            <div className="mt-2 space-y-2">
              {(Object.keys(SINAVLAR) as SinavTipi[]).map((id) => (
                <label key={id} className={`flex cursor-pointer items-center gap-3 rounded-xl border-[1.5px] px-3 py-2.5 ${ayar.sinav === id ? "border-[var(--primary)] bg-[var(--primary-soft)]" : "border-[var(--line)] bg-[var(--paper)]"}`}>
                  <input type="radio" name="sinav" className="sr-only" checked={ayar.sinav === id} onChange={() => setAyar({ ...ayar, sinav: id })} />
                  <span aria-hidden className={`bubble sm ${ayar.sinav === id ? "on" : ""}`}>{ayar.sinav === id ? "●" : ""}</span>
                  <span className="min-w-0">
                    <span className="block font-medium">{SINAVLAR[id].ad}</span>
                    <span className="block text-xs text-[var(--muted)]">{SINAVLAR[id].not}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {hata && <p role="alert" className="mt-4 rounded-2xl bg-[var(--bad-soft)] px-3 py-2 text-sm font-medium text-[var(--bad)]">{hata}</p>}
          <button onClick={olustur} disabled={!hazirKaynak || yukleniyor} className="btn mt-5 w-full">
            {yukleniyor ? "Sayfan okunuyor..." : `${ayar.adet} soruluk testimi hazırla`}
          </button>
          {!hazirKaynak && <p className="mt-2 text-center text-xs text-[var(--muted)]">Önce bir sayfa fotoğrafı ya da birkaç cümlelik not ekle.</p>}
          {yukleniyor && <p className="mt-2 text-center text-xs text-[var(--muted)]">Sorular hazırlanıyor, her biri notundaki bir cümleye bağlanıyor. Bu 10-20 saniye sürebilir.</p>}
        </section>
      </div>
    </div>
  );
}

/* ================= ÇÖZ: tek tek soru, süre, ilerleme ================= */

function Coz({ test, deneme, onBitir, onVazgec }: { test: Test; deneme: Deneme; onBitir: (d: Deneme) => void; onVazgec: () => void }) {
  const [i, setI] = useState(0);
  const [cevaplar, setCevaplar] = useState<Record<string, number | null>>({});
  const [sn, setSn] = useState(0);
  const ids = deneme.soruIds;
  const soru = test.sorular.find((s) => s.id === ids[i])!;
  const sira = deneme.sira?.[soru.id] || soru.siklar.map((_, k) => k);
  const onerilen = Math.round(ids.length * SINAVLAR[test.sinav].dkSoru * 60);
  const cevapli = ids.filter((id) => cevaplar[id] !== undefined && cevaplar[id] !== null).length;

  useEffect(() => {
    const t = setInterval(() => setSn((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const sec = useCallback((orijinal: number) => {
    setCevaplar((c) => ({ ...c, [ids[i]]: c[ids[i]] === orijinal ? null : orijinal }));
  }, [ids, i]);

  const bitir = useCallback(() => {
    const bos = ids.length - ids.filter((id) => cevaplar[id] !== undefined && cevaplar[id] !== null).length;
    if (bos > 0 && !confirm(`${bos} soru boş. Yine de bitirilsin mi?`)) return;
    const tam: Record<string, number | null> = {};
    ids.forEach((id) => { tam[id] = cevaplar[id] ?? null; });
    onBitir({ ...deneme, cevaplar: tam, sureSn: sn });
  }, [ids, cevaplar, deneme, sn, onBitir]);

  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const k = e.key.toUpperCase();
      const h = HARF.indexOf(k);
      if (h >= 0 && h < sira.length) sec(sira[h]);
      else if (e.key === "ArrowRight") setI((x) => Math.min(ids.length - 1, x + 1));
      else if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [sira, sec, ids.length]);

  const secili = cevaplar[soru.id];
  const asim = sn > onerilen;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <section className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="chip">{SINAVLAR[test.sinav].kisa}</span>
          <span className="font-display text-[18px]">{test.baslik}</span>
          {deneme.mod === "tekrar" && <span className="chip chip-accent">Tekrar turu · şıkların yeri değişti</span>}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--sand)]">
            <div className="h-full bg-[var(--primary)] transition-all" style={{ width: `${(cevapli / ids.length) * 100}%` }} />
          </div>
          <span className="font-mono text-sm">{cevapli}/{ids.length}</span>
          <span className={`font-mono rounded-full px-2.5 py-0.5 text-sm ${asim ? "bg-[var(--bad-soft)] text-[var(--bad)]" : "bg-[var(--sand)]"}`} title={`Önerilen süre ${sureYaz(onerilen)}`}>
            {sureYaz(sn)}
          </span>
        </div>

        <article className="card card-lift mt-4 p-5 md:p-8">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-sm">Soru {i + 1} / {ids.length}</span>
            <span className="chip">{soru.konu}</span>
          </div>
          <h2 className="font-display mt-4 text-[21px] font-semibold leading-snug md:text-[25px]">{soru.soru}</h2>
          <div className="mt-5 space-y-2.5" role="radiogroup" aria-label="Şıklar">
            {sira.map((orj, k) => (
              <button key={k} role="radio" aria-checked={secili === orj} onClick={() => sec(orj)} className={`opt ${secili === orj ? "on" : ""}`}>
                <span className={`bubble ${secili === orj ? "on" : ""}`}>{HARF[k]}</span>
                <span className="pt-1 leading-snug">{soru.siklar[orj]}</span>
              </button>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <button onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0} className="btn btn-ghost btn-sm">← Önceki</button>
            <button onClick={() => { setCevaplar((c) => ({ ...c, [soru.id]: null })); setI((x) => Math.min(ids.length - 1, x + 1)); }} className="btn btn-ghost btn-sm">Boş bırak</button>
            {i < ids.length - 1 ? (
              <button onClick={() => setI((x) => x + 1)} className="btn btn-sm ml-auto">Sonraki →</button>
            ) : (
              <button onClick={bitir} className="btn btn-dark btn-sm ml-auto">Testi bitir</button>
            )}
          </div>
          <p className="mt-4 hidden text-xs text-[var(--muted)] md:block">Klavye: {HARF.slice(0, sira.length).join(" / ")} şık seçer, ok tuşları soru değiştirir. Seçili şıkka tekrar basınca boşa döner.</p>
        </article>
      </section>

      <aside className="card h-fit p-4 md:p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-[19px]">Optik form</h3>
          <span className="font-mono text-xs text-[var(--muted)]">önerilen {sureYaz(onerilen)}</span>
        </div>
        <ol className="mt-3 grid grid-cols-5 gap-2 lg:grid-cols-4">
          {ids.map((id, k) => {
            const c = cevaplar[id];
            const s = test.sorular.find((x) => x.id === id)!;
            const goster = c === null || c === undefined ? "" : HARF[(deneme.sira?.[id] || s.siklar.map((_, n) => n)).indexOf(c)];
            return (
              <li key={id}>
                <button onClick={() => setI(k)} className={`flex w-full items-center gap-1.5 rounded-lg border-[1.5px] px-1.5 py-1 ${k === i ? "border-[var(--primary)] bg-[var(--primary-soft)]" : "border-[var(--line)]"}`} aria-label={`Soru ${k + 1}`}>
                  <span className="font-mono w-5 text-right text-xs">{k + 1}</span>
                  <span className={`bubble sm ${goster ? "on" : ""}`}>{goster}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <button onClick={bitir} className="btn btn-dark mt-4 w-full">Testi bitir</button>
        <button onClick={() => { if (confirm("Bu çözüm kaydedilmeden çıkılsın mı?")) onVazgec(); }} className="mt-3 w-full text-center text-sm font-medium text-[var(--muted)] underline underline-offset-2">Vazgeç</button>
      </aside>
    </div>
  );
}

/* ================= SONUÇ: net, D/Y/B, açıklamalar ================= */

function Sonuc({ test, deneme, onTekrar, onBastan, onMasa, onKagit }: {
  test: Test; deneme: Deneme; onTekrar: (ids: string[]) => void; onBastan: () => void; onMasa: () => void; onKagit: () => void;
}) {
  const e = degerlendir(test, deneme);
  const [hepsi, setHepsi] = useState(false);
  const liste = deneme.soruIds.filter((id) => hepsi || e.hatalilar.includes(id));
  const ceza = SINAVLAR[test.sinav].ceza;

  return (
    <div>
      <div className="tag">{deneme.mod === "tekrar" ? "Tekrar turu sonucu" : "Sonucun"}</div>
      <h1 className="font-display mt-2 text-[34px] leading-[1.1] md:text-[46px]">{test.baslik}</h1>

      <div className="mt-6 grid gap-4 md:grid-cols-[auto_1fr]">
        <div className="flex items-center gap-6 rounded-2xl border-2 border-[var(--ink)] bg-[var(--accent)] px-6 py-6 shadow-[var(--shadow)]">
          <div>
            <div className="font-light-num text-[76px] leading-none">{netYaz(e.net)}</div>
            <div className="mt-2 text-[13px] font-medium">net · {SINAVLAR[test.sinav].kisa}</div>
          </div>
          <div className="text-sm">
            <div>%{e.yuzde} başarı</div>
            <div>{sureYaz(deneme.sureSn)} sürede</div>
            <div className="text-xs">{ceza ? `${ceza} yanlış 1 doğruyu götürür` : "yanlış doğruyu götürmez"}</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { k: "Doğru", v: e.dogru, c: "var(--ok)", bg: "var(--ok-soft)" },
            { k: "Yanlış", v: e.yanlis, c: "var(--bad)", bg: "var(--bad-soft)" },
            { k: "Boş", v: e.bos, c: "var(--muted)", bg: "var(--paper)" },
          ].map((x) => (
            <div key={x.k} className="flex flex-col justify-between rounded-2xl border-[1.5px] border-[var(--line)] px-4 py-4" style={{ background: x.bg }}>
              <div className="font-light-num text-[48px] leading-none" style={{ color: x.c }}>{x.v}</div>
              <div className="mt-2 text-sm font-medium" style={{ color: x.c }}>{x.k}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="no-print mt-5 flex flex-wrap gap-2">
        {e.hatalilar.length > 0 ? (
          <button onClick={() => onTekrar(e.hatalilar)} className="btn">Yanlışlarımı tekrar et ({e.hatalilar.length})</button>
        ) : (
          <span className="rounded-xl bg-[var(--ok-soft)] px-4 py-2.5 font-medium text-[var(--ok)]">Hepsi doğru. Bu sayfa tamam! 🎉</span>
        )}
        <button onClick={onBastan} className="btn btn-ghost">Testi baştan çöz</button>
        <button onClick={onKagit} className="btn btn-ghost">Sınav kağıdı</button>
        <button onClick={onMasa} className="btn btn-ghost">Testlerime dön</button>
      </div>

      <div className="mt-8 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-[26px]">{hepsi ? "Bütün sorular" : "Yanlış ve boş bıraktıkların"}</h2>
        <button onClick={() => setHepsi(!hepsi)} className="text-sm font-medium underline underline-offset-2">{hepsi ? "Sadece hatalıları göster" : "Hepsini göster"}</button>
      </div>
      {liste.length === 0 && <p className="mt-3 text-[var(--muted)]">Hatalı soru yok, tebrikler.</p>}
      <ol className="mt-3 space-y-3">
        {liste.map((id) => {
          const s = test.sorular.find((x) => x.id === id)!;
          const c = deneme.cevaplar[id];
          const durum = c === null || c === undefined ? "bos" : c === s.dogru ? "dogru" : "yanlis";
          const no = deneme.soruIds.indexOf(id) + 1;
          return (
            <li key={id} className="card p-4 md:p-5">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                <span className="font-mono">Soru {no}</span>
                <span className="rounded-full px-2.5 py-0.5" style={{ background: durum === "dogru" ? "var(--ok-soft)" : durum === "yanlis" ? "var(--bad-soft)" : "var(--rule)", color: durum === "dogru" ? "var(--ok)" : durum === "yanlis" ? "var(--bad)" : "var(--muted)" }}>
                  {durum === "dogru" ? "Doğru" : durum === "yanlis" ? "Yanlış" : "Boş"}
                </span>
                <span className="text-[var(--muted)]">{s.konu}</span>
              </div>
              <p className="font-display mt-2 text-[19px] font-semibold leading-snug">{s.soru}</p>
              <ul className="mt-3 space-y-1.5">
                {s.siklar.map((sik, k) => {
                  const dogruMu = k === s.dogru, benim = k === c;
                  if (!dogruMu && !benim) return null;
                  return (
                    <li key={k} className="flex items-start gap-2.5 text-[15px]">
                      <span className={`bubble sm ${dogruMu ? "ok" : "bad"}`}>{HARF[k]}</span>
                      <span className="pt-0.5"><b className="font-medium">{dogruMu ? "Doğru cevap:" : "Senin cevabın:"}</b> {sik}</span>
                    </li>
                  );
                })}
              </ul>
              {s.aciklama && <p className="mt-3 text-[15px] leading-relaxed">{s.aciklama}</p>}
              {s.dayanak && (
                <blockquote className="mt-3 rounded-xl border-l-4 border-[var(--accent)] bg-[var(--sand)] px-4 py-2.5 text-[15px] leading-relaxed">
                  <span className="mr-1 text-[13px] font-bold">📌 Notunda geçen cümle:</span>
                  <span className="mark">{s.dayanak}</span>
                </blockquote>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ================= KAĞIT: öğretmen modu, yazdırılabilir sınav + cevap anahtarı ================= */

function Kagit({ test, onGeri }: { test: Test; onGeri: () => void }) {
  const [kurum, setKurum] = useState("Okul / kurum adı");
  const [tur, setTur] = useState<"A" | "B">("A");
  const [aciklama, setAciklama] = useState(true);
  const sorular = useMemo(() => kitapcik(test, tur), [test, tur]);

  return (
    <div>
      <div className="no-print flex flex-wrap items-end gap-4">
        <div>
          <div className="tag">Yazdırılabilir sınav</div>
          <h1 className="font-display mt-2 text-[34px] leading-[1.1] md:text-[42px]">Sınav kağıdı ve <em>cevap anahtarı</em></h1>
        </div>
        <button onClick={onGeri} className="btn btn-ghost btn-sm ml-auto">← Testlerim</button>
      </div>
      <div className="no-print card mt-6 grid gap-4 p-4 md:grid-cols-[1fr_auto_auto_auto] md:items-end md:p-5">
        <label className="block">
          <span className="text-sm font-medium">Kurum / öğretmen adı</span>
          <input value={kurum} onChange={(e) => setKurum(e.target.value)} className="field mt-1" />
        </label>
        <div>
          <div className="text-sm font-medium">Kitapçık</div>
          <div className="seg mt-1">
            {(["A", "B"] as const).map((k) => <button key={k} className={tur === k ? "on" : ""} onClick={() => setTur(k)}>{k}</button>)}
          </div>
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm font-medium">
          <input type="checkbox" checked={aciklama} onChange={(e) => setAciklama(e.target.checked)} className="h-4 w-4 accent-[var(--ink)]" />
          Anahtara açıklama ekle
        </label>
        <button onClick={() => window.print()} className="btn">Yazdır / PDF</button>
      </div>
      <p className="no-print mt-2 text-xs text-[var(--muted)]">B kitapçığında soruların ve şıkların sırası değişir, yan yana oturan öğrenciler farklı kağıt alır. Cevap anahtarı seçtiğin kitapçığa göre hazırlanır.</p>

      <div className="kagit mt-6 rounded-md p-6 md:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-black pb-3">
          <div>
            <div className="text-sm font-bold uppercase tracking-wider">{kurum}</div>
            <div className="font-display text-2xl">{test.baslik}</div>
            <div className="text-sm">{test.ders} · {SINAVLAR[test.sinav].ad} · {test.sorular.length} soru · {SINAVLAR[test.sinav].not}</div>
          </div>
          <div className="font-mono grid h-14 w-14 shrink-0 place-items-center border-2 border-black text-2xl font-semibold">{tur}</div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <div>Ad Soyad: ______________________</div>
          <div>Sınıf / No: ____________</div>
          <div>Tarih: ____ / ____ / ________</div>
        </div>
        <div className="kagit-sorular mt-6">
          {sorular.map(({ soru, no }) => (
            <div key={soru.id} className="kagit-soru text-[14px] leading-snug">
              <p><b>{no}.</b> {soru.soru}</p>
              <ol className="mt-1.5 space-y-0.5 pl-4">
                {soru.siklar.map((s, k) => <li key={k}><b>{HARF[k]})</b> {s}</li>)}
              </ol>
            </div>
          ))}
        </div>

        <div className="sayfa-sonu mt-10 border-t-2 border-dashed border-black pt-6">
          <div className="flex items-baseline justify-between gap-3">
            <div className="font-display text-xl">Cevap anahtarı · {tur} kitapçığı</div>
            <div className="text-xs">Öğretmen nüshası</div>
          </div>
          <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-10">
            {sorular.map(({ soru, no }) => (
              <div key={soru.id} className="font-mono border border-black px-1 py-1 text-center text-sm"><b>{no}</b> {HARF[soru.dogru]}</div>
            ))}
          </div>
          {aciklama && (
            <ol className="mt-5 space-y-2 text-[13px] leading-snug">
              {sorular.map(({ soru, no }) => (
                <li key={soru.id}><b>{no}. {HARF[soru.dogru]})</b> {soru.aciklama} {soru.dayanak && <i>Dayanak: “{soru.dayanak}”</i>}</li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
