export default function Loading() {
  return (
    <main className="app-loading-page" aria-busy="true" aria-live="polite">
      <div className="app-loading-card">
        <span className="app-loading-spinner" aria-hidden="true" />
        <strong>A preparar o LIM PDF…</strong>
        <span>As ferramentas continuam a processar os seus ficheiros localmente.</span>
      </div>
    </main>
  );
}
