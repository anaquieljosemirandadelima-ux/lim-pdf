"use client";

import Link from "next/link";
import {
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
import { HeaderToolSearch } from "@/components/HeaderToolSearch";
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

  return (
    <aside className="reference-sidebar" aria-label="Navegação principal">
      <div className="sidebar-brand"><Logo /></div>
      <div className="sidebar-search"><HeaderToolSearch /></div>
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
    </aside>
  );
}
