import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ListChecks } from "lucide-react";
import { ToolIcon } from "@/components/ToolIcon";
import { allToolBySlug } from "@/lib/all-tools";
import { proTools } from "@/lib/pro-tools";

export const metadata: Metadata = {
  title: "Formulários PDF grátis e online",
  description: "Crie, preencha e achate formulários PDF diretamente no navegador, incluindo campos de assinatura digital.",
  alternates: { canonical: "/categorias/formularios" },
};

export default function FormsCategoryPage() {
  const proForm = proTools.find((tool) => tool.slug === "criar-formulario-pdf");
  const tools = [proForm, allToolBySlug.get("preencher-formulario-pdf"), allToolBySlug.get("achatar-formulario-pdf")].filter(Boolean);
  return <section className="reference-category-page">
    <div className="reference-category-heading"><span className="reference-heading-icon accent-teal"><ListChecks size={23} /></span><div><h1>Formulários PDF</h1><p>Crie campos preenchíveis, complete formulários existentes e gere cópias achatadas para distribuição.</p></div></div>
    <div className="reference-category-tools">{tools.map((tool) => tool ? <Link className={`reference-tool-card accent-${tool.accent}`} href={`/ferramentas/${tool.slug}`} key={tool.slug}><span className="reference-tool-icon"><ToolIcon icon={tool.icon} /></span><strong>{tool.name}</strong><small>{tool.shortDescription}</small><ArrowRight size={18} /></Link> : null)}</div>
  </section>;
}
