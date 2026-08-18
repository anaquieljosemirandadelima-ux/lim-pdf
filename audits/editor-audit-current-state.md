# Auditoria do editor de PDF — estado atual

## Escopo auditado

A rota pública `/ferramentas/editar-pdf` usa `PdfEditorExperienceSwitcher`, que atualmente é apenas um wrapper de carregamento dinâmico e renderiza exclusivamente `PdfEditorWorkspaceHardened`. O `PdfEditorStudio` existe no repositório como uma experiência alternativa mais ampla, mas não está conectado à rota pública. O `EditorCommandBar` e parte do `PremiumToolExperience` também pressupõem uma arquitetura de dois modos que não está ativa no editor atual.

## Capacidades já existentes no editor publicado

| Área | Capacidades confirmadas | Observação técnica |
|---|---|---|
| Entrada e privacidade | Upload de PDF, limite centralizado, processamento local, aviso para arquivos grandes, cache temporário e rascunho local | O rascunho usa `localStorage`; imagens são mantidas separadamente em IndexedDB. PDFs muito grandes podem ficar sem cache para preservar memória. |
| Recuperação | Rascunho por nome, tamanho e data de modificação; lista de até seis recentes; restauração de páginas e objetos | A chave do arquivo é baseada em `name:size:lastModified`, portanto não é um identificador criptográfico do conteúdo. |
| Páginas | Reordenar, duplicar, excluir, inserir página em branco, selecionar miniaturas e navegar anterior/próxima | A duplicação reutiliza a referência da página na sequência, o que é eficiente, mas exige cuidado na exportação e nas alterações por página. |
| Objetos | Texto novo, substituição visual de texto detectado, imagem JPG/PNG, destaque, redação, comentário e assinatura desenhada | Não há, na rota publicada, formas, linhas, setas, carimbos, caneta livre ou controle de fonte/família. |
| Seleção | Seleção individual e múltipla com Shift/Ctrl/Cmd; mover, redimensionar, copiar, colar, duplicar, excluir e nudging por teclado | A seleção múltipla inclui alinhamento e distribuição. |
| Camadas | Ocultar, bloquear, mover para frente/fundo e subir/descer camada | Há painel de camadas, mas a ordenação e a edição não são apresentadas como um sistema visual completo de composição. |
| Texto | Conteúdo, tamanho, posição, largura e altura; substituição de texto detectado | O exportador usa somente `StandardFonts.Helvetica`, sem família, peso, itálico, cor, rotação, alinhamento, espaçamento ou carregamento de fontes externas. |
| Exportação | Geração de novo PDF com `pdf-lib`; cópia de páginas não alteradas; achatamento de páginas quando há redação ou texto substituído; inserção de textos, imagens, destaques, comentários e assinatura | O achatamento protege contra permanência do conteúdo antigo em redações/substituições, mas pode rasterizar uma página inteira e reduzir fidelidade/acessibilidade. |
| Atalhos | Desfazer/refazer, Ctrl/Cmd+A, copiar, colar, duplicar, excluir, Escape e setas com Shift para passos maiores | Não há uma paleta de comandos realmente integrada à rota publicada. |
| Responsividade | Layout desktop com trilho de ferramentas, páginas, canvas e propriedades; rearranjo para telas menores | Em até 900px o painel de propriedades é ocultado; em até 620px o editor fica comprimido e perde parte do contexto de edição. |
| Assinatura | Desenho em canvas e inserção como imagem | Não é assinatura digital criptográfica; essa capacidade existe em ferramenta profissional separada. |

## Limitações e riscos prioritários

### 1. O editor publicado não é o editor visual mais completo do repositório

O `PdfEditorStudio` possui ferramentas adicionais, como formas, linhas, setas, caneta, carimbo, controle de rotação, opacidade e família de fonte limitada. Porém, a rota pública está hardwired no `PdfEditorWorkspaceHardened`. Isso cria uma diferença entre o que o código sugere e o que o usuário recebe, além de deixar componentes e comandos potencialmente mortos ou inconsistentes.

### 2. A edição de texto não é uma edição nativa de conteúdo PDF

O editor detecta blocos de texto com PDF.js e cria objetos de substituição. Na exportação, quando o texto muda, a página é achatada em imagem e o novo texto é desenhado por cima. O mecanismo é seguro contra a permanência visual do texto antigo, mas não preserva a estrutura textual original, a seleção de texto, fontes, kerning, acessibilidade ou reflow. O produto precisa comunicar claramente a diferença entre **sobreposição visual**, **substituição sanitizada** e uma futura edição nativa avançada.

