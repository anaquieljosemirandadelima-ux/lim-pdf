"use client";

import Link from "next/link";
import { FileOutput, FileStack, FileText, Grid2X2, PencilLine, Search, ShieldCheck, Signature, SlidersHorizontal } from "lucide-react";
import { usePathname } from "next/navigation";

type SidebarItem = {
  href: string;
  label: string;
  icon: typeof FileStack;
  match: (path: string) => boolean;
  section?: "main" | "workflow" | "special";
};

const items: SidebarItem[] = [
  { href: "/", label: "Início", icon: FileStack, section: "main", match: (path) => path === "/" },
  { href: "/ferramentas", label: "Todas as ferramentas", icon: Grid2X2, section: "main", match: (path) => path === "/ferramentas" },
  { href: "/ferramentas/editar-pdf", label: "Editar PDF", icon: PencilLine, section: "workflow", match: (path) => path.includes("editar-pdf") || /adicionar-texto|adicionar-imagem|destacar-texto|marca-dagua|marcar-confidencial|cabecalho-rodape|adicionar-fundo|anotacoes-pdf|links-pdf|editar-metadados/.test(path) },
  { href: "/categorias/organizar", label: "Organizar PDF", icon: Grid2X2, section: "workflow", match: (path) => path.includes("/categorias/organizar") || /juntar-pdf|dividir-pdf|extrair-paginas|excluir-paginas|organizar-paginas|girar-pdf|duplicar-paginas|inserir-pagina|alternar-pdfs|sobrepor-pdfs|bookmarks-pdf|numeracao-bates/.test(path) },
  { href: "/ferramentas/converter-pdf", label: "Converter PDF", icon: FileOutput, section: "workflow", match: (path) => path.includes("/ferramentas/converter-pdf") || path.includes("/categorias/converter") || /pdf-para-|word-para-pdf|excel-para-pdf|imagens-para-pdf|powerpoint-para-pdf|extrair-texto/.test(path) },
  { href: "/ferramentas/ocr-pdf", label: "OCR e digitalização", icon: Search, section: "workflow", match: (path) => /ocr-pdf|limpar-documento-digitalizado/.test(path) },
  { href: "/categorias/otimizar", label: "Otimizar PDF", icon: SlidersHorizontal, section: "workflow", match: (path) => path.includes("/categorias/otimizar") || /compactar-pdf|redimensionar|dimensionar-pdf|recortar|livreto|paginas-por-folha|reparar-pdf|pdf-a|otimizar-pdf-avancado/.test(path) },
  { href: "/categorias/assinar", label: "Assinar PDF", icon: Signature, section: "special", match: (path) => path.includes("/categorias/assinar") || /assinar-pdf|assinatura-digital-pdf/.test(path) },
  { href: "/categorias/formularios", label: "Formulários PDF", icon: FileText, section: "special", match: (path) => path.includes("/categorias/formularios") || /formulario-pdf|preencher-formulario|achatar-formulario/.test(path) },
  { href: "/categorias/seguranca", label: "Segurança PDF", icon: ShieldCheck, section: "special", match: (path) => path.includes("/categorias/seguranca") || /proteger-pdf|desbloquear-pdf|permissoes-pdf|remover-metadados|marcar-confidencial/.test(path) },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="reference-sidebar" aria-label="Navegação principal">
      {items.map((item, index) => {
        const Icon = item.icon;
        const active = item.match(pathname);
        const previous = items[index - 1];
        const divider = previous && previous.section !== item.section;
        return (
          <div className="sidebar-item-wrap" key={item.href}>
            {divider ? <span className="sidebar-divider" aria-hidden="true" /> : null}
            <Link href={item.href} aria-label={item.label} className={active ? "active" : ""}>
              <Icon size={20} strokeWidth={1.9} />
              <span className="sidebar-hover-label">{item.label}</span>
            </Link>
          </div>
        );
      })}
    </aside>
  );
}
