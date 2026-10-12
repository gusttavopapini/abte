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
| firebase-tools (CLI e emuladores, dev) | 15.31.0 |
| @firebase/rules-unit-testing (dev) | 5.0.2 |
| ESLint (eslint-config-next) | 9.39 |
| Stylelint | 17.15 |

CSS puro com CSS Modules e `src/styles/tokens.css` global. **Sem Tailwind, Bootstrap ou kits de UI.** Public Sans via `next/font/google`, auto-hospedada no build. O design system prevê os pesos 400 e 600; o código carrega 300, 400 e 600 (ver Divergências).

Atenção ao Next.js 16: o antigo `middleware.ts` agora se chama **`proxy.ts`** (`src/proxy.ts`); `cookies()` é assíncrono. Antes de escrever código, consulte a documentação em `node_modules/next/dist/docs/`.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Site em http://localhost:3000 |
| `npm run build` | Build de produção |
| `npm run lint` | ESLint |
| `npm run lint:css` | Stylelint: falha com cor em hex/rgb/hsl/nome ou font-size em px fora do tokens.css |
| `npm run typecheck` | Checagem de tipos (tsc) |
| `npm run test:regras` | Testes das regras do Firestore no emulador (exige Java) |
| `npm run test:sessao` | Testes de sessão e permissão nos emuladores de Authentication e Firestore (cliente nunca entra no painel, sessão revogada, exclusão de conta); exige Java |
| `npm run test:unidade` | Testes de unidade das funções puras (acesso ao painel, validações, slug), com `node --test`, sem emulador |
| `npm run admin:conceder -- email@exemplo.com [--nome "Nome"]` | Dá o papel "administrador" a um usuário existente (lê o .env e depois o .env.local; o .env.local prevalece) |

## Estrutura de pastas

```
docs/                     arquivos de referência (design system, tokens, contexto, ABTE_contexto_projeto.md)
firestore.rules           regras do Firestore (nega tudo)
firebase.json, .firebaserc  Firebase CLI (Firestore + emulador; projeto padrão abte-dev)
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
    admin/                painel
      acoes.ts            ações de servidor do login (criar e encerrar sessão)
      acoes-conteudo.ts   ações de servidor de posts, artigos e profissionais
      acoes-topicos.ts    ações de servidor dos tópicos dos artigos (categorias e tags)
      acoes-profissionais.ts  ações de servidor dos profissionais (salvar, excluir para a lixeira, restaurar)
      acoes-produtos.ts   ações de servidor dos produtos da loja (cadastro, sem pagamento)
    loja/acoes-conta.ts   ações da conta de cliente (cadastro, entrar, sair, excluir)
    loja/acoes-carrinho.ts  ações do carrinho (adicionar, trocar quantidade, remover)
      entrar/             login e recuperação de senha
      (painel)/           telas protegidas (layout com checagem de sessão e papel)
      _componentes/       componentes só do painel (um por pasta, com CSS Module)
  components/<Nome>/      componentes do site, um por pasta, com seu CSS Module (Revelar: entrada ao rolar)
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
```

## Rotas

- **Públicas:** `/`, `/profissionais` (filtro `?tag=`), `/blog`, `/blog/[slug]`, `/artigos`, `/artigos/[slug]`, `/artigos/categoria/[slug]` (categorias e tags lidas do Firestore), `/contato`, `/loja` (lista com filtro `?categoria=`, subcabeçalho próprio da loja), `/loja/produto/[slug]` (produto com relacionados e aviso "Em breve"), `/loja/entrar`, `/loja/entrar/recuperar-senha`, `/loja/cadastro`, `/loja/conta` (conta de cliente, noindex), `/loja/carrinho` (exige conta, noindex), `/componentes` (revisão visual, noindex).
- **Painel:** `/admin/entrar`, `/admin/entrar/recuperar-senha`, `/admin` (visão geral), `/admin/blog`, `/admin/blog/novo`, `/admin/blog/editar/[id]`, `/admin/artigos`, `/admin/artigos/novo`, `/admin/artigos/editar/[id]`, `/admin/artigos/topicos` (categorias e tags), `/admin/profissionais`, `/admin/loja`, `/admin/loja/novo`, `/admin/loja/editar/[id]`, `/admin/loja/categorias` (criar, editar e excluir num modal).
- **Links do menu e do rodapé que ainda dão 404:** `/doe`, `/seja-associado`, `/acessibilidade`, `/politica-de-privacidade`, `/termos-de-uso`.

