import Link from "next/link";
import { Globe2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { PrivacyPreferencesButton } from "@/components/ConsentBanner";

const columns = [
  {
    title: "Ferramentas",
    links: [
      ["Todas as ferramentas", "/ferramentas"],
      ["Editar PDF", "/ferramentas/editar-pdf"],
      ["Converter PDF", "/categorias/converter"],
      ["Organizar PDF", "/categorias/organizar"],
      ["Compactar PDF", "/ferramentas/compactar-pdf"],
    ],
  },
  {
    title: "Recursos",
    links: [
      ["Guias e tutoriais", "/guias"],
      ["Segurança dos arquivos", "/seguranca"],
      ["Perguntas frequentes", "/guias"],
      ["Acessibilidade", "/acessibilidade"],
      ["Contato", "/contato"],
    ],
  },
  {
    title: "Institucional",
    links: [
      ["Sobre o LIM PDF", "/sobre"],
      ["Termos de uso", "/termos"],
      ["Política de privacidade", "/privacidade"],
      ["Política de cookies", "/cookies"],
    ],
  },
];

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Logo />
          <p>Ferramentas gratuitas para editar, organizar, converter, assinar e otimizar documentos PDF diretamente no navegador.</p>
          <div className="footer-language"><Globe2 size={15} /> Português (Brasil)</div>
        </div>
        {columns.map((column) => (
          <div className="footer-column" key={column.title}>
            <h2>{column.title}</h2>
            <ul>{column.links.map(([label, href]) => <li key={href}><Link href={href}>{label}</Link></li>)}</ul>
          </div>
        ))}
        <div className="footer-column footer-privacy-column">
          <h2>Privacidade</h2>
          <p>Arquivos processados localmente e cache temporário com expiração automática.</p>
          <PrivacyPreferencesButton />
        </div>
      </div>
      <div className="container footer-bottom"><span>© {new Date().getFullYear()} LIM PDF. Todos os direitos reservados.</span><span>Sem login · Sem marca-d’água · Processamento local</span></div>
    </footer>
  );
}
