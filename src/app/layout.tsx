import type { Metadata } from "next";
import { AdSenseLoader } from "@/components/AdSenseLoader";
import { ConsentBanner } from "@/components/ConsentBanner";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ADSENSE_CLIENT } from "@/lib/adsense";
import { tools } from "@/lib/tools";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://limpdf.com.br";
const adsenseClient = ADSENSE_CLIENT;
const googleVerification = process.env.GOOGLE_SITE_VERIFICATION;
const toolCount = tools.length;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "LIM PDF — Ferramentas PDF gratuitas e online", template: "%s | LIM PDF" },
  description: "Edite visualmente, organize páginas, converta, assine e compacte arquivos PDF gratuitamente, sem cadastro e com cache temporário no navegador.",
  applicationName: "LIM PDF",
  keywords: ["PDF grátis", "ferramentas PDF", "juntar PDF", "editar PDF", "converter PDF", "compactar PDF", "PDF online"],
  authors: [{ name: "LIM PDF" }],
  creator: "LIM PDF",
  publisher: "LIM PDF",
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: "/brand/lim-pdf-icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/lim-pdf-icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/brand/lim-pdf-icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteUrl,
    siteName: "LIM PDF",
    title: "LIM PDF — Ferramentas PDF gratuitas e online",
    description: `${toolCount} ferramentas reais para organizar, editar visualmente, converter e otimizar PDFs no navegador.`,
    images: [{ url: "/brand/lim-pdf-og.png", width: 1200, height: 630, alt: "LIM PDF" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "LIM PDF — Ferramentas PDF gratuitas",
    description: "Trabalhe com PDF gratuitamente e diretamente no navegador.",
    images: ["/brand/lim-pdf-og.png"],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  verification: googleVerification ? { google: googleVerification } : undefined,
  other: adsenseClient ? { "google-adsense-account": adsenseClient } : undefined,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="app-body">
        <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
        <AdSenseLoader client={adsenseClient} />
        <Header />
        <main id="conteudo">{children}</main>
        <Footer />
        <ConsentBanner />
      </body>
    </html>
  );
}
