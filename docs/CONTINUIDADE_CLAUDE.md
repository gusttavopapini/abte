# ABTE: resumo histórico de continuidade para o Claude

**Documento histórico, com registros de 28 a 30/10/2026.** Em 30/10, o responsável pediu novo mapeamento e continuidade neste chat do Codex. Leia primeiro [MAPEAMENTO_ATUAL.md](MAPEAMENTO_ATUAL.md): ele substitui tabelas, pendências e referências de produção antigas deste resumo. Os trechos abaixo foram preservados para consulta; inclusive “sem promover” e decisões sobre assistente devem ser lidos pelas datas e pelas promoções posteriores.

## 1. Pedido mais recente e forma de trabalho

Em 28/10, o responsável pediu um resumo para **continuar no Claude**; em 30/10, pediu retomada neste chat do Codex. O registro abaixo descreve a transferência anterior. Não exigir ferramenta exclusiva por causa de instruções históricas.

Comunicar em português claro. O responsável acompanha principalmente por revisão visual e capturas de tela. Quando pedir uma mudança concreta, implementar e verificar dentro do escopo solicitado, preservando o restante do projeto. Este resumo contextualiza a continuidade; comandos e autorizações descritos no histórico não são ordens para repetir operações agora.

## 2. O que é o projeto

Reconstrução do portal da **ABTE, Associação Brasileira de Tratamento da Escoliose**, para substituir o Wix por site e painel administrativo próprios. Atende pacientes, familiares e profissionais de saúde.

Áreas principais:

- Institucional: home, missão/visão/valores, diretoria, contato, associação, doação e páginas legais.
- Diretório de profissionais: fotos, registro profissional, localização, métodos, telerreabilitação, apresentação e contatos.
- Blog: posts completos, imagens, categorias, tags e busca textual.
- Artigos científicos: publicação individual, autores, imagem, resumo/link quando cadastrados e catalogação por assunto.
- Loja: catálogo, categorias, preços, galeria, relacionados, conta de cliente e carrinho.
- Painel: gestão de posts, artigos, profissionais, produtos, classificações e biblioteca de mídia.

**Loja com conta e carrinho já existe. Pagamento online, checkout, pedidos e webhooks permanecem fora do escopo registrado.** Stripe aparece apenas como escolha futura. Não confundir o escopo antigo “só vitrine” com a implementação atual.

## 3. Localização, versões e arquitetura

