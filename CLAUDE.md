# ABTE: site e painel em código próprio

## Resumo do projeto

Reconstrução do site da **ABTE, Associação Brasileira de Tratamento da Escoliose**, que hoje está no Wix, em código próprio (saída 100% do Wix). O site público mostra conteúdo institucional, diretório de profissionais, blog, artigos, loja (só vitrine) e doação. O conteúdo é mantido por um **painel administrativo sob medida** (sem CMS pronto), com dois papéis: **administrador** (acesso total, inclusive usuários e configurações) e **editor** (cadastra e edita conteúdo).

A gestão do projeto não é feita por desenvolvedores: a revisão é visual, em 390, 768, 1280 e 1710 px. Sempre que for preciso agir no console do Firebase ou no GitHub, explique passo a passo, em linguagem simples.

## Stack e versões instaladas (etapa 1)

| Item | Versão |
|---|---|
| Node.js (máquina de desenvolvimento) | 25.9 (conferido em 02/10/2026; mínimo 22.18, por causa dos scripts `.mts` e dos testes em TypeScript) |
| Next.js (App Router, TypeScript) | 16.3.6 |
| React | 19.2.8 |
| TypeScript | 5.9 |
| firebase (SDK web, só nos logins do painel e da loja) | 12.19.0 |
| firebase-admin (só no servidor) | 14.5.0 |
| server-only | 0.0.1 |
| sharp (processamento de imagens no servidor, etapa 4d; versão exata, aprovada em 18/10/2026; já vinha instalado pelo Next.js) | 0.35.5 |
| firebase-tools (CLI e emuladores, dev) | 15.31.0 |
| @firebase/rules-unit-testing (dev) | 5.0.2 |
| ESLint (eslint-config-next) | 9.39 |
| Stylelint | 17.15 |

CSS puro com CSS Modules e `src/styles/tokens.css` global. **Sem Tailwind, Bootstrap ou kits de UI.** Public Sans via `next/font/google`, auto-hospedada no build. O design system prevê os pesos 400 e 600; o código carrega 300, 400 e 600 (ver Divergências).

Atenção ao Next.js 16: o antigo `middleware.ts` agora se chama **`proxy.ts`** (`src/proxy.ts`); `cookies()` é assíncrono. Antes de escrever código, consulte a documentação em `node_modules/next/dist/docs/`.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Site em http://localhost:3000 (e, na mesma rede Wi-Fi, pelo IP da máquina; ver "Servidor de desenvolvimento pelo IP") |
| `npm run build` | Build de produção |
| `npm run lint` | ESLint |
| `npm run lint:css` | Stylelint: falha com cor em hex/rgb/hsl/nome ou font-size em px fora do tokens.css |
| `npm run typecheck` | Checagem de tipos (tsc) |
| `npm run test:regras` | Testes das regras do Firestore e do Cloud Storage nos emuladores (exige Java; 80 testes desde 18/10/2026: 60 do Firestore e 20 do Storage) |
| `npm run test:sessao` | Testes de sessão e permissão nos emuladores de Authentication, Firestore e Storage (cliente nunca entra no painel, sessão revogada, exclusão de conta; biblioteca de mídia: envio, lixeira, exclusão de vez, registro de alterações e permissões por papel; foto do profissional: imagem inexistente ou na lixeira recusada, registro só com os campos alterados, imagem em uso listada pelo nome); exige Java. 42 testes desde 18/10/2026 (fatias 3b a 3d: também capas, imagens de artigos, categorias e galeria de produtos, divisão entre publico/ e lixeira/, falhas registradas no log e o script `midia:orfas`) |
| `npm run test:unidade` | Testes de unidade das funções puras (acesso ao painel e permissões por ação, validações, slug, regras e processamento de imagens com o sharp), com `node --test`, sem emulador. 113 testes desde 18/10/2026 (fatias 3b a 3d: também variantes na largura original, id da imagem escolhida, fronteira entre navegador e servidor, capa do post e galeria do produto) |
| `npm run admin:conceder -- email@exemplo.com [--nome "Nome"]` | Dá o papel "administrador" a um usuário existente (lê o .env e depois o .env.local; o .env.local prevalece) |
| `npm run midia:orfas` | Confere a biblioteca de mídia: pastas no Storage sem documento em `midias` e documentos com arquivo faltando. Mostra antes o projectId e o bucket em uso. Por padrão SÓ LISTA. Apagar exige `-- --apagar --confirmo-projeto=<id exibido>`; apaga só os arquivos das pastas órfãs (nunca documentos) e ignora pastas com arquivo criado há menos de 60 minutos (`--minutos=N` muda). Testado no emulador (`testes/sessao/midia-orfas.test.mts`) |

## Estrutura de pastas

```
docs/                     arquivos de referência (design system, tokens, contexto, ABTE_contexto_projeto.md)
docs/dados-privados/      dados de origem da migração; fora do Git, só o README é versionado
tmp-migracao/             saída dos scripts de migração (fora do Git; criada quando houver script)
firestore.rules           regras do Firestore (nega tudo)
storage.rules             regras do Cloud Storage (nega tudo; só abrir arquivo em publico/)
firebase.json, .firebaserc  Firebase CLI (Firestore, Storage e emuladores; projeto padrão abte-dev)
.env.example              modelo das variáveis de ambiente (sem valores)
scripts/                  scripts de linha de comando (Admin SDK)
testes/regras/            testes das regras (node:test + emulador)
testes/unidade/           testes de unidade das funções puras (node:test)
testes/sessao/            testes de sessão e permissão nos emuladores (node:test)
src/
  proxy.ts                checagem rápida de cookie no /admin (redireciona ao login)
  styles/tokens.css       tokens v3.1 (única fonte de valores visuais; difere de docs/tokens.css, ver P15)
  app/
    globals.css           reset, base, classes tipográficas, .container, .texto-sobre-destaque
    layout.tsx            layout raiz (html pt-BR, fonte)
    page.tsx              home
    not-found.tsx         404 provisória
    blog/, artigos/, profissionais/, contato/, loja/   páginas públicas
    componentes/          página de revisão visual (noindex)
    robots.ts             robots.txt PROVISÓRIO que bloqueia tudo (remover no lançamento)
    doe/, seja-associado/ páginas provisórias (decisões P1 e P8 em aberto)
    politica-de-privacidade/, termos-de-uso/, acessibilidade/   versões preliminares, em revisão pela ABTE
    admin/                painel
      acoes.ts            ações de servidor do login (criar e encerrar sessão)
      acoes-conteudo.ts   ações de servidor de posts, artigos e profissionais
      acoes-topicos.ts    ações de servidor dos tópicos dos artigos (categorias e tags)
      acoes-profissionais.ts  ações de servidor dos profissionais (salvar, excluir para a lixeira, restaurar)
      acoes-produtos.ts   ações de servidor dos produtos da loja (cadastro, sem pagamento)
      acoes-midia.ts      ações de servidor da biblioteca de mídia (só checam sessão e papel e chamam lib/midia/biblioteca.ts), inclusive a lista do seletor de mídia
    loja/acoes-conta.ts   ações da conta de cliente (cadastro, entrar, sair, excluir)
    loja/acoes-carrinho.ts  ações do carrinho (adicionar, trocar quantidade, remover)
      entrar/             login e recuperação de senha
      (painel)/           telas protegidas (layout com checagem de sessão e papel)
      _componentes/       componentes só do painel (um por pasta, com CSS Module)
  components/<Nome>/      componentes do site, um por pasta, com seu CSS Module (Revelar: entrada ao rolar; PaginaDeTexto: páginas institucionais só de texto)
  config/navegacao.ts     menu, rodapé, e-mail, redes e funções de item ativo do menu
  config/profissionais.ts tipos de profissional (também as tags do filtro), métodos, países e UFs
  lib/firebase/cliente.ts SDK web (navegador, só login)
  lib/firebase/servidor.ts e admin-auth.ts   Admin SDK (server-only)
  lib/auth/               sessão do painel e do cliente (server-only), verificação do cookie, papéis e decisão de acesso (pura), destino seguro, constantes
  lib/loja/               cadastro de cliente e regras do carrinho (puras) e contas (Admin SDK recebido por parâmetro)
  lib/dados/carrinho.ts   leitura do carrinho e dos produtos dele (server-only)
  lib/dados/              tipos das coleções e leitura tipada do Firestore (colecoes.ts é server-only)
  lib/validacao.ts        validações puras (id do Firestore, campos de formulário, e-mail)
  lib/contatos.ts         validação e padronização de WhatsApp, Instagram, Facebook e e-mail (pura)
  lib/profissionais.ts    validação do cadastro de profissional (pura)
  lib/produtos.ts         preço em centavos, validação do produto e relacionados (pura)
  lib/slug.ts             geração de slug (pura)
  lib/midia/regras.ts     regras puras da mídia (tipo real pela assinatura, larguras, alt, aviso de menores, caminhos, endereço público)
  lib/midia/biblioteca.ts processamento (sharp) e gravação no Storage e no Firestore; sem sessão e sem server-only, reaproveitável pela migração (etapa 6)
  lib/midia/servicos.ts   liga a biblioteca ao Firebase do site (server-only) e monta o endereço público (emulador nos testes)
  lib/midia/exibicao.ts   monta as imagens para as telas (server-only): lista da biblioteca e imagens por id, só as fora da lixeira
  lib/midia/tela.ts       tipos das imagens como as telas recebem (sem dependências)
  lib/log/alteracoes.ts   registro mínimo em logAlteracoes (mídia e profissionais, por enquanto) e lista dos campos alterados
  lib/gravacao/profissionais.ts  gravação dos profissionais com o registro de alterações (Firestore por parâmetro, sem server-only)
  lib/gravacao/posts.ts   gravação dos posts com a capa da biblioteca (Firestore por parâmetro, sem server-only; sem registro de alterações até a etapa 3)
  lib/gravacao/artigos.ts gravação dos artigos (categoria, tags e imagem conferidas), mesmo padrão
  lib/gravacao/topicos.ts conferência da imagem das categorias (de artigos e de produtos)
  lib/gravacao/produtos.ts conferência das imagens da galeria do produto
  lib/capaDoPost.ts       regra pura de qual capa o post mostra (lista e página)
```

## Rotas

