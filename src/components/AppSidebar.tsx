"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileOutput, FileStack, Grid2X2, PencilLine, SlidersHorizontal, ShieldCheck } from "lucide-react";

const items = [
  { href: "/", label: "Início", icon: FileStack, match: (path: string) => path === "/" },
  { href: "/ferramentas", label: "Todas as ferramentas", icon: Grid2X2, match: (path: string) => path === "/ferramentas" },
  { href: "/ferramentas/converter-pdf", label: "Converter PDF", icon: FileOutput, match: (path: string) => path.includes("/ferramentas/converter-pdf") || path.includes("/categorias/converter") || /pdf-para-|word-para-pdf|excel-para-pdf|imagens-para-pdf|extrair-texto/.test(path) },
  { href: "/categorias/seguranca", label: "Proteger PDF", icon: ShieldCheck, match: (path: string) => path.includes("/categorias/seguranca") || /proteger-pdf|desbloquear-pdf|permissoes-pdf|remover-metadados|achatar-formulario/.test(path) },
  { href: "/ferramentas/editar-pdf", label: "Editar PDF", icon: PencilLine, match: (path: string) => path.includes("editar-pdf") || /adicionar-texto|adicionar-imagem|assinar-pdf|marca-dagua|destacar-texto|marcar-confidencial/.test(path) },
  { href: "/categorias/otimizar", label: "Otimizar PDF", icon: SlidersHorizontal, match: (path: string) => path.includes("/categorias/otimizar") || /compactar-pdf|redimensionar|dimensionar-pdf|recortar|livreto|paginas-por-folha/.test(path) },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="reference-sidebar" aria-label="Navegação principal">
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            className={active ? "active" : ""}
          >
            <Icon size={21} strokeWidth={1.9} />
            <span className="sidebar-hover-label">{item.label}</span>
          </Link>
        );
      })}
    </aside>
  );
}
