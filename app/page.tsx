import Link from "next/link";
import Logo from "./_parcalar/Logo";
import { DEMO_NOTLAR, HARF, SINAVLAR, degerlendir, kitapcik, netYaz, ornekDurum, demoTesti, type SinavTipi } from "./lib/motor";

// Sayfadaki her örnek, motorun kendi demo verisinden hesaplanır (uydurma rakam yok).
const FEN = DEMO_NOTLAR[0];
const TARIH = DEMO_NOTLAR[1];
const SORU = FEN.sorular[0];
const NOT_SATIRLARI = FEN.metin.split("\n").filter(Boolean).slice(1, 7);

const durum = ornekDurum();
const fenTest = durum.testler.find((t) => t.baslik === FEN.baslik)!;
const fenIlk = durum.denemeler.find((d) => d.testId === fenTest.id && d.mod === "ilk")!;
const E = degerlendir(fenTest, fenIlk);
const KAGIT_B = kitapcik({ ...demoTesti(TARIH, 10, "karisik", { tur: "metin", sayfa: 1, ozet: "" }), id: "ornek-tarih" }, "B");

const ADIMLAR = [
  { n: "1", b: "Sayfanı çek", t: "Defter, fotokopi ya da kitap sayfası. İstersen birkaç sayfa birden, istersen metni yapıştır." },
  { n: "2", b: "Sınavını seç", t: "LGS, TYT, AYT ya da okul sınavı. Soru sayısını ve zorluğu sen belirle." },
  { n: "3", b: "Çöz ve netini gör", t: "Süre tutulur, net sınavın kuralıyla hesaplanır, yanlışların ayrı bir tura düşer." },
];

const OZELLIKLER = [
  { i: "📌", b: "Her sorunun kaynağı belli", t: "Cevabın dayandığı cümle notundan aynen gösterilir. Uydurma bilgiyle çalışmazsın." },
  { i: "🔁", b: "Yanlışlar geri gelir", t: "Yanlış ve boş bıraktığın sorular şıkları karışmış halde yeniden karşına çıkar." },
  { i: "📊", b: "Konu karnesi", t: "Hangi konuda zayıfsın, tek bakışta. %50 altı konular tekrar listene girer." },
  { i: "⏱️", b: "Gerçek sınav temposu", t: "Sınav tipine göre önerilen süre. Süreyi aşarsan sayaç kırmızıya döner." },
  { i: "🅰️", b: "Optik form hissi", t: "Cevap kağıdı ekranda hep yanında. Klavyeden A, B, C, D ile işaretle." },
  { i: "🖨️", b: "Kağıda dökülebilir", t: "Testi yazdırılabilir sınav kağıdına çevir. Öğretmenler için A/B kitapçık ve cevap anahtarı." },
];

const SSS = [
  { q: "El yazımı okuyabilir mi?", a: "Okunaklı el yazısını ve fotokopileri okur. Sayfa çok silikse ya da eğri çekilmişse okuyabildiği kısımdan soru hazırlar. En iyi sonuç için sayfayı düz ve aydınlık bir yerde çek." },
  { q: "Sorular nereden geliyor?", a: "Sadece senin verdiğin sayfadan. İnternetten ya da hazır bir soru bankasından soru çekilmez. Her sorunun altında, cevabın notundaki hangi cümleye dayandığını görürsün." },
  { q: "Net nasıl hesaplanıyor?", a: "Seçtiğin sınavın kuralıyla: LGS'de 3 yanlış, TYT ve AYT'de 4 yanlış 1 doğruyu götürür. Okul sınavı ve genel tekrar modunda yanlış doğruyu götürmez." },
  { q: "Öğretmenim, sınıfıma kağıt çıkarabilir miyim?", a: "Evet. Her test yazdırılabilir bir sınav kağıdına dönüşür. A ve B kitapçık seçebilir, cevap anahtarını ayrı sayfada alabilirsin." },
  { q: "Ücretli mi?", a: "Lansman döneminde ücretsiz. İleride sınırlı ücretsiz kullanım ve uygun fiyatlı bir Premium plan olacak. Kayıtlı kullanıcılara önceden haber veririz." },
  { q: "Fotoğraflarım saklanıyor mu?", a: "Fotoğrafın yalnızca soruları hazırlamak için kullanılır. Testlerin ve netlerin şimdilik bu cihazdaki tarayıcında durur." },
];