## Arquivos de referência (ordem de prioridade em caso de conflito)

1. `docs/tokens.css` e `docs/tokens.json`: valores visuais oficiais v3.1 (a cópia usada no código é `src/styles/tokens.css`, com os tamanhos de fonte convertidos para rem)
2. `docs/design-system.md`
3. `docs/ABTE_design_redesign.md`
4. `docs/ABTE_contexto_redesign.md`

## Arquitetura Firebase

- **Desenvolvimento:** projeto `abte-dev`, numa conta Google de desenvolvimento, separada da conta da ABTE (plano gratuito, Firestore em southamerica-east1, Authentication por e-mail e senha).
- **Produção:** projeto próprio, em conta da ABTE, criado na etapa 9. Nada no código depende do `abte-dev`: tudo que identifica o projeto vem de variáveis de ambiente (`.env.example` lista todas). O `.firebaserc` só define o alias padrão da CLI.
- **Acesso aos dados sempre pelo servidor**, com o Admin SDK. O navegador não lê nem grava no Firestore.
- **Regras do Firestore negam todo acesso direto do navegador.** Toda coleção nova continua negada e ganha teste em `testes/regras/`. Qualquer exceção precisa de regra específica e teste.
- **Papéis por custom claim** `papel` no Authentication: `administrador` ou `editor`. Sem papel, nada do painel.
- **Sessão por cookie** de sessão do Firebase (`__session`, httpOnly, secure em produção, sameSite strict, 5 dias, caminho `/admin`), validado no servidor em toda página do painel com checagem de revogação (`src/lib/auth/sessao.ts`). O layout do painel usa `exigirSessaoDoPainel()` para mostrar "Acesso não autorizado" a quem não tem papel; **toda ação de servidor e toda página do painel que lê dados começam por `exigirPapelDoPainel()`**, que falha fechada (sem sessão vai para o login; sem papel interrompe antes de ler ou gravar). A decisão fica na função pura `decidirAcessoAoPainel()` (`src/lib/auth/papeis.ts`), testada em `test:unidade`. Administrador e editor ainda têm o mesmo acesso. "Sair" revoga a sessão e apaga o cookie.
- **Conta de cliente da loja (D1, lote E3):** criada pelo servidor com o Admin SDK (`cadastrarCliente`), sem custom claim `papel`, com documento em `clientes` (nome, e-mail, data e versão do consentimento; a senha fica só no Authentication). Sessão no cookie `abte_cliente` (httpOnly, secure em produção, sameSite strict, 5 dias, caminho `/loja`), separado do `__session` do painel; validada por `lerSessaoCliente()` e `exigirSessaoCliente()` (`src/lib/auth/sessao-cliente.ts`), que também exigem o documento em `clientes` (conta do painel não entra na loja). A verificação do cookie fica em `src/lib/auth/verificacao.ts`, sem Next.js, testada no emulador (`test:sessao`). O destino depois do login só aceita caminhos da loja (`destinoSeguroNaLoja`). Excluir a conta pede a senha de novo e apaga usuário, cliente e carrinho.
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

## Estado atual (verificado em 12/10/2026)

**Git.** A main está em `207c9b1` (igual a `origin/main`) e é o que a Vercel publica em produção (`abte-lovat.vercel.app`, confirmado pelos deployments do GitHub em 12/10/2026). As branches formam uma cadeia linear, cada uma contida na seguinte: `limpeza/codigo-limpo` (9 commits à frente da main), `limpeza/sem-pessoas` (11), `feature/loja-e-ajustes` (21, também no GitHub, com preview na Vercel) e `fix/menu-banner-rodape` (26). A branch **`integracao/versao-atual`** (12/10/2026) parte da ponta dessa cadeia e reúne tudo: limpeza, remoção de referências a pessoas, loja (lotes E1 a E4) e correções de menu, banner e rodapé. Os merges das demais branches nela foram vazios (nenhum conflito). Ela é a candidata a ir para a main, depois da revisão do preview.

