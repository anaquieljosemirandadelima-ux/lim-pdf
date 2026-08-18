# Auditoria inicial do catálogo e do buscador — 18 de agosto de 2026

## Rota auditada

URL: https://limpdf.com.br/ferramentas

A página apresenta dois campos de busca: o buscador global do cabeçalho, com placeholder `Buscar: juntar, assinar, converter...`, e o buscador interno do catálogo, com placeholder `Buscar: juntar, imprimir, OCR, Word...`. O catálogo público exibe sete abas de jornadas, um botão `Ver somente esta jornada` e cards com favoritos.

## Teste reproduzido

Ao inserir `centro` no buscador interno do catálogo, a interface filtra para um único card `Centro de impressão`, com as marcas `Gratuito` e `Local`, mantendo as abas de jornada visíveis. O resultado funciona, mas a experiência visual fica excessivamente comprimida: os controles de jornada ocupam várias linhas, o card filtrado aparece isolado sem resumo de estado ou contagem de resultados e há grande área vazia abaixo.

## Hipóteses a investigar

1. A existência de dois buscadores com comportamentos e estilos diferentes pode confundir o utilizador e criar a percepção de bug.
2. O buscador global deve ser testado com termos exatos, parciais, acentos, slugs, sinónimos e ausência de resultados.
3. O catálogo deve revelar com clareza a contagem de resultados, a jornada correspondente e a forma de limpar filtros.
4. A densidade visual e a hierarquia das abas, pipelines e cards precisam de um padrão único para desktop e mobile.

## Busca global do cabeçalho

Com o termo `centro`, o dropdown global retorna um resultado com o rótulo `Centro de impressão`, a descrição e a jornada `Otimizar e proteger`, além da ação `Ver todas as ferramentas`. O resultado é funcional, mas aparece sobre a navegação lateral e a hierarquia visual fica apertada em viewport de aproximadamente 900 px.

Com o termo inexistente `zzzzxyz`, o buscador mostra `Resultados`, `Nenhum resultado`, uma orientação textual e o botão `Ver todas as ferramentas`. Ao mesmo tempo, o buscador interno permanece com o valor anterior `centro`, o que cria dois estados de filtragem simultâneos na mesma página e pode parecer um bug para o utilizador.

A hipótese principal do problema visual é a coexistência de dois buscadores sem sincronização de estado, com dropdown global sobreposto à sidebar e ausência de uma convenção única de resultados, limpeza e foco.

## Validação do build local após a primeira correção

O build novo passou a servir a sidebar canónica com as sete jornadas: Organizar, Editar, Converter, Formulários, Segurança, Otimizar e Automação. O buscador global foi movido para o cabeçalho e, ao pesquisar “centro”, apresentou um único resultado para “Centro de impressão”, com a jornada “Otimizar e preparar” e ação “Ver todas as ferramentas”.

A reprodução visual confirmou que o bug estrutural foi resolvido, mas ainda há acabamento necessário: o dropdown do cabeçalho compete visualmente com o título do catálogo em viewport desktop estreito; o catálogo ainda apresenta dois campos de busca com papéis diferentes sem uma explicação explícita; a sidebar está correta, porém os blocos de recomendação e consentimento ocupam bastante espaço; e os cartões de fluxos locais usam textos pequenos demais para uma leitura confortável. Esses pontos serão tratados antes da publicação.

## Validação da segunda iteração

Com `centro` na busca local, o catálogo agora mostra `1 ferramenta para “centro”`, oferece `Limpar filtros`, preserva a jornada correspondente e exibe apenas o card de Centro de impressão. O campo tem label acessível `Buscar no catálogo de ferramentas` e nota de escopo local.

Visualmente, a hierarquia melhorou porque o estado de busca deixou de ser ambíguo. Ainda será necessário validar o dropdown global com termos inexistentes, testar teclado e verificar a versão mobile antes de publicar.

## Estado vazio global

Com `zzzzxyz`, o buscador global apresenta `Nenhum resultado`, exemplos úteis (`juntar`, `assinar`, `diminuir`, `Word`, `OCR`) e o botão `Ver todas as ferramentas`, sem erro de runtime. A busca local mantém `centro` e o seu resultado, o que é tecnicamente correto porque os campos possuem escopos diferentes, mas a separação ainda deve ser comunicada visualmente para evitar a impressão de inconsistência.

## Auditoria visual multiviewport

A auditoria automatizada passou em 22 capturas nos viewports desktop, tablet e mobile, sem overflow horizontal, erros de página ou regressões nos painéis editoriais. O catálogo desktop mostra as sete jornadas e o inventário canónico com maior clareza. No mobile, a sidebar permanece compacta e o conteúdo continua navegável; a densidade vertical é alta, mas não há corte de conteúdo nem overflow horizontal.
