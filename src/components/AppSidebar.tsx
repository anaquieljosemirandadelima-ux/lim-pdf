"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileOutput, FileStack, Grid2X2, PencilLine, SlidersHorizontal, ShieldCheck } from "lucide-react";

const items = [
  { href: "/", label: "Início", icon: FileStack, match: (path: string) => path === "/" },
  { href: "/ferramentas", label: "Todas as ferramentas", icon: Grid2X2, match: (path: string) => path === "/ferramentas" },
  { href: "/categorias/converter", label: "Converter", icon: FileOutput, match: (path: string) => path.includes("/categorias/converter") || /pdf-para-|imagens-para-pdf|extrair-texto/.test(path) },
  { href: "/categorias/seguranca", label: "Proteger", icon: ShieldCheck, match: (path: string) => path.includes("/categorias/seguranca") || /remover-metadados|achatar-formulario/.test(path) },
  { href: "/ferramentas/editar-pdf", label: "Editar PDF", icon: PencilLine, match: (path: string) => path.includes("editar-pdf") || /adicionar-texto|adicionar-imagem|assinar-pdf|marca-dagua/.test(path) },
  { href: "/categorias/otimizar", label: "Otimizar", icon: SlidersHorizontal, match: (path: string) => path.includes("/categorias/otimizar") || /compactar-pdf|redimensionar|recortar|livreto|paginas-por-folha/.test(path) },
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
            title={item.label}
            className={active ? "active" : ""}
          >
            <Icon size={21} strokeWidth={1.9} />
          </Link>
        );
      })}
    </aside>
  );
}
