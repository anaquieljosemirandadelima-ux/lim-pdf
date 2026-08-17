"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("LIM PDF application error", error);
  }, [error]);

  return (
    <main className="app-error-page" aria-labelledby="app-error-title">
      <div className="app-error-card">
        <p className="eyebrow">LIM PDF</p>
        <h1 id="app-error-title">Não foi possível concluir esta página.</h1>
        <p>O ficheiro permanece no seu dispositivo. Tente novamente ou volte ao início para escolher outra ferramenta.</p>
        <div className="app-error-actions">
          <button type="button" className="primary-button" onClick={() => reset()}>Tentar novamente</button>
          <Link className="secondary-button" href="/">Voltar ao início</Link>
        </div>
      </div>
    </main>
  );
}
