import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Clock3, Search, Wrench } from "lucide-react";
import { AdSlot } from "@/components/AdSlot";
import { ToolIcon } from "@/components/ToolIcon";
import { guides } from "@/lib/guides";
import { toolBySlug } from "@/lib/tools";

export const metadata: Metadata = {
  title: "Guias e tutoriais sobre PDF",
  description: "Tutoriais em português para editar, converter, compactar, assinar, organizar e proteger documentos PDF.",
  alternates: { canonical: "/guias" },
};

export default function GuidesPage() {
  const relatedTools = ["editar-pdf", "pdf-para-jpg", "assinar-pdf", "compactar-pdf"]
    .map((slug) => toolBySlug.get(slug as never))
    .filter((tool) => tool !== undefined);
  return (
    <div className="guides-page">
      <section className="guides-heading"><div className="container"><span className="eyebrow"><BookOpen size={15} /> Conteúdo LIM PDF</span><h1>Guias e tutoriais sobre PDF</h1><p>Aprenda a editar, converter, organizar e proteger documentos com passos claros e exemplos práticos.</p><form className="guides-search" action="/guias"><Search size={18} /><input name="busca" placeholder="Pesquisar artigos e guias..." /></form></div></section>
      <div className="container guides-layout">
        <main>
          <div className="guide-grid refined-guide-grid">{guides.map((guide) => <article className="guide-card refined-guide-card" key={guide.slug}><span className="guide-category">Guia prático</span><h2>{guide.title}</h2><p>{guide.description}</p><div><span><Clock3 size={14} /> {guide.readingTime}</span><Link href={`/guias/${guide.slug}`}>Ler guia <ArrowRight size={15} /></Link></div></article>)}</div>
          <AdSlot placement="guides-inline" format="horizontal" />
          <section className="guides-faq"><h2>Perguntas frequentes sobre PDF</h2><details><summary>Como editar texto em um PDF?</summary><p>Use o editor visual para selecionar um bloco detectado, substituir o conteúdo e exportar uma nova cópia.</p></details><details><summary>Os arquivos ficam salvos no site?</summary><p>Não. A sessão pode ser armazenada temporariamente no navegador e expira automaticamente.</p></details><details><summary>É necessário criar conta?</summary><p>Não. Todas as ferramentas publicadas funcionam sem login.</p></details></section>
        </main>
        <aside className="guides-sidebar">
          <section><h2><Wrench size={18} /> Ferramentas relacionadas</h2>{relatedTools.map((tool) => <Link href={`/ferramentas/${tool.slug}`} key={tool.slug}><span className={`mini-tool-icon accent-${tool.accent}`}><ToolIcon icon={tool.icon} /></span><span><strong>{tool.name}</strong><small>{tool.shortDescription}</small></span><ArrowRight size={15} /></Link>)}</section>
          <AdSlot placement="guides-side" format="rectangle" />
        </aside>
      </div>
    </div>
  );
}
