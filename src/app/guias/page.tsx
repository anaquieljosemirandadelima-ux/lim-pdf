import type { Metadata } from "next";
import Link from "next/link";
import { AdSlot } from "@/components/AdSlot";
import { LucideClientIcon } from "@/components/LucideClientIcon";
import { guides } from "@/lib/guides";

export const metadata: Metadata = {
  title: "Guias práticos sobre PDF | LIM PDF",
  description: "Guias originais para editar, converter, proteger, assinar, comprimir e reconhecer textos em PDFs com decisões mais seguras.",
  alternates: { canonical: "/guias" },
  openGraph: { title: "Guias práticos sobre PDF | LIM PDF", description: "Aprenda a escolher a ferramenta PDF certa, revisar resultados e proteger informações sensíveis.", url: "/guias", type: "website" },
};

export default function GuidesPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://limpdf.com.br";
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Guias práticos sobre PDF",
    url: `${siteUrl}/guias`,
    description: metadata.description,
    isPartOf: { "@type": "WebSite", name: "LIM PDF", url: siteUrl },
    mainEntity: { "@type": "ItemList", itemListElement: guides.map((guide, index) => ({ "@type": "ListItem", position: index + 1, url: `${siteUrl}/guias/${guide.slug}`, name: guide.title })) },
  };

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    <main className="editorial-page guides-index-page">
      <section className="editorial-hero">
        <div className="editorial-hero-copy">
          <span className="editorial-kicker">Centro de conhecimento LIM PDF</span>
          <h1>Guias para tomar decisões melhores com seus PDFs.</h1>
          <p>Ferramentas resolvem uma tarefa. Um bom guia explica qual tarefa escolher, o que pode dar errado e como revisar o arquivo antes de compartilhar.</p>
          <div className="editorial-trust-row"><span><LucideClientIcon name="CheckCircle2" size={16} /> Escrito pela equipe LIM PDF</span><span><LucideClientIcon name="ListChecks" size={16} /> Atualizado continuamente</span><span><LucideClientIcon name="ShieldCheck" size={16} /> Foco em privacidade</span></div>
        </div>
        <div className="editorial-hero-card"><strong>Como usamos estes guias</strong><p>Partimos dos fluxos reais do produto, testamos os limites no navegador e descrevemos o que deve ser conferido antes de usar o resultado.</p><Link href="/sobre">Conheça os critérios editoriais <LucideClientIcon name="ArrowRight" size={16} /></Link></div>
      </section>

      <section className="editorial-content-wrap">
        <div className="editorial-main-column">
          <div className="editorial-section-heading"><div><span>Biblioteca prática</span><h2>Escolha um problema para começar</h2></div><span className="editorial-count">{guides.length} guias publicados</span></div>
          <div className="guide-card-grid">{guides.map((guide) => <article className="guide-card" key={guide.slug}><div className="guide-card-meta"><span>{guide.category}</span><span>{guide.readingTime}</span></div><h3><Link href={`/guias/${guide.slug}`}>{guide.title}</Link></h3><p>{guide.excerpt}</p><div className="guide-card-footer"><span>Por {guide.author}</span><Link href={`/guias/${guide.slug}`} aria-label={`Ler ${guide.title}`}>Ler guia <LucideClientIcon name="ArrowRight" size={16} /></Link></div></article>)}</div>
          <AdSlot placement="catalog-inline" format="horizontal" className="editorial-ad-slot" />
          <section className="editorial-method-card"><div><span className="editorial-kicker">Critério editorial</span><h2>Conteúdo que acompanha a ferramenta, não texto para preencher espaço.</h2></div><p>Cada guia explica uma decisão concreta, apresenta limites que o utilizador pode verificar, indica quando uma ferramenta diferente é mais adequada e recomenda uma revisão antes do download. Não usamos uma única descrição repetida em todas as páginas.</p></section>
        </div>
        <aside className="editorial-side-column"><div className="editorial-side-card"><span className="editorial-side-icon"><LucideClientIcon name="Search" size={21} /></span><h2>Não sabe qual ferramenta usar?</h2><p>Comece pelo catálogo e filtre por combinar, organizar, editar, converter, OCR ou proteger.</p><Link href="/ferramentas">Explorar ferramentas <LucideClientIcon name="ArrowRight" size={16} /></Link></div><div className="editorial-side-card muted"><h2>Processamento local</h2><p>Quando indicado na ferramenta, o documento é processado no navegador. Leia sempre o aviso apresentado antes de iniciar.</p><Link href="/privacidade">Entender privacidade <LucideClientIcon name="ArrowRight" size={16} /></Link></div></aside>
      </section>
    </main>
  </>;
}