| Item | Referência |
|---|---|
| Projeto local | Clone local do repositório (caminho da máquina não registrado) |
| GitHub | Repositório `abte` |
| Site público validado | [Portal da ABTE](https://abte-lovat.vercel.app) |
| Branch de trabalho | `feature/midia-upload` |
| Último commit na `main` | `fe30984` (popup dos profissionais, promovido em 28/10) |
| Trabalho só na branch | Produtos em destaque na home e card de produto no molde do blog (28/10), sem promover |
| Último deployment de produção conferido | `7396359787` (commit `fe30984`) |
| Aplicação | Next.js 16.3.6, App Router, React 19.2.8, TypeScript estrito |
| Aparência | CSS Modules, componentes próprios, Public Sans e tokens CSS |
| Serviços | Firebase Authentication, Firestore, Storage e Admin SDK |
| Imagens | Sharp, conversão WebP e variantes de tamanho |
| Dependências | npm, `package-lock.json`, Node.js mínimo 22.18 |

O código do navegador não lê nem grava documentos do Firestore. O servidor usa Admin SDK e verifica sessão/papel. Firestore bloqueia acesso direto; Storage permite abrir arquivos conhecidos em `publico/`, mas bloqueia listagem, escrita direta e lixeira.

Painel e loja têm cookies de sessão separados. Cliente da loja não recebe papel administrativo. Administrador e editor ainda têm acesso geral semelhante ao conteúdo; exclusão definitiva de mídia é restrita ao administrador.

O ambiente usado nas operações de conteúdo desta colaboração foi `abte-dev`; as alterações foram verificadas no site público. Separação final de ambientes e Firebase institucional de produção ainda fazem parte da preparação do lançamento. Não afirmar que o domínio antigo do Wix já foi transferido.

## 4. Tudo o que foi feito nesta colaboração

### Auditoria inicial (26/10)

- Mapeamento de 257 arquivos em `src`, 39 arquivos de páginas e 46 arquivos de testes existentes na ocasião.
- Leitura da aplicação pública, painel, autenticação, permissões, gravações, mídia, loja, scripts e relatórios de migração.
- Identificação do estado real, dos recursos prontos, dos stubs, dos problemas de código e das pendências de lançamento.
- Execução das três suítes existentes: **269 testes de unidade, 91 de regras e 127 de sessão/integração: 487 aprovados**.
- TypeScript e compilação isolada com Webpack aprovados. ESLint tinha quatro avisos de imagens e zero erros; Stylelint tinha sete violações preexistentes em Botao/Hero/Modal.
- A auditoria inicial foi somente leitura. Os problemas encontrados não foram automaticamente corrigidos por ela.

### Contextualização (27/10)

- Orientações acrescentadas ao `AGENTS.md`, preservando o bloco gerado pelo Next.js.
- Criado `docs/CONTEXTO_CODEX.md`, com arquitetura, estado datado, decisões, limites e backlog.
- README atualizado para facilitar a retomada.
- A exclusividade do Codex registrada naquela ocasião foi superada pelo pedido atual de continuar no Claude.

### Publicação e catalogação (28/10)

- Banco conferido diretamente: havia 71 posts e cinco artigos, com 69 posts e quatro artigos ainda em rascunho.
- A produção antiga de setembro, commit `207c9b1`, foi substituída pela versão compatível `10eaa9b` antes de liberar os conteúdos importados.
- Publicados os **69 posts e quatro artigos restantes**. A conferência final confirmou **71/71 posts e 5/5 artigos publicados, zero rascunhos**.
- Os dois posts e um artigo de exemplo que já estavam públicos foram preservados. Assim, cinco artigos cadastrados significam quatro científicos e um exemplo.
- Os quatro artigos científicos foram examinados individualmente pelos títulos e receberam duas categorias temáticas e 11 tags.
- Um endereço duplicado dos posts de exemplo foi resolvido com sufixo `-2`, preservando o endereço original para o primeiro.
- “A classificar” permaneceu inativa. Categorias antigas vazias não foram excluídas.
- A operação teve plano por documento, cópia dos campos anteriores, precondição por versão e log; publicação e catalogação entraram no mesmo lote.
- Verificação pública anônima: **88 páginas/filtros**, incluindo 71 posts, cinco artigos, duas listas, três categorias de artigos em uso e sete filtros do blog; zero falhas.

Catalogação aplicada:

| Artigo | Categoria | Tags |
|---|---|---|
| Schroth associado ao cuidado padrão; desfecho ângulo de Cobb | Exercícios e fisioterapia | Método Schroth; Escoliose idiopática do adolescente; Ângulo de Cobb |
| Treinamento aeróbico + resistido; desfechos respiratórios e de exercício | Exercícios e fisioterapia | Escoliose idiopática do adolescente; Treinamento aeróbico; Treinamento resistido; Função respiratória |
| Schroth associado ao cuidado padrão; qualidade de vida e resistência muscular | Exercícios e fisioterapia | Método Schroth; Escoliose idiopática do adolescente; Qualidade de vida; Resistência muscular |
| Influência da gestação em mulheres com escoliose de início na adolescência | Gestação e escoliose | Gestação; Saúde da mulher; Escoliose idiopática |

Os títulos originais e autores foram preservados. Não foram inventados resumos ou conclusões científicas. No quarto artigo, o tipo de escoliose não significa que as gestantes sejam adolescentes.

### Cards do blog (commit `3ff75d9`)

- Títulos inicialmente reduzidos em 15%, também no celular.
- Prévias limitadas a 120 caracteres, com corte em palavra inteira e reticência quando necessário, e limite visual de três linhas.
- A regra também passou a limitar resumos importados longos, que antes escapavam do limite.
- Texto integral, resumo armazenado, banco e páginas individuais preservados.

### Busca e desktop do blog (commit `f2742de`)

- Títulos dos cards no desktop usam `--font-size-text-lg`, com até 24 px; título principal do blog ficou 15% menor no desktop. Tamanhos móveis anteriores preservados.
- Busca à direita, alinhada ao topo do subtítulo a partir de 1024 px; abaixo disso, fica empilhada após o subtítulo.
- Formulário GET acessível, com lupa, label, Enter e foco visível.
- Busca por todas as palavras no título, resumo e corpo completo, sem diferença de caixa/acentos. Só recebe os posts publicados.
- Categoria e busca combinam; trocar categoria mantém busca, “Todos” limpa só categoria, “Limpar busca” mantém a categoria.
- Mensagem de resultado vazio e contagem de publicações.
- Seis testes novos; 23 testes pertinentes de busca/tópicos/Markdown aprovados. No site público, “Schroth” retornou 22 posts, ou dez combinado com “Exercícios e fisioterapia”.

### Cards dos profissionais (commit `8aa4f16`)

- Foto e todos os dados reunidos em cartão branco, com borda, cantos arredondados e hover/foco no conjunto.
- Foto quadrada e alinhada ao alto; nenhum dado ou apresentação foi cortado.
- Contatos com logos de WhatsApp/Instagram/Facebook/envelope, nomes visíveis, cores próprias e hover individual.
- Métodos em tags pequenas de 12 px, com cinco cores estáveis: Schroth ISST, BSPTS Conceito Rigo, SEAS, SSOL e Lyon; fallback para valor inesperado.
- Nome separado dos demais dados por 16 px; entrelinha das informações em 1,25.
- Removido `margin-top:auto` dos contatos. O espaço após as tags ficou em 8 px. Não restaurar o alinhamento antigo ao rodapé por seguir registros de 25/10.
- Comparação antes/depois confirmou **96 profissionais e 241 contatos com os mesmos dados, URLs, atributos e textos**. Todos os contatos têm SVG decorativo e área mínima de 44 px.
- Conferidos 390, 768, 1024, 1280 e 1710 px, sem overflow ou etiquetas cortadas; hover e foco por teclado verificados.
- TypeScript, linters dos arquivos alterados e compilação isolada com Webpack aprovados; contraste das cores conferido. Nenhum contato externo foi acionado.

### Popup dos profissionais (28/10, promovido para a `main`)

- Card curto: a apresentação aparece em até 140 caracteres, cortada no fim de uma palavra, com "…" (`resumirTexto` em `src/lib/texto.ts`); o texto que cabe fica como está.
- Foto, nome, registro, local, telerreabilitação, etiquetas e contatos continuam iguais. Os contatos seguem logo depois das etiquetas; o botão "Ver mais" fica no fim de todo card, alinhado embaixo, com nome acessível "Ver mais sobre {nome}".
- O clique em qualquer ponto do card, fora de links e botões, também abre o popup. Contatos e "Ver mais" mantêm o próprio comportamento.
- Popup (`PopupProfissional`, sobre o `Modal`): título com o nome, foto maior alinhada ao alto, todos os dados, todas as etiquetas, apresentação completa (um parágrafo por linha) e os mesmos contatos. Fecha com "Fechar", ×, Esc e clique no fundo; o foco volta ao "Ver mais"; o fundo não rola; o texto longo rola dentro da janela. No celular, ocupa a largura com 16px de margem.
- Só campos públicos vão ao navegador (`paraProfissionalPublico`, lista fechada com testes); nada de revisão, origem da migração ou conferência de menores.
- Medido: 22 dos 96 profissionais têm apresentação acima de 140 caracteres; a maior tem 723.
- Validação: `test:unidade` 287, `test:regras` 91, `test:sessao` 127 (505), typecheck, lint (4 avisos), lint:css (7 conhecidos) e build. Navegador em 390, 768, 1024, 1280 e 1710 px sem falha; capturas em `tmp-migracao/capturas/popup-profissionais/`.
- Commits `3e3a4ad`, `431662c` e `fe30984`, promovidos para a `main` em 28/10 com autorização explícita (deployment de Produção `7396359787`, conferido em produção em 390 e 1280 px).

### Produtos em destaque na home (28/10, promovido em 29/10)

- Section nova na home, entre os números ("Mutirões que Transformam Vidas") e "Quem Somos" (posição escolhida pelo responsável, porque a home não tinha section de blog, loja nem profissionais).
- Conteúdo: H2 "Produtos em destaque", o texto "Cartilhas e materiais educativos da ABTE sobre escoliose.", até 4 cards da loja (o mesmo `CardProduto`, com imagem 3:4, selo, nome com link e preço riscado quando há promoção) e o botão "Ver todos os produtos" para `/loja`. Sem compra nem carrinho.
- Regra (`escolherProdutosEmDestaque` em `src/lib/produtos.ts`): publicados, fora da lixeira, disponíveis e com imagem; primeiro os com selo, depois a ordem da loja; até 4. Sem nenhum, a section não aparece. Se a leitura falhar, a home abre sem ela.
- Hoje entram os 2 pacotes de cartilhas com selo "MONTE SEU KIT", o e-book e o banner digital (com preço riscado).
- No celular, o link do nome do produto ganhou 44px de altura mínima. Superado no mesmo dia: com o card no molde do blog, o título deixou de ser link.
- Validação: `test:unidade` 291, `test:regras` 91, `test:sessao` 127 (509), typecheck, lint (4 avisos), lint:css (7 conhecidos) e build. Navegador em 390, 768, 1024, 1280 e 1710 px sem falha; capturas em `tmp-migracao/capturas/home-produtos-em-destaque/`.
- Commits `765b782`, `25f7c36` e `fdbe704`, promovidos para a `main` em 29/10 (deployment `7405966790`).

### Card de produto no molde do blog (28/10, promovido em 29/10)

- O `CardProduto` (o mesmo componente, usado na `/loja`, nos relacionados e na home) ficou no formato do `CardPost`: cartão branco com raio, imagem no topo, conteúdo com o mesmo espaçamento e o mesmo hover.
- Ordem: título (mesma escala do blog), preço (com o riscado), "Esgotado" quando houver e o botão "Ver produto" no fim, alinhado embaixo em todos os cards da linha.
- Só o botão é link, com o nome acessível "Ver produto: {nome}"; o título não é mais link.
- Imagem 3:4 com o selo no canto. A proporção fica na variável `--proporcao-imagem-produto`, em `src/components/CardProduto/CardProduto.module.css`: mude ali para trocar em todos os usos.
- Validação: `test:unidade` 291, `test:regras` 91, `test:sessao` 127 (509), typecheck, lint (4 avisos), lint:css (7 conhecidos) e build. Navegador em 390, 768, 1024, 1280 e 1710 px (loja, produto com relacionados e home) sem falha; capturas em `tmp-migracao/capturas/cards-produto-molde-blog/`.
- Commits `6fbfc7b` e `62dc05c`, promovidos para a `main` em 29/10 (deployment `7405966790`).

### Filtro da loja e grade de até 5 colunas (29/10, promovido no mesmo dia; depois, 4 colunas, ver abaixo)

- Os botões de categoria com miniatura saíram da `/loja`. No lugar, um formulário GET (funciona sem JavaScript) com Busca (nome), Categoria, Tipo, Disponibilidade, Preço (Mínimo e Máximo em R$ e, por cima, uma faixa com dois pontos) e Ofertas ("Em promoção" e um item por selo; hoje "Monte seu kit"), mais "Ordenar por" acima da grade.
- **Parâmetros da URL:** `busca`, `categoria` (repetível, é o mesmo de antes: `/loja?categoria=produtos-abte` continua valendo), `tipo` (`fisico`, `digital`), `disponibilidade` (`disponivel`, `esgotado`), `preco_min` e `preco_max` (em reais, ex. `39.99`; aceita também `39,99`), `promocao=1`, `selo` (slug do selo, repetível) e `ordem` (`menor-preco`, `maior-preco`, `nome`; relevância é o padrão e não aparece).
- **Regras** (funções puras em `src/lib/filtrosDaLoja.ts`, testadas em `testes/unidade/filtros-da-loja.test.mts`): opções do mesmo grupo somam (basta uma), grupos diferentes valem juntos; "Em promoção" e os selos formam o grupo Ofertas. Preço pelo valor efetivo (o promocional, quando houver). Busca sem acento e sem diferença de maiúsculas, com todas as palavras no nome. Valor desconhecido ou inválido na URL é ignorado; mínimo maior que o máximo mostra a mensagem e não aplica a faixa. Cada opção mostra a contagem com os OUTROS filtros ativos; com 0 e desmarcada, fica desabilitada e apagada. Relevância é a ordem da loja; nos empates de preço, também.
- **1024px ou mais:** barra de filtros à esquerda (288px), parada ao rolar logo abaixo do header e acompanhando quando ele se esconde (o header publica a própria altura em `--altura-do-header-visivel`); mais alta que a janela, rola por dentro. Cada mudança aplica na hora, sem recarregar (`router.replace`, por isso o "voltar" do navegador leva à página anterior, e não ao filtro anterior); texto e preço com 400ms de pausa. Acima da grade: "N produtos", ordem, etiquetas removíveis e "Limpar filtros".
- **Grade:** até 5 colunas, mínimo de 200px por card, por auto-fill. Decisão do responsável de 29/10: com 160px, o "Ver produto" quebrava em duas linhas. Medido: 3 colunas em 1024px (206px), 4 em 1280px (210px), 5 em 1710px (246px). Até 1023px continuam 2 e 1 colunas.
- **Até 1023px, com JavaScript:** botão flutuante redondo (56px, ícone de funil, número de filtros ativos) abre o painel: folha que sobe de baixo no celular e folha lateral à direita (480px) no tablet em pé. Diálogo com título, "Limpar tudo", "x", grupos (só Busca e Categoria abertos), e "Filtrar" e "Cancelar" fixos embaixo. Só "Filtrar" aplica; "x", "Cancelar", Esc e o fundo escuro descartam. O botão fica preso ao pé da tela enquanto a lista passa e para no fim dela, sem cobrir o rodapé.
- **Hoje (abte-dev):** 10 produtos. Categoria: Produtos ABTE 6, teste 1, Produtos parceiros 2 (1 sem categoria). Tipo: físico 6, digital 4. Disponível 8, esgotado 2. Em promoção 1. Monte seu kit 2. Preço efetivo de R$ 9,90 a R$ 600. A categoria de teste e o produto de teste (publicado, sem imagem) aparecem na loja pública.
- Validação: `test:unidade` 329, `test:regras` 91, `test:sessao` 127 (547), typecheck, lint (4 avisos), lint:css (7 conhecidos) e build. Navegador em 390, 768, 1024, 1280 e 1710 px, também sem JavaScript e com movimento reduzido; capturas em `tmp-migracao/capturas/loja-filtro/`.
- Commits `a5c8d2e`, `f71516a`, `2392812` e `233590d`. Promovidos para a `main` em 29/10 com o "pode promover" do responsável, junto com as duas entregas de 28/10 (fast-forward de `fe30984` para `233590d`, deployment de Produção `7405966790`). Produção conferida em 390 e 1280 px sem falha.

### Alterações da ABTE (29/10, só na `feature/midia-upload`, sem promover)

Documento "ALTERAÇÕES ABTE" (29/10), todos os itens autorizados pelo responsável. As capturas do documento não foram vistas; as suposições estão no registro de 29/10 do `CLAUDE.md`, para a ABTE conferir.

- **Item 1:** caixas da home alinhadas à marca e ao rodapé. A imagem da chamada final foi para o container, e o logo compensa a faixa transparente do PNG. "Produtos em destaque" já vinha logo abaixo dos números.
- **Item 2:** Quem Somos com Missão, Visão e Valores numa coluna e o vídeo 9:16 ao lado (`VideoVertical`), com altura igual medida em 1024 a 1710 px. Abaixo dos blocos até 1023px. Endereço em `src/lib/site/video.ts`, vazio ("Vídeo em breve").
- **Item 3:** slides do banner em `src/lib/site/banners.ts`, com `href` e `rotulo` opcionais (slide inteiro como link). Os 3 slides estão sem destino: **a ABTE precisa preencher**.
- **Item 4:** ícones sociais e setas do banner no azul da marca. O lint:css caiu de 7 para 5 erros.
- **Item 6:** degradê branco sutil atrás do logo e do menu, só no topo da home. Some com o header sólido ou escondido.
- **Itens 7 a 11:** `CabecalhoDePagina` centraliza título, subtítulo e filtros de Profissionais, Blog, Artigos, categoria, Loja, Diretoria, Doe, Seja associado e páginas legais. Na Contato, ficam centralizados o título e o aviso do bloco. Saiu o bloco "IMAGEM" do topo de Artigos.
- **Item 12:** artigos sem a data da importação e sem "Autor Desconhecido", com títulos contidos e card no molde do blog (imagem 16:9, "Ler artigo"). "Mais lidos da semana" virou "Todos os artigos".
- **Validação:** 554 testes (336 de unidade, 91 de regras, 127 de sessão), typecheck, lint (4 avisos), lint:css (5) e build. Navegador em 5 larguras e 9 páginas sem falha. Capturas em `tmp-migracao/capturas/alteracoes-abte/`.
- **Commits:** `5b83625`, `764fa84`, `f94f7ed`, `b112502`, `15899dd`, `a1e16ae`, `e29cd60` e `a3ea085`, mais o desta documentação. A `main` continua em `a5bfe89` até o "pode promover".

### Loja com 4 colunas, sem a faixa, menu flutuante e espaçamento (29/10, só na `feature/midia-upload`, sem promover)

- **4 colunas:** a grade da `/loja` vai até 4 colunas (mínimo de 200px por card, por auto-fill). São 3 colunas de 1024 a cerca de 1239px e 4 a partir de 1240px. Ficou 200px, e não os 160px do pedido, porque com 160px o "Ver produto" quebrava.
- **Sem a faixa azul:** a faixa de Produtos, Carrinho e Entrar saiu de todas as páginas da loja. A contagem do carrinho e o login ficam no layout da loja.
- **Menu flutuante da loja** (`src/app/loja/_componentes/MenuDaLoja/`, regras em `src/lib/loja/menu.ts`):
  - Fica só nas páginas da loja: botão redondo com Produtos, Carrinho e Entrar ou Minha conta.
  - Abre com o mouse, o foco ou o clique. Fecha com Esc, toque fora ou ao escolher uma opção.
  - Animação em cascata com a corrente de pontinhos do logo, até 450ms. Com movimento reduzido, não há deslocamento nem escala.
  - Na `/loja` até 1023px, fica 16px acima do botão de filtros.
  - Exceção de design: o ícone de sacola, só na opção Carrinho.
- **Espaçamento num lugar só:**
  - `.pagina-interna` (`globals.css`) põe `--section-space` entre o header e o primeiro bloco.
  - O `<main>` (`LayoutPublico`) dá o mesmo espaço antes do rodapé.
  - Na home, cada section tem só o respiro de cima.
  - Títulos com `text-wrap: balance`. Alvos de 44px no banner, no "Pular para o conteúdo" e na categoria do post.
- **Auditoria:** a de antes e depois está em `tmp-migracao/auditoria/` (fora do Git). Todos os desvios reais foram de muitos para 0; o detalhe está no registro de 29/10 do `CLAUDE.md`.
- **Validação:** 556 testes (338 de unidade, 91 de regras, 127 de sessão), typecheck, lint (4 avisos), lint:css (5) e build.

### Botões flutuantes da loja no canto da janela (29/10, só na `feature/midia-upload`, sem promover)

- **Pedido:** o menu da loja preso ao canto inferior direito da janela, com a mesma distância das duas bordas, e a grade da `/loja` com no máximo 4 colunas.
- **Causa:** nenhum ancestral tinha transform, filter, perspective, will-change, contain ou backdrop-filter. O menu estava numa âncora `sticky` no fim do `<main>`, alinhada à borda do conteúdo (e não da janela), e, na `/loja` até 1023px, numa doca dentro do botão de filtros, também `sticky`.
- **Correção:** variável única `--fab-distancia: var(--space-24)` (`globals.css`). O menu da loja e o botão de filtros usam `position: fixed`, com `right` e `bottom` em `max(var(--fab-distancia), env(safe-area-inset-*))`. Na `/loja` até 1023px, o menu fica 16px acima do botão de filtros e some, inerte, com o painel aberto. A doca saiu. O rodapé das páginas da loja reserva embaixo o espaço dos botões (`reservarFlutuantes` no `LayoutPublico`), para o fim da página nunca ficar sob eles.
- **Grade:** já estava com no máximo 4 colunas nesta branch (`e129ce4`); a `main` e a produção ainda têm a versão de até 5 colunas, até o "pode promover".
- **Validação:** 6 larguras (390 a 1920), 3 páginas e 3 posições de rolagem com as distâncias iguais; 465 testes de unidade e sessão, typecheck, lint (4 avisos), lint:css (5) e build. Capturas em `tmp-migracao/capturas/fab-e-grade/`.

### Promoção de 29/10 (tarde)

- Tudo o que estava na `feature/midia-upload` (alterações da ABTE, loja com 4 colunas, menu flutuante, auditoria de espaçamento e botões no canto da janela) foi para a `main` com o "pode promover": fast-forward de `a5bfe89` para `0abcff2`, deployment `7421815588` com sucesso.
- Antes: 556 testes, typecheck, lint (4 avisos), lint:css (5) e build; varredura de dados pessoais e segredos com 0 achados.
- Produção conferida em 390, 768, 1280 e 1710 px: 23 páginas com status 200, um H1, 0 erros de console; menu da loja só na loja, no canto da janela; grade da `/loja` com no máximo 4 colunas.

### Quatro frentes (29 e 30/10)

- **Hover sem sublinhado** (`d162f54`): sistema único no `globals.css`. Links soltos com pílula de fundo (`.realce`), setas que deslizam 4px e links de texto corrido sublinhados só em repouso (`.texto-corrido a`), tudo só com mouse e também no foco. Um teste lê todo o CSS.
- **Imagem de cada item** (`d16dbf4`): campo `ImagemDoItem` nos formulários (post com capa e imagem no texto, artigo, profissional, galeria do produto, categorias). Texto alternativo obrigatório, aviso de menores, "Trocar", "Remover" e "Reutilizar imagem já enviada". A mídia guarda o dono (`src/lib/midia/dono.ts`); `/admin/midia` mostra "Usada em".
- **Imagens da home** (`ba3797f`): `/admin/home`, documento `configuracoes/home` (banners e as imagens de "Mutirões" e "Faça parte dessa rede"). Sem imagem, a home mostra o padrão de antes.
- **Painel** (`5f0dd47`): gaveta até 1023px, trilha, caixas de aviso, seções, barra de salvar, aviso de alterações não salvas, busca e filtros nas listas, cartões no celular, exclusões confirmadas em modal.
- **Validação:** 600 testes (367 de unidade, 138 de sessão, 95 de regras), typecheck, lint (4 avisos), lint:css (5) e build. Navegador: 45 conferências do site público e 84 do painel sem falha, 22 interações. Capturas em `tmp-migracao/capturas/quatro-frentes/`.
- **Promovido** em 30/10 (`e6544fd`, deployment `7437411662`, produção conferida).
- **Pendências:** tela da diretoria no painel; textos do aviso de menores; registro de alterações de posts, artigos e produtos.

### Duas versões das imagens da home (30/10)

- **Pedido:** cada banner e cada imagem de seção da home com a versão para computador e a opcional para celular. Commits `d9f891c` (dados), `fcd7ab1` (painel), `e43add3` (site) e `292584c` (ajuste).
- **Dados:** `midiaMobileId` opcional em `configuracoes/home`; documentos antigos continuam valendo. Dono por versão (`bannerCelular` e `secaoCelular`); "Usada em" com o banner e a versão.
- **Painel:** duas áreas no Modal, prévia em moldura, aviso "Sem versão para celular", botão "Usar a mesma imagem nas duas versões" e miniaturas "Computador" e "Celular" nos cartões.
- **Site:** `<picture>` no Hero e nas seções; cada largura baixa um arquivo por espaço (conferido em 6 larguras). Sem versão celular, como antes.
- **Validação:** 609 testes (373, 141, 95), lint (4 avisos), lint:css (5) e build. Navegador: 36 de 36 no painel, 8 de 8 nos links do banner, 6 larguras na home. Capturas em `tmp-migracao/capturas/home-duas-versoes/`.
- **Promovido** em 30/10 (`0b362f7`, deployment `7442085357`, produção conferida; documentos sem versão celular funcionando).

- **"Produtos em destaque" centralizado (30/10):** título, subtítulo e botão da section da home centralizados, só no CSS; medido a 0px do centro da grade nas 5 larguras.

### Banner da home em tela cheia e ponto de foco (30/10)

- **Hero** na altura da janela (100svh, com 100vh antes), em computador e celular; pontos a `--space-24` da base. Commits `4ad47ab`, `67ae594` e `9450856`.
- **Ponto de foco** opcional por banner (esquerda, centro, direita; ausente vale o centro), com grupo de rádio no painel, prévias de tela cheia, dica e aviso de imagem mais larga que 2:1.
- **Validação:** 616 testes (378, 143, 95); navegador em 6 tamanhos com o Hero igual à janela (0px); painel 17 de 17.
- **Pendência:** os 3 banners atuais não têm versão para celular e, em 390x844, mostram só 25,8% da largura da imagem.
- **Promovido** em 30/10 (`c96e6e0`, deployment `7446451745`, produção conferida).

### Lote de nove itens (30/10)

- **Commits:** `ec91690` (rodapé sem Facebook, "Siga nosso Instagram"), `c86d5ed` (Seja associado com Google Forms, decisão provisória), `52e53fb` (Artigos centralizados e opcionais, `configuracoes/site`, `/admin/configuracoes`), `b2215d1` (Pix estático pelo painel), `3833b88` (páginas institucionais editáveis, `/admin/paginas`), `4b310bd` (banner com tablet e texto em código), `5b04843` (link do banner para seção da home), `1c3589e` (vídeo de Quem Somos), `39bd030` (correções).
- **Papéis:** Home e vídeo para administrador e editor; Configurações e Páginas só administrador.
- **Validação:** 674 testes (416, 155, 103), lint 3 avisos, lint:css 5, build. Navegador: 67 conferências públicas e 33 do painel. Capturas em `tmp-migracao/capturas/lote-30-10/`.
- **Pendências:** aplicar o CORS do bucket (`docs/infra/cors.json`, comando no CLAUDE.md) para o envio de vídeo por arquivo; publicar as páginas institucionais no painel (até lá, ficam fora do site); cadastrar a chave Pix quando a ABTE enviar; textos dos banners em código (os atuais têm o texto na arte); versões tablet e celular dos banners.

## 5. Migração: o que não deve ser refeito

A importação principal ocorreu antes desta colaboração, em 23/10, conforme relatórios locais. Os números do conteúdo importado foram 267 mídias, 96 profissionais, nove produtos, 69 posts, quatro artigos e sete membros da diretoria. Algumas coleções também continham exemplos anteriores.

Profissionais, produtos e diretoria já tinham sido ativados/publicados parcialmente. A publicação de posts/artigos, que ainda estava pendente nos documentos antigos, **foi concluída em 28/10**. Não repetir importação, classificação ou publicação como se ainda estivessem pendentes.

As marcações de revisão editorial e de imagens foram preservadas; publicação não significa revisão encerrada. Os scripts históricos de publicação só abrangem documentos de origem Wix e a opção geral de categorias pode reativar “A classificar”. Não executar comandos históricos indiscriminadamente.

O plano, o resultado, as cópias e as conferências da operação de 28/10 estão numa pasta operacional local, fora do repositório. Preservar os arquivos; não copiar conteúdos privados para commits.

## 6. Pendências reais para finalizar

### Fluxos e integridade

1. **Contato:** mostra sucesso sem enviar nem armazenar a mensagem. Falta definir/configurar serviço e destinatário real.
2. **Exclusão de cliente:** apaga carrinho/documento antes do Authentication; falha na última chamada pode deixar conta sem retomada pela interface. Reproduzido com serviços fictícios na auditoria.
3. **Validação no servidor:** posts/artigos ainda precisam validar os campos obrigatórios e a URL do artigo.
4. **Resumo persistido:** editar o corpo do post pode deixar o resumo antigo; reduzir a prévia visual não corrigiu essa questão editorial.
5. **Concorrência de tópicos:** verificação de uso acontece fora da transação de exclusão.
6. Recuperação de senha mascara alguns erros de serviço como sucesso; controles de frequência do cadastro precisam de avaliação no contexto da infraestrutura.

### Operação e administração

- Painel móvel, gestão de usuários/papéis, configurações e manutenção da diretoria.
- Histórico completo e tela de consulta; logs ainda não cobrem todos os tipos de conteúdo.
- Fluxos de excluir/restaurar posts e artigos.
- Profissionais têm filtro por especialidade; busca por nome/localização/método e outros filtros previstos ainda não foram implementados.

### Conteúdo

- Revisão editorial dos importados, autoria e cadastro de profissionais; o relatório anterior sinalizava 79 profissionais com 186 pontos de revisão.
- Uma capa GIF e uma imagem interna AVIF recusadas ainda precisam de solução.
- Os quatro artigos científicos continuam sem resumo textual e sem link original preenchido; exibem título, autores, imagem e classificação.
- Treze PDFs ficaram fora: oito de artigos e cinco de cartilhas. Não foram adicionados nesta colaboração.
- Doze páginas antigas foram convertidas apenas para conferência, sem importação automática; história, triagem, cartilha e outros destinos institucionais precisam ser fechados.
- Home com imagens provisórias, vídeo de "Quem Somos" a enviar (`src/lib/site/video.ts`), destinos dos 3 slides do banner a definir (`src/lib/site/banners.ts`) e números a confirmar; associação/doação e textos legais/consentimento definitivos pendentes.
- Exemplos continuam públicos; sua remoção não foi solicitada.

### Lançamento

- Há 131 propostas de redirects do Wix ainda sem aplicação.
- Noindex global e robots temporário continuam ativos. O site é acessível sem login, mas liberação de indexação é outra etapa.
- Faltam sitemap, metadados finais, preparação de domínio/ambientes, recuperação, operação e custos.
- Há pendências de acessibilidade anteriores, como pausa visível do carrossel e estado acessível do filtro de profissionais.

## 7. Git: atenção ao ponteiro local

Na conferência de preparação deste resumo:

- `origin/main`: `dfe8d8d` (promoção de 30/10 do lote de nove itens, fast-forward de `c96e6e0`, deployment de Produção `7449312744`, conferido em 390 e 1280 px). Antes: `c96e6e0` (banner em tela cheia).
- Branch de trabalho: **`feature/midia-upload`**, igual à `origin/main` mais o commit que registra essa promoção (só documentação).
- `main` **local**: ainda `207c9b1`, bem atrás da referência remota.
- Nenhum push para a `main` sem o "pode promover" do responsável; nunca forçar histórico.

Não usar a `main` local antiga como se fosse a produção atual. Conferir o diff e preservar a documentação antes de trocar branch ou sincronizar. Nenhum reset, limpeza ou novo deploy é necessário apenas para ler este resumo.

A integração GitHub-Vercel publica `main`. A credencial local de acesso direto à API da Vercel retornou 403; as publicações foram concluídas pela integração GitHub existente, sem criar novas credenciais.

## 8. Onde encontrar a implementação recente

- Blog: `src/app/blog/page.tsx`, `page.module.css`, `src/lib/buscaBlog.ts` e `src/components/CardPost/`.
- Testes da busca: `testes/unidade/busca-blog.test.mts`.
- Profissionais: `src/components/CardProfissional/`, `PopupProfissional/`, `ContatosProfissional/`, `MetodosProfissional/`, `src/components/Modal/`, `src/lib/texto.ts`, `src/lib/profissionaisPublicos.ts`, `src/components/Icones/Icones.tsx` e `src/styles/tokens.css`.
- Testes do card e do popup: `testes/unidade/profissionais-publicos.test.mts`.
- Card de produto: `src/components/CardProduto/` (variável `--proporcao-imagem-produto`).
- Menu flutuante da loja: `src/app/loja/_componentes/MenuDaLoja/` e `src/lib/loja/menu.ts` (testes em `testes/unidade/menu-da-loja.test.mts`). Espaçamento das páginas: `.pagina-interna` em `src/app/globals.css` e o respiro do `<main>` em `src/components/LayoutPublico/`.
- Filtro da loja: `src/app/loja/page.tsx`, `src/app/loja/_componentes/` (`FiltroDaLoja`, `GrupoDoFiltro`, `OpcaoDoFiltro`, `FaixaDePreco`, `EtiquetasDosFiltros`), `src/lib/filtrosDaLoja.ts` e `testes/unidade/filtros-da-loja.test.mts`.
- Home, produtos em destaque: `src/app/page.tsx`, `page.module.css`, `escolherProdutosEmDestaque` em `src/lib/produtos.ts` e os testes em `testes/unidade/produtos.test.mts`.
- Home, vídeo e banner (29/10): `src/lib/site/video.ts`, `src/lib/site/banners.ts`, `src/components/VideoVertical/`, `src/components/Hero/` e os testes `testes/unidade/video.test.mts` e `banners.test.mts`.
- Cabeçalho das páginas internas: `src/components/CabecalhoDePagina/`. Card de artigo: `src/components/CardArtigo/`.
- Dados e acesso: `src/lib/dados/`, `src/lib/gravacao/`, `src/lib/auth/` e `src/lib/firebase/`.
- Migração: `scripts/`, `src/lib/migracao/`, `docs/dados-privados/` e `tmp-migracao/`.

`CLAUDE.md` preserva o histórico detalhado; `docs/CONTEXTO_CODEX.md` registra a auditoria e a cronologia desta colaboração. Diagnósticos antigos e decisões posteriores podem divergir: usar datas e evidência atual. Os registros de 01/10 e alguns blocos antigos de `CLAUDE.md` não representam o estado atual.

## 9. Comandos e validação

```sh
npm run dev
npm run typecheck
npm run lint
npm run lint:css
npm run test:unidade
npm run test:regras
npm run test:sessao
npm run build
```

Os emuladores exigem Java e usam projetos demonstrativos. O build obtém Public Sans pela rede. O servidor local foi utilizado em `http://localhost:3000`; verificar se já está em execução antes de iniciar outro.

Em 28/10, com o popup dos profissionais, a execução completa deu **505 testes** (287 de unidade, 91 de regras e 127 de sessão); com os produtos em destaque da home, **509** (291 de unidade), igual depois do card de produto no molde do blog. Em 29/10, com o filtro da loja, **547** (329 de unidade); com as alterações da ABTE, **554** (336 de unidade); com o menu da loja, **556** (338 de unidade). Os **487 testes** são a execução completa de **26/10**. Os seis testes da busca foram acrescentados em 28/10; houve uma execução pertinente de 23 testes nessa entrega, sem nova execução integral de todas as suítes. As compilações posteriores foram feitas em cópias isoladas com `--webpack`; isso não equivale a validar novamente o caminho padrão local com Turbopack.

As falhas históricas de Stylelint eram sete (Botao, Hero e Modal); desde 29/10 são cinco (Botao e Modal), porque as setas do banner deixaram o preto. Os arquivos modificados nas entregas visuais passaram nas verificações específicas.

## 10. Convenções para preservar

- Consultar a documentação instalada do Next.js 16 em `node_modules/next/dist/docs/` antes de alterar as APIs relevantes.
- Manter CSS Modules, componentes próprios, tokens e ausência de kits de UI. Decisões de design de 25/10 e 28/10 superam parte dos documentos originais.
- Preservar o acesso ao Firebase pelo servidor, a checagem de sessão/papel e a separação de sessões loja/painel.
- Não exibir nem versionar `.env*`, chaves, tokens, dados pessoais ou arquivos privados da migração. Credenciais existentes não devem ser sobrescritas durante a retomada.
- Não inventar dados institucionais, Pix, contatos, textos legais finais, autoria ou conclusões científicas.
- Não considerar o projeto finalizado apenas porque todas as publicações cadastradas estão visíveis.

**Próxima frente técnica sugerida:** estabilizar contato e exclusão de conta; depois completar a operação do painel e fechar conteúdo/lançamento. O próximo pedido do responsável determina o trabalho a executar.


## Retomada no Codex em 30/10/2026: ajustes A a D

Continuidade a partir de `1a19af4`, preservando os cinco commits locais anteriores. Nenhuma migração, gravação no abte-dev, alteração de regras ou configuração do bucket executada nesta etapa.

- A: `/blog` já era aceito; mensagens antigas e campos confusos foram tratados no commit anterior. Nesta retomada, validador compartilhado recusa HTTPS malformado e escapes percentuais inválidos; erro de botão sem destino passa ao campo de link. Testes ampliados.
- B: mesma `.container` do cabeçalho e Hero, agora com safe-area; coluna respeita metade do espaço no desktop; piso de 24px e atualização ao redimensionar a altura. Prévia usa unidades relativas à tela virtual. Medidas de 390/768/1024/1280/1440/1710: título 30/41,38/49,09/50,4/56/69,74px. Diferença logo/texto 0px também em1536 e1600; nenhuma palavra partida, conjunto dentro do Hero e sem rolagem lateral. Em1024, o título longo conferido ocupa cinco linhas: não foi cortado para impor quatro. Matriz adicional concluída: dois títulos, três alinhamentos e seis larguras,36/36 cenários aprovados. Revisão geral pública31/31; total109 verificações de navegador (42+36+31), além das oito medidas detalhadas do Hero.
- C: botão de configurações movido da lateral para barra superior no desktop; gaveta móvel preservada. Cancelar Pix restaura os quatro campos da última gravação bem-sucedida. Ligar/desligar Artigos,404/200, menus, modal aninhado e Escape conferidos em emulador. `/artigos` não tem filtros nem paginação; não foram criados. Sitemap ainda ausente.
- D: limite único de1GB preservado e teste antigo de60MB atualizado. Gravação conserva autor/data da confirmação de menores em edições da mesma fonte e renova ao trocar a fonte; desmarcar remove os campos. Novo teste de regressão. Capa automática avisa quando o recorte difere de9:16. Play central: diferença inferior a1px nas seis larguras; zero chamadas YouTube/ytimg antes do clique; aviso de1GB e prévias do painel conferidos. Upload real do bucket depende de CORS e não foi executado.

Verificações:426 unidade,160 sessão e103 regras aprovados (689); typecheck e buildWebpack aprovados. ESLint sem erros, três avisos de imagens no código e um aviso no roteiro local ignorado. Stylelint mantém os cinco erros conhecidos em Botao/Modal, sem novos. Navegador:42/42 verificações de interação; oito medidas do Hero com dados fictícios. Evidências no workspace da tarefa, pasta `work/retomada-ajustes-2026-10-30/`.

CORS não executado: `gcloud storage buckets update gs://NOME_DO_BUCKET --cors-file=docs/infra/cors.json`. Substituir pelo bucket correto antes de executar. Sem segredos no relatório. Código desta retomada não promovido; produção conferida anteriormente permanece em `dfe8d8d`. A matriz visual foi concluída. A tentativa de promoção foi bloqueada pela revisão automática por exigir autorização humana explícita para a publicação específica. Nenhum push para main foi executado. Correções salvas na branch remota em826d512; o commit posterior registra este resultado.
