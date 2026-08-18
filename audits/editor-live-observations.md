# Observações ao vivo do editor

Data: 2026-08-18

A primeira inspeção em `127.0.0.1:3001` mostrou o editor Hardened legado porque havia uma instância antiga de `next start` ocupando a porta. O log confirmou `EADDRINUSE`. Após liberar a porta 3001 e iniciar uma única instância atual de `next dev`, a rota `/ferramentas/editar-pdf` passou a exibir o **Studio 2.0**, com a descrição de desenho livre, formas, setas, tipografia, carimbos, comentários, imagens, assinatura e redação segura.

A rota pública está ligada a `PdfEditorExperienceSwitcher`, que carrega `PdfEditorStudio` dinamicamente. O CSS global `editor-reference-2026.css` ainda esconde `.studio-find-replace` e `.studio-stamps` permanentemente e esconde `.studio-properties` abaixo de 900px; isso precisa ser corrigido para o editor Premium ficar realmente descobrível e usável em telas menores.

O gate `npm run check` passou após a implementação atual: lint, testes, build de 96 páginas e performance budget. O bundle reportou 3,38 MB de JavaScript e 0,27 MB de CSS.

Próximo teste: carregar o fixture `audits/ocr-fixture-scanned.pdf` na instância correta e validar seleção de objeto, fonte Google, substituir texto e exportação.


Após iniciar a instância correta, o upload de `ocr-fixture-scanned.pdf` carregou o Studio e revelou no DOM os controles **Grade**, **Snap**, Texto, Caneta, Destaque, Linha, Seta, Retângulo, Círculo, Redigir, Comentário, Carimbo, Assinar, Imagem, Localizar texto, Substituir ocorrência, Carimbos, Assinatura e Camadas. Isso confirma que o CSS corrigido tornou os blocos Premium descobríveis.

Foi observado um possível bug de estado durante a primeira leitura após o upload: o cabeçalho mostrava `Páginas 0` e o rodapé `Página 1 de 0`, embora a lista já exibisse a miniatura `Página 1` e o palco estivesse presente. Deve ser verificado após a hidratação completa; se persistir, o estado de páginas deve ser corrigido antes do deploy.


Ao clicar em **Fechar**, o Studio voltou corretamente ao estado inicial de upload. O contador inconsistente não foi reproduzido nesse estado limpo; a hipótese principal passou a ser uma corrida entre recuperação do cache temporário e o upload manual, não um problema estrutural do markup. O próximo teste deve carregar o fixture novamente após o fechamento e aguardar a hidratação completa.


Após remover `[file, restored]` e usar apenas `[file]`, o carregamento limpo do mesmo fixture ainda exibiu `Páginas 0` e `Página 1 de 0` enquanto havia uma miniatura e uma página renderizada. Portanto, o problema não é somente a segunda execução disparada por `restored`; há outra atualização concorrente, cache de bundle ou inconsistência entre a fonte carregada e o DOM que precisa ser isolada antes do release.


O cache `lim-pdf-temporary-cache` e os rascunhos locais foram removidos via IndexedDB/localStorage antes do teste. Mesmo assim, após novo upload do fixture, o DOM apresentou uma miniatura e o palco renderizado, mas manteve `Páginas 0` e `Página 1 de 0`. O bug é reproduzível em estado limpo e deve ser corrigido antes de qualquer publicação.
