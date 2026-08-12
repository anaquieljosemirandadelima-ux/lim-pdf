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
import { useEffect, useMemo, useRef, useState } from "react";
import { HeaderToolSearch } from "@/components/HeaderToolSearch";
import { Logo } from "@/components/Logo";

type SidebarItem = {
  href: string;
  label: string;
  icon: typeof Files;
  match: (path: string) => boolean;
};

type TrailLayout = {
  width: number;
  height: number;
  originX: number;
  originY: number;
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
  const developmentNoteRef = useRef<HTMLDivElement | null>(null);
  const [recommendationIndex, setRecommendationIndex] = useState(0);
  const [trailLayout, setTrailLayout] = useState<TrailLayout>({ width: 0, height: 0, originX: 0, originY: 0 });
  const recommendation = useMemo(() => recommendations[recommendationIndex % recommendations.length], [recommendationIndex]);
  const RecommendationIcon = recommendation.icon;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRecommendationIndex((index) => (index + 1) % recommendations.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const updateTrailOrigin = () => {
      const note = developmentNoteRef.current;
      if (!note) return;
      const rect = note.getBoundingClientRect();
      setTrailLayout({
        width: window.innerWidth,
        height: window.innerHeight,
        originX: Math.round(rect.right - 2),
        originY: Math.round(rect.top + rect.height / 2),
      });
    };

    updateTrailOrigin();
    window.addEventListener("resize", updateTrailOrigin);
    window.addEventListener("scroll", updateTrailOrigin, { passive: true });

    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateTrailOrigin) : null;
    if (developmentNoteRef.current) observer?.observe(developmentNoteRef.current);

    return () => {
      window.removeEventListener("resize", updateTrailOrigin);
      window.removeEventListener("scroll", updateTrailOrigin);
      observer?.disconnect();
    };
  }, []);

  const trailPaths = useMemo(() => {
    const { width, height, originX, originY } = trailLayout;
    if (!width || !height || width <= 900) return [];

    const safeRight = Math.max(originX + 260, width - 120);
    const midX = Math.max(originX + 220, width * 0.5);
    const lowY = Math.min(height - 90, Math.max(originY + 120, height * 0.72));
    const highY = Math.max(90, Math.min(originY - 170, height * 0.22));

    return [
      `M ${originX} ${originY} C ${originX + 130} ${originY - 90}, ${midX * 0.9} ${highY}, ${safeRight} ${Math.max(120, height * 0.2)} S ${width * 0.9} ${height * 0.58}, ${width * 0.64} ${lowY} S ${width * 0.34} ${Math.min(height - 70, originY + 80)}, ${originX} ${originY}`,
      `M ${originX} ${originY} C ${originX + 170} ${originY + 85}, ${width * 0.42} ${height * 0.38}, ${width * 0.78} ${Math.min(height - 110, height * 0.56)} S ${width * 0.82} ${height * 0.82}, ${width * 0.52} ${Math.min(height - 60, height * 0.84)} S ${width * 0.3} ${Math.max(100, originY - 70)}, ${originX} ${originY}`,
    ];
  }, [trailLayout]);

  return (
    <>
      {trailPaths.length > 0 ? (
        <div className="site-development-trails" aria-hidden="true">
          <svg viewBox={`0 0 ${trailLayout.width} ${trailLayout.height}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="limpdf-trail-red" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#f0181f" stopOpacity="0" />
                <stop offset="55%" stopColor="#ff5560" stopOpacity="0.72" />
                <stop offset="100%" stopColor="#ff9c6a" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="limpdf-trail-violet" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#8a63ff" stopOpacity="0" />
                <stop offset="52%" stopColor="#c377ff" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#f0181f" stopOpacity="0" />
              </linearGradient>
            </defs>
            {trailPaths.map((path, index) => (
              <path
                key={path}
                d={path}
                pathLength="1000"
                className={`site-development-trail site-development-trail-${index + 1}`}
              />
            ))}
          </svg>
        </div>
      ) : null}

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
          <div ref={developmentNoteRef} className="sidebar-development-note" role="note" aria-label="LIM PDF em desenvolvimento">
            <span className="sidebar-development-orb" aria-hidden="true" />
            <span className="sidebar-development-copy">
              <strong>LIM PDF está evoluindo</strong>
              <span className="sidebar-development-text">Novas funções e melhorias estão chegando.</span>
              <span className="sidebar-development-chip">Em desenvolvimento</span>
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
            grid-template-columns: 30px minmax(0, 1fr);
            align-items: center;
            gap: 10px;
            width: 100%;
            min-height: 74px;
            margin-bottom: 8px;
            padding: 10px 11px;
            box-sizing: border-box;
            overflow: hidden;
            border: 1px solid rgba(240, 24, 31, 0.13);
            border-radius: 14px;
            background:
              radial-gradient(circle at 12% 20%, rgba(255, 182, 122, 0.13), transparent 34%),
              radial-gradient(circle at 92% 86%, rgba(173, 101, 255, 0.12), transparent 42%),
              linear-gradient(135deg, #fffdfa 0%, #fff8fa 54%, #fbf8ff 100%);
            box-shadow: 0 8px 22px rgba(33, 27, 50, 0.07), inset 0 1px 0 rgba(255, 255, 255, 0.92);
          }

          .sidebar-development-note::before {
            content: "";
            position: absolute;
            top: -35%;
            bottom: -35%;
            width: 30%;
            left: -38%;
            transform: rotate(18deg);
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.9), transparent);
            filter: blur(2px);
            animation: sidebar-development-shimmer 7.5s ease-in-out infinite;
            pointer-events: none;
          }

          .sidebar-development-note::after {
            content: "";
            position: absolute;
            inset: 0;
            border-radius: inherit;
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.72);
            pointer-events: none;
          }

          .sidebar-development-orb {
            position: relative;
            width: 30px;
            height: 30px;
            border: 1px solid rgba(240, 24, 31, 0.18);
            border-radius: 50%;
            background: radial-gradient(circle at 34% 32%, #fff 0 12%, #fff4f4 43%, #ffe7e9 100%);
            box-shadow: 0 6px 16px rgba(240, 24, 31, 0.13), inset 0 0 0 5px rgba(255, 255, 255, 0.72);
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
            width: 8px;
            height: 8px;
            background: radial-gradient(circle at 34% 30%, #ffb08b 0 16%, #ff5a63 46%, #f0181f 100%);
            box-shadow: 0 0 14px rgba(240, 24, 31, 0.42);
          }

          .sidebar-development-orb::after {
            width: 12px;
            height: 12px;
            border: 1px solid rgba(240, 24, 31, 0.34);
            animation: sidebar-development-pulse 2.65s ease-out infinite;
          }

          .sidebar-development-copy {
            min-width: 0;
            position: relative;
            z-index: 1;
          }

          .sidebar-development-copy > strong {
            display: block;
            color: #20242c;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-size: 10.6px;
            font-weight: 850;
            line-height: 1.18;
            letter-spacing: -0.015em;
          }

          .sidebar-development-text {
            display: block;
            margin-top: 4px;
            color: #747d8d;
            font-size: 8.7px;
            font-weight: 500;
            line-height: 1.3;
          }

          .sidebar-development-chip {
            display: inline-flex;
            align-items: center;
            min-height: 16px;
            margin-top: 6px;
            padding: 0 6px;
            border: 1px solid rgba(240, 24, 31, 0.13);
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.66);
            color: #d71920;
            font-size: 6.8px;
            font-weight: 850;
            line-height: 1;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            box-shadow: 0 3px 9px rgba(240, 24, 31, 0.06);
          }

          @keyframes sidebar-development-pulse {
            0% {
              opacity: 0.72;
              transform: translate(-50%, -50%) scale(0.94);
            }
            72%, 100% {
              opacity: 0;
              transform: translate(-50%, -50%) scale(2.35);
            }
          }

          @keyframes sidebar-development-shimmer {
            0%, 60% {
              opacity: 0;
              left: -38%;
            }
            68% {
              opacity: 0.78;
            }
            86% {
              opacity: 0.36;
              left: 118%;
            }
            100% {
              opacity: 0;
              left: 118%;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .sidebar-development-note::before,
            .sidebar-development-orb::after {
              animation: none;
            }
          }

          @media (max-height: 850px) and (min-width: 761px) {
            .sidebar-development-note {
              min-height: 58px;
              margin-bottom: 6px;
              padding: 8px 9px;
              grid-template-columns: 25px minmax(0, 1fr);
              gap: 8px;
            }

            .sidebar-development-orb {
              width: 25px;
              height: 25px;
            }

            .sidebar-development-chip {
              display: none;
            }

            .sidebar-development-text {
              margin-top: 3px;
              font-size: 8.2px;
            }
          }
        `}</style>
      </aside>

      <style jsx global>{`
        .site-development-trails {
          position: fixed;
          inset: 0;
          z-index: 205;
          pointer-events: none;
          overflow: hidden;
          opacity: 0.9;
        }

        .site-development-trails svg {
          display: block;
          width: 100%;
          height: 100%;
          overflow: visible;
        }

        .site-development-trail {
          fill: none;
          stroke-linecap: round;
          stroke-linejoin: round;
          opacity: 0;
          filter: drop-shadow(0 0 5px rgba(240, 24, 31, 0.12));
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        .site-development-trail-1 {
          stroke: url(#limpdf-trail-red);
          stroke-width: 2.2;
          stroke-dasharray: 68 932;
          animation-name: site-development-trail-run-1;
          animation-duration: 11.5s;
        }

        .site-development-trail-2 {
          stroke: url(#limpdf-trail-violet);
          stroke-width: 1.75;
          stroke-dasharray: 46 954;
          animation-name: site-development-trail-run-2;
          animation-duration: 15s;
          animation-delay: -5.2s;
        }

        @keyframes site-development-trail-run-1 {
          0%, 10% { stroke-dashoffset: 1000; opacity: 0; }
          15% { opacity: 0.55; }
          55% { opacity: 0.42; }
          90% { opacity: 0.26; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }

        @keyframes site-development-trail-run-2 {
          0%, 14% { stroke-dashoffset: 1000; opacity: 0; }
          20% { opacity: 0.38; }
          60% { opacity: 0.3; }
          92% { opacity: 0.2; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }

        @media (max-width: 900px), (prefers-reduced-motion: reduce) {
          .site-development-trails {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
