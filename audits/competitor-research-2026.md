# Auditoria competitiva de suites PDF — pesquisa oficial

## Fontes consultadas

| Concorrente | URL oficial | Evidências principais |
|---|---|---|
| iLovePDF | https://www.ilovepdf.com/pricing | Plano gratuito limitado; Premium indicado a US$5/mês faturado anualmente ou US$9/mês; acesso web, desktop e mobile; processamento ilimitado; assinaturas digitais; workflows; experiência sem anúncios; suporte prioritário; processamento regional; créditos de IA; API; limites Premium publicados até 4 GB para muitas operações. |
| PDF24 | https://tools.pdf24.org/en/all-tools | Posicionamento 100% gratuito, sem limites, sem marca d'água e sem registo; grande catálogo dividido em converter para PDF, converter de PDF, imagens e desktop. |
| Adobe Acrobat | https://www.adobe.com/acrobat/pricing.html | Suite paga com edição de texto/imagens, organização de páginas, conversão Office, formulários e assinaturas, OCR, redação, comparação, marca, formulários web, IA, colaboração, armazenamento cloud, integrações Box/Dropbox/Drive/OneDrive, preflight para impressão, PDF/A/PDF/X, acessibilidade e Bates numbering. |
| Adobe Acrobat Online | https://www.adobe.com/acrobat/online.html | Mais de 25 ferramentas online gratuitas para converter, reduzir, editar, assinar e proteger, além de geração de apresentação com IA. |

## Implicações iniciais para o LIM PDF

O LIM PDF já possui uma vantagem forte de privacidade por processamento local, mas precisa expor melhor os fluxos completos, a preparação para impressão, a conformidade técnica, a colaboração e a gestão de documentos. A referência mais importante para a próxima evolução é manter o modelo local-first e acrescentar profundidade operacional — especialmente livreto/imposição, preflight orientado à impressão, filas e relatórios — sem prometer cloud, assinatura avançada ou IA remota enquanto essas integrações não existirem.

## Segunda e terceira tranches de fontes

| Concorrente | URL oficial | Evidências principais |
|---|---|---|
| Smallpdf | https://smallpdf.com/pricing | Mais de 30 ferramentas; plano gratuito com limites de downloads e acesso móvel; Premium com acesso ilimitado, OCR, edição de texto, compressão forte, lote, IA, cloud storage, app móvel e Sign; recursos de conformidade ISO 27001, GDPR, CCPA e nFADP. |
| PDFgear | https://www.pdfgear.com/pdfgear-for-windows/ | Editor gratuito para Windows, macOS, iOS e ferramentas online; edição de texto e imagens, conversão em lote, OCR, chat com PDF e Copilot; declara processamento local, sem limite de tamanho ou quantidade na aplicação desktop. |
| Sejda | https://www.sejda.com/upgrade | Gratuito sem cadastro, mas com limites de páginas/horas/ficheiros; plano pago com documentos ilimitados, OCR até 100 páginas, processamento múltiplo, tarefas de até 21 minutos e ficheiros até 500 MB; Desktop processa localmente sem enviar para servidores. |
| Online2PDF | https://online2pdf.com/features/booklet | Interface única que combina seleção de páginas, rotação, reorganização, divisão, cabeçalho/rodapé, layout, compressão e proteção; ferramenta de livreto com formatos, orientação, margens, leitura esquerda-direita/direita-esquerda e modos de impressão duplex ou sem duplex com ZIP de frente/verso. |
| Soda PDF | https://www.sodapdf.com/plans/ | Suite Pro com IA, tradução, cloud storage, e-sign, OCR, formulários, lote, comentários e segurança; Pro inclui 5 GB de cloud; oferece versões Desktop e Online e implantação corporativa. |
| Foxit PDF Editor | https://www.foxit.com/pdf-editor/pricing/ | Planos Editor e Editor+; edição, OCR, comparação, proteção, acessibilidade, PDF/A, comentários, colaboração em tempo real, eSign, Smart Redact, Bates numbering, preflight de impressão, áudio/vídeo, integrações e aplicações desktop/mobile/web. |
| Nitro PDF | https://www.gonitro.com/pricing | PDF Standard/Plus/Classic; criação, edição, conversão, revisão, colaboração, formulários, OCR, comparação, extração de tabelas/formulários, IA, segurança empresarial, SSO, analytics, integrações e criação de PDF a partir de qualquer aplicação que imprime; Classic oferece licença de três anos. |
| PDF-XChange Editor | https://www.pdf-xchange.com/product/pdf-xchange-editor | Aplicação Windows com versão gratuita que deixa 70% dos recursos sem restrição; licença perpétua, portable/MSI, conformidade ISO e versões Editor/Editor Plus. |
| Canva PDF Editor | https://www.canva.com/pdf-editor/ | Editor gratuito orientado a design: importa PDF como elementos editáveis, permite alterar texto/imagens, comentários, colaboração, exportação para JPG/PNG/PPTX/PDF e ficheiros prontos para impressão; biblioteca de fontes, brand kit, cloud storage e autosave. |

