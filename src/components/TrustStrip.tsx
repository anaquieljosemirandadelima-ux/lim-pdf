import { Globe2, Repeat2, ShieldCheck, Sparkles } from "lucide-react";

const items = [
  { icon: ShieldCheck, accent: "red", title: "Processamento local", text: "Quando indicado, o documento é processado no próprio navegador." },
  { icon: Sparkles, accent: "purple", title: "Sem cadastro", text: "As ferramentas principais podem ser usadas diretamente." },
  { icon: Globe2, accent: "blue", title: "Privacidade clara", text: "O LIM PDF não usa o conteúdo do documento para publicidade." },
  { icon: Repeat2, accent: "green", title: "Fluxos conectados", text: "Continue para OCR, edição, conversão ou proteção sem procurar do zero." },
];

export function TrustStrip() {
  return (
    <section className="reference-trust-wrap" aria-label="Como o LIM PDF funciona">
      <div className="reference-trust-strip">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div className="reference-trust-item" key={item.title}>
              <span className={`trust-icon ${item.accent}`}><Icon size={30} strokeWidth={2} /></span>
              <div><strong>{item.title}</strong><small>{item.text}</small></div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
