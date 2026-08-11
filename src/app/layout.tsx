import type { Metadata } from "next";
import { AdSenseRouteLoader } from "@/components/AdSenseRouteLoader";
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
import "./globals.css";
import "./reference-ui-v2.css";
import "./premium-ui.css";
import "./premium-suite-v2.css";
import "./premium-suite-v2-fixes.css";
import "./launch-hardening.css";
import "./release-clean.css";
import "./release-clean-home.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://limpdf.com.br";
const adsenseClient = ADSENSE_CLIENT;
const googleVerification = process.env.GOOGLE_SITE_VERIFICATION;
const toolCount = allTools.length + 3;
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
  featureList: [...allTools.map((tool) => tool.name), "Converter PDF", "OCR PDF", "Dimensionar página PDF"],
  publisher: { "@type": "Organization", name: "LIM PDF", url: siteUrl, logo: `${siteUrl}/brand/lim-pdf-icon-192.png` },
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "LIM PDF — editar, converter e organizar PDF grátis", template: "%s | LIM PDF" },
  description: "Edite, converta, organize, reconheça texto com OCR, proteja e compacte PDFs gratuitamente no navegador.",
  applicationName: "LIM PDF",
  keywords: ["PDF grátis", "editar PDF", "converter PDF", "OCR PDF", "juntar PDF", "compactar PDF", "PDF para Word", "PDF online"],
  authors: [{ name: "LIM PDF" }],
  creator: "LIM PDF",
  publisher: "LIM PDF",
  alternates: { canonical: "/" },
  icons: { icon: [{ url: "/brand/lim-pdf-icon-32.png", sizes: "32x32", type: "image/png" }, { url: "/brand/lim-pdf-icon-192.png", sizes: "192x192", type: "image/png" }], apple: [{ url: "/brand/lim-pdf-icon-192.png", sizes: "192x192", type: "image/png" }] },
  openGraph: { type: "website", locale: "pt_BR", url: siteUrl, siteName: "LIM PDF", title: "LIM PDF — ferramentas PDF gratuitas", description: `${toolCount} fluxos para editar, converter, organizar, reconhecer, proteger e otimizar PDFs.`, images: [{ url: "/brand/lim-pdf-og.png", width: 1200, height: 630, alt: "LIM PDF" }] },
  twitter: { card: "summary_large_image", title: "LIM PDF — ferramentas PDF gratuitas", description: "Edite, converta e trabalhe com PDF no navegador.", images: ["/brand/lim-pdf-og.png"] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  verification: googleVerification ? { google: googleVerification } : undefined,
  other: adsenseClient ? { "google-adsense-account": adsenseClient } : undefined,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body className="app-body reference-app-body"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /><a className="skip-link" href="#conteudo">Pular para o conteúdo</a><LocalPrivacyGuard /><LanguageDocumentSync /><NativeTranslator /><AdSenseRouteLoader client={adsenseClient} /><Header /><AppSidebar /><main id="conteudo" className="reference-main">{children}</main><TrustStrip /><SiteFooter /><ConsentBanner /></body></html>;
}