**Comportamento no navegador (12/10/2026, `integracao/versao-atual`, Chrome headless a 1440 px, build de produção e modo dev):** submenu de Profissionais abre com o mouse e fecha ao sair; o menu esconde ao rolar para baixo e volta ao rolar para cima com fundo `--color-bg`; no topo, transparente na home e sem fundo nas internas; o banner troca de slide sozinho e as setas funcionam; a frase de direitos autorais fica centralizada; título da aba de `/blog` é "Blog | ABTE"; nenhum erro de JavaScript nem aviso de hidratação. Com um submenu aberto o menu não se esconde (`Header.tsx`, checagem de `aria-expanded="true"`), então o submenu nunca fica solto na tela. No console aparecem só os 404 de pré-carregamento dos links sem página (ver "Rotas") e, no modo dev, um aviso de pré-carregamento de CSS do próprio Next.js.

**Cache do modo dev:** em 12/10/2026 o `npm run dev` respondia erro 500 em todas as páginas ("Can't resolve '@vercel/turbopack-next/internal/font/google/font'", da fonte Public Sans). Sem a página, o JavaScript não roda, e por isso o submenu, o recolhimento do menu e o banner pareciam quebrados no computador local, enquanto o site publicado funcionava. A causa estava no cache do Turbopack em `.next/dev`, não no código: com o cache refeito, tudo funciona. Se acontecer de novo, pare o `npm run dev`, apague a pasta `.next/dev` e rode `npm run dev` outra vez. Por que o cache ficou nesse estado não foi verificado.

**Verificações automáticas (12/10/2026, branch `integracao/versao-atual`):** typecheck passa; lint com 0 erros e 5 avisos (`<img>` sem `next/image`); lint:css com exatamente os 7 erros da tabela A de "Exceções de design"; build passa; `test:regras` 60 de 60 (15 coleções); `test:unidade` 73 de 73; `test:sessao` 8 de 8. Iguais aos de 10/10/2026 (`feature/loja-e-ajustes`). Antes da loja: lint com 6 avisos, `test:regras` 40, `test:unidade` 22.

**Etapas do plano no código**
| Etapa | O que existe |
|---|---|
| 1 Base | Concluída. |
| 2 Páginas estáticas | Home (carrossel, cards de público, estatísticas, missão, visão e valores), `/contato` (envio falso), `/loja` (só título), `/componentes`. Sem `/doe`, sem páginas legais. |
| 3 Modelo de dados | Não feita. Sem `usuarios`, `configuracoes`, `logAlteracoes`, lixeira (`excluidoEm`) ou cadastro de usuários pelo painel. Os papéis existem só como custom claim. |
| 4 Painel | 4a: profissionais com o modelo completo (lote C, 10/10/2026: tipo, tratamento, nome, registro, métodos, país, UF, cidades, telerreabilitação, WhatsApp, Instagram, Facebook, e-mail, apresentação, ativo, ordem), contatos validados, exclusão para a lixeira com restauração; sem foto (etapa 4d) e sem diretoria. 4b: blog e artigos com listar, criar e editar (sem excluir), e tópicos dos artigos (categorias e tags) com criar, renomear, excluir para a lixeira e restaurar. 4c: produtos (lote E1, 10/10/2026) com nome, slug único e estável, descrição, preço e preço promocional em centavos, categoria editável, tipo físico ou digital, disponível ou esgotado, selo, ordem e publicado; lixeira com restauração; sem galeria (etapa 4d). 4d: nada. |
| 5 Páginas dinâmicas | `/blog`, `/blog/[slug]`, `/artigos`, `/artigos/[slug]`, `/profissionais` e a loja (lista, produto, conta de cliente e carrinho, sem pagamento) leem o Firestore. `/artigos/categoria/[slug]` lê categorias e artigos do Firestore desde o lote B (10/10/2026). |
| 6 a 9 | Nada. |

