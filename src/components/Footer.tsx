"use client";

import Link from "next/link";
import { Globe2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { PrivacyPreferencesButton } from "@/components/ConsentBanner";
import { getLanguage } from "@/lib/i18n";
import { uiText } from "@/lib/i18n-content";
import { useLanguage } from "@/lib/use-language";

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
      ["Segurança dos arquivos", "/seguranca"],
      ["Perguntas frequentes", "/faq"],
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
  const language = useLanguage();
  const currentLanguage = getLanguage(language);
  const text = uiText[language];
  const localizedColumns = language === "pt-BR" ? columns : [
    { title: language === "en" ? "Tools" : "Herramientas", links: columns[0].links },
    { title: language === "en" ? "Resources" : "Recursos", links: columns[1].links },
    { title: language === "en" ? "Company" : "Institucional", links: columns[2].links },
  ];
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Logo />
          <p>{text.footerDescription}</p>
          <div className="footer-language"><Globe2 size={15} /> {currentLanguage.nativeLabel}</div>
        </div>
        {localizedColumns.map((column) => (
          <div className="footer-column" key={column.title}>
            <h2>{column.title}</h2>
            <ul>{column.links.map(([label, href]) => <li key={href}><Link href={href}>{label}</Link></li>)}</ul>
          </div>
        ))}
        <div className="footer-column footer-privacy-column">
          <h2>{text.privacy}</h2>
          <p>{text.privacyText}</p>
          <PrivacyPreferencesButton />
        </div>
      </div>
      <div className="container footer-bottom"><span>© {new Date().getFullYear()} LIM PDF. {text.rights}</span><span>{text.footerBadge}</span></div>
    </footer>
  );
}
