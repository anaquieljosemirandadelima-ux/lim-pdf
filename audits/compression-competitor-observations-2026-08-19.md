# Observações de compressão — 19/08/2026

## iLovePDF

Fonte: https://www.ilovepdf.com/compress_pdf e https://www.ilovepdf.com/blog/how-to-reduce-pdf-file-size-online

A página principal posiciona a ferramenta como redução de tamanho com otimização para máxima qualidade. O fluxo inicial é simples: seleção ou arraste do PDF. O material editorial informa três níveis: **Extreme**, **Recommended** e **Less compression**, apresentados como escolha entre máxima redução, equilíbrio recomendado e menor compressão/maior preservação.

## Smallpdf

Fonte: https://smallpdf.com/compress-pdf

A página posiciona o produto como compressão preservando a qualidade e informa três opções: **Basic**, **Moderate** e **Strong**. O texto também enfatiza escolha do equilíbrio ideal entre tamanho e qualidade, em vez de expor parâmetros técnicos como DPI ou fator JPEG.

## Adobe Acrobat Online

Fonte localizada na busca oficial: https://www.adobe.com/acrobat/online/compress-pdf.html

A descrição oficial informa três níveis: **High**, **Medium** e **Low compression**, equilibrando qualidade e tamanho. A nomenclatura é orientada ao resultado, não à implementação interna.

## Implicações para o LIM PDF

1. O fluxo público deve oferecer três presets semanticamente claros, equivalentes a **Alta qualidade**, **Recomendado** e **Máxima redução**.
2. A ferramenta deve tentar manter texto selecionável, links e estrutura sempre que o PDF permitir; rasterização total deve ser tratada como fallback explícito, não como única estratégia padrão.
3. O resultado deve informar tamanho original, tamanho final e percentual efetivo de redução, porque o usuário precisa confirmar se houve ganho real.
4. A qualidade deve ser controlada por heurística de conteúdo: PDFs já vetoriais/textuais não devem ser rasterizados sem necessidade; páginas escaneadas/imagens devem receber recompressão com resolução e JPEG adequados ao preset.
5. A UI deve explicar o compromisso de cada nível sem expor apenas números técnicos.

## Adobe Acrobat Online

Fonte: https://www.adobe.com/acrobat/online/compress-pdf.html

O fluxo observado começa com arrastar/selecionar o PDF e comunica que o arquivo é tratado nos servidores da Adobe, sendo apagado salvo login para conservar o resultado. A busca oficial descreve três níveis como **High**, **Medium** e **Low compression**. A nomenclatura reforça o balanço entre qualidade e tamanho, mas o fluxo inicial mantém a escolha simples.

## PDF24

Fonte: https://tools.pdf24.org/en/compress-pdf

O PDF24 comunica compressão rápida, gratuita, online e segura. A página afirma que a qualidade é ajustável e orienta que o usuário pode alterar **DPI** e **image quality** antes de iniciar. Também explica que PDFs com imagens comprimem melhor que PDFs apenas textuais e que a operação ocorre em servidor, não consumindo recursos locais.

## Síntese comparativa

| Serviço | Presets/controles observados | Mensagem principal | Preservação/limitação explicitada |
|---|---|---|---|
| iLovePDF | Extreme, Recommended, Less compression | Máxima qualidade com redução de tamanho | Equilíbrio entre tamanho e qualidade |
| Smallpdf | Basic, Moderate, Strong | Menor tamanho sem perda perceptível | Intensidade escolhida pelo usuário |
| Adobe | High, Medium, Low compression | Equilibrar tamanho e qualidade | Fluxo online com tratamento em servidor |
| PDF24 | DPI e image quality ajustáveis | Ajuste fino e resultado configurável | Imagens comprimem melhor que texto |

Para o LIM PDF, a combinação mais útil é: presets amigáveis para a maioria dos usuários, uma opção avançada com DPI/qualidade quando necessário e processamento estrutural antes do raster. A implementação atual do `compactar-pdf` rasteriza todas as páginas em JPEG em qualquer nível, portanto não corresponde ao comportamento esperado para documentos textuais/vetoriais e pode apagar texto selecionável, links e formulários mesmo no nível de alta qualidade.

## Verificação local do LIM PDF

A rota local `/ferramentas/compactar-pdf` carregou corretamente e exibiu a promessa atualizada da ferramenta. O navegador mostrou o fluxo privado/local, a descrição com três níveis — alta qualidade, recomendada e máxima redução — e a nota de compressão inteligente.

A primeira tentativa de consultar o campo de upload via console falhou por usar sintaxe TypeScript (`as HTMLInputElement`) em JavaScript puro; nenhum arquivo foi enviado e nenhuma operação externa foi realizada.

## QA de upload local

O teste manual com a ferramenta de upload não conseguiu anexar o fixture ao input oculto; a página permaneceu sem arquivo selecionado e nenhum dado foi enviado para serviço externo. A validação automatizada posterior usou Chromium local e anexou o arquivo diretamente ao mesmo input.

O teste final processou um PDF vetorial de 3 páginas em todos os três presets: 3.301 bytes de entrada e 2.368 bytes de saída, redução de 28%, com estratégia estrutural. Também processou um PDF escaneado no preset recomendado: 149.734 bytes de entrada e 40.460 bytes de saída, redução de 73%, com estratégia visual. Lint, build, testes unitários e `git diff --check` passaram.