**Firestore:** coleções usadas pelo código: `posts`, `artigos`, `categoriasDeArtigos`, `tagsDeArtigos`, `profissionais`, `produtos`, `categoriasDeProdutos`, `clientes` e `carrinhos`; todas negadas ao navegador e cobertas por `testes/regras`. No projeto de desenvolvimento (contagem sem ler valores, no início da sessão), só a coleção `posts` existia, com 2 documentos publicados; os testes desta sessão rodaram nos emuladores e não gravaram nada no projeto. `artigos` e `profissionais` estão vazias, portanto não há dado a migrar quando os modelos mudarem. No Authentication há 1 usuário, com papel administrador. As regras negam tudo; `testes/regras/firestore.test.mts` cobre 10 coleções (as do modelo planejado e uma qualquer) para visitante, logado sem papel, administrador e editor. `firestore.indexes.json` não tem índices.

**Storage:** o bucket padrão do projeto de desenvolvimento não existe (consulta pelo Admin SDK), ou seja, o Cloud Storage não está ativo. Não há `storage.rules` nem emulador de Storage no `firebase.json`. Fotos de profissionais, imagens de tópicos e galeria de produtos dependem da etapa 4d e do plano Blaze.

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

- **D1 (10/10/2026), carrinho e conta de cliente na loja:** pedido explícito de carrinho e conta de cliente, restritos à área da loja (`/loja` e rotas filhas, num subcabeçalho próprio; o cabeçalho do site não ganha login nem carrinho). Substitui a regra "loja só vitrine" e os itens 1 a 3 do registro de alterações de `docs/design-system.md` no que diz respeito ao carrinho. Continuam proibidos: pagamento, gateway, SDK de pagamento, webhook, variáveis de pagamento e finalização de compra (até decisão própria). Conta de cliente pelo Firebase Authentication, criada pelo servidor, sem custom claim `papel`, com sessão em cookie separado do painel; clientes nunca acessam o painel. Implementado em 10/10/2026 (lotes E1 a E4), com estas decisões aprovadas: finalização como botão "Finalizar compra: em breve" desativado, com o carrinho guardado na conta (opções de envio por e-mail ou WhatsApp e Stripe ficam para depois); carrinho só com conta de cliente; relacionados da mesma categoria, publicados, sem o próprio produto, até 3, pela ordem do painel; exclusão para a lixeira (`excluidoEm`); subcabeçalho com o texto "Carrinho (n)", sem o ícone de sacola, até a designer decidir; cookie `abte_cliente` com caminho `/loja`. O carrinho guarda só id e quantidade (`carrinhos/{uid}`); preço e disponibilidade são lidos do produto no servidor a cada vez.

## Decisões em aberto: NUNCA assumir

