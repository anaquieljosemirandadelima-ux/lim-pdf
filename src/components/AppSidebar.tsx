"use client";

import Link from "next/link";
import {
  FileOutput,
  Files,
  Grid2X2,
  Home,
  Layers3,
  Minimize2,
  PencilLine,
  ScanText,
  ShieldCheck,
  Signature,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { HeaderToolSearch } from "@/components/HeaderToolSearch";
import { Logo } from "@/components/Logo";

type SidebarItem = {
  href: string;
  label: string;
  icon: typeof Files;
  match: (path: string) => boolean;
};

const items: SidebarItem[] = [
  { href: "/", label: "Início", icon: Home, match: (path) => path === "/" },
  { href: "/ferramentas/editar-pdf", label: "Editor de PDF", icon: PencilLine, match: (path) => path.includes("editar-pdf") || /adicionar-texto|adicionar-imagem|destacar-texto|marca-dagua|marcar-confidencial|cabecalho-rodape|adicionar-fundo|anotacoes-pdf|links-pdf|editar-metadados/.test(path) },
  { href: "/ferramentas/juntar-pdf", label: "Juntar PDF", icon: Files, match: (path) => path.includes("juntar-pdf") },
  { href: "/ferramentas/compactar-pdf", label: "Comprimir PDF", icon: Minimize2, match: (path) => path.includes("compactar-pdf") },
  { href: "/ferramentas/converter-pdf", label: "Converter PDF", icon: FileOutput, match: (path) => path.includes("/ferramentas/converter-pdf") || path.includes("/categorias/converter") || /pdf-para-|word-para-pdf|excel-para-pdf|imagens-para-pdf|powerpoint-para-pdf|extrair-texto/.test(path) },
  { href: "/ferramentas/organizar-paginas", label: "Organizar PDF", icon: Layers3, match: (path) => path.includes("/categorias/organizar") || /dividir-pdf|extrair-paginas|excluir-paginas|organizar-paginas|girar-pdf|duplicar-paginas|inserir-pagina|alternar-pdfs|sobrepor-pdfs|bookmarks-pdf|numeracao-bates/.test(path) },
  { href: "/ferramentas/assinar-pdf", label: "Assinar PDF", icon: Signature, match: (path) => /assinar-pdf|assinatura-digital-pdf/.test(path) },
  { href: "/ferramentas/proteger-pdf", label: "Proteger PDF", icon: ShieldCheck, match: (path) => /proteger-pdf|desbloquear-pdf|permissoes-pdf|remover-metadados|marcar-confidencial/.test(path) },
  { href: "/ferramentas/ocr-pdf", label: "OCR PDF", icon: ScanText, match: (path) => /ocr-pdf|limpar-documento-digitalizado/.test(path) },
  { href: "/ferramentas", label: "Todas as ferramentas", icon: Grid2X2, match: (path) => path === "/ferramentas" },
];

const recommendations = [
  { title: "Converter PDF em Word", description: "Transforme seu arquivo em documento editável", href: "/ferramentas/pdf-para-word", icon: FileOutput },
  { title: "Assinar PDF", description: "Adicione sua assinatura rapidamente", href: "/ferramentas/assinar-pdf", icon: Signature },
  { title: "Organizar páginas", description: "Reordene, duplique ou remova páginas", href: "/ferramentas/organizar-paginas", icon: Layers3 },
  { title: "Comprimir PDF", description: "Reduza o tamanho sem perder praticidade", href: "/ferramentas/compactar-pdf", icon: Minimize2 },
  { title: "Proteger PDF", description: "Adicione senha e proteja seu documento", href: "/ferramentas/proteger-pdf", icon: ShieldCheck },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const [recommendationIndex, setRecommendationIndex] = useState(0);
  const recommendation = useMemo(() => recommendations[recommendationIndex % recommendations.length], [recommendationIndex]);
  const RecommendationIcon = recommendation.icon;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRecommendationIndex((index) => (index + 1) % recommendations.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <aside className="reference-sidebar" aria-label="Navegação principal">
      <div className="sidebar-brand"><Logo /></div>
      <div className="sidebar-search"><HeaderToolSearch /></div>

      <nav className="sidebar-navigation" aria-label="Ferramentas principais">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.match(pathname);
          return (
            <div className="sidebar-item-wrap" key={item.href}>
              <Link href={item.href} aria-current={active ? "page" : undefined} className={active ? "active" : ""}>
                <Icon size={19} strokeWidth={1.8} />
                <span className="sidebar-hover-label">{item.label}</span>
              </Link>
            </div>
          );
        })}
      </nav>

      <section className="sidebar-recommendation" aria-label="Sugestão de ferramenta">
        <div
          role="note"
          aria-label="Site em desenvolvimento"
          style={{
            width: "100%",
            marginBottom: 8,
            padding: "8px 10px",
            boxSizing: "border-box",
            border: "1px solid #f1dfb5",
            borderLeft: "3px solid #e5a600",
            borderRadius: 10,
            background: "linear-gradient(180deg, #fffdf7 0%, #fff9eb 100%)",
            color: "#685632",
            fontSize: 10,
            lineHeight: 1.35,
            fontWeight: 700,
          }}
        >
          Site em desenvolvimento
          <span
            style={{
              display: "block",
              marginTop: 2,
              color: "#8a7650",
              fontSize: 9,
              fontWeight: 500,
              lineHeight: 1.35,
            }}
          >
            Algumas funções ainda estão sendo aprimoradas.
          </span>
        </div>
        <div className="sidebar-recommendation-card" key={recommendation.title}>
          <span className="sidebar-recommendation-icon"><RecommendationIcon size={24} /></span>
          <strong>{recommendation.title}</strong>
          <p>{recommendation.description}</p>
          <Link href={recommendation.href}>Usar agora <span aria-hidden="true">→</span></Link>
        </div>
      </section>
    </aside>
  );
}
