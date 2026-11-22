import type { Metadata } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans, Caveat, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin", "latin-ext"], weight: ["500", "700", "800"], variable: "--font-display" });
const body = Plus_Jakarta_Sans({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700"], variable: "--font-body" });
const hand = Caveat({ subsets: ["latin", "latin-ext"], weight: ["500", "600", "700"], variable: "--font-hand" });
const mono = JetBrains_Mono({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "TestSayfam · Defterinin sayfası, senin testin",
  description:
    "Defterinin ya da kitabının sayfasını çek, LGS ve YKS kurallarıyla sana özel çoktan seçmeli test hazırlansın. Çöz, netini gör, yanlışlarını tekrar et.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${display.variable} ${body.variable} ${hand.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