Confirmação da doação por Pix e dados do Pix da ABTE (chave, titular, cidade, exibição do CNPJ); hospedagem (Firebase App Hosting é candidata, não decidida); região do projeto de produção; registro do domínio; serviço de e-mail do formulário de contato; papéis no painel; associação (Google Forms ou formulário próprio); newsletter; área de membros; comentários no blog; marca "Tratando Escoliose"; logo em vetor; fotos; números oficiais; depoimentos; logos de parceiros; e, quando o pagamento for ativado, frete, recorrência, recibo e nota fiscal.

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
- **H1 na home:** a home não tem H1 (o hero virou carrossel sem título).
- **Carrossel do Hero:** desde 12/10/2026 avança sozinho a cada 6 segundos (`INTERVALO_DO_CARROSSEL_MS` em `Hero.tsx`), em loop, e para com o mouse sobre o banner, com foco de teclado dentro dele, com a aba oculta e com movimento reduzido; setas "Slide anterior" e "Próximo slide" e pontos funcionam sempre. **Pendente: botão de pausa visível** (chamado de P16 no pedido de 12/10/2026; neste arquivo P16 é o slug que muda ao editar, conferir a numeração), porque muda o visual. Texto alternativo ainda genérico ("Slide 1"). As setas têm 28 px de largura em 390 px, abaixo dos 44 px dos controles (visual não alterado).
- **aria-pressed:** os botões do filtro de `/profissionais` não anunciam qual está ativo.
- **Modal:** resolvido em 10/10/2026 (lote C): `role="dialog"`, Esc fecha, foco preso dentro e devolvido ao fechar; a exclusão de profissional usa confirmação dentro do modal.
- **Profissionais sem foto:** o card mostra o placeholder preto "IMAGEM" até a etapa 4d (Storage e plano Blaze). O filtro de `/profissionais` ainda é só por tipo; os filtros do design (estado, cidade, método, telerreabilitação, busca) ficam para depois.
- **Saltos de título** (H1 direto para H3) em `/blog`, `/profissionais` e `/artigos/categoria/[slug]`; o `globals.css` estiliza h2 e h3 pela tag, então trocar o nível muda o tamanho.
- **Submenu de Profissionais:** os itens nunca ficam marcados como ativos (o caminho não inclui `?tag=`).
- **P16, slug que muda ao editar:** o slug do post é refeito a partir do título a cada edição (links antigos quebram), e dois títulos iguais geram o mesmo slug.
- **Erros no painel:** erro nas ações de post e de artigo cai na página de erro padrão do Next.js, em inglês. Ainda não existe registro de alterações (etapa 3).
- **Endereço inválido:** `/blog/[slug]` e `/artigos/[slug]` com um valor que não é id válido do Firestore (ex.: `__x__`) dão erro 500 em vez de 404.
- **P19, classificações de artigo:** resolvida em 10/10/2026. Categorias e tags são cadastradas em `/admin/artigos/topicos` e lidas do Firestore pelo painel e pelas páginas públicas. Os cards de categoria ficam sem imagem (placeholder) até a etapa 4d.
- **P22, exclusão de profissional:** resolvida em 10/10/2026. Vai para os excluídos (`excluidoEm`), sai do site e pode ser restaurada; falhas aparecem em português.
- **Numeração P:** P18, P20, P21 e P23 são citadas nos registros do Projeto, mas não aparecem neste arquivo; as 7 perguntas do diagnóstico original também não. Conferir e trazer para cá.

**Conteúdo e etapas futuras**
- O formulário de contato mostra "enviado" sem enviar nada (serviço de e-mail em aberto).
- Links que dão 404 (ver "Rotas").
- **Carrinho (n) no subcabeçalho:** conta todas as unidades guardadas, inclusive de produtos que esgotaram ou saíram da loja; o total do carrinho conta só os disponíveis.
- **Storage e plano Blaze:** ação pendente de quem administra a conta: ativar o plano Blaze no projeto de desenvolvimento, com alerta de orçamento, para a galeria de produtos e as fotos (etapa 4d).
- **Loja:** produtos sem imagem (placeholder) até a etapa 4d; os endereços antigos do Wix (`/product-page/...`, `/category/...`) precisam de redirecionamento na etapa 9. Dados estruturados de produto sem `offers` (não aparecem preço nem disponibilidade no Google).
- Imagens provisórias externas (picsum.photos e placehold.co).
- Números das estatísticas e o título da home com "Tratando Escoliose" dependem das decisões em aberto.

**Conta de cliente da loja (lote E3)**
- **Cadastro público do Firebase:** NÃO VERIFICADO se está desligado no console (Authentication > Configurações > Ações do usuário > "Permitir criação de conta"). A loja não precisa dele: as contas são criadas pelo servidor.
- **Robôs no cadastro:** há só um campo escondido; sem limite de tentativas nem verificação (reCAPTCHA ou App Check). Avaliar antes do lançamento.
- **Nome do cookie e hospedagem:** no Firebase Hosting clássico só o cookie `__session` chega ao servidor; se essa for a hospedagem, o cookie da loja terá de se chamar `__session` com caminho `/loja`.
- **sameSite strict:** quem chega à loja por um link de outro site aparece sem sessão na primeira página (o cookie não vai nessa navegação); ao clicar em qualquer link da loja, a sessão volta.
- **Consentimento:** o texto do cadastro é provisório (versão `provisorio-2026-10-10`) e aponta para `/politica-de-privacidade`, que ainda dá 404. Ver "Política de privacidade" abaixo.
- **E-mail repetido:** o cadastro avisa que já existe conta com o e-mail (inevitável num cadastro), o que revela que o e-mail está em uso.