## Observações de mercado

A categoria divide-se em quatro propostas: suites online de tarefa rápida (iLovePDF, Smallpdf, Sejda, PDF24, Online2PDF), editores locais completos (PDFgear, PDF-XChange, Nitro, Foxit), plataformas de design/colaboração (Canva) e suites empresariais com IA, compliance e assinatura (Adobe, Nitro, Foxit, Soda). O LIM PDF pode ocupar um espaço próprio ao combinar a simplicidade dos primeiros com o processamento local dos segundos, mas deve investir em fluxos guiados, impressão real, conformidade e relatórios para superar a percepção de “coleção de ferramentas”.

O recurso de livreto do Online2PDF é especialmente relevante: não é apenas reorganização de páginas; envolve imposição, orientação, margens, leitura, duplex, impressão sem duplex e instruções para o hardware. A implementação do LIM PDF deve tratar isso como um fluxo de produção com preview e presets, não como uma simples ferramenta de ordenar páginas.

## Auditoria visual inicial do LIM PDF em produção — 18/08/2026

URL auditada: https://limpdf.com.br/ferramentas?audit=competitive-2026

- A hierarquia geral está clara: barra lateral, busca global, cards de entrada, workflows locais e catálogo por categoria.
- O catálogo mostra workflows locais e sinaliza que os ficheiros continuam no dispositivo, o que torna o diferencial de privacidade mais visível.
- A barra lateral ocupa uma faixa estreita e comprime títulos longos; em viewport de browser de QA há truncamentos e densidade elevada de itens.
- A barra de filtros por categoria fica visualmente muito próxima do conteúdo e, na captura, o banner de consentimento de cookies sobrepõe parte da região inferior dos filtros, reduzindo a leitura e a acessibilidade.
- Existem duas buscas visíveis (header e conteúdo); isso é útil para descoberta, mas cria duplicação visual e pode gerar dúvida sobre qual estado controla os resultados.
- Os cards de workflow são compreensíveis, mas os passos numerados ficam pequenos e com pouco espaçamento; o fluxo de preparação para impressão precisa de uma entrada mais destacada.
- Há um card de anúncio “LIM PDF está evoluindo” na barra lateral que consome espaço acima da primeira ferramenta e compete com o CTA de uso.
- A principal melhoria visual não é adicionar mais elementos: é reduzir densidade, melhorar responsividade real, evitar sobreposições do consentimento e criar um modo de foco por tarefa.

## Auditoria visual do livreto em produção — 18/08/2026

URL auditada: https://limpdf.com.br/ferramentas/criar-livreto-pdf?audit=print-booklet

O LIM PDF já possui uma ferramenta de livreto funcional, privada no navegador, com fluxo guiado Arquivo → Ajustes → Resultado, suporte a até 500 MB, folha de impressão, encadernação, virada de impressora e margem. A página explica que completa múltiplos de quatro e monta duas páginas por folha.

A experiência ainda pode evoluir de forma significativa. Antes do upload, o painel de configurações fica vazio; não há preview gráfico real da folha imposta, simulação de frente/verso, escolha explícita de duplex ou geração dos dois PDFs para impressora sem duplex; o utilizador recebe instrução textual, mas não um botão de “Imprimir” nem um assistente de impressão do navegador. O banner de cookies aparece sobre a área de conteúdo inferior e pode cobrir informações. A barra lateral permanece muito densa em viewport reduzida. A próxima versão deve manter o motor existente e adicionar um modo de impressão assistida com preview, presets e instruções adaptativas.
