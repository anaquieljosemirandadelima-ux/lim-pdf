# Fontes técnicas do roadmap — 18 de agosto de 2026

## Impressão no navegador

A documentação oficial da MDN para `window.print()` informa que o método abre a caixa de diálogo de impressão do documento atual e bloqueia enquanto a caixa permanece aberta. Fonte: https://developer.mozilla.org/en-US/docs/Web/API/Window/print

Implicação para o LIM PDF: o Centro de Impressão deve gerar e revisar o PDF no navegador, preparar uma superfície específica para `@media print` e chamar `window.print()`. A escolha final de impressora, bandeja, duplex e spooler deve continuar na caixa de impressão do sistema; o produto não deve prometer controlo silencioso sobre esses recursos.

## Política de anúncios

A política oficial do Google AdSense afirma que publishers não podem usar implementação enganosa em que anúncios pareçam links de menu, navegação ou download, e que anúncios não devem ser posicionados em áreas destinadas à navegação. Fonte: https://support.google.com/adsense/answer/48182?hl=pt-BR

Implicação para o LIM PDF: anúncios devem permanecer em áreas editoriais e de descoberta, com espaço reservado que não cubra navegação, upload, configuração, processamento, resultado, download ou impressão. O roadmap deve tratar essa regra como critério de aceite, não como detalhe posterior.
