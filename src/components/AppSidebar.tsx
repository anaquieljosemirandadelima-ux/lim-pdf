"use client";

import Link from "next/link";
import {
  ArrowRight,
  FileOutput,
  Files,
  Grid2X2,
  Home,
  ListChecks,
  PencilLine,
  Repeat2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/Logo";
import { navigationGroups, type NavigationGroup } from "@/lib/navigation";

type SidebarItem = {
  href: string;
  label: string;
  icon: typeof Files;
  match: (path: string) => boolean;
};

const journeyIcons: Record<NavigationGroup["slug"], typeof Files> = {
  organizar: Grid2X2,
  editar: PencilLine,
  converter: Repeat2,
  formularios: ListChecks,
  seguranca: ShieldCheck,
  otimizar: Sparkles,
  automacao: Files,
};

const coreItems: SidebarItem[] = [
  { href: "/", label: "Início", icon: Home, match: (path) => path === "/" },
  { href: "/ferramentas", label: "Todas as ferramentas", icon: Grid2X2, match: (path) => path === "/ferramentas" },
];

const recommendations = [
  { title: "Converter PDF em Word", description: "Transforme seu arquivo em documento editável", href: "/ferramentas/pdf-para-word", icon: FileOutput },
  { title: "Assinar PDF", description: "Adicione sua assinatura rapidamente", href: "/ferramentas/assinar-pdf", icon: ShieldCheck },
  { title: "Organizar páginas", description: "Reordene, duplique ou remova páginas", href: "/ferramentas/organizar-paginas", icon: Grid2X2 },
  { title: "Comprimir PDF", description: "Reduza o tamanho sem perder praticidade", href: "/ferramentas/compactar-pdf", icon: Sparkles },
] as const;

function SidebarLink({ item, pathname }: { item: SidebarItem; pathname: string }) {
  const Icon = item.icon;
  const active = item.match(pathname);
  return (
    <div className="sidebar-item-wrap" key={item.href}>
      <Link href={item.href} aria-current={active ? "page" : undefined} className={active ? "active" : ""}>
        <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
        <span className="sidebar-hover-label">{item.label}</span>
      </Link>
    </div>
  );
}

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
      <nav className="sidebar-navigation" aria-label="Explorar o LIM PDF">
        <div className="sidebar-nav-section">
          <span className="sidebar-nav-heading">Começar</span>
          {coreItems.map((item) => <SidebarLink item={item} pathname={pathname} key={item.href} />)}
        </div>

        <div className="sidebar-nav-section sidebar-journeys">
          <span className="sidebar-nav-heading">Jornadas</span>
          {navigationGroups.map((group) => {
            const Icon = journeyIcons[group.slug];
            const item: SidebarItem = {
              href: `/categorias/${group.slug}`,
              label: group.label,
              icon: Icon,
              match: (path) => path.startsWith(`/categorias/${group.slug}`),
            };
            return <SidebarLink item={item} pathname={pathname} key={group.slug} />;
          })}
        </div>

      </nav>

      <section className="sidebar-recommendation" aria-label="Sugestão de ferramenta">
        <div className="sidebar-development-note" role="note" aria-label="LIM PDF gratuito">
          <span className="sidebar-development-orb" aria-hidden="true" />
          <span className="sidebar-development-copy">
            <strong>Tudo gratuito no LIM PDF</strong>
            <span className="sidebar-development-text">Processamento local, sem assinatura obrigatória e sem bloquear downloads.</span>
            <span className="sidebar-development-chip">100% gratuito</span>
          </span>
        </div>

        <div className="sidebar-recommendation-card" key={recommendation.title}>
          <span className="sidebar-recommendation-icon"><RecommendationIcon size={24} aria-hidden="true" /></span>
          <strong>{recommendation.title}</strong>
          <p>{recommendation.description}</p>
          <Link href={recommendation.href}>Usar agora <ArrowRight size={14} aria-hidden="true" /></Link>
        </div>
      </section>
    </aside>
  );
}