- **Públicas:** `/`, `/profissionais` (filtro `?tag=`), `/blog`, `/blog/[slug]`, `/artigos`, `/artigos/[slug]`, `/artigos/categoria/[slug]` (categorias e tags lidas do Firestore), `/contato`, `/loja` (lista com filtro `?categoria=`, subcabeçalho próprio da loja), `/loja/produto/[slug]` (produto com relacionados e aviso "Em breve"), `/loja/entrar`, `/loja/entrar/recuperar-senha`, `/loja/cadastro`, `/loja/conta` (conta de cliente, noindex), `/loja/carrinho` (exige conta, noindex), `/componentes` (revisão visual, noindex).
- **Painel:** `/admin/entrar`, `/admin/entrar/recuperar-senha`, `/admin` (visão geral), `/admin/blog`, `/admin/blog/novo`, `/admin/blog/editar/[id]`, `/admin/artigos`, `/admin/artigos/novo`, `/admin/artigos/editar/[id]`, `/admin/artigos/topicos` (categorias e tags), `/admin/profissionais`, `/admin/loja`, `/admin/loja/novo`, `/admin/loja/editar/[id]`, `/admin/loja/categorias` (criar, editar e excluir num modal), `/admin/midia` (biblioteca de mídia: enviar, buscar, editar alt, lixeira, restaurar e excluir de vez).
- **Provisórias (18/10/2026):** `/doe` ("Em breve", sem Pix nem dado de pagamento, decisão P1 em aberto) e `/seja-associado` (texto do card da home e botão para `/contato`, decisão P8 em aberto).
- **Preliminares, com a faixa "Versão preliminar, em revisão pela ABTE" (18/10/2026):** `/politica-de-privacidade`, `/termos-de-uso`, `/acessibilidade`. Descrevem só o que o código faz hoje, sem afirmação jurídica nem declaração de conformidade.
- Nenhum link interno do menu ou do rodapé dá 404 desde 18/10/2026.

## Arquivos de referência (ordem de prioridade em caso de conflito)

1. `docs/tokens.css` e `docs/tokens.json`: valores visuais oficiais v3.1 (a cópia usada no código é `src/styles/tokens.css`, com os tamanhos de fonte convertidos para rem)
2. `docs/design-system.md`
3. `docs/ABTE_design_redesign.md`
4. `docs/ABTE_contexto_redesign.md`

## Arquitetura Firebase

- **Desenvolvimento:** projeto `abte-dev`, numa conta Google de desenvolvimento, separada da conta da ABTE (plano gratuito, Firestore em southamerica-east1, Authentication por e-mail e senha).
- **Produção:** projeto próprio, em conta da ABTE, criado na etapa 9. Nada no código depende do `abte-dev`: tudo que identifica o projeto vem de variáveis de ambiente (`.env.example` lista todas). O `.firebaserc` só define o alias padrão da CLI.
- **Acesso aos dados sempre pelo servidor**, com o Admin SDK. O navegador não lê nem grava no Firestore.
- **Regras do Cloud Storage (`storage.rules`, desde 18/10/2026):** tudo negado ao navegador, inclusive para quem tem papel no painel. Única exceção: abrir (`get`) um arquivo pelo caminho exato em `publico/**`, onde ficam as imagens já processadas. Listar pastas continua negado; `lixeira/` e qualquer outro caminho ficam fechados; gravar, alterar metadados e apagar são sempre negados (os envios passam pelo servidor, com o Admin SDK). Testes em `testes/regras/storage.test.mts` (emulador na porta 9199). As regras ainda não foram publicadas no projeto real: no console, o bucket está no modo de produção (bloqueado), que nega tudo (conferido por leitura pela API em 21/10/2026).
- **Regras do Firestore negam todo acesso direto do navegador.** Toda coleção nova continua negada e ganha teste em `testes/regras/`. Qualquer exceção precisa de regra específica e teste.
- **Papéis por custom claim** `papel` no Authentication: `administrador` ou `editor`. Sem papel, nada do painel.
- **Sessão por cookie** de sessão do Firebase (`__session`, httpOnly, secure em produção, sameSite strict, 5 dias, caminho `/admin`), validado no servidor em toda página do painel com checagem de revogação (`src/lib/auth/sessao.ts`). O layout do painel usa `exigirSessaoDoPainel()` para mostrar "Acesso não autorizado" a quem não tem papel; **toda ação de servidor e toda página do painel que lê dados começam por `exigirPapelDoPainel()`**, que falha fechada (sem sessão vai para o login; sem papel interrompe antes de ler ou gravar). A decisão fica na função pura `decidirAcessoAoPainel()` (`src/lib/auth/papeis.ts`), testada em `test:unidade`. Administrador e editor ainda têm o mesmo acesso. "Sair" revoga a sessão e apaga o cookie.
- **Conta de cliente da loja (D1, lote E3):** criada pelo servidor com o Admin SDK (`cadastrarCliente`), sem custom claim `papel`, com documento em `clientes` (nome, e-mail, data e versão do consentimento; a senha fica só no Authentication). Sessão no cookie `abte_cliente` (httpOnly, secure em produção, sameSite strict, 5 dias, caminho `/loja`), separado do `__session` do painel; validada por `lerSessaoCliente()` e `exigirSessaoCliente()` (`src/lib/auth/sessao-cliente.ts`), que também exigem o documento em `clientes` (conta do painel não entra na loja). A verificação do cookie fica em `src/lib/auth/verificacao.ts`, sem Next.js, testada no emulador (`test:sessao`). O destino depois do login só aceita caminhos da loja (`destinoSeguroNaLoja`). Excluir a conta pede a senha de novo e apaga usuário, cliente e carrinho.
- **Código de servidor sem "server-only" (desde 18/10/2026):** `lib/midia/biblioteca.ts`, `lib/gravacao/*`, `lib/loja/contas.ts` e `lib/log/alteracoes.ts` não importam `server-only`, para servirem a scripts e testes. O teste `testes/unidade/fronteira-cliente.test.mts` falha se um arquivo "use client" importar diretamente um deles, `firebase-admin` ou `sharp` (importação só de tipo é permitida). A importação INDIRETA (componente que importa um arquivo que importa um deles) é coberta pelo build, que falha com "Can't resolve 'child_process'" (conferido em 18/10/2026).
- **Admin SDK só no servidor:** `src/lib/firebase/servidor.ts`, `src/lib/firebase/admin-auth.ts`, `src/lib/auth/sessao.ts`, `src/lib/auth/sessao-cliente.ts` e `src/lib/dados/colecoes.ts` importam `server-only`. O SDK do navegador pode apontar para o emulador de Authentication só se `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` estiver definida no build (testes); em produção ela fica vazia.
- **Leitura tipada:** as páginas leem o Firestore por `lerPosts()`, `lerArtigos()`, `lerProfissionais()` e `lerTopicos()` (com `listarTopicosAtivos()`) e `lerProdutos()` (com `listarProdutosVisiveis()`) (`src/lib/dados/colecoes.ts`), com conversores somente de leitura; os tipos ficam em `src/lib/dados/tipos.ts`. As gravações ficam nas ações de servidor, que validam o id (`ehIdDeDocumentoValido`) e limitam o tamanho dos campos curtos.
- **Padrões de dados (desde 10/10/2026):** slug criado com o nome, único (verificado numa transação, `escolherSlugUnico()`) e estável ao renomear; exclusão vai para a lixeira (`excluidoEm` preenchido), com "Restaurar" na própria tela; coleções pequenas são filtradas e ordenadas na memória, sem índice composto. Ações que respondem a formulários com `useActionState` devolvem `{ ok, mensagem }` em português.
- **Teste ponta a ponta:** o build de produção pode rodar contra os emuladores de Firestore e Authentication (variáveis `FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST` e `FIREBASE_ADMIN_PROJECT_ID=demo-...`), com um cookie de sessão criado no emulador; nenhum dado de teste toca o projeto real.
- **Variáveis de ambiente:** o arquivo oficial dos segredos é o **`.env.local`** (modelo em `.env.example`). Hoje as credenciais também estão num `.env` criado durante o deploy de teste na Vercel; o Next.js e o `admin:conceder` leem os dois, e o `.env.local` prevalece. Nenhum dos dois entra no Git.
- **Testes:** toda etapa que mexe com dados inclui testes de regras e de permissões (sessão e papel) das ações de servidor. Funções puras (decisão de acesso, validações, slug) têm testes em `testes/unidade/` (`npm run test:unidade`).

## Plano de etapas

1. **Base** ✅ concluída
2. Páginas públicas estáticas (inclui a página Doe com Pix estático, se confirmado)
3. Modelo de dados no Firestore, papéis administrador e editor, cadastro de usuários pelo painel, registro de alterações, lixeira, "Configurações do site" com os dados do Pix (editável só pelo administrador), regras e testes; SEM coleções de pedidos, doações e cupons
4. Painel administrativo, em partes com revisão entre elas: 4a profissionais e diretoria; 4b blog e artigos; 4c produtos; 4d biblioteca de mídia (Cloud Storage, que exige o plano Blaze)
5. Páginas dinâmicas (inclui lista da loja e página de produto; carrinho e conta de cliente só dentro da loja, ver D1; finalização de compra SEM pagamento)
6. Migração de conteúdo
7. Loja com pagamento: DESATIVADO (quando ativado, via Stripe)
8. Doação com pagamento online: DESATIVADO (quando ativado, via Stripe)
9. SEO e lançamento (inclui projeto Firebase de produção na conta da ABTE, hospedagem e alerta de orçamento no Google Cloud)

Situação real: ver "Estado atual" logo abaixo e "Divergências conhecidas e pendentes".

## Estado atual (verificado em 21/10/2026; os blocos com data própria valem para a data indicada)

**Registro de 21/10/2026 (relatório só de leitura e preparação da migração):**
- **Git:** a branch de trabalho é `feature/midia-upload`. Ela tem a etapa 4d inteira em 31 commits à frente de `integracao/continuidade` (`b91dfde`) que existem SÓ no Git local (nunca enviados ao GitHub, sem cópia remota), mais os commits de 21/10/2026 (pasta de dados privados e esta atualização). `main` em `207c9b1`, igual a `origin/main`. `refs/original` intocado (1 ref).
- **Produção:** a Vercel publica a main de 29/09/2026 (`207c9b1`, último deployment de Production pelos deployments do GitHub), que NÃO tem noindex (sem `robots.ts` e sem `robots` na metadata) e ainda tem o conteúdo anterior à limpeza. Último preview: `b91dfde` (18/10/2026).
- **GitHub:** `gh api` indicou o repositório como PÚBLICO (`private=false`) em 21/10/2026. A decisão de torná-lo privado está com o responsável do projeto (pendência; ver "Encontrado em 21/10/2026").
- **Etapa 4d:** concluída no código (fatias 0 a 3d, mais os ajustes de falha parcial, `midia:orfas`, fronteira entre navegador e servidor e variante na largura original). **`storage.rules` NÃO publicado no `abte-dev`:** a leitura das regras pela API em 21/10/2026 mostrou a regra publicada em 18/10/2026 (a padrão do modo de produção, que nega tudo e não tem `publico/`), diferente do arquivo do repositório. Teste real pendente.
- **Dados no `abte-dev` (só contagens):** `posts` 2, `artigos` 1, `categoriasDeArtigos` 1, `produtos` 1, `categoriasDeProdutos` 1; `profissionais`, `tagsDeArtigos`, `midias`, `logAlteracoes`, `usuarios`, `configuracoes`, `diretoria`, `clientes` e `carrinhos` 0. Authentication: 1 usuário, administrador. Bucket vazio (0 arquivos em `publico/` e em `lixeira/`). Regras do Firestore publicadas iguais ao `firestore.rules`.
- **Linhas de base (21/10/2026, `feature/midia-upload`):** typecheck passa; lint 0 erros e 4 avisos (`<img>` em `blog/[slug]/page.tsx`, `CardPost`, `Hero` e `Logo`; o do `CardCategoriaArtigo` saiu na fatia 3c); lint:css só os 7 erros da tabela A; build passa; `test:unidade` 113 de 113; `test:regras` 80 de 80; `test:sessao` 42 de 42.
- **Dados privados da migração:** `docs/dados-privados/` (só o README é versionado) e `tmp-migracao/` (saída dos scripts) ficam fora do Git desde 21/10/2026.