### 3. Tipografia é o maior espaço para a integração com Google Fonts

Hoje o exportador embute apenas Helvetica. Para competir com editores premium, o editor precisa de família tipográfica, peso, itálico, tamanho, cor, alinhamento, espaçamento de linha e, idealmente, ajuste automático de caixa. A API/CSS do Google Fonts pode servir para pré-visualização e carregamento sob demanda, mas a exportação exige obter o arquivo de fonte em formato compatível, embutir a fonte no PDF e lidar com licença, CORS, cache, offline e falhas de rede. A arquitetura deve manter uma fonte local segura como fallback e consentimento claro para qualquer chamada externa.

### 4. O pipeline de exportação é funcional, mas pode consumir muita memória

Cada página que exige sanitização é renderizada em canvas e inserida como JPEG. Em documentos grandes, isso pode elevar pico de memória, perder qualidade e alongar o download. Falta uma estratégia explícita de progresso por página, cancelamento, fila sequencial configurável, pré-visualização da saída e diagnóstico de falha por página.

### 5. Redação visual precisa de auditoria de garantia

O flattening elimina o conteúdo visual antigo na região processada, mas o produto ainda precisa de uma verificação pós-exportação: extrair texto do PDF final, verificar se os termos redigidos não aparecem, conferir sobreposição das áreas e apresentar um relatório de sanitização. A redação deve continuar distinta de marcação visual, destaque ou comentário.

### 6. O layout desktop é forte, mas a experiência mobile é incompleta

Em telas menores, o painel de propriedades desaparece em vez de virar gaveta ou painel inferior. O usuário perde acesso a posição, tamanho, conteúdo, camadas e alinhamento. A melhoria recomendada é uma interface responsiva com barra inferior contextual, painel de propriedades em drawer e miniaturas em trilho horizontal.

### 7. Recursos existentes precisam de melhor descoberta

A rota não inclui o `PremiumToolExperience`, apesar de a aplicação possuir comandos, modo foco e sugestões de ferramentas para esse ecossistema. O editor deveria expor uma barra de comandos consistente, atalhos visíveis, grupos de ferramentas, histórico de alterações e indicação de quais capacidades são gratuitas, Premium ou profissionais.

## Lacunas de produto observadas antes da pesquisa competitiva

As capacidades com maior potencial de diferenciação são: edição tipográfica mais fiel; fontes locais e fontes sob demanda; sublinhado, tachado, formas, linhas e desenho livre; carimbos configuráveis; rotação e opacidade; comentários e revisão com status; preenchimento de formulários no mesmo canvas; criação e edição de links e bookmarks; comparação visual; OCR assistido para PDFs escaneados; ações em lote; presets de exportação; garantia de redação; histórico de versões; e workflows locais encadeados.

## Diretriz arquitetural preliminar

A próxima implementação deve consolidar uma única experiência pública, reaproveitando as capacidades válidas do Studio e do Hardened em vez de manter dois editores paralelos. O núcleo deve separar: modelo de documento e páginas; modelo de objetos; comandos transacionais com histórico; renderização/seleção; fontes e tipografia; exportação; persistência local; e recursos Premium. A integração com Google Fonts deve ser opcional, progressiva e isolada em um adaptador, sem tornar a edição básica dependente de internet.

## Arquivos principais auditados

- `src/components/PdfEditorWorkspaceHardened.tsx`
- `src/components/PdfEditorStudio.tsx`
- `src/components/PdfEditorExperienceSwitcher.tsx`
- `src/components/EditorCommandBar.tsx`
- `src/components/PremiumToolExperience.tsx`
- `src/app/ferramentas/[slug]/page.tsx`
- `src/app/editor-reference-2026.css`
- `src/lib/editor-drafts.ts`
- `src/lib/editor-assets.ts`
- `src/lib/temporary-cache.ts`

## Próxima etapa

Pesquisar a documentação oficial de Google Fonts e as experiências de Adobe Acrobat, Smallpdf, iLovePDF, PDFgear, Sejda e PDF24 especificamente para edição, tipografia, formulários, revisão, redação, comparação, colaboração e limites. A matriz deverá distinguir recursos realmente locais de recursos dependentes de nuvem e separar funções que já existem no LIM PDF de funções genuinamente novas.
