# Auditoria de layout e impressão — 19/08/2026

## Observações visuais iniciais

A homepage desktop apresenta o CTA `Preparar impressão` no hero, uma ação rápida `Preparar impressão` na faixa de fluxos principais e o atalho permanente `Centro de Impressão` na sidebar. A hierarquia ficou clara e o cartão de impressão mantém a mesma linguagem visual dos demais fluxos.

No mobile, os três CTAs do hero aparecem empilhados e o cartão de impressão aparece como o quarto fluxo principal, sem overflow horizontal ou sobreposição. A densidade vertical é alta, mas o conteúdo permanece legível e a entrada de impressão fica visível sem exigir a abertura do catálogo.

O layout ainda pode evoluir posteriormente com redução de repetição entre hero, fluxos principais e cartões destacados, além de uma barra de ações contextual nas páginas de ferramenta. Essas melhorias ficam fora desta alteração para não misturar descoberta de impressão com uma reformulação visual ampla.

## Estado funcional observado

A implementação já oferece Centro de Impressão, livreto, N-up, A4/A3/Carta, pré-visualização, fila local, download e ação de impressão no computador. O problema era principalmente de descoberta: a ação existia no fluxo, mas não estava exposta nas superfícies principais.
## Catálogo

No desktop, o Centro de Impressão aparece logo após o banner de gratuidade e antes das ações prioritárias, com CTA explícito `Abrir Centro de Impressão`. A entrada permanente da sidebar reforça a descoberta sem criar um segundo slug ou uma segunda ferramenta.

No mobile, a entrada de impressão aparece antes das jornadas e os cartões prioritários ficam empilhados. O conteúdo continua sem overflow horizontal. A principal oportunidade visual futura do catálogo é reduzir a quantidade de blocos consecutivos antes da primeira jornada — banner, destaque, ações prioritárias e workflows — usando uma hierarquia progressiva ou acordeão em ecrãs pequenos.
## Confirmação no browser

Na homepage do QA, os pontos de entrada estão visíveis: `Centro de Impressão` na sidebar, `Preparar impressão` no hero e `Preparar impressão` nos fluxos principais. No Centro de Impressão, a tela informa `Até 500 MB · processamento local`, oferece `Escolher PDF` e explica livreto, N-up, A4/A3/Carta e revisão da ordem.

A ação `Imprimir no computador` não aparece antes do upload porque depende de um PDF processado. Ela é liberada na etapa de resultado junto do preview e download; o fluxo P0 automatizado confirmou `printCenter: true` e a ação de impressão funcional. Esta é a principal razão por que a opção não era visível na primeira visita.