**Git (18/10/2026).** A main continua em `207c9b1` (igual a `origin/main`) e é o que a Vercel publica em produção (deployments do GitHub: produção só da main; não há `vercel.json`, e `.vercel/` só liga a pasta ao projeto `abte`). Todas as outras branches estão contidas, em cadeia linear, na ponta `c470d4f` (`fix/dev-ip-e-rodape`, nunca enviada; `feature/midia-upload` partia desse ponto antes da etapa 4d e hoje tem todo o trabalho de mídia, ver o registro de 21/10/2026). A branch **`integracao/continuidade`** parte de `c470d4f` (merges das demais vazios) e traz as correções de 18/10/2026: 404 em vez de 500 em endereço inválido, título da aba em posts e artigos, H1 para leitores de tela na home e em `/contato`, `allowedDevOrigins` só com `192.168.1.*`, noindex em todo o site, `/doe`, `/seja-associado` e as três páginas legais preliminares. É a candidata a ir para a main, depois da revisão do preview. No remoto existem `main`, `feature/loja-e-ajustes`, `integracao/versao-atual` e, depois do push, `integracao/continuidade`; `refs/original` existe só no Git local.

**Navegador (18/10/2026, `integracao/continuidade`, build de produção, Chrome headless com perfil temporário, script Node sem dependência, em 390, 768, 1280 e 1710 px):** 18 rotas públicas (inclusive as 5 novas) com status 200, um H1 cada, sem rolagem horizontal, sem imagem quebrada, sem erro de console nem aviso de hidratação, todas com `noindex, nofollow`; nenhum link interno dá 404; endereço inválido e rota inexistente dão 404 com título "Página não encontrada". Submenu de Profissionais abre e fecha com mouse e teclado (Esc devolve o foco à seta); o menu esconde ao rolar para baixo e volta com fundo branco ao subir, transparente no topo; o banner passa sozinho (0, 1, 2, 0 a cada 6 s), para com o mouse em cima e as setas funcionam; abaixo de 1024 px o hambúrguer abre o menu, prende o foco, trava a rolagem, fecha com Esc e com o botão e devolve o foco. Painel sem sessão redireciona para `/admin/entrar` (307), e painel e `/componentes` têm `X-Robots-Tag` e metadata noindex. Terceiros pedidos pelo navegador: `picsum.photos` (home e `/componentes`) e `static.portugues.com.br` (imagem gravada num post do blog).

**Verificações automáticas (18/10/2026, `integracao/continuidade`):** iguais às de 12/10/2026: typecheck passa; lint 0 erros e 5 avisos; lint:css só os 7 erros da tabela A; build passa; `test:regras` 60 de 60; `test:unidade` 73 de 73; `test:sessao` 8 de 8. Os 6 avisos de lint de antes vinham do `<img>` da foto em `CardProfissional`, removido no lote C (o card passou a usar o placeholder).

**Pedido de 10/10/2026, situação em 18/10/2026:** A (rodapé à esquerda) feito, com a exceção da frase de direitos centralizada; B (tópicos dos artigos) feito; C (profissionais com lixeira) feito, sem foto (Storage) e sem "grupo" (decidido em 10/10/2026: só tipo); D (animações) feito; E (loja: produtos, páginas, relacionados, conta de cliente, carrinho) feito, sem galeria (Storage) e sem finalização de compra (decisão D1). Degradê do menu: não iniciado (tarefa separada; nenhuma branch ou código). Mídia: etapa 4d concluída no código em `feature/midia-upload` (inclui a foto dos profissionais e a galeria dos produtos); bucket criado em 18/10/2026, ainda vazio e com o `storage.rules` não publicado (ver o registro de 21/10/2026).

**Conteúdo de terceiros e placeholders (etapa de mídia, não mexer antes):** `picsum.photos` em `src/app/page.tsx` (banner) e `src/app/componentes/page.tsx`; `static.portugues.com.br` vem do campo antigo `imagem` de posts gravados no Firestore (capa antiga, ver "Capa do post"); `placehold.co` saiu em 18/10/2026 (fatia 3b: post sem capa usa o placeholder interno); blocos "IMAGEM" (`PlaceholderImagem`) fixos em `src/app/page.tsx` e `src/app/artigos/page.tsx` (abertura); nos cards de post, profissional, categoria de artigo e produto e na galeria do produto, só quando não há imagem da biblioteca.

### Registro de 12/10/2026

**Git.** A main está em `207c9b1` (igual a `origin/main`) e é o que a Vercel publica em produção (`abte-lovat.vercel.app`, confirmado pelos deployments do GitHub em 12/10/2026). As branches formam uma cadeia linear, cada uma contida na seguinte: `limpeza/codigo-limpo` (9 commits à frente da main), `limpeza/sem-pessoas` (11), `feature/loja-e-ajustes` (21, também no GitHub, com preview na Vercel) e `fix/menu-banner-rodape` (26). A branch **`integracao/versao-atual`** (12/10/2026) parte da ponta dessa cadeia e reúne tudo: limpeza, remoção de referências a pessoas, loja (lotes E1 a E4) e correções de menu, banner e rodapé. Os merges das demais branches nela foram vazios (nenhum conflito). Ela é a candidata a ir para a main, depois da revisão do preview.

**Comportamento no navegador (12/10/2026, `integracao/versao-atual`, Chrome headless a 1440 px, build de produção e modo dev):** submenu de Profissionais abre com o mouse e fecha ao sair; o menu esconde ao rolar para baixo e volta ao rolar para cima com fundo `--color-bg`; no topo, transparente na home e sem fundo nas internas; o banner troca de slide sozinho e as setas funcionam; a frase de direitos autorais fica centralizada; título da aba de `/blog` é "Blog | ABTE"; nenhum erro de JavaScript nem aviso de hidratação. Com um submenu aberto o menu não se esconde (`Header.tsx`, checagem de `aria-expanded="true"`), então o submenu nunca fica solto na tela. No console aparecem só os 404 de pré-carregamento dos links sem página (ver "Rotas") e, no modo dev, um aviso de pré-carregamento de CSS do próprio Next.js.

**Cache do modo dev:** em 12/10/2026 o `npm run dev` respondia erro 500 em todas as páginas ("Can't resolve '@vercel/turbopack-next/internal/font/google/font'", da fonte Public Sans). Sem a página, o JavaScript não roda, e por isso o submenu, o recolhimento do menu e o banner pareciam quebrados no computador local, enquanto o site publicado funcionava. A causa estava no cache do Turbopack em `.next/dev`, não no código: com o cache refeito, tudo funciona. Se acontecer de novo, pare o `npm run dev`, apague a pasta `.next/dev` e rode `npm run dev` outra vez. Por que o cache ficou nesse estado não foi verificado.

