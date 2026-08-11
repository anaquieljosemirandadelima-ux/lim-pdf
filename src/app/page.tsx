import type { Metadata } from "next";
import Link from "next/link";
import { LucideClientIcon } from "@/components/LucideClientIcon";
import { ToolIcon } from "@/components/ToolIcon";
import { allToolBySlug, allTools, type AllToolSlug } from "@/lib/all-tools";
import { proTools, type ProToolSlug } from "@/lib/pro-tools";
import { releaseTools, type ReleaseToolSlug } from "@/lib/release-tools";

export const metadata: Metadata = {
  title: "Ferramentas PDF grátis com editor, OCR e conversor completo",
  description: "Edite, converta, reconheça, dimensione, revise, assine, organize e proteja PDFs em uma suíte gratuita que processa documentos no navegador.",
  alternates: { canonical: "/" },
};

type FeaturedSlug = AllToolSlug | ProToolSlug | ReleaseToolSlug;
const proToolBySlug = new Map(proTools.map((tool) => [tool.slug, tool]));
const releaseToolBySlug = new Map(releaseTools.map((tool) => [tool.slug, tool]));
const featuredSlugs: FeaturedSlug[] = ["converter-pdf", "editar-pdf", "ocr-pdf", "normalizar-paginas-pdf", "compactar-pdf", "preflight-pdf"];
const toolCount = allTools.length + proTools.length + releaseTools.length;

export default function Home() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://limpdf.com.br";
  const featured = featuredSlugs.flatMap((slug) => { const tool = releaseToolBySlug.get(slug as ReleaseToolSlug) || proToolBySlug.get(slug as ProToolSlug) || allToolBySlug.get(slug as AllToolSlug); return tool ? [tool] : []; });
  const structuredData = { "@context": "https://schema.org", "@graph": [{ "@type": "WebSite", name: "LIM PDF", url: siteUrl, inLanguage: "pt-BR", potentialAction: { "@type": "SearchAction", target: `${siteUrl}/ferramentas?busca={search_term_string}`, "query-input": "required name=search_term_string" } }, { "@type": "SoftwareApplication", name: "LIM PDF", applicationCategory: "UtilitiesApplication", operatingSystem: "Web", offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" }, description: `Suíte gratuita com ${toolCount} ferramentas para edição, conversão, OCR, revisão, organização, formulários, assinatura e proteção de PDFs no navegador.` }] };

  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /><section className="reference-home">
    <div className="reference-home-hero"><div className="reference-home-copy"><span className="reference-pill"><i /> Gratuito · sem cadastro · direto no navegador</span><h1>Seu PDF pronto, <em>sem complicação.</em></h1><p>Um editor completo, conversão com troca de formato depois do upload, OCR real, dimensionamento de páginas e revisão profissional em um só lugar.</p><div className="reference-hero-actions"><Link className="reference-primary-button" href="/ferramentas/converter-pdf"><LucideClientIcon name="Repeat2" size={18} /> Converter um arquivo</Link><Link className="reference-ghost-button" href="/ferramentas/editar-pdf"><span className="play-dot"><LucideClientIcon name="PencilLine" size={14} /></span> Abrir editor PDF</Link></div><small className="reference-tool-count">{toolCount} ferramentas disponíveis — a contagem é atualizada automaticamente.</small></div>
    <div className="reference-hero-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="hero-document"><span className="pdf-badge">PDF</span><div className="doc-line wide" /><div className="doc-line" /><div className="doc-line medium" /><div className="doc-line small" /><span className="doc-brand">L</span></div><span className="floating-card convert"><LucideClientIcon name="Repeat2" size={25} /><b>Converter</b></span><span className="floating-card edit"><LucideClientIcon name="PencilLine" size={25} /><b>Editar</b></span><span className="floating-card sign"><LucideClientIcon name="Signature" size={25} /><b>Assinar</b></span><span className="floating-card protect"><LucideClientIcon name="ShieldCheck" size={25} /><b>Revisar</b></span><span className="floating-card ocr"><LucideClientIcon name="TextSearch" size={24} /><b>OCR</b></span></div></div>
    <div className="reference-featured-tools">{featured.map((tool) => <Link href={`/ferramentas/${tool.slug}`} className={`reference-tool-card accent-${tool.accent}`} key={tool.slug}><span className="reference-tool-icon"><ToolIcon icon={tool.icon} /></span><strong>{tool.name}</strong><small>{tool.shortDescription}</small><LucideClientIcon name="ArrowRight" size={18} /></Link>)}</div>
    <section className="home-value-section"><div><span>Feito para o arquivo real</span><h2>Escolha a tarefa. Faça. Revise. Continue.</h2><p>O LIM PDF organiza ferramentas simples e profissionais no mesmo fluxo. Conversões mantêm o arquivo carregado enquanto você troca a saída; o editor reúne ações por objetivo; e o Preflight mostra o que merece revisão antes de compartilhar.</p></div><div className="home-value-points"><article><strong>Privacidade</strong><p>As ferramentas indicadas como locais trabalham no seu navegador.</p></article><article><strong>Qualidade</strong><p>Limitações técnicas aparecem antes de você confiar no resultado.</p></article><article><strong>Continuidade</strong><p>Próximas ações e formatos ficam perto do arquivo, não escondidos no fim da página.</p></article></div></section>
  </section></>;
}
