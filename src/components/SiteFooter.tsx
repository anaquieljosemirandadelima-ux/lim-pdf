import Link from "next/link";
import { FileText, ShieldCheck } from "lucide-react";
import { PrivacyPreferencesButton } from "@/components/ConsentBanner";

export function SiteFooter() {
  return <footer className="site-footer"><div className="site-footer-inner"><div className="site-footer-brand"><span><FileText size={20} /></span><div><strong>LIM PDF</strong><small>Ferramentas PDF gratuitas e objetivas.</small></div></div><nav aria-label="Informações do site"><div><strong>Produto</strong><Link href="/ferramentas">Ferramentas</Link><Link href="/ferramentas/editar-pdf">Editar PDF</Link><Link href="/ferramentas/converter-pdf">Converter</Link><Link href="/guias">Guias</Link></div><div><strong>Transparência</strong><Link href="/sobre">Sobre</Link><Link href="/seguranca">Segurança</Link><Link href="/privacidade">Privacidade</Link><Link href="/cookies">Cookies</Link></div><div><strong>Suporte</strong><Link href="/contato">Contato</Link><Link href="/termos">Termos</Link><Link href="/acessibilidade">Acessibilidade</Link><PrivacyPreferencesButton /></div></nav></div><div className="site-footer-bottom"><span><ShieldCheck size={14} /> O conteúdo dos arquivos processados localmente não é usado para publicidade.</span><small>© {new Date().getFullYear()} LIM PDF</small></div></footer>;
}
