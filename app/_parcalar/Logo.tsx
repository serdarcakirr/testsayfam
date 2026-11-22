import Link from "next/link";

/** Kıvrık köşeli sayfa ikonu + iki renkli kelime işareti. `koyu` koyu zeminde kullanılır. */
export function SayfaIkon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path d="M6 3.5h14.5L27 10v18.5H6z" fill="#fff" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M20.5 3.5V10H27" fill="var(--accent)" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="11.5" cy="15" r="2" fill="var(--primary)" />
      <path d="M15.5 15h7" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="11.5" cy="21.5" r="2" fill="none" stroke="var(--ink)" strokeWidth="1.6" />
      <path d="M15.5 21.5h7" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo({ koyu = false, kucuk = false }: { koyu?: boolean; kucuk?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="TestSayfam ana sayfa">
      <SayfaIkon className={kucuk ? "h-7 w-7" : "h-8 w-8"} />
      <span className={`font-display ${kucuk ? "text-[18px]" : "text-[21px]"} leading-none tracking-tight`}>
        <span className={koyu ? "text-white" : "text-[var(--ink)]"}>Test</span>
        <span className={koyu ? "text-[var(--accent)]" : "text-[var(--primary)]"}>Sayfam</span>
      </span>
    </Link>
  );
}