export default function Home() {
  return (
    <main className="overflow-x-clip">
      {/* NAV */}
      <header className="border-b-2 border-[var(--ink)] bg-[var(--paper)]">
        <nav className="mx-auto flex max-w-[1160px] items-center justify-between gap-3 px-4 py-3 md:px-6">
          <Logo />
          <div className="hidden items-center gap-6 text-[15px] font-semibold md:flex">
            <a href="#nasil" className="hover:text-[var(--primary)]">Nasıl çalışır</a>
            <a href="#ozellikler" className="hover:text-[var(--primary)]">Özellikler</a>
            <a href="#ogretmen" className="hover:text-[var(--primary)]">Öğretmenler</a>
            <a href="#sss" className="hover:text-[var(--primary)]">SSS</a>
          </div>
          <Link href="/app" className="btn btn-sm">Teste başla</Link>
        </nav>
      </header>

      {/* HERO */}
      <section className="mx-auto grid max-w-[1160px] items-center gap-12 px-4 pb-16 pt-12 md:grid-cols-[1.05fr_1fr] md:px-6 md:pb-24 md:pt-20">
        <div>
          <div className="flex flex-wrap gap-2">
            {["LGS", "TYT", "AYT", "Okul sınavı"].map((x, i) => (
              <span key={x} className={`chip border-[1.5px] border-[var(--ink)] ${i === 0 ? "chip-accent" : "bg-[var(--paper)]"}`}>{x}</span>
            ))}
          </div>
          <h1 className="font-display mt-6 text-[44px] leading-[1.02] md:text-[68px]">
            Sayfanı çek,<br /><em>testin</em> hazır.
          </h1>
          <p className="mt-6 max-w-[520px] text-[17px] leading-relaxed text-[var(--muted)] md:text-[18px]">
            Defterindeki, fotokopindeki ya da kitabındaki sayfadan sana özel test. Sorular <b className="text-[var(--ink)]">senin notundan</b> çıkar, netin <b className="text-[var(--ink)]">gerçek sınav kuralıyla</b> hesaplanır.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/app" className="btn btn-lg">Ücretsiz test hazırla →</Link>
            <a href="#nasil" className="btn btn-ghost btn-lg">Nasıl çalışır?</a>
          </div>
          <p className="mt-5 text-[14px] text-[var(--muted)]">Kayıt yok, kart yok. Örnek notla hemen dene.</p>
        </div>

        {/* Hero görseli: defter sayfası → soru kartı */}
        <div className="relative mx-auto w-full max-w-[480px] pb-24 md:pb-28">
          <div className="sticker rotate-[-2.5deg] overflow-hidden">
            <div className="flex items-center justify-between border-b-2 border-[var(--ink)] bg-[var(--sand)] px-4 py-2 text-[13px] font-semibold">
              <span>📓 {FEN.baslik}</span><span className="text-[var(--muted)]">8. sınıf · fen</span>
            </div>
            <div className="defter pb-3 pr-4 text-[13.5px] text-[var(--muted)]">
              {NOT_SATIRLARI.map((x, i) => (
                <p key={i} className="line-clamp-1">{x.includes(SORU.dayanak) ? <span className="mark text-[var(--ink)]">{SORU.dayanak}</span> : x}</p>
              ))}
            </div>
          </div>
          <div className="el absolute -right-1 top-[46%] hidden rotate-[-6deg] text-[22px] text-[var(--primary)] sm:block">bu cümleden ↓</div>
          <div className="sticker absolute bottom-0 left-6 right-[-8px] rotate-[1.5deg] p-4 md:left-10">
            <div className="flex items-center justify-between text-[12px] font-semibold">
              <span className="font-mono">Soru 1 / 10</span><span className="chip">{SINAVLAR.lgs.kisa}</span>
            </div>
            <p className="font-display mt-2 text-[16px] font-semibold leading-snug">{SORU.soru}</p>
            <div className="mt-2.5 grid grid-cols-2 gap-1.5">
              {SORU.siklar.map((x, k) => (
                <div key={k} className={`flex items-center gap-2 rounded-lg border-[1.5px] px-2 py-1.5 text-[12px] leading-tight ${k === SORU.dogru ? "border-[var(--primary)] bg-[var(--primary-soft)]" : "border-[var(--line)]"}`}>
                  <span className={`bubble sm ${k === SORU.dogru ? "on" : ""}`}>{HARF[k]}</span><span className="line-clamp-2">{x}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* NASIL */}
      <section id="nasil" className="scroll-mt-6 border-y-2 border-[var(--ink)] bg-[var(--primary)] text-white">
        <div className="mx-auto max-w-[1160px] px-4 py-16 md:px-6 md:py-20">
          <div className="tag !text-[var(--accent)]">Nasıl çalışır</div>
          <h2 className="font-display mt-3 max-w-xl text-[34px] leading-[1.08] md:text-[46px]">Üç adım, bir dakikadan kısa.</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {ADIMLAR.map((a) => (
              <div key={a.n} className="sticker p-6 text-[var(--ink)]">
                <div className="font-display grid h-12 w-12 place-items-center rounded-xl border-2 border-[var(--ink)] bg-[var(--accent)] text-[24px]">{a.n}</div>
                <h3 className="font-display mt-4 text-[22px]">{a.b}</h3>
                <p className="mt-2 leading-relaxed text-[var(--muted)]">{a.t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NEDEN KENDİ NOTUN */}
      <section className="mx-auto max-w-[1160px] px-4 py-20 md:px-6 md:py-28">
        <div className="max-w-2xl">
          <div className="tag">Neden kendi notun?</div>
          <h2 className="font-display mt-3 text-[34px] leading-[1.08] md:text-[46px]">Okumak tanıdık gelir. <em>Soru</em> gerçeği gösterir.</h2>
          <p className="mt-4 text-[17px] leading-relaxed text-[var(--muted)]">Notunu üçüncü kez okumak &quot;biliyorum&quot; hissi verir ama sınavda hatırlatmaz. Kendini soruyla yoklamak, neyi bilmediğini ortaya çıkarır.</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="card p-6 md:p-7">
            <div className="text-[15px] font-bold text-[var(--muted)]">Hazır soru bankası</div>
            <ul className="mt-4 space-y-3 text-[15.5px]">
              {["Öğretmeninin derste ne anlattığını bilmez", "Henüz işlemediğin konulardan da sorar", "Hangi sayfayı tekrar etmen gerektiğini söylemez"].map((x) => (
                <li key={x} className="flex gap-3 text-[var(--muted)]"><span className="bubble sm bad">✕</span>{x}</li>
              ))}
            </ul>
          </div>
          <div className="sticker p-6 md:p-7">
            <div className="text-[15px] font-bold text-[var(--primary)]">TestSayfam</div>
            <ul className="mt-4 space-y-3 text-[15.5px]">
              {["Tam olarak senin defterinden sorar", "Bu hafta işlediğin konuyu bu akşam test edersin", "Yanlış yaptığın her sorunun notundaki yerini gösterir"].map((x) => (
                <li key={x} className="flex gap-3"><span className="bubble sm ok">✓</span>{x}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* NET KURALLARI */}
      <section className="mx-auto max-w-[1160px] px-4 pb-20 md:px-6 md:pb-28">
        <div className="sticker grid gap-8 p-6 md:grid-cols-[1fr_1.1fr] md:p-10">
          <div>
            <div className="tag">Net hesabı</div>
            <h2 className="font-display mt-3 text-[30px] leading-[1.1] md:text-[40px]">Deneme sınavındaki netin, <em>burada da</em> aynı.</h2>
            <p className="mt-4 leading-relaxed text-[var(--muted)]">Sınav tipini seçince şık sayısı, yanlış cezası ve önerilen süre otomatik ayarlanır.</p>
            <div className="mt-6 rounded-xl border-2 border-[var(--ink)] bg-[var(--accent)] p-5">
              <div className="text-[13px] font-bold">Örnek deneme · {FEN.etiket}</div>
              <div className="mt-2 flex items-end gap-4">
                <div className="font-light-num text-[60px] leading-none">{netYaz(E.net)}</div>
                <div className="pb-1.5 text-[14px] font-semibold">net<br /><span className="font-mono text-[13px]">{E.dogru}D · {E.yanlis}Y · {E.bos}B</span></div>
              </div>
              <div className="mt-2 text-[13px]">LGS kuralı: {E.yanlis} yanlış, {netYaz(E.dogru - E.net)} doğruyu götürdü.</div>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border-[1.5px] border-[var(--line)]">
            <table className="w-full text-left text-[14.5px]">
              <thead className="bg-[var(--sand)] text-[13px]">
                <tr><th className="px-4 py-3">Sınav</th><th className="px-4 py-3">Şık</th><th className="px-4 py-3">Yanlış cezası</th></tr>
              </thead>
              <tbody>
                {(Object.keys(SINAVLAR) as SinavTipi[]).map((id) => (
                  <tr key={id} className="border-t border-[var(--line)]">
                    <td className="px-4 py-3 font-semibold">{SINAVLAR[id].ad}</td>
                    <td className="font-mono px-4 py-3">{SINAVLAR[id].sik}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{SINAVLAR[id].ceza ? `${SINAVLAR[id].ceza} yanlış = 1 doğru` : "Yok"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ÖZELLİKLER */}
      <section id="ozellikler" className="mx-auto max-w-[1160px] scroll-mt-6 px-4 pb-20 md:px-6 md:pb-28">
        <div className="tag">Özellikler</div>
        <h2 className="font-display mt-3 max-w-2xl text-[34px] leading-[1.08] md:text-[46px]">Test hazırlamak işin yarısı. <em>Gerisi</em> de burada.</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {OZELLIKLER.map((o) => (
            <div key={o.b} className="card p-6 transition hover:-translate-y-0.5 hover:border-[var(--ink)]">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--sand)] text-[22px]" aria-hidden>{o.i}</div>
              <h3 className="font-display mt-4 text-[20px]">{o.b}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--muted)]">{o.t}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ÖĞRETMEN */}
      <section id="ogretmen" className="scroll-mt-6 border-y-2 border-[var(--ink)] bg-[var(--accent)]">
        <div className="mx-auto grid max-w-[1160px] items-center gap-12 px-4 py-16 md:grid-cols-[0.9fr_1.1fr] md:px-6 md:py-24">
          <div>
            <div className="tag !text-[var(--ink)]">Öğretmen misin?</div>
            <h2 className="font-display mt-3 text-[32px] leading-[1.08] md:text-[42px]">Ders notundan yarınki quiz kağıdı.</h2>
            <p className="mt-4 max-w-md text-[16px] leading-relaxed">Hazırladığın testi tek tıkla yazdırılabilir sınav kağıdına çevir. Kurumunun adı başlıkta, A ve B kitapçık, cevap anahtarı ayrı sayfada.</p>
            <Link href="/app" className="btn btn-dark mt-7">Sınav kağıdı hazırla</Link>
          </div>
          <div className="sticker rotate-[1.5deg] p-5 text-[12.5px] leading-snug md:p-7">
            <div className="flex items-start justify-between gap-3 border-b-2 border-black pb-2">
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-wider">Kurum adın burada</div>
                <div className="font-display text-[19px]">{TARIH.baslik}</div>
                <div className="text-[11.5px]">Tarih · {SINAVLAR.tyt.ad} · {KAGIT_B.length} soru</div>
              </div>
              <div className="font-mono grid h-11 w-11 shrink-0 place-items-center border-2 border-black text-xl">B</div>
            </div>
            {KAGIT_B.slice(0, 2).map(({ soru, no }) => (
              <div key={no} className="mt-3">
                <p><b>{no}.</b> {soru.soru}</p>
                <p className="mt-1 flex flex-wrap gap-x-4 pl-4">{soru.siklar.map((x, k) => <span key={k}><b>{HARF[k]})</b> {x}</span>)}</p>
              </div>
            ))}
            <div className="mt-4 border-t border-dashed border-black pt-2">
              <div className="text-[10.5px] font-bold uppercase tracking-wider">Cevap anahtarı · B</div>
              <div className="font-mono mt-1.5 flex flex-wrap gap-1.5">
                {KAGIT_B.map(({ soru, no }) => <span key={no} className="border border-black px-1.5">{no} {HARF[soru.dogru]}</span>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SSS */}
      <section id="sss" className="mx-auto max-w-[860px] scroll-mt-6 px-4 py-20 md:px-6 md:py-28">
        <div className="text-center">
          <div className="tag">Sık sorulanlar</div>
          <h2 className="font-display mt-3 text-[34px] leading-[1.08] md:text-[46px]">Aklına takılanlar</h2>
        </div>
        <div className="mt-10 space-y-3">
          {SSS.map((f) => (
            <details key={f.q} className="group card px-5 py-4 open:border-[var(--ink)] open:shadow-[var(--shadow-sm)]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16.5px] font-bold">
                {f.q}<span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--sand)] text-lg transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 leading-relaxed text-[var(--muted)]">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* KAPANIŞ + FOOTER */}
      <section className="bg-[var(--dark)] text-white">
        <div className="mx-auto max-w-[1160px] px-4 py-20 text-center md:px-6 md:py-24">
          <div className="el text-[28px] text-[var(--accent)]">bu akşam dene</div>
          <h2 className="font-display mx-auto mt-2 max-w-2xl text-[36px] leading-[1.05] md:text-[54px]">Bugün işlediğin konu, bu akşam testin olsun.</h2>
          <Link href="/app" className="btn btn-accent btn-lg mt-9">Ücretsiz test hazırla →</Link>
        </div>
        <footer className="border-t border-white/15">
          <div className="mx-auto flex max-w-[1160px] flex-col gap-4 px-4 py-8 text-[13.5px] text-[var(--dark-muted)] md:flex-row md:items-center md:justify-between md:px-6">
            <Logo koyu kucuk />
            <p>Sorular senin notundan hazırlanır; resmi sınav sorusu değildir.</p>
            <p>© 2026 TestSayfam</p>
          </div>
        </footer>
      </section>
    </main>
  );
}
