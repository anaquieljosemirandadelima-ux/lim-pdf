import { Globe2, Repeat2, ShieldCheck, Sparkles } from "lucide-react";

const items = [
  { icon: ShieldCheck, accent: "red", title: "100% Seguro", text: "Seus arquivos são protegidos durante o processamento." },
  { icon: Sparkles, accent: "purple", title: "Rápido", text: "Processamento otimizado direto no navegador." },
  { icon: Globe2, accent: "blue", title: "Sem instalação", text: "Use de qualquer dispositivo, onde estiver." },
  { icon: Repeat2, accent: "green", title: "Sem limites", text: "Ferramentas gratuitas e sem cadastro." },
];

export function TrustStrip() {
  return (
    <section className="reference-trust-wrap" aria-label="Benefícios do LIM PDF">
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
