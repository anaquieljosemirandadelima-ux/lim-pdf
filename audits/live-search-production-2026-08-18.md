# Validação do buscador em produção

Data: 18 de agosto de 2026.

O domínio `https://limpdf.com.br/` abriu com sucesso e apresentou o buscador global no bloco da sidebar, com o campo `#header-tool-search` visível e o catálogo canónico de sete jornadas.

Ao pesquisar `diminuir pdf`, o dropdown abriu junto do campo dentro da sidebar, sem ser cortado pela caixa lateral. A lista apresentou 8 opções, incluindo `Compactar PDF`, `Criar formulário PDF`, `Desbloquear PDF`, `Excel para PDF`, `Imagens para PDF`, `Juntar PDF`, `PDF para Excel` e `PDF para JPG`, além da ação `Ver todas as ferramentas`.

A captura visual do browser confirmou que a lista permanece dentro da área da sidebar e não invade a área principal de modo incorreto. O build publicado corresponde ao comportamento implementado na PR #22, mergeada na `main` como commit `4d178f0`.

Observação: o painel de consentimento de cookies permanece visível na captura, mas não interfere no teste do dropdown; trata-se de um estado normal para uma sessão sem consentimento previamente guardado.

Testes locais associados:

- `npm run check`: aprovado.
- `LIMPDF_BASE_URL=http://127.0.0.1:3001 npm run test:visual`: aprovado, 22 screenshots.
- Catálogo: 62 ferramentas indexadas e 0 duplicados.

## Medição DOM adicional

Na sessão publicada, a caixa de resultados foi medida em `x=33`, `width=330`, enquanto a sidebar terminou em `x=282`; a viewport era `1280×1100`. O estilo computado da sidebar ainda retornou `overflow: hidden`, apesar de a correção local e o commit `4d178f0` definirem `overflow: visible`. Isto indica que a produção pode ainda estar a servir uma versão anterior ou um deployment que não concluiu; a publicação final deve ser confirmada no Vercel antes de encerrar a tarefa.

## Revalidação após deployment

Depois de confirmar no Vercel o deployment de produção `dpl_43mdbcTXNSdPCUuit5pGRpxUSXwp`, em estado `READY`, associado ao commit `4d178f07e97de120bc83cebb80a7cd0172785680`, a página foi recarregada com cache-bust e a pesquisa `diminuir pdf` voltou a apresentar o dropdown com 8 resultados. A lista apareceu alinhada ao campo da sidebar e permaneceu visualmente contida na coluna lateral na captura da sessão.

## Medição final confirmada

Na revalidação do deployment de produção, o estilo computado retornou `sidebarOverflow: visible` e `sidebarOverflowX: visible`. Com viewport `1280×1100`, o dropdown mediu `x=33`, `right=275`, `width=242`, enquanto a sidebar mediu `x=10`, `right=282`, `width=272`; portanto, a lista está contida na sidebar e não é cortada.

## Correção da scrollbar — PR #23

A PR `#23` foi mergeada em `main` com o commit `a1723ced0959eda67cfa22cef3226effc09b3968`. O deployment de produção Vercel `dpl_J3CXjZqTwf1qZBPnqo3veTLroHRJ` ficou `READY`. Após recarregar `https://limpdf.com.br/?release=a1723ce`, a pesquisa `diminuir pdf` abriu o dropdown com oito opções e a captura pública não apresentou a scrollbar nativa visível.

## Medição DOM final

A produção confirmou numericamente `scrollbarWidth: none`, `webkitScrollbarDisplay: none` e `overflowY: auto`. O dropdown ficou em `x=33`, `right=275`, `width=242`, `top=134`, `bottom=594`, dentro da sidebar `x=10`, `right=282`, `width=272`. Assim, a rolagem continua disponível quando necessária, mas a barra nativa não é apresentada.
