import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, ShieldCheck } from "lucide-react";
import { guides } from "@/lib/guides";

export const metadata: Metadata = {
  title: "Guias práticos sobre PDF, OCR, edição e segurança",
  description: "Conteúdo original do LIM PDF para editar, reconhecer, comprimir, proteger, assinar e arquivar documentos com mais segurança.",
  alternates: { canonical: "/guias" },
};

export default function GuidesPage() {
  return <section className="knowledge-page"><header className="knowledge-hero"><span><BookOpen size={18} /> Central de conhecimento</span><h1>PDF sem complicação.</h1><p>Guias escritos para explicar o que cada operação realmente faz, onde costuma dar errado e como revisar o arquivo final.</p></header><div className="knowledge-grid">{guides.map((guide) => <Link href={`/guias/${guide.slug}`} key={guide.slug}><span className="knowledge-card-icon"><BookOpen size={20} /></span><strong>{guide.title}</strong><p>{guide.description}</p><small>Ler guia <ArrowRight size={14} /></small></Link>)}</div><div className="knowledge-trust"><ShieldCheck size={20} /><div><strong>Conteúdo do produto, não texto para preencher página</strong><p>Os guias descrevem limitações reais e apontam para as ferramentas correspondentes. O objetivo é ajudar você a escolher e revisar o processamento correto.</p></div></div></section>;
}
