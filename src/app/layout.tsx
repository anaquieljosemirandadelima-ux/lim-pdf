import type { Metadata } from "next";
import { AdSenseLoader } from "@/components/AdSenseLoader";
import { AppSidebar } from "@/components/AppSidebar";
import { ConsentBanner } from "@/components/ConsentBanner";
import { Header } from "@/components/Header";
import { LanguageDocumentSync } from "@/components/LanguageDocumentSync";
import { LocalPrivacyGuard } from "@/components/LocalPrivacyGuard";
import { NativeTranslator } from "@/components/NativeTranslator";
import { TrustStrip } from "@/components/TrustStrip";
import { ADSENSE_CLIENT } from "@/lib/adsense";
import { allTools } from "@/lib/all-tools";
import { proTools } from "@/lib/pro-tools";
import "./globals.css";
import "./reference-ui-v2.css";
import "./premium-ui.css";
import "./premium-suite-v2.css";
import "./premium-suite-v2-fixes.css";
import "./launch-hardening.css";
import "./pro-suite.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://limpdf.com.br";
const adsenseClient = ADSENSE_CLIENT;
const googleVerification = process.env.GOOGLE_SITE_VERIFICATION;
const publicTools = [...allTools, ...proTools];
const toolCount = publicTools.length;
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "LIM PDF",
  url: siteUrl,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  inLanguage: ["pt-BR", "en", "es"],
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
  featureList: publicTools.map((tool) => tool.name),
  publisher: {
    "@type": "Organization",
    name: "LIM PDF",
    url: siteUrl,
    logo: `${siteUrl}/brand/lim-pdf-icon-192.png`,
  },
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "LIM PDF — Suíte profissional de PDF gratuita e online", template: "%s | LIM PDF" },
  description: "Edite, reconheça texto com OCR, compare, crie formulários, assine digitalmente, converta, organize, repare, proteja e otimize PDFs no navegador.",
  applicationName: "LIM PDF",
  keywords: ["PDF grátis", "ferramentas PDF", "OCR PDF", "editar PDF", "assinatura digital PDF", "comparar PDF", "formulário PDF", "PDF para PowerPoint", "PDF para Word", "PDF para Excel", "proteger PDF", "compactar PDF", "PDF online"],
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
    title: "LIM PDF — Suíte profissional de PDF gratuita e online",
    description: `${toolCount} ferramentas para OCR, edição, organização, conversão, formulários, assinatura, proteção e otimização de PDFs no navegador.`,
    images: [{ url: "/brand/lim-pdf-og.png", width: 1200, height: 630, alt: "LIM PDF" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "LIM PDF — Suíte profissional de PDF gratuita",
    description: "OCR, edição, comparação, formulários, assinatura e ferramentas PDF diretamente no navegador.",
    images: ["/brand/lim-pdf-og.png"],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  verification: googleVerification ? { google: googleVerification } : undefined,
  other: adsenseClient ? { "google-adsense-account": adsenseClient } : undefined,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="app-body reference-app-body">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
        <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
        <LocalPrivacyGuard />
        <LanguageDocumentSync />
        <NativeTranslator />
        <AdSenseLoader client={adsenseClient} />
        <Header />
        <AppSidebar />
        <main id="conteudo" className="reference-main">{children}</main>
        <TrustStrip />
        <ConsentBanner />
      </body>
    </html>
  );
}