**Servidor de desenvolvimento pelo IP (12/10/2026):** aberto pelo endereço de rede da máquina (ex.: http://192.168.1.19:3000), o `npm run dev` só funciona porque o `next.config.ts` libera essa rede em `allowedDevOrigins`. Sem isso, o Next.js bloqueia a conexão `/_next/hmr` vinda de origem diferente de localhost (no log: "Blocked cross-origin request to Next.js dev resource /_next/hmr"), e o React não liga: banner parado, setas e submenu sem resposta (medido: 1 de 183 elementos com React pelo IP, contra 178 de 184 pelo localhost). A lista vale só na fase do servidor de desenvolvimento (`PHASE_DEVELOPMENT_SERVER`) e libera só o padrão `192.168.1.*` (o `*` vale para o último número do IP, que o roteador pode trocar; o IP específico saiu em 18/10/2026 por já estar coberto). Em outra rede (ex.: 192.168.0.x ou 10.x), acrescente o padrão dela na lista e reinicie o `npm run dev`; nunca liste endereço público. Build e produção não usam essa opção. **Para testar pelo celular:** computador e celular na mesma rede Wi-Fi; rode `npm run dev`; o terminal mostra a linha "Network: http://192.168...:3000"; abra esse endereço no celular. Se o IP mostrado não começar com 192.168.1, inclua o padrão da rede na lista antes.

**Verificações automáticas (12/10/2026, branch `integracao/versao-atual`):** typecheck passa; lint com 0 erros e 5 avisos (`<img>` sem `next/image`); lint:css com exatamente os 7 erros da tabela A de "Exceções de design"; build passa; `test:regras` 60 de 60 (15 coleções); `test:unidade` 73 de 73; `test:sessao` 8 de 8. Iguais aos de 10/10/2026 (`feature/loja-e-ajustes`). Antes da loja: lint com 6 avisos, `test:regras` 40, `test:unidade` 22.

**Etapas do plano no código**
| Etapa | O que existe |
|---|---|
| 1 Base | Concluída. |
| 2 Páginas estáticas | Home (carrossel, cards de público, estatísticas, missão, visão e valores), `/contato` (envio falso), `/loja` (só título), `/componentes`; desde 18/10/2026, `/doe` e `/seja-associado` provisórias e as três páginas legais preliminares. |
| 3 Modelo de dados | Parcial. Existem a lixeira (`excluidoEm`) em profissionais, tópicos, produtos e mídia, o `logAlteracoes` só para mídia e profissionais e a tabela `PERMISSOES` (provisória, P7). Faltam `usuarios`, `configuracoes`, cadastro de usuários pelo painel e o registro de alterações nas demais coleções. Os papéis existem só como custom claim. |
| 4 Painel | 4a: profissionais com o modelo completo (lote C, 10/10/2026: tipo, tratamento, nome, registro, métodos, país, UF, cidades, telerreabilitação, WhatsApp, Instagram, Facebook, e-mail, apresentação, ativo, ordem), contatos validados, exclusão para a lixeira com restauração; sem foto (etapa 4d) e sem diretoria. 4b: blog e artigos com listar, criar e editar (sem excluir), e tópicos dos artigos (categorias e tags) com criar, renomear, excluir para a lixeira e restaurar. 4c: produtos (lote E1, 10/10/2026) com nome, slug único e estável, descrição, preço e preço promocional em centavos, categoria editável, tipo físico ou digital, disponível ou esgotado, selo, ordem e publicado; lixeira com restauração; sem galeria (etapa 4d). 4d (18/10/2026, concluída no código): regras do Storage, biblioteca de mídia e `/admin/midia` (fatias 0 a 2); seletor de mídia e foto do profissional (fatia 3a); capa do post (fatia 3b); imagem dos artigos e das categorias de artigos (fatia 3c); galeria dos produtos e imagem das categorias de produtos (fatia 3d). Etapa 4d concluída no código; faltam publicar o `storage.rules` e o teste real no `abte-dev`. |
| 5 Páginas dinâmicas | `/blog`, `/blog/[slug]`, `/artigos`, `/artigos/[slug]`, `/profissionais` e a loja (lista, produto, conta de cliente e carrinho, sem pagamento) leem o Firestore. `/artigos/categoria/[slug]` lê categorias e artigos do Firestore desde o lote B (10/10/2026). |
| 6 a 9 | Nada. |

**Firestore:** coleções usadas pelo código: `posts`, `artigos`, `categoriasDeArtigos`, `tagsDeArtigos`, `profissionais`, `produtos`, `categoriasDeProdutos`, `clientes`, `carrinhos` e, desde 18/10/2026, `midias` e `logAlteracoes` (ainda vazias no projeto de desenvolvimento); todas negadas ao navegador e cobertas por `testes/regras`. No projeto de desenvolvimento, em 18/10/2026 só a coleção `posts` existia, com 2 documentos publicados; em 21/10/2026 (contagem sem ler valores) havia também 1 artigo, 1 categoria de artigos, 1 produto e 1 categoria de produtos (ver o registro de 21/10/2026). Os testes rodam nos emuladores e não gravam nada no projeto. `profissionais` está vazia. No Authentication há 1 usuário, com papel administrador. As regras negam tudo; `testes/regras/firestore.test.mts` cobre 10 coleções (as do modelo planejado e uma qualquer) para visitante, logado sem papel, administrador e editor. `firestore.indexes.json` não tem índices.

**Storage (18/10/2026):** o bucket `abte-dev.firebasestorage.app` existe, em `SOUTHAMERICA-EAST1` (consulta pelo Admin SDK, só nome e região), vazio e sem CORS (vazio também em 21/10/2026). A etapa 4d (biblioteca de mídia) está concluída no código na branch `feature/midia-upload`, em fatias: 0 (sharp e correções de 18/10), 1 (regras e emulador), 2 (biblioteca e `/admin/midia`) e 3a a 3d (campos de imagem). Testada só nos emuladores: nenhum envio real ao `abte-dev` até a pessoa responsável publicar o `storage.rules` no console (em 21/10/2026 ainda não publicado).

**Biblioteca de mídia (fatia 2, 18/10/2026):**
- **Caminhos no Storage:** `publico/midias/{id}/{largura}.webp` (lido pelo site) e `lixeira/midias/{id}/{largura}.webp` (fechado). O id do documento é novo a cada envio, então nenhum nome de arquivo é reaproveitado.
- **Documento `midias/{id}`:** `caminhoStorage`, `tipo` ("imagem"), `alt` (obrigatório, até 200 caracteres), `largura` e `altura` (da imagem enviada, já na orientação certa), `tamanho` (bytes recebidos), `variantes` [{`largura`, `caminho`, `tamanho`}], `enviadoPor` (uid), `indicaMenor`, `autorizacaoConfirmadaPor` (uid), `autorizacaoConfirmadaEm`, `criadoEm`, `excluidoEm`. Diferenças aprovadas em relação ao modelo de dados: sem `url` (montada pelo caminho) e sem AVIF; campos de menores acrescentados. Nenhum e-mail nem nome de arquivo é gravado.
- **Registro `logAlteracoes/{id}`:** `usuarioId`, `usuarioNome` (nome de exibição do Authentication, nunca o e-mail), `papel` (campo extra), `colecao`, `documentoId`, `acao` (criar, editar, excluir, restaurar, excluir_definitivo), `campos` (nomes, sem valores), `resumo`, `criadoEm` (hora do servidor). Gravado no mesmo lote da alteração. **`excluir_definitivo` é extensão ao enum do modelo de dados: atualizar o documento 05 do Projeto.** Sem tela de consulta.
- **Limites:** o navegador reduz a imagem (lado maior até 2560 px, orientação do EXIF aplicada) e recodifica em JPEG de qualidade 0,92 (`SAIDA_DO_NAVEGADOR`; desde 18/10/2026, porque o Safari não gera WebP no canvas e devolveria PNG; áreas transparentes ficam brancas); o arquivo enviado vai até 4 MB menos 64 KB (`LIMITE_DO_ARQUIVO_EM_BYTES`), dentro do `serverActions.bodySizeLimit` "4mb" do `next.config.ts`. O servidor confere o tipo real e recodifica tudo de novo.
- **Exibição:** componente `ImagemDaMidia` (`next/image` com carregador próprio que escolhe a variante; sem a otimização da Vercel e sem `remotePatterns`). Na lixeira, a prévia usa endereço assinado de leitura, válido por uma hora (NÃO VERIFICADO no projeto real; funcionou no emulador).
- **Imagem em uso:** `REFERENCIAS_DE_MIDIA` em `biblioteca.ts` lista os campos que apontam para uma mídia (desde a fatia 3a: `profissionais.fotoMidiaId`; desde a 3b: `posts.capaMidiaId`, pelo título; desde a 3c: `artigos.imagemMidiaId`, pelo título, e `categoriasDeArtigos.imagemMidiaId`, pelo nome; desde a 3d: `produtos.imagens[].midiaId`, pelo nome, em qualquer posição da galeria, e `categoriasDeProdutos.imagemMidiaId`, pelo nome). Campos em lista (`emLista`) leem a coleção inteira (pequena) e filtram na memória, sem campo extra no documento. "Excluir" mostra os registros que usam a imagem, pelo nome (os que estão na lixeira aparecem marcados), e só segue com "Excluir mesmo assim". A referência não é apagada: com a imagem na lixeira ou excluída de vez, o site mostra o placeholder; restaurada, a foto volta.
- **Seletor de mídia (fatia 3a):** `src/app/admin/_componentes/SeletorDeMidia/` é o campo de imagem dos formulários do painel: escolher da biblioteca (busca pelo alt, miniaturas operáveis por teclado), prévia, remover e enviar imagem nova sem sair do formulário (usa `EnviarMidia`, que não é `<form>` e não tem campos com `name` nem `required`, para não ir junto nem travar o formulário de fora). O alt aparece só para leitura (editável em `/admin/midia`). O formulário recebe só o id, num campo escondido; a gravação confere no servidor se a imagem existe e está fora da lixeira (a imagem já gravada pode ficar, mesmo na lixeira).
- **Capa do post (fatia 3b, 18/10/2026):** campo `capaMidiaId` (nome do modelo de dados), escolhido pelo seletor de mídia no formulário do post (que passou a ser componente de cliente com `useActionState`: erros voltam em português, sem perder o texto digitado). O campo de texto "Imagem de Capa (URL)" saiu do formulário; o valor antigo gravado em `imagem` NÃO é apagado nem alterado (o formulário de edição só informa o endereço). Exibição na lista do blog e na página do post: com `capaMidiaId`, a imagem da biblioteca (`ImagemDaMidia`, com o alt da mídia; se ela estiver na lixeira ou excluída, nada da biblioteca, sem voltar para a capa antiga); sem `capaMidiaId`, a capa antiga, se houver; sem imagem nenhuma, a lista do blog mostra o placeholder interno e a página do post fica sem bloco de imagem (como antes da fatia 3b). Regra numa função pura, `src/lib/capaDoPost.ts`, testada em `testes/unidade/capa-do-post.test.mts`. Na página do post, a capa carrega já e com prioridade alta (`prioridade` do `ImagemDaMidia` usa `loading="eager"` e `fetchPriority="high"`, porque `priority` foi descontinuado no Next.js 16).
- **Imagem do artigo e da categoria de artigos (fatia 3c, 18/10/2026):** `artigos.imagemMidiaId` (nome do modelo de dados) e `categoriasDeArtigos.imagemMidiaId`. O modelo de dados não define imagem para categorias; segue o mesmo padrão `imagemMidiaId` dos artigos (escolha registrada aqui; sem conflito com a seção 12.3 de `docs/ABTE_contexto_redesign.md`, que não lista as coleções de categorias). **Decisão de 18/10/2026:** a imagem do artigo aparece SÓ na página do artigo (`/artigos/[slug]`, entre o cabeçalho e o resumo; sem imagem, nenhum bloco), porque o design aprovado define o card de artigo como só texto (design-system seção 11, A1). A imagem da categoria aparece no card da categoria em `/artigos` (`CardCategoriaArtigo`, 16:9; sem imagem, o placeholder interno). O formulário de artigo virou componente de cliente (mesmo padrão dos posts: erros em português sem perder o texto). Na tela "Tópicos dos artigos", cada categoria já criada tem o seletor de mídia; a imagem é escolhida depois de criar a categoria. A gravação só mexe na imagem quando o formulário traz o campo. PDFs (`pdfArtigoMidiaId`, `pdfCatMidiaId`) ficam para depois (PDF fora desta tarefa).
- **Galeria do produto e imagem da categoria de produto (fatia 3d, 18/10/2026):** `produtos.imagens [{ midiaId, ordem }]` (modelo de dados), até 8 imagens por produto (`LIMITE_DE_IMAGENS_DO_PRODUTO` em `lib/produtos.ts`, proposto em 18/10/2026), sem ids repetidos. A principal é a primeira pela ordem, sem campo extra; no site vale a primeira DISPONÍVEL (se a primeira estiver na lixeira, entra a seguinte; `imagemPrincipal`). No painel, `GaleriaDeMidia` (adicionar da biblioteca ou enviando, "Subir", "Descer" e "Remover" por botão, operáveis por teclado, com o foco acompanhando o item e anúncio para leitores de tela); a escolha da biblioteca é o componente `EscolhaDaBiblioteca`, comum ao seletor e à galeria. O servidor confere que as imagens novas existem e estão fora da lixeira; as já gravadas podem ficar (mesma regra das outras imagens). No site: `CardProduto` com a principal (3:4; sem imagem, o placeholder interno) e a página do produto com `GaleriaDoProduto` (destaque 3:4 e miniaturas como botões, com o alt de cada imagem no rótulo e a atual marcada). `categoriasDeProdutos.imagemMidiaId` (mesmo padrão das categorias de artigos): **decisão de 18/10/2026**, aparece como miniatura decorativa (alt vazio, o nome já identifica o link) nos filtros de categoria de `/loja`; sem imagem, um quadrado vazio na cor suave. É exceção de design pendente da designer (tabela D). A loja continua sem pagamento, gateway ou finalização de compra; o carrinho da decisão D1 não foi alterado.
- **Foto do profissional (fatia 3a):** campo `fotoMidiaId` (id da mídia ou null). O card público (`CardProfissional`) usa `ImagemDaMidia` com o alt da mídia; sem foto, ou com a imagem na lixeira, mostra o placeholder. As gravações de profissionais (criar, editar com só os nomes dos campos alterados, excluir e restaurar) passaram a ir para `logAlteracoes`, no mesmo lote.

**Segurança:** todas as ações de `acoes-conteudo.ts` e todas as páginas do painel que leem dados começam por `exigirPapelDoPainel()`; as páginas sem leitura de dados (`/admin`, `novo`) ficam protegidas pelo layout. Cookie `__session` httpOnly, sameSite strict, secure em produção, caminho `/admin`, 5 dias. Painel e `/componentes` com noindex (metadata e cabeçalho `X-Robots-Tag`). Nenhum código, dependência ou variável de pagamento.

**Movimento (desde o lote D, 10/10/2026):** só CSS, sem framer-motion (removido). Entrada ao rolar pelo componente `Revelar` (`revelar()` espalhado no próprio elemento, `ObservadorDeRevelacao` no `LayoutPublico`), ligada por um script curto no `<head>` de `app/layout.tsx` só com JavaScript ativo e sem movimento reduzido; sem JavaScript, ou se o observador não carregar em 3 segundos, nada fica escondido. Só opacidade e transform (CLS medido 0). Menus com entrada e seta animadas; botões e links do rodapé com troca de cor suave; foco sempre instantâneo. O `globals.css` desliga transições e animações com `prefers-reduced-motion`, e o carrossel do Hero não avança sozinho nesse caso. O painel não usa nada disso.

## Decisões tomadas sobre pagamento

- Pagamento online **desativado**.
- Gateway definido para quando for ativado: **Stripe**.
- Loja com **carrinho e conta de cliente restritos à área da loja** (D1, 10/10/2026), sem pagamento e sem finalização de compra. Substitui a regra anterior "loja só vitrine".
- Doação por **Pix estático** (QR code e código copia e cola, valores sugeridos de R$25, R$50, R$100 e valor livre, sem registro automático das doações), **a confirmar**.
- **Nunca** instalar gateway, SDK de pagamento, finalização de compra (checkout) ou webhook sem pedido explícito. Sem coleções `pedidos`, `pedidoItens`, `doacoes` ou `cupons`.

## Decisões registradas

Numeração D: este arquivo não tinha série D antes de 10/10/2026; D1 é o primeiro número usado aqui. Se os registros do Projeto já usam outra numeração, ajustar.

- **D2 (18/10/2026), biblioteca de mídia (etapa 4d):** envio pelo painel com a imagem reduzida no navegador (lado maior até 2560 px, respeitando a orientação) e mandada por ação de servidor (`serverActions.bodySizeLimit` "4mb"; acima disso, mensagem em português); sem CORS no bucket. O processamento fica num módulo server-only independente de sessão, reaproveitável pela migração (etapa 6): confere o tipo real (JPEG, PNG ou WebP; SVG e HEIC recusados), aplica a rotação do EXIF, remove metadados, gera WebP qualidade 78 nas larguras 480, 960 e 1600 px (sem ampliar; abaixo de 480 px, uma variante na largura original; desde 18/10/2026, também uma variante na largura original quando a imagem tem menos de 1600 px e é pelo menos 15% maior que a maior variante da lista que coube: 900 px gera 480 e 900, 1000 px gera 480 e 960; com 1600 px ou mais, só 480, 960 e 1600) e não guarda o original. Sem AVIF e sem PDF nesta etapa. Leitura pública só em `publico/**` (get, sem list), cache de um ano, componente próprio de imagem que escolhe entre as larguras, sem a otimização de imagens da Vercel. Exclusão em duas etapas: "Excluir" move para `lixeira/`, "Restaurar" devolve, "Excluir de vez" só para administrador, com confirmação; imagem em uso pede confirmação. Registro mínimo em `logAlteracoes` só para mídia, com os campos do modelo de dados do Projeto (documento 05, fora do repositório) mais `papel` e `campos` e a ação `excluir_definitivo` (ver "Biblioteca de mídia" em Estado atual). Caixa de menores com confirmação de autorização, texto PROVISÓRIO. Home e banner fora (dependem de `configuracoes`, etapa 3).
- **D1 (10/10/2026), carrinho e conta de cliente na loja:** pedido explícito de carrinho e conta de cliente, restritos à área da loja (`/loja` e rotas filhas, num subcabeçalho próprio; o cabeçalho do site não ganha login nem carrinho). Substitui a regra "loja só vitrine" e os itens 1 a 3 do registro de alterações de `docs/design-system.md` no que diz respeito ao carrinho. Continuam proibidos: pagamento, gateway, SDK de pagamento, webhook, variáveis de pagamento e finalização de compra (até decisão própria). Conta de cliente pelo Firebase Authentication, criada pelo servidor, sem custom claim `papel`, com sessão em cookie separado do painel; clientes nunca acessam o painel. Implementado em 10/10/2026 (lotes E1 a E4), com estas decisões aprovadas: finalização como botão "Finalizar compra: em breve" desativado, com o carrinho guardado na conta (opções de envio por e-mail ou WhatsApp e Stripe ficam para depois); carrinho só com conta de cliente; relacionados da mesma categoria, publicados, sem o próprio produto, até 3, pela ordem do painel; exclusão para a lixeira (`excluidoEm`); subcabeçalho com o texto "Carrinho (n)", sem o ícone de sacola, até a designer decidir; cookie `abte_cliente` com caminho `/loja`. O carrinho guarda só id e quantidade (`carrinhos/{uid}`); preço e disponibilidade são lidos do produto no servidor a cada vez.

## Decisões em aberto: NUNCA assumir

Forma de doação (P1; `/doe` mostra só "Em breve") e, se for Pix, confirmação e dados do Pix da ABTE (chave, titular, cidade, exibição do CNPJ); hospedagem (Firebase App Hosting é candidata, não decidida); região do projeto de produção; registro do domínio; serviço de e-mail do formulário de contato; papéis no painel; associação (P8: Google Forms ou formulário próprio; `/seja-associado` é provisória); newsletter; área de membros; comentários no blog; marca "Tratando Escoliose" (título e descrição da home não mudam até a decisão); logo em vetor; fotos; números oficiais; depoimentos; logos de parceiros; e, quando o pagamento for ativado, frete, recorrência, recibo e nota fiscal.

## Regras permanentes

- **Design:** usar somente os tokens. Nenhuma cor, fonte, tamanho ou espaçamento fora do tokens.css. Raio 0, sem sombra.
- **Tipografia:** tamanhos só pelos tokens convertidos na etapa 1 (clamp em rem, âncoras 390 e 1710 px).
- **Regra do #76ACF5:** nenhum texto abaixo de 24px sobre essa cor, em nenhuma tela (use a classe `.texto-sobre-destaque`).
- **Responsivo:** o mesmo design em todas as telas. Só mudam tamanhos (pelos clamp), colunas (design-system.md seção 9) e altura mínima de 44px nos controles até 767px. Nada é escondido no celular, nada muda de ordem. Abaixo de 1024px, única exceção: o menu vira hambúrguer. Breakpoints literais: 767px e 1023px.
- **Acessibilidade:** um H1 por página, hierarquia sem saltos, foco visível com `--focus-ring`, tudo operável por teclado, textos alternativos em português, `prefers-reduced-motion` respeitado, erro e sucesso em caixa branca.
- **Idioma:** tudo em português do Brasil, inclusive textos do sistema, rótulos acessíveis, mensagens de validação e de erro do Firebase (nunca exibir a mensagem técnica em inglês). Em textos visíveis, não use travessão (o sinal longo de pontuação); use vírgula, dois-pontos ou ponto.
- **Dados:** nunca inventar profissionais, registros, preços, números, depoimentos, parcerias, CNPJ ou chave Pix. Use placeholders claramente marcados como exemplo.
- **Pagamento:** desativado. Não instalar Stripe nem qualquer outro gateway ou SDK de pagamento, não criar finalização de compra (checkout), rotas de webhook, variáveis de ambiente de pagamento nem coleções de pedidos, doações ou cupons até pedido explícito. Carrinho e conta de cliente são permitidos só dentro da loja (D1).
- **Imagens:** nunca linkar static.wixstatic.com nem outro CDN do Wix.
- **Firebase:** acesso aos dados sempre pelo servidor com Admin SDK, com checagem de sessão e papel; regras negam todo acesso direto do navegador por padrão; toda exceção precisa de regra específica e teste; o Admin SDK nunca vai para o navegador.
- **Segurança:** segredos só no .env.local, nunca no código, nunca em commit, nunca exibidos no terminal. Painel com noindex. Cookies de sessão httpOnly e sameSite strict.
- **Organização:** componentes pequenos e reutilizáveis, um por pasta com seu CSS Module. Comentários do código em português.

@AGENTS.md


## Divergências conhecidas e pendentes

Registro de 02/10/2026, depois da limpeza da branch `limpeza/codigo-limpo`. Nada aqui foi decidido: cada item espera o responsável pela decisão ou a etapa certa. Não corrigir sem pedido, porque quase todos mudam o que se vê ou se faz.

**Design (decisão de design, a definir)**
- **Peso 300 contra 400 e 600 do design system:** `src/styles/tokens.css` tem `--font-weight-light: 300`, `--font-weight-regular: 300` e `--font-weight-bold: 400`; `docs/tokens.css` tem regular 400 e bold 600. A fonte é carregada em 300, 400 e 600.
- **Raios e sombras:** o design system pede raio 0 e nenhuma sombra; o código tem cantos de 4, 5, 8 e 20 px e sombras em cards, modal e hover (ver "Exceções de design").
- **P15, tokens diferentes de `docs/tokens.css`:** além dos pesos, `--section-space` passou de `clamp(64px, 5.61vw, 96px)` para `clamp(96px, 8vw, 160px)` (commit e070500). Os tamanhos de fonte em rem são a conversão legítima da etapa 1.
- **Variáveis usadas e nunca definidas** (o navegador ignora a declaração): `--space-12` e `--font-size-base` (formulários de post e artigo do painel) e `--color-text-muted` (`src/app/blog/[slug]/page.module.css`).
- **Preto sem token próprio** (`#000` e `rgba(0,0,0,…)`): o único token com esse valor é `--color-icon-social`, dos ícones do rodapé; não foi usado em fundos e sombras para não amarrar uma coisa à outra.

**Acessibilidade e comportamento adiados (mudam o que se vê ou se faz)**
- **H1 na home:** desde 18/10/2026 a home e `/contato` têm H1 só para leitores de tela (classe `somente-leitor`), sem mudança visual. O H1 visível da home depende da designer e da marca.
- **Carrossel do Hero:** desde 12/10/2026 avança sozinho a cada 6 segundos (`INTERVALO_DO_CARROSSEL_MS` em `Hero.tsx`), em loop, e para com o mouse sobre o banner, com foco de teclado dentro dele, com a aba oculta e com movimento reduzido; setas "Slide anterior" e "Próximo slide" e pontos funcionam sempre. **Pendente: botão de pausa visível** (chamado de P16 no pedido de 12/10/2026; neste arquivo P16 é o slug que muda ao editar, conferir a numeração), porque muda o visual. Texto alternativo ainda genérico ("Slide 1"). As setas têm 28 px de largura em 390 px, abaixo dos 44 px dos controles (visual não alterado).
- **aria-pressed:** os botões do filtro de `/profissionais` não anunciam qual está ativo.
- **Modal:** resolvido em 10/10/2026 (lote C): `role="dialog"`, Esc fecha, foco preso dentro e devolvido ao fechar; a exclusão de profissional usa confirmação dentro do modal.
- **Profissionais sem foto:** desde a fatia 3a (18/10/2026) o card mostra a foto escolhida no painel; sem foto, o placeholder preto "IMAGEM". O filtro de `/profissionais` ainda é só por tipo; os filtros do design (estado, cidade, método, telerreabilitação, busca) ficam para depois.
- **Saltos de título** (H1 direto para H3) em `/blog`, `/profissionais` e `/artigos/categoria/[slug]`; o `globals.css` estiliza h2 e h3 pela tag, então trocar o nível muda o tamanho.
- **Submenu de Profissionais:** os itens nunca ficam marcados como ativos (o caminho não inclui `?tag=`).
- **P16, slug que muda ao editar:** o slug do post é refeito a partir do título a cada edição (links antigos quebram), e dois títulos iguais geram o mesmo slug.
- **Erros no painel:** posts (fatia 3b) e artigos (fatia 3c) mostram os erros em português no próprio formulário, desde 18/10/2026. O registro de alterações cobre só mídia e profissionais (ver "Registro de alterações só em mídia e profissionais").
- **Endereço inválido:** resolvido em 18/10/2026: `/blog/[slug]` e `/artigos/[slug]` com valor reservado (ex.: `__x__`) dão 404; as duas páginas também passaram a ter o título do post ou do artigo na aba.
- **P19, classificações de artigo:** resolvida em 10/10/2026. Categorias e tags são cadastradas em `/admin/artigos/topicos` e lidas do Firestore pelo painel e pelas páginas públicas. Os cards de categoria ficam sem imagem (placeholder) até a etapa 4d.
- **P22, exclusão de profissional:** resolvida em 10/10/2026. Vai para os excluídos (`excluidoEm`), sai do site e pode ser restaurada; falhas aparecem em português.
- **Numeração P:** P18, P20, P21 e P23 são citadas nos registros do Projeto, mas não aparecem neste arquivo; as 7 perguntas do diagnóstico original também não. Conferir e trazer para cá.

**Conteúdo e etapas futuras**
- O formulário de contato mostra "enviado" sem enviar nada (serviço de e-mail em aberto).
- Links que davam 404: resolvido em 18/10/2026 com páginas provisórias e preliminares (ver "Rotas").
- **Rodapé no celular:** em 390 px as colunas empilhadas começam em alturas e bordas esquerdas diferentes (cada coluna centralizada como bloco, com o texto à esquerda, conforme a opção aprovada no lote A). Pendente de decisão de design.
- **Carrinho (n) no subcabeçalho:** conta todas as unidades guardadas, inclusive de produtos que esgotaram ou saíram da loja; o total do carrinho conta só os disponíveis.
- **Storage e plano Blaze:** bucket criado em 18/10/2026 em São Paulo. Fora das 3 regiões dos EUA com nível gratuito: armazenamento e download são cobrados desde o primeiro byte (valores por GB NÃO VERIFICADOS). Conferir o alerta de orçamento no Google Cloud.
- **Download das imagens sem CDN (etapa 9):** as imagens públicas saem direto do bucket pelo endereço do Firebase Storage, sem CDN, com `Cache-Control: public, max-age=31536000, immutable` e nomes nunca reaproveitados. Reavaliar CDN no lançamento.
- **Posts com capa externa:** os 2 posts publicados do banco de desenvolvimento (`9kvFVacPmfqrSDSd66mk` e `PoMkgyRruccfAzwCxwK2`) têm a capa em `static.portugues.com.br` (campo antigo `imagem`). Ficam como estão: a etapa 4d não apaga nem altera dados existentes. O site continua mostrando essa capa até alguém escolher uma capa da biblioteca para o post (fatia 3b).
- **Aviso de fotos de menores (etapa 4d, fatia 2):** a caixa "A imagem mostra criança ou adolescente" e a confirmação "A ABTE tem autorização por escrito dos responsáveis" têm texto PROVISÓRIO (`EnviarMidia.tsx` e `validarAvisoDeMenor` em `lib/midia/regras.ts`); a redação final é da ABTE e da assessoria jurídica.
- **P7, permissões por papel (PROVISÓRIO, depende da diretoria):** tabela única `PERMISSOES` em `src/lib/auth/papeis.ts`. Hoje: administrador e editor enviam mídia, editam o alt, excluem para a lixeira e restauram; só o administrador exclui de vez. Para mudar, altere só a tabela (os testes de `acesso.test.mts` e `testes/sessao/midia.test.mts` dizem o que mudou).
- **Variante na largura original (decidido em 18/10/2026, ajustado no mesmo dia):** além de 480, 960 e 1600 (sem ampliar), uma variante na largura original só quando a imagem tem MENOS de 1600 px e é pelo menos 15% maior que a maior variante da lista que coube (`FOLGA_PARA_VARIANTE_ORIGINAL` em `lib/midia/regras.ts`). Com 1600 px ou mais, só 480, 960 e 1600 (nenhuma variante de 2000 px ou maior). Imagens já enviadas antes da mudança não ganham a variante nova (o projeto de desenvolvimento não tinha imagens).
- **Registro de alterações só em mídia e profissionais (etapa 3):** posts, artigos, produtos e categorias (de artigos e de produtos) ainda não gravam em `logAlteracoes`, por decisão de 18/10/2026; estender na etapa 3.
- **Falhas parciais no Storage (decidido em 18/10/2026):** mover para a lixeira e restaurar não travam depois de uma falha no meio: arquivo que já está no destino conta como movido, e repetir "Excluir" ou "Restaurar" conserta uma divisão entre `publico/` e `lixeira/`. Falha ao desfazer ou limpar vai para o log do servidor com o id da mídia ("Mídia {id}: falha ao ..."). Arquivos que sobrarem sem documento (ex.: servidor caiu no meio de um envio) aparecem em `npm run midia:orfas`.
- **Teste real da mídia no `abte-dev` (pendente):** depois de a pessoa responsável publicar o `storage.rules` no console, um único envio de imagem FICTÍCIA (sem pessoas), conferência no site e no painel (inclusive a prévia assinada da lixeira) e, em seguida, "Excluir de vez".
- **Loja:** produtos com galeria desde a fatia 3d (18/10/2026; sem imagem, placeholder); os endereços antigos do Wix (`/product-page/...`, `/category/...`) precisam de redirecionamento na etapa 9. Dados estruturados de produto sem `offers` (não aparecem preço nem disponibilidade no Google).
- Imagens provisórias externas (picsum.photos; placehold.co saiu na fatia 3b).
- Números das estatísticas e o título da home com "Tratando Escoliose" dependem das decisões em aberto.

**Conta de cliente da loja (lote E3)**
- **Cadastro público do Firebase:** NÃO VERIFICADO se está desligado no console (Authentication > Configurações > Ações do usuário > "Permitir criação de conta"). A loja não precisa dele: as contas são criadas pelo servidor.
- **Robôs no cadastro:** há só um campo escondido; sem limite de tentativas nem verificação (reCAPTCHA ou App Check). Avaliar antes do lançamento.
- **Nome do cookie e hospedagem:** no Firebase Hosting clássico só o cookie `__session` chega ao servidor; se essa for a hospedagem, o cookie da loja terá de se chamar `__session` com caminho `/loja`.
- **sameSite strict:** quem chega à loja por um link de outro site aparece sem sessão na primeira página (o cookie não vai nessa navegação); ao clicar em qualquer link da loja, a sessão volta.
- **Consentimento:** o texto do cadastro é provisório (versão `provisorio-2026-10-10`) e aponta para `/politica-de-privacidade`, que desde 18/10/2026 tem versão preliminar. Ver "Política de privacidade" abaixo.
- **E-mail repetido:** o cadastro avisa que já existe conta com o e-mail (inevitável num cadastro), o que revela que o e-mail está em uso.

**Política de privacidade (pendência para a ABTE, com assessoria jurídica; nenhum texto conclusivo foi escrito)**
- Desde 18/10/2026 existe uma versão preliminar em `/politica-de-privacidade` que descreve só o que o código faz hoje (campos do contato, que não envia nada; dados da conta da loja; cookies `abte_cliente` e `__session`; Vercel, Firebase Authentication e Firestore). O consentimento da loja continua na versão `provisorio-2026-10-10`.
- **Texto da política alterado em 18/10/2026 (fatia 3b da etapa 4d), continua PROVISÓRIO:** saiu a menção ao placehold.co (deixou de ser usado) e entrou o Cloud Storage para Firebase na lista de serviços (guarda as imagens do site, baixadas direto pelo navegador). A ABTE e a assessoria precisam revisar também esse trecho.
- A confirmar pela ABTE ou assessoria, nas três páginas legais: finalidade e base legal; prazos de guarda; encarregado (DPO) e canal dos direitos do titular; menores de idade; local de armazenamento e transferência internacional; responsabilidade pelo conteúdo e pela lista de profissionais; direitos autorais do conteúdo; regras da loja (frete, troca, devolução); como os termos mudam; e se a declaração de acessibilidade deve seguir algum modelo (ex.: eMAG).
- Quais dados a loja guarda: nome, e-mail, conteúdo do carrinho, data e versão do consentimento; cookie de sessão `abte_cliente` (e `__session` do painel).
- Finalidade e base legal de cada um (consentimento, execução de contrato ou outra, a definir pela assessoria).
- Prazo de guarda e o que acontece com contas inativas.
- Google (Firebase Authentication e Firestore) como operador, e transferência internacional de dados (região de produção em aberto).
- Direitos do titular (acesso, correção, exclusão, portabilidade) e como exercê-los; a exclusão da conta já existe em "Minha conta".
- Contato do encarregado de dados (DPO) da ABTE.
- Menores de idade: o público inclui adolescentes (art. 14 da LGPD); definir idade mínima ou consentimento dos responsáveis.
- Versionar o texto e trocar a versão do consentimento (`VERSAO_DO_CONSENTIMENTO` em `src/lib/loja/contas.ts`) quando ele mudar.

**Dependências e hospedagem**
- **P17, framer-motion fora do plano:** resolvida em 10/10/2026: trocado por CSS e removido do `package.json`.
- **Região das funções da Vercel (ligada à decisão de hospedagem, P3):** por padrão as funções rodam em `iad1` (EUA), enquanto o Firestore e o bucket estão em São Paulo; cada leitura e cada envio de imagem atravessam o continente. Avaliar `gru1` quando a hospedagem for decidida.
- **Plano Hobby da Vercel (ligado à P3):** pela política de uso justo da Vercel, o Hobby é só para uso pessoal não comercial; a loja e a doação pesam na escolha do plano ou da hospedagem.
- **Ajustes de Vercel com hospedagem ainda não decidida:** `transpilePackages: ["jwks-rsa", "jose"]` no `next.config.ts` e o override de `jose` 4.15.9 no `package.json`. Não remover sem testar o deploy.
- `turbopack.root` no `next.config.ts` só evita o aviso de um `package-lock.json` solto na pasta do usuário, fora do projeto.
- O Git local tem `refs/original/refs/heads/main`, backup de uma reescrita de autoria anterior; não está em nenhuma branch.

**Encontrado em 10/10/2026**
- **Conteúdo invisível sem JavaScript:** resolvido no lote D (o framer-motion entregava 11 blocos da home com `opacity: 0`).
- **Menu de desktop:** o hover troca o peso da fonte (300 para 600), o que alarga o texto e empurra os itens vizinhos; já era assim antes do lote D.
- **Nome de pessoa na documentação:** o nome da presidente da diretoria saiu de `docs/ABTE_contexto_projeto.md` (seção 1) em 12/10/2026, mas continua no histórico do Git (commit `d4c75fc`, já no GitHub, que é público); tirar do histórico exigiria reescrevê-lo, o que não foi autorizado. `docs/ABTE_contexto_redesign.md` continua listando profissionais reais com registro, como referência da migração (etapa 6), por decisão de 12/10/2026; já estava assim na main.
- **Permissão do `.env.local`:** o arquivo pode ser lido por outros usuários da máquina (o `.env` não). Fora do Git; ajuste local, sem efeito no código.
- **"Mais lidos da semana" em `/artigos`:** a seção mostra os artigos mais recentes; não existe contagem de leitura.
- **Painel no celular:** a barra lateral tem 280 px fixos e o conteúdo fica com `calc(100vw - 280px)`, sem regra para telas estreitas; em 390 px o painel fica espremido e difícil de usar (`LayoutPainel.module.css`). Vale também para `/admin/midia` (medido em 18/10/2026: sem rolagem horizontal, mas com textos e cartões cortados).
- **Artigos antigos sem categoria válida:** o campo `categoria` agora guarda o id do documento de `categoriasDeArtigos`. Não havia artigos no banco de desenvolvimento; na migração (etapa 6), cada artigo precisa receber o id de uma categoria cadastrada.

**Encontrado em 21/10/2026**
- **Repositório público (pendência, decisão do responsável do projeto):** `gh api` indicou o repositório do GitHub como público (`private=false`), enquanto `docs/ABTE_contexto_projeto.md` dizia privado. Na `origin/main`, `docs/ABTE_contexto_redesign.md` tem nomes e registros de profissionais reais, e o histórico tem o nome citado em "Nome de pessoa na documentação". Torná-lo privado não foi feito nem autorizado; não afirmar que mudou sem conferir de novo.
- **Produção sem noindex:** a main publicada (`207c9b1`, 29/09/2026) não tem o noindex provisório, que existe só a partir de `integracao/continuidade`. Se ela está indexada em buscadores: NÃO VERIFICADO.
- **Etapa 4d sem cópia remota:** os commits da mídia existem só no Git local até o push de `feature/midia-upload` (não autorizado ainda).

## Checklist de lançamento (etapa 9)

- [ ] **Remover o noindex provisório** (desde 18/10/2026): o `robots` da metadata em `src/app/layout.tsx` e o `src/app/robots.ts`, que bloqueiam o site inteiro enquanto há conteúdo de exemplo. Manter noindex só no painel, em `/componentes` e nas páginas de conta da loja; trocar o robots.txt por regras que liberem o site público e bloqueiem `/admin`.
- [ ] Trocar as páginas legais preliminares pelo texto revisado e tirar a faixa "Versão preliminar"; atualizar `VERSAO_DO_CONSENTIMENTO`.
- [ ] Substituir `/doe` e `/seja-associado` provisórias conforme as decisões P1 e P8.
- [ ] Redirecionar os endereços antigos do Wix e retirar imagens de terceiros e placeholders.
- [ ] Projeto Firebase de produção na conta da ABTE, hospedagem, domínio e alerta de orçamento.

## Exceções de design

Valores visuais que ficaram fora dos tokens porque não existe token de **valor idêntico** em `src/styles/tokens.css`. Trocar qualquer um muda o visual e depende da decisão de design. Linhas conferidas em 02/10/2026; se o arquivo mudar, confira de novo.

### A. Erros do Stylelint

`npm run lint:css` deve mostrar exatamente estes 7 erros, e nenhum outro.

| Arquivo | Linha | Valor | Regra violada |
|---|---|---|---|
| `src/components/Botao/Botao.module.css` | 37 | `#000` | Cores só pelos tokens (Stylelint color-no-hex) |
| `src/components/Hero/Hero.module.css` | 41 | `rgba(0, 0, 0, 0.5)` | Cores só pelos tokens (Stylelint function-disallowed-list) |
| `src/components/Hero/Hero.module.css` | 53 | `rgba(0, 0, 0, 0.8)` | Cores só pelos tokens (Stylelint function-disallowed-list) |
| `src/components/Modal/Modal.module.css` | 7 | `rgba(0, 0, 0, 0.5)` | Cores só pelos tokens (Stylelint function-disallowed-list) |
| `src/components/Modal/Modal.module.css` | 23 | `rgba(0, 0, 0, 0.2)` | Cores só pelos tokens (Stylelint function-disallowed-list) |
| `src/components/Modal/Modal.module.css` | 37 | `20px` | Tamanhos de fonte só pelos tokens (Stylelint declaration-property-unit-disallowed-list) |
| `src/components/Modal/Modal.module.css` | 44 | `24px` | Tamanhos de fonte só pelos tokens (Stylelint declaration-property-unit-disallowed-list) |

### B. Outros valores literais (o Stylelint não verifica)

Raios, sombras, pesos, espaçamentos, medidas, linhas de 1 e 2 px e opacidades, em CSS Modules e em estilos inline. Os estilos inline com esses valores ficaram inline de propósito: só os que usavam apenas tokens foram para CSS Module.

| Arquivo | Linhas | Valores | Regra violada |
|---|---|---|---|
| `src/app/admin/(painel)/artigos/page.tsx` | 36 | 14px | Tamanhos de fonte só pelos tokens |
| `src/app/admin/(painel)/artigos/page.tsx` | 31 | 0.8 | Cores só pelos tokens (opacidade) |
| `src/app/admin/(painel)/artigos/page.tsx` | 30 | 500 | Pesos só pelos tokens |
| `src/app/admin/(painel)/blog/page.tsx` | 36 | 14px | Tamanhos de fonte só pelos tokens |
| `src/app/admin/(painel)/blog/page.tsx` | 32 | 0.8 | Cores só pelos tokens (opacidade) |
| `src/app/admin/(painel)/blog/page.tsx` | 28 | 500 | Pesos só pelos tokens |
| `src/app/admin/_componentes/LayoutPainel/LayoutPainel.module.css` | 36 | 4px | Espaçamento só pelos tokens |
| `src/app/admin/_componentes/LayoutPainel/LayoutPainel.module.css` | 10, 17, 64 | 1px | Espessura de linha sem token (--color-border NÃO VERIFICADO) |
| `src/app/admin/_componentes/LayoutPainel/LayoutPainel.module.css` | 3, 8, 58, 62 | 70px, 100vh, 280px, 100vw 280px | Tamanhos só pelos tokens |
| `src/app/admin/_componentes/LayoutPainel/LayoutPainel.tsx` | 54 | 0.8 | Cores só pelos tokens (opacidade) |
| `src/app/admin/_componentes/SeloStatus/SeloStatus.tsx` | 9 | 4px 8px | Espaçamento só pelos tokens |
| `src/app/admin/_componentes/SeloStatus/SeloStatus.tsx` | 11 | 12px | Tamanhos de fonte só pelos tokens |
| `src/app/admin/_componentes/SeloStatus/SeloStatus.tsx` | 10 | 4px | Raio 0 (--radius) |
| `src/app/admin/_componentes/TabelaPainel/TabelaPainel.tsx` | 6, 12 | 1px | Espessura de linha sem token (--color-border NÃO VERIFICADO) |
| `src/app/admin/_componentes/TabelaPainel/TabelaPainel.tsx` | 16 | 0.7 | Cores só pelos tokens (opacidade) |
| `src/app/admin/_componentes/TabelaPainel/TabelaPainel.tsx` | 14 | 500 | Pesos só pelos tokens |
| `src/app/admin/_componentes/TabelaPainel/TabelaPainel.tsx` | 10 | 5px | Raio 0 (--radius) |
| `src/app/admin/_componentes/estilosDoFormulario.ts` | 16 | 1px | Espessura de linha sem token (--color-border NÃO VERIFICADO) |
| `src/app/admin/_componentes/estilosDoFormulario.ts` | 9 | 800px | Tamanhos só pelos tokens |
| `src/app/admin/_componentes/estilosDoFormulario.ts` | 11 | 500 | Pesos só pelos tokens |
| `src/app/admin/_componentes/estilosDoFormulario.ts` | 15 | 5px | Raio 0 (--radius) |
| `src/app/artigos/[slug]/page.module.css` | 20 | 1px | Espessura de linha sem token (--color-border NÃO VERIFICADO) |
| `src/app/artigos/[slug]/page.module.css` | 3, 8 | 100vh, 800px | Tamanhos só pelos tokens |
| `src/app/artigos/[slug]/page.module.css` | 36 | 0.8 | Cores só pelos tokens (opacidade) |
| `src/app/artigos/categoria/[slug]/page.module.css` | 19 | -24px | Espaçamento só pelos tokens |
| `src/app/artigos/categoria/[slug]/page.module.css` | 3 | 100vh | Tamanhos só pelos tokens |
| `src/app/artigos/page.module.css` | 3, 72, 73 | 8px, 100vh | Tamanhos só pelos tokens |
| `src/app/artigos/page.module.css` | 67 | 600 | Pesos só pelos tokens |
| `src/app/artigos/page.module.css` | 40, 75 | 50%, 5px | Raio 0 (--radius) |
| `src/app/artigos/page.tsx` | 88 | 0.6 | Cores só pelos tokens (opacidade) |
| `src/app/blog/[slug]/page.module.css` | 20 | 1px | Espessura de linha sem token (--color-border NÃO VERIFICADO) |
| `src/app/blog/[slug]/page.module.css` | 3, 8 | 100vh, 800px | Tamanhos só pelos tokens |
| `src/app/blog/[slug]/page.tsx` | 62 | 8px | Raio 0 (--radius) |
| `src/app/blog/page.module.css` | 3, 17 | 100vh, 800px | Tamanhos só pelos tokens |
| `src/app/blog/page.tsx` | 47 | 40px | Espaçamento só pelos tokens |
| `src/app/blog/page.tsx` | 47 | 0.6 | Cores só pelos tokens (opacidade) |
| `src/app/contato/page.module.css` | 7, 12 | 60vh, 600px | Tamanhos só pelos tokens |
| `src/app/globals.css` | 149 | 1.5rem 24px | Tamanhos de fonte só pelos tokens |
| `src/app/globals.css` | 25, 166, 167 | 1px, 100vh | Tamanhos só pelos tokens |
| `src/app/page.module.css` | 108 | 35px | Espaçamento só pelos tokens |
| `src/app/page.module.css` | 67, 87, 92, 93, 109 | -4px, 24px, 500px, 800px | Tamanhos só pelos tokens |
| `src/app/page.module.css` | 79, 110 | 5px | Raio 0 (--radius) |
| `src/app/page.module.css` | 88 | 0 16px 40px color-mix(in srgb,  10%, transparent) | Sem sombra (--shadow: none) |
| `src/app/page.tsx` | 74, 135 | 500px, 600px | Tamanhos só pelos tokens |
| `src/app/page.tsx` | 90 | 5px | Raio 0 (--radius) |
| `src/app/profissionais/page.module.css` | 39 | 6px 20px | Espaçamento só pelos tokens |
| `src/app/profissionais/page.module.css` | 38 | 1px | Espessura de linha sem token (--color-border NÃO VERIFICADO) |
| `src/app/profissionais/page.module.css` | 3, 15 | 100vh, 800px | Tamanhos só pelos tokens |
| `src/app/profissionais/page.module.css` | 40 | 20px | Raio 0 (--radius) |
| `src/components/BlocoContato/BlocoContato.module.css` | 5 | 25px | Espaçamento só pelos tokens |
| `src/components/BlocoContato/BlocoContato.module.css` | 8 | 5px | Raio 0 (--radius) |
| `src/components/Botao/Botao.module.css` | 8 | 5px | Raio 0 (--radius) |
| `src/components/CaixaConsentimento/CaixaConsentimento.module.css` | 29, 72 | 5px | Raio 0 (--radius) |
| `src/components/CaixaConsentimento/CaixaConsentimento.module.css` | 50, 54 | inset 0 0 0 2px, inset 0 0 0 2px , | Sem sombra (--shadow: none) |
| `src/components/Campo/Campo.module.css` | 24, 57 | 5px | Raio 0 (--radius) |
| `src/components/Campo/Campo.module.css` | 43, 47 | inset 0 0 0 2px, inset 0 0 0 2px , | Sem sombra (--shadow: none) |
| `src/components/CardArtigo/CardArtigo.module.css` | 46 | 1px | Espessura de linha sem token (--color-border NÃO VERIFICADO) |
| `src/components/CardArtigo/CardArtigo.module.css` | 12 | 4px | Tamanhos só pelos tokens |
| `src/components/CardArtigo/CardArtigo.module.css` | 21 | 0.8 | Cores só pelos tokens (opacidade) |
| `src/components/CardArtigo/CardArtigo.module.css` | 32, 55 | 500 | Pesos só pelos tokens |
| `src/components/CardCategoriaArtigo/CardCategoriaArtigo.module.css` | 35 | 12px 16px | Espaçamento só pelos tokens |
| `src/components/CardCategoriaArtigo/CardCategoriaArtigo.module.css` | 11 | -4px | Tamanhos só pelos tokens |
| `src/components/CardCategoriaArtigo/CardCategoriaArtigo.module.css` | 5 | 5px | Raio 0 (--radius) |
| `src/components/CardCategoriaArtigo/CardCategoriaArtigo.module.css` | 12 | 0 16px 40px color-mix(in srgb,  10%, transparent) | Sem sombra (--shadow: none) |
| `src/components/CardPost/CardPost.module.css` | 12 | -4px | Tamanhos só pelos tokens |
| `src/components/CardPost/CardPost.module.css` | 5 | 5px | Raio 0 (--radius) |
| `src/components/CardPost/CardPost.module.css` | 13 | 0 16px 40px color-mix(in srgb,  10%, transparent) | Sem sombra (--shadow: none) |
| `src/components/CardProfissional/CardProfissional.module.css` | 10 | 4px | Espaçamento só pelos tokens |
| `src/components/CardProfissional/CardProfissional.module.css` | 30 | 5px | Raio 0 (--radius) |
| `src/components/CardPublico/CardPublico.module.css` | 6 | 30px | Espaçamento só pelos tokens |
| `src/components/CardPublico/CardPublico.module.css` | 14 | -4px | Tamanhos só pelos tokens |
| `src/components/CardPublico/CardPublico.module.css` | 8 | 5px | Raio 0 (--radius) |
| `src/components/CardPublico/CardPublico.module.css` | 15 | 0 16px 40px color-mix(in srgb,  15%, transparent) | Sem sombra (--shadow: none) |
| `src/components/Estatisticas/Estatisticas.module.css` | 22 | -4px | Tamanhos só pelos tokens |
| `src/components/Estatisticas/Estatisticas.module.css` | 16 | 5px | Raio 0 (--radius) |
| `src/components/Estatisticas/Estatisticas.module.css` | 23 | 0 16px 40px color-mix(in srgb,  15%, transparent) | Sem sombra (--shadow: none) |
| `src/components/Header/Header.module.css` | 60 | 30px | Espaçamento só pelos tokens |
| `src/components/Header/Header.module.css` | 66, 71 | 5px | Raio 0 (--radius) |
| `src/components/Hero/Hero.module.css` | 45, 57, 61, 67, 71, 95 | 10px, 1rem, 20px, 0.5rem | Espaçamento só pelos tokens |
| `src/components/Hero/Hero.module.css` | 44, 94 | 2rem, 1.5rem | Tamanhos de fonte só pelos tokens |
| `src/components/Hero/Hero.module.css` | 6, 7, 8, 76, 77, 91 | 12px, 50vh, 90vh, 500px, 1200px | Tamanhos só pelos tokens |
| `src/components/Hero/Hero.module.css` | 49, 78 | 50%, 5px | Raio 0 (--radius) |
| `src/components/Logo/Logo.module.css` | 16 | 100px | Tamanhos só pelos tokens |
| `src/components/MenuDesktop/MenuDesktop.module.css` | 26, 68, 83 | 4px, 10px, -20px | Espaçamento só pelos tokens |
| `src/components/MenuDesktop/MenuDesktop.module.css` | 86 | 20px | Tamanhos só pelos tokens |
| `src/components/MenuDesktop/MenuDesktop.module.css` | 21, 104 | 600 | Pesos só pelos tokens |
| `src/components/MenuDesktop/MenuDesktop.module.css` | 76, 95 | 5px | Raio 0 (--radius) |
| `src/components/MenuTelaCheia/MenuTelaCheia.module.css` | 65 | 600 | Pesos só pelos tokens |
| `src/components/Modal/Modal.module.css` | 32 | 1px | Espessura de linha sem token (--color-border NÃO VERIFICADO) |
| `src/components/Modal/Modal.module.css` | 20, 21 | 90vh, 500px | Tamanhos só pelos tokens |
| `src/components/Modal/Modal.module.css` | 47 | 0.6 | Cores só pelos tokens (opacidade) |
| `src/components/Modal/Modal.module.css` | 38 | 600 | Pesos só pelos tokens |
| `src/components/Modal/Modal.module.css` | 18 | 8px | Raio 0 (--radius) |
| `src/components/PlaceholderImagem/PlaceholderImagem.tsx` | 13, 14 | #000, #fff | Cores só pelos tokens |
| `src/components/PlaceholderImagem/PlaceholderImagem.tsx` | 19 | 1.5rem | Tamanhos de fonte só pelos tokens |
| `src/components/PlaceholderImagem/PlaceholderImagem.tsx` | 22, 23 | 0.1em, 200px | Tamanhos só pelos tokens |
| `src/components/Rodape/Rodape.module.css` | 6, 16 | 25px, 8vw 120px | Espaçamento só pelos tokens |
| `src/components/Rodape/Rodape.module.css` | 98 | 90px | Tamanhos só pelos tokens |
| `src/components/Rodape/Rodape.module.css` | 34 | 600 | Pesos só pelos tokens |
| `src/components/Rodape/Rodape.module.css` | 9 | 5px | Raio 0 (--radius) |

### C. Movimento (pendente de confirmação da designer)

O design system marca movimento como NÃO VERIFICADO. Os valores abaixo são PROPOSTA do lote D (10/10/2026), ficam como propriedades locais comentadas nos CSS Modules (nenhum token novo) e esperam a designer. Todos somem com `prefers-reduced-motion`.

| Onde | Propriedade local | Valor | Uso |
|---|---|---|---|
| `src/components/Revelar/Revelar.module.css` | `--revelar-duracao`, `--revelar-distancia`, `--revelar-passo`, `--revelar-curva` | 600ms, `var(--space-16)`, 120ms, `cubic-bezier(0.25, 0.1, 0.25, 1)` | Entrada ao rolar (home, `/blog`, `/artigos`, `/artigos/categoria/[slug]`, `/profissionais`) |
| `src/components/MenuDesktop/MenuDesktop.module.css` | `--menu-duracao`, `--menu-distancia` | 200ms, `var(--space-8)` | Entrada do submenu, giro da seta, cor do link |
| `src/components/MenuTelaCheia/MenuTelaCheia.module.css` | `--menu-duracao`, `--menu-distancia` | 200ms, `var(--space-8)` | Entrada do menu em tela cheia e das sublistas, giro da seta, cor do link |
| `src/components/Botao/Botao.module.css` | `--botao-transicao` | 150ms ease-out | Troca de cor no hover |
| `src/components/Rodape/Rodape.module.css` | `--rodape-transicao` | 150ms ease-out | Cor do link no hover |
| `src/components/Header/Header.module.css` | `--header-duracao`, `--header-curva`, `--header-distancia` | 300ms, ease-in-out, -100% | Header que se esconde ao rolar para baixo e volta ao rolar para cima (12/10/2026; antes os mesmos valores eram literais) |
| `src/components/Header/Header.tsx` | `LIMITE_DE_ROLAGEM_PX`, `TOLERANCIA_DE_ROLAGEM_PX` | 80, 8 | Rolagem a partir da qual o header pode se esconder e ganha fundo; movimentos menores que a tolerância são ignorados |
| `src/components/MenuDesktop/MenuDesktop.tsx` | `ATRASO_PARA_FECHAR_MS` | 300 | Atraso para fechar o submenu quando o mouse sai do item (12/10/2026) |

Já existiam antes (sem propriedade local): elevação de cards no hover (0.4s, com sombra), carrossel (0.5s) e modal do painel (0.2s e 0.3s).

### D. Exceções de comportamento e alinhamento (pendentes de confirmação da designer)

| Onde | O que | Por quê |
|---|---|---|
| `src/app/loja/page.tsx` e `page.module.css` (`.miniatura`) | Os filtros de categoria de `/loja` ganharam a miniatura da imagem da categoria (32 px, decorativa; sem imagem, quadrado vazio em `--color-surface-soft`). | Decisão de 18/10/2026 (fatia 3d): o design não tem card nem imagem de categoria de produto. |
| `src/components/Header/Header.module.css` (`.comFundo`) e `Header.tsx` | Depois de rolar a página (mais de 80 px), o header visível ganha fundo `--color-bg`; no topo continua como antes (transparente sobre a foto na home, sem fundo nas internas). Não se esconde com submenu ou menu em tela cheia abertos nem com foco de teclado dentro dele. | Header visível ao rolar é PROPOSTA no design system; sem fundo, o logo e o menu ficavam transparentes sobre o conteúdo. Pedido de 12/10/2026. |
| `src/components/Rodape/Rodape.module.css` (`.copyright`) | A frase "© ano ABTE, Associação Brasileira de Tratamento da Escoliose. Todos os direitos reservados." ocupa a largura do rodapé e fica centralizada. | Exceção ao lote A (10/10/2026), que alinhou à esquerda todos os textos do rodapé; os demais textos continuam à esquerda. Pedido de 12/10/2026. Os ícones de Instagram e Facebook da coluna Contato, antes centralizados, começam desde 12/10/2026 na mesma borda esquerda do título e do e-mail (o ícone de 24 px fica à esquerda da área de toque de 44 px). |