**Política de privacidade (pendência para a ABTE, com assessoria jurídica; nenhum texto conclusivo foi escrito)**
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
- **Ajustes de Vercel com hospedagem ainda não decidida:** `transpilePackages: ["jwks-rsa", "jose"]` no `next.config.ts` e o override de `jose` 4.15.9 no `package.json`. Não remover sem testar o deploy.
- `turbopack.root` no `next.config.ts` só evita o aviso de um `package-lock.json` solto na pasta do usuário, fora do projeto.
- O Git local tem `refs/original/refs/heads/main`, backup de uma reescrita de autoria anterior; não está em nenhuma branch.

**Encontrado em 10/10/2026**
- **Conteúdo invisível sem JavaScript:** resolvido no lote D (o framer-motion entregava 11 blocos da home com `opacity: 0`).
- **Menu de desktop:** o hover troca o peso da fonte (300 para 600), o que alarga o texto e empurra os itens vizinhos; já era assim antes do lote D.
- **Nome de pessoa na documentação:** o nome da presidente da diretoria saiu de `docs/ABTE_contexto_projeto.md` (seção 1) em 12/10/2026, mas continua no histórico do Git (commit `d4c75fc`, já no GitHub, que é público); tirar do histórico exigiria reescrevê-lo, o que não foi autorizado. `docs/ABTE_contexto_redesign.md` continua listando profissionais reais com registro, como referência da migração (etapa 6), por decisão de 12/10/2026; já estava assim na main.
- **Permissão do `.env.local`:** o arquivo pode ser lido por outros usuários da máquina (o `.env` não). Fora do Git; ajuste local, sem efeito no código.
- **"Mais lidos da semana" em `/artigos`:** a seção mostra os artigos mais recentes; não existe contagem de leitura.
- **Painel no celular:** a barra lateral tem 280 px fixos e o conteúdo fica com `calc(100vw - 280px)`, sem regra para telas estreitas; em 390 px o painel fica espremido e difícil de usar (`LayoutPainel.module.css`).
- **Artigos antigos sem categoria válida:** o campo `categoria` agora guarda o id do documento de `categoriasDeArtigos`. Não havia artigos no banco de desenvolvimento; na migração (etapa 6), cada artigo precisa receber o id de uma categoria cadastrada.

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
| `src/app/artigos/page.tsx` | 80 | 0.6 | Cores só pelos tokens (opacidade) |
| `src/app/blog/[slug]/page.module.css` | 20 | 1px | Espessura de linha sem token (--color-border NÃO VERIFICADO) |
| `src/app/blog/[slug]/page.module.css` | 3, 8 | 100vh, 800px | Tamanhos só pelos tokens |
| `src/app/blog/[slug]/page.tsx` | 42 | 8px | Raio 0 (--radius) |
| `src/app/blog/page.module.css` | 3, 17 | 100vh, 800px | Tamanhos só pelos tokens |
| `src/app/blog/page.tsx` | 41 | 40px | Espaçamento só pelos tokens |
| `src/app/blog/page.tsx` | 41 | 0.6 | Cores só pelos tokens (opacidade) |
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
| `src/components/CardCategoriaArtigo/CardCategoriaArtigo.module.css` | 30 | 12px 16px | Espaçamento só pelos tokens |
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
| `src/components/Rodape/Rodape.module.css` | 99 | 90px | Tamanhos só pelos tokens |
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
| `src/components/Header/Header.module.css` (`.comFundo`) e `Header.tsx` | Depois de rolar a página (mais de 80 px), o header visível ganha fundo `--color-bg`; no topo continua como antes (transparente sobre a foto na home, sem fundo nas internas). Não se esconde com submenu ou menu em tela cheia abertos nem com foco de teclado dentro dele. | Header visível ao rolar é PROPOSTA no design system; sem fundo, o logo e o menu ficavam transparentes sobre o conteúdo. Pedido de 12/10/2026. |
| `src/components/Rodape/Rodape.module.css` (`.copyright`) | A frase "© ano ABTE, Associação Brasileira de Tratamento da Escoliose. Todos os direitos reservados." ocupa a largura do rodapé e fica centralizada. | Exceção ao lote A (10/10/2026), que alinhou à esquerda todos os textos do rodapé; os demais textos continuam à esquerda. Pedido de 12/10/2026. |
