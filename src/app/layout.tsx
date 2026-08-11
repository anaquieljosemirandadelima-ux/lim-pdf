import type { Metadata } from "next";
import { AdSenseLoader } from "@/components/AdSenseLoader";
import { AppSidebar } from "@/components/AppSidebar";
import { ConsentBanner } from "@/components/ConsentBanner";
import { Header } from "@/components/Header";
import { LanguageDocumentSync } from "@/components/LanguageDocumentSync";
import { LocalPrivacyGuard } from "@/components/LocalPrivacyGuard";
import { NativeTranslator } from "@/components/NativeTranslator";
import { SiteFooter } from "@/components/SiteFooter";
import { TrustStrip } from "@/components/TrustStrip";
import { ADSENSE_CLIENT } from "@/lib/adsense";
import { allTools } from "@/lib/all-tools";
import { proTools } from "@/lib/pro-tools";
import { releaseTools } from "@/lib/release-tools";
import "./globals.css";
import "./reference-ui-v2.css";
import "./premium-ui.css";
import "./premium-suite-v2.css";
import "./premium-suite-v2-fixes.css";
import "./launch-hardening.css";
import "./pro-suite.css";
import "./pro-suite-motion.css";
import "./release-top.css";
import "./editor-release.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://limpdf.com.br";
const adsenseClient = ADSENSE_CLIENT;
const googleVerification = process.env.GOOGLE_SITE_VERIFICATION;
const publicTools = [...allTools, ...proTools, ...releaseTools];
const toolCount = publicTools.length;
const structuredData = { "@context": "https://schema.org", "@type": "WebApplication", name: "LIM PDF", url: siteUrl, applicationCategory: "BusinessApplication", operatingSystem: "Web", inLanguage: ["pt-BR", "en", "es"], isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" }, featureList: publicTools.map((tool) => tool.name), publisher: { "@type": "Organization", name: "LIM PDF", url: siteUrl, logo: `${siteUrl}/brand/lim-pdf-icon-192.png` } };

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "LIM PDF — Editor e suíte profissional de PDF grátis", template: "%s | LIM PDF" },
  description: "Edite, converta, reconheça texto com OCR, dimensione páginas, compare, crie formulários, assine, revise, proteja e otimize PDFs no navegador.",
  applicationName: "LIM PDF",
  keywords: ["editar PDF", "converter PDF", "PDF grátis", "ferramentas PDF", "OCR PDF", "dimensionar PDF", "preflight PDF", "assinatura digital PDF", "comparar PDF", "formulário PDF", "PDF para PowerPoint", "PDF para Word", "PDF para Excel", "proteger PDF", "compactar PDF", "PDF online"],
  authors: [{ name: "LIM PDF" }], creator: "LIM PDF", publisher: "LIM PDF", alternates: { canonical: "/" },
  icons: { icon: [{ url: "/brand/lim-pdf-icon-32.png", sizes: "32x32", type: "image/png" }, { url: "/brand/lim-pdf-icon-192.png", sizes: "192x192", type: "image/png" }], apple: [{ url: "/brand/lim-pdf-icon-192.png", sizes: "192x192", type: "image/png" }] },
  openGraph: { type: "website", locale: "pt_BR", url: siteUrl, siteName: "LIM PDF", title: "LIM PDF — Editor e suíte profissional de PDF grátis", description: `${toolCount} ferramentas para edição, conversão, OCR, organização, revisão, formulários, assinatura e proteção de PDFs no navegador.`, images: [{ url: "/brand/lim-pdf-og.png", width: 1200, height: 630, alt: "LIM PDF" }] },
  twitter: { card: "summary_large_image", title: "LIM PDF — Editor e ferramentas PDF gratuitas", description: "Editor, conversor, OCR, dimensionamento, Preflight e ferramentas PDF diretamente no navegador.", images: ["/brand/lim-pdf-og.png"] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  verification: googleVerification ? { google: googleVerification } : undefined,
  other: adsenseClient ? { "google-adsense-account": adsenseClient } : undefined,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body className="app-body reference-app-body"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /><a className="skip-link" href="#conteudo">Pular para o conteúdo</a><LocalPrivacyGuard /><LanguageDocumentSync /><NativeTranslator /><AdSenseLoader client={adsenseClient} /><Header /><AppSidebar /><main id="conteudo" className="reference-main">{children}</main><TrustStrip /><SiteFooter /><ConsentBanner /></body></html>;
}
