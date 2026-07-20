import Link from "next/link";
import { ArrowRight, FileQuestion } from "lucide-react";
export default function NotFound() { return <section className="not-found-page"><div className="container narrow"><FileQuestion size={54} /><span className="eyebrow">Erro 404</span><h1>Página não encontrada</h1><p>O endereço pode ter mudado ou a ferramenta ainda não está disponível.</p><Link className="primary-button" href="/ferramentas">Ver ferramentas <ArrowRight size={17} /></Link></div></section>; }
