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
        <div className="sidebar-development-note" role="note" aria-label="LIM PDF em desenvolvimento">
          <span className="sidebar-development-orb" aria-hidden="true" />
          <span className="sidebar-development-copy">
            <span className="sidebar-development-title-row">
              <strong>LIM PDF em evolução</strong>
              <span className="sidebar-development-chip">Em desenvolvimento</span>
            </span>
            <span className="sidebar-development-text">Algumas funções ainda estão sendo aprimoradas.</span>
          </span>
        </div>

        <div className="sidebar-recommendation-card" key={recommendation.title}>
          <span className="sidebar-recommendation-icon"><RecommendationIcon size={24} /></span>
          <strong>{recommendation.title}</strong>
          <p>{recommendation.description}</p>
          <Link href={recommendation.href}>Usar agora <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <style jsx>{`
        .sidebar-development-note {
          position: relative;
          display: grid;
          grid-template-columns: 26px minmax(0, 1fr);
          align-items: center;
          gap: 9px;
          width: 100%;
          min-height: 58px;
          margin-bottom: 8px;
          padding: 9px 10px;
          box-sizing: border-box;
          overflow: hidden;
          border: 1px solid #e7e9ee;
          border-radius: 12px;
          background: #ffffff;
          box-shadow: 0 5px 16px rgba(25, 28, 34, 0.05);
        }

        .sidebar-development-note::after {
          content: "";
          position: absolute;
          left: 0;
          bottom: 0;
          width: 34%;
          height: 2px;
          border-radius: 999px;
          background: #f0181f;
          opacity: 0.72;
          transform: translateX(-120%);
          animation: sidebar-development-sweep 4.6s ease-in-out infinite;
        }

        .sidebar-development-orb {
          position: relative;
          width: 26px;
          height: 26px;
          border: 1px solid #ffd8da;
          border-radius: 50%;
          background: #fff5f5;
          box-shadow: inset 0 0 0 5px #fffafa;
        }

        .sidebar-development-orb::before,
        .sidebar-development-orb::after {
          content: "";
          position: absolute;
          top: 50%;
          left: 50%;
          border-radius: 50%;
          transform: translate(-50%, -50%);
        }

        .sidebar-development-orb::before {
          width: 7px;
          height: 7px;
          background: #f0181f;
          box-shadow: 0 0 0 3px rgba(240, 24, 31, 0.08);
        }

        .sidebar-development-orb::after {
          width: 9px;
          height: 9px;
          border: 1px solid rgba(240, 24, 31, 0.38);
          animation: sidebar-development-pulse 2.4s ease-out infinite;
        }

        .sidebar-development-copy {
          min-width: 0;
        }

        .sidebar-development-title-row {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }

        .sidebar-development-title-row strong {
          color: #20242c;
          white-space: nowrap;
          font-size: 10.5px;
          font-weight: 800;
          line-height: 1.2;
          letter-spacing: -0.01em;
        }

        .sidebar-development-chip {
          flex: 0 0 auto;
          padding: 3px 5px;
          border: 1px solid #ffdadd;
          border-radius: 999px;
          background: #fff5f5;
          color: #d71920;
          font-size: 7px;
          font-weight: 800;
          line-height: 1;
          letter-spacing: 0.035em;
          text-transform: uppercase;
        }

        .sidebar-development-text {
          display: block;
          margin-top: 4px;
          color: #79818e;
          font-size: 8.8px;
          font-weight: 500;
          line-height: 1.35;
        }

        @keyframes sidebar-development-pulse {
          0% {
            opacity: 0.75;
            transform: translate(-50%, -50%) scale(1);
          }
          70%, 100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(2.15);
          }
        }

        @keyframes sidebar-development-sweep {
          0%, 14% {
            transform: translateX(-120%);
          }
          48%, 62% {
            transform: translateX(292%);
          }
          100% {
            transform: translateX(292%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .sidebar-development-note::after,
          .sidebar-development-orb::after {
            animation: none;
          }
        }

        @media (max-height: 850px) and (min-width: 761px) {
          .sidebar-development-note {
            min-height: 50px;
            margin-bottom: 6px;
            padding: 7px 9px;
          }

          .sidebar-development-orb {
            width: 23px;
            height: 23px;
          }

          .sidebar-development-chip {
            display: none;
          }

          .sidebar-development-text {
            margin-top: 3px;
            font-size: 8.4px;
          }
        }
      `}</style>
    </aside>
  );
}
