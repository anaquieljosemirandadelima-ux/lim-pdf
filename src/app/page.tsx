import type { Metadata } from "next";
import Link from "next/link";
import { LucideClientIcon } from "@/components/LucideClientIcon";
import { ToolIcon } from "@/components/ToolIcon";
import { allToolBySlug, type AllToolSlug } from "@/lib/all-tools";
import { proTools, type ProToolSlug } from "@/lib/pro-tools";

export const metadata: Metadata = {
  title: "Ferramentas PDF grátis com OCR, edição e conversão",
  description: "Suíte PDF gratuita com OCR real, editor, comparação, formulários, assinatura, conversão e proteção diretamente no navegador.",
  alternates: { canonical: "/" },
};

type FeaturedSlug = AllToolSlug | ProToolSlug;
const proToolBySlug = new Map(proTools.map((tool) => [tool.slug, tool]));
const featuredSlugs: FeaturedSlug[] = ["ocr-pdf", "editar-pdf", "compactar-pdf", "pdf-para-word", "comparar-pdfs", "assinatura-digital-pdf"];

export default function Home() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://limpdf.com.br";
  const featured = featuredSlugs.flatMap((slug) => {
    const tool = proToolBySlug.get(slug as ProToolSlug) || allToolBySlug.get(slug as AllToolSlug);
    return tool ? [tool] : [];
  });
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", name: "LIM PDF", url: siteUrl, inLanguage: "pt-BR", potentialAction: { "@type": "SearchAction", target: `${siteUrl}/ferramentas?busca={search_term_string}`, "query-input": "required name=search_term_string" } },
      { "@type": "SoftwareApplication", name: "LIM PDF", applicationCategory: "UtilitiesApplication", operatingSystem: "Web", offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" }, description: "Suíte gratuita com OCR real, edição, organização, formulários, assinatura, comparação, conversão, proteção e otimização de PDFs no navegador." },
    ],
  };

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    <section className="reference-home">
      <div className="reference-home-hero">
        <div className="reference-home-copy">
          <span className="reference-pill"><i /> 100% Gratuito · Online · Seguro</span>
          <h1>Tudo que você precisa para <em>seus PDFs.</em></h1>
          <p>OCR real, edição visual, formulários, comparação, assinatura e conversão em uma suíte rápida que processa seus arquivos no navegador.</p>
          <div className="reference-hero-actions">
            <Link className="reference-primary-button" href="/ferramentas"><LucideClientIcon name="Sparkles" size={18} /> Explorar 58 ferramentas</Link>
            <Link className="reference-ghost-button" href="/ferramentas/ocr-pdf"><span className="play-dot"><LucideClientIcon name="ArrowRight" size={14} /></span> Testar OCR</Link>
          </div>
        </div>

        <div className="reference-hero-art" aria-hidden="true">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="hero-document"><span className="pdf-badge">PDF</span><div className="doc-line wide" /><div className="doc-line" /><div className="doc-line medium" /><div className="doc-line small" /><span className="doc-brand">L</span></div>
          <span className="floating-card convert"><LucideClientIcon name="Repeat2" size={25} /><b>Converter</b></span>
          <span className="floating-card edit"><LucideClientIcon name="PencilLine" size={25} /><b>Editar</b></span>
          <span className="floating-card sign"><LucideClientIcon name="Signature" size={25} /><b>Assinar</b></span>
          <span className="floating-card protect"><LucideClientIcon name="ShieldCheck" size={25} /><b>Proteger</b></span>
          <span className="floating-card ocr"><LucideClientIcon name="TextSearch" size={24} /><b>OCR</b></span>
        </div>
      </div>

      <div className="reference-featured-tools">
        {featured.map((tool) => <Link href={`/ferramentas/${tool.slug}`} className={`reference-tool-card accent-${tool.accent}`} key={tool.slug}>
          <span className="reference-tool-icon"><ToolIcon icon={tool.icon} /></span><strong>{tool.name}</strong><small>{tool.shortDescription}</small><LucideClientIcon name="ArrowRight" size={18} />
        </Link>)}
      </div>
    </section>
  </>;
}
