# Relatório do projeto ABTE

**Data: 05/11/2026.** Código analisado: `e095683` (`main` e `feature/midia-upload` iguais no GitHub). Fontes: código, testes, `git log`, `CLAUDE.md` e `docs/MAPEAMENTO_ATUAL.md`, mais uma leitura anônima por HTTP do site publicado nesta data. O que não pôde ser provado por essas fontes está marcado como **NÃO VERIFICADO**. Este relatório não contém segredos, valores de `.env`, nem dados pessoais de profissionais ou clientes; os nomes citados já aparecem no site público.

## 1. Resumo executivo

O site e o painel próprios da ABTE estão funcionando e publicados em `abte-lovat.vercel.app`, ainda bloqueados para buscadores (`robots.txt` com `Disallow: /` e `noindex`). O conteúdo do Wix foi migrado no projeto de desenvolvimento `abte-dev`: 71 posts, 5 artigos (4 científicos e 1 de exemplo), 104 profissionais, 9 produtos e 7 membros da diretoria. O painel ganhou, entre 04 e 05/11/2026, as ações completas de conteúdo (rascunho, publicar, duplicar, lixeira, restaurar e excluir de vez), a lista comum com filtros e ações em lote, o menu agrupado e a visão geral. A página de profissionais ganhou o filtro por estado e deixou de mostrar o Facebook. Tudo isso foi promovido para a `main` nesta data. O principal bloqueio do lançamento não é técnico: faltam o projeto Firebase de produção na conta da ABTE, domínio, hospedagem definitiva, textos legais, chave Pix, serviço de e-mail do contato e decisões editoriais. A produção ainda lê o banco de desenvolvimento.

### Painel de situação

| Situação | Itens |
|---|---|
| **No ar** (`main` = `e095683`, implantação de Produção `7590226814`, `success`) | Home administrável com banners, blog com busca e categorias, profissionais com filtro por tipo e por estado, diretoria, loja com filtros, conta e carrinho (sem pagamento), doação (sem chave Pix cadastrada), associação por Google Forms, contato (sem envio real), painel completo |
| **Pronto só na branch** | Nada. A branch e a `main` estão no mesmo commit; este relatório é um commit posterior de documentação |
| **Desligado por configuração** | Artigos (`/artigos` responde 404 em 05/11/2026, interruptor do painel desligado); páginas legais (404, não publicadas) |
| **Bloqueado** | Envio de vídeo por arquivo (falta aplicar o CORS do bucket); lançamento (falta ambiente de produção da ABTE e decisões em aberto); pagamento online (fora do escopo) |

## 2. Números

| Medida | Valor |
|---|---|
| Commits no histórico de `e095683` | 358, desde 26/09/2026 (`55f871d`) |
| Commits desde 31/10/2026 (data do commit) | 22 |
| Commits promovidos nesta rodada | 20 (`078df95..e095683`), 110 arquivos, 6.366 linhas incluídas e 1.184 removidas |
| Arquivos rastreados | 475 (cerca de 70,2 mil linhas de texto) |
| `src/` | 353 arquivos, 43 páginas (`page.tsx`), 36.295 linhas de TS, TSX e CSS |
| `testes/` | 75 arquivos (45 de unidade, 28 de sessão, 2 de regras), 9.976 linhas |
| `scripts/` | 19 arquivos, 2.476 linhas |

### Validação desta rodada (05/11/2026, saída completa guardada)

| Verificação | Resultado |
|---|---|
| `npm run typecheck` | Aprovado |
| `npm run build` | Aprovado (32 páginas estáticas geradas) |
| `npm run lint` | 0 erros, 4 avisos: 3 `<img>` sem `next/image` (`blog/[slug]/page.tsx`, `CardPost.tsx`, `Logo.tsx`) e 1 variável sem uso num roteiro local fora do Git (`tmp-migracao/`) |
| `npm run lint:css` | 5 erros conhecidos: `Botao.module.css:37` (`#000`) e `Modal.module.css:7, 23, 37, 44` (`rgba` e `font-size` em px) |
| `npm run test:unidade` | 458 de 458 |
| `npm run test:sessao` | 197 de 197 (emuladores, projeto `demo-abte-sessao`) |
| `npm run test:regras` | 118 de 118 (emuladores, projeto `demo-abte-regras`) |
| **Total** | **773 de 773 testes aprovados** |

Varredura antes do envio: nenhum segredo nas linhas novas (as duas ocorrências de `privateKey` leem a variável de ambiente, sem valor); os únicos e-mails são fictícios (`@exemplo.invalid`); números parecidos com telefone são dados de teste fictícios, carimbos de data e ids de implantação; 0 dos 104 nomes de profissionais nas linhas novas; 0 endereços do Wix; 0 caminhos da máquina. `.env*`, `docs/dados-privados/` (exceto o README) e `tmp-migracao/` continuam ignorados; `.env.example` só tem os nomes das variáveis. Achado antigo, fora desta rodada: `docs/ABTE_design_redesign.md` (desde 26/09/2026) e `docs/ABTE_contexto_redesign.md` contêm nomes de profissionais reais, e o repositório no GitHub está **público** (`private=false` em 05/11/2026). Ver a seção 8.

## 3. Funcionalidades públicas

| Área | Rota | Estado | Observações |
|---|---|---|---|
| Home | `/` | Pronto | Banner em tela cheia (até 8 slides, versões computador, tablet e celular, ponto de foco horizontal e vertical, texto e botão em código, pilha até 1023px), cards de público, números, Mutirões, Produtos em destaque, Quem Somos com vídeo, Faça parte. Conteúdo final depende da ABTE |
| Blog | `/blog`, `/blog/[slug]` | Pronto | 71 posts publicados; busca por título, resumo e corpo; filtro `?categoria=`; Markdown restrito sem HTML |
| Artigos | `/artigos`, `/artigos/[slug]`, `/artigos/categoria/[slug]` | Desativado | Código pronto; o interruptor está desligado (404 conferido em 05/11/2026). Os 4 científicos não têm resumo, link nem PDF |
| Profissionais | `/profissionais` | Pronto | Filtro por tipo (`?tag=`, com `aria-pressed`) e por estado ou país (`?uf=`, `?pais=`), quantidade anunciada, card curto e popup com tudo; Facebook fora do site (o dado continua no cadastro). Sem busca por nome, cidade ou método; sem página individual |
| Diretoria | `/diretoria` | Parcial | Página pronta, sem link no menu nem no rodapé; sem tela no painel |
| Loja | `/loja`, `/loja/produto/[slug]` | Pronto (vitrine com carrinho) | Filtros por busca, categoria, tipo, disponibilidade, preço, promoção e selo, com URL compartilhável; menu flutuante; 9 produtos importados |
| Conta e carrinho | `/loja/entrar`, `/loja/cadastro`, `/loja/conta`, `/loja/carrinho` | Pronto, sem pagamento | "Finalizar compra: em breve" desligado. Sem checkout, pedidos, cupons ou webhooks |
| Doação | `/doe` | Parcial | Mostra o Pix quando o administrador cadastra a chave; hoje sem chave (texto "Em breve"). Sem QR Code nem gateway |
| Associação | `/seja-associado` | Pronto (provisório) | Dois botões para Google Forms (médicos e fisioterapeutas), decisão provisória P8 |
| Contato | `/contato` | Parcial | Formulário mostra "enviado" sem enviar nem gravar nada |
| Páginas legais | `/politica-de-privacidade`, `/termos-de-uso`, `/acessibilidade` | Pendente | Editáveis no painel; não publicadas (404 em 05/11/2026) |
| SEO | `robots.ts`, metadata | Bloqueado de propósito | `noindex` e `Disallow: /` até o lançamento; sem sitemap |

## 4. Painel `/admin`

**Seções do menu** (agrupado, com ícones): Visão geral; Conteúdo (Home, Blog, Categorias e tags do blog, Artigos, Categorias e tags dos artigos, Páginas); Pessoas (Profissionais); Loja (Produtos, Categorias da loja); Mídia; Configurações. Páginas e Configurações só aparecem para o administrador. Toda tela tem trilha a partir da Visão geral e o link "Voltar para ...". Até 1023px, gaveta com foco preso.

### Ações por tipo de conteúdo

| Tipo | Criar | Editar | Rascunho | Publicar ou ativar | Duplicar | Lixeira | Restaurar | Excluir de vez | Em lote |
|---|---|---|---|---|---|---|---|---|---|
| Posts | Sim | Sim | Sim | Sim | Sim | Sim (vira rascunho) | Sim (volta rascunho) | Só administrador | Despublicar, lixeira, restaurar |
| Artigos | Sim | Sim | Sim | Sim | Sim | Sim (vira rascunho) | Sim (volta rascunho) | Só administrador | Despublicar, lixeira, restaurar |
| Profissionais | Sim (janela) | Sim (janela) | Caixa "Ativo" | Ativar e desativar | Não | Sim | Sim (volta como estava) | Só administrador; recusado se ligado à diretoria ou autor de post | Desativar, lixeira, restaurar |
| Produtos | Sim | Sim | Sim | Sim | Sim | Sim | Sim | Só administrador, com aviso se estiver em carrinho | Despublicar, lixeira, restaurar |
| Banners da home | Sim (janela) | Sim (janela) | Caixa "Ativo" | Ativar e desativar | Não | Sim | Sim (volta desativado) | Só administrador | Não |
| Categorias de post e de artigo | Sim | Sim | Não | Ativar e desativar | Não | Sim, se sem uso | Sim | Só administrador, se sem uso | Não |
| Tags e categorias da loja | Sim | Sim | Não | Não | Não | Sim, se sem uso | Sim | Só administrador, se sem uso | Não |
| Páginas institucionais | Não (slugs fixos) | Sim | Sim | Sim | Não | Não | Não | Não | Não |
| Mídia | Envio | Alt | Não | Não | Não | Sim | Sim | Só administrador | Não |
| Configurações (Artigos no site, Pix) | Não | Só administrador | Não | Interruptor de Artigos | Não | Não | Não | Não | Não |

Excluir de vez nunca é em lote e pede confirmação reforçada (digitar EXCLUIR ou o nome).

**Papéis e permissões** (tabela única `PERMISSOES` em `src/lib/auth/papeis.ts`, provisória, P7): administrador e editor criam, editam, duplicam, publicam, despublicam, movem para a lixeira, restauram, editam a home e o vídeo e veem o registro; só o administrador exclui de vez, edita configurações e páginas institucionais. Cliente da loja nunca entra no painel. Toda ação de servidor começa por `exigirPapelDoPainel()`, que falha fechada.

**Registro de alterações** (`logAlteracoes`): grava, na mesma transação, criar, editar, duplicar, publicar, lixeira, restaurar e excluir de vez em posts, artigos, profissionais, produtos, banners e home, configurações, páginas, mídia e todos os tópicos. Guarda só os nomes dos campos e um resumo, nunca valores nem e-mail. A Visão geral mostra as 10 últimas alterações. Não existe tela de consulta completa do registro.

**Lista comum** (`ListaDoPainel`) em blog, artigos, profissionais e produtos: filtro de situação com contagem (Todos, Publicados, Rascunhos, Lixeira), busca que também procura na lixeira, ordenação, "Mostrar mais" de 20 em 20, estado no endereço e seleção de várias linhas com confirmação.

**Visão geral:** atalhos para criar post, artigo, profissional e produto; contagens de publicados, rascunhos e lixeira com links para a lista filtrada; imagens na lixeira; últimas alterações.

**Falta no painel:** gestão de usuários e papéis, tela da diretoria, consulta completa do registro, conferência de menores das imagens importadas (hoje só por script).

## 5. Dados e segurança

### Coleções do Firestore

`posts`, `artigos`, `categoriasDePosts`, `tagsDePosts`, `categoriasDeArtigos`, `tagsDeArtigos`, `profissionais`, `diretoria`, `produtos`, `categoriasDeProdutos`, `clientes`, `carrinhos`, `midias`, `logAlteracoes`, `configuracoes` (documentos `home` e `site`) e `paginasInstitucionais`. Não existem coleções de pedidos, doações ou cupons.

### Regras e acesso

| Item | Como está |
|---|---|
| Firestore (`firestore.rules`) | Uma regra única que nega tudo ao navegador, inclusive para administrador e editor. Todo acesso passa pelo servidor com o Admin SDK |
| Storage (`storage.rules`) | Nega tudo; única exceção: abrir (`get`) um arquivo pelo caminho exato em `publico/**`. Listar, gravar e apagar negados. Vídeos usam envio autorizado pelo servidor (política assinada ou sessão retomável) para um caminho específico |
| Sessão do painel | Cookie `__session` httpOnly, sameSite strict, secure em produção, caminho `/admin`, 5 dias, com checagem de revogação |
| Sessão da loja | Cookie `abte_cliente` separado, caminho `/loja`; exige documento em `clientes` |
| Papéis | Custom claim `papel` (`administrador` ou `editor`) |
| Mídia | Tipo real conferido pela assinatura, metadados removidos, WebP em 480, 960 e 1600 px, original não guardado, lixeira em `lixeira/`, dono da mídia ligado ao item |

### O que `test:regras` cobre (118 testes)

Para visitante, logado sem papel, administrador e editor: leitura e gravação negadas em todas as coleções do modelo, inclusive `configuracoes/home`, `configuracoes/site`, `paginasInstitucionais` e os itens na lixeira de posts, artigos, profissionais, produtos e tópicos; no Storage, só a leitura exata em `publico/` permitida, com listagem, `lixeira/`, envio a `publico/videos/` e gravações negadas.

### Riscos conhecidos

| Risco | Severidade |
|---|---|
| A produção (`abte-lovat.vercel.app`) lê o projeto de desenvolvimento `abte-dev`, numa conta separada da ABTE | Alta antes do lançamento |
| Repositório do GitHub público, com nomes e registros de profissionais em dois documentos antigos e no histórico | Média (decisão do responsável) |
| Cadastro da loja sem limite de tentativas nem verificação contra robôs | Média antes do lançamento |
| Cadastro público do Firebase Authentication desligado no console | NÃO VERIFICADO |
| Funções da Vercel nos EUA (`iad1`) e Firestore em São Paulo | Baixa (latência) |
| Alerta de orçamento do Google Cloud | NÃO VERIFICADO |

## 6. Migração do Wix

Executada no `abte-dev` em 23/10/2026 e publicada entre 24 e 28/10/2026, conforme os registros do `CLAUDE.md` e do mapa. Nesta rodada, nenhum script de migração foi executado.

| Conteúdo | Situação |
|---|---|
| Imagens | 267 importadas para a biblioteca; 2 recusadas pelo tipo (uma capa GIF e uma imagem AVIF no corpo de um post); conferência de menores "pendente" em todas (exceção decidida em 24/10/2026) |
| Posts | 69 importados e publicados (mais 2 de exemplo); classificados em 7 categorias com `revisarClassificacao`; autoria só como sugestão |
| Artigos | 4 importados com título e autores lidos nas imagens; sem resumo, link e PDF |
| Profissionais | 96 importados e mais 8 cadastrados em lote em 04/11/2026: 104 ativos |
| Diretoria | 7 membros, período 2025-2027 |
| Loja | 9 produtos e 2 categorias importadas, com preço da página ao vivo |
| Páginas institucionais | 12 coletadas e convertidas só para conferência; nada importado |

**Falta:** 13 PDFs (8 de artigos e 5 de cartilhas; modelo de PDF adiado); a capa GIF e a imagem AVIF; revisão dos pontos marcados com `revisarMigracao`; campos do arquivo privado fora do modelo (telefones extras, endereço, site).

**Redirecionamentos:** 131 propostos em `tmp-migracao/redirects.json` (15 da loja, 115 de posts e `/blogtratandoescoliose`), com `ativo = false`. Nada ativado; entra na etapa 9.

**Links conhecidos como quebrados ou removidos na conversão:** 7 links internos para `/fisioterapia` (sem destino no site novo, texto mantido) e 19 links em http removidos com o texto mantido, listados em arquivos privados para conferência. 1 marcador `midia:wix:...` pendente (a imagem AVIF), que não aparece no site.

## 7. Ambiente e implantação

| Item | Valor |
|---|---|
| Node.js (máquina de desenvolvimento) | 25.9 (mínimo 22.18) |
| Next.js | 16.3.6 (App Router; `proxy.ts` no lugar de `middleware.ts`) |
| React | 19.2.8 |
| TypeScript | 5.9 |
| firebase / firebase-admin | 12.19.0 / 14.5.0 |
| sharp | 0.35.5 |
| firebase-tools | 15.31.0 |
| Firebase em uso | `abte-dev` (conta de desenvolvimento, Firestore e bucket em São Paulo, plano Blaze) |
| Firebase de produção da ABTE | Não criado (etapa 9) |
| Hospedagem atual | Vercel, projeto `abte`, implantação automática a cada push na `main` |
| Domínio | `abte-lovat.vercel.app` (provisório); domínio próprio não registrado |

**Variáveis de ambiente necessárias** (só os nomes; valores no `.env.local`, fora do Git): `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` e, só nos testes, `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST`.

**Comandos principais:** `npm run dev`, `npm run build`, `npm run typecheck`, `npm run lint`, `npm run lint:css`, `npm run test:unidade`, `npm run test:sessao` e `npm run test:regras` (os dois últimos exigem Java), `npm run admin:conceder`, `npm run midia:orfas`, `npm run cadastro:profissionais-lote` e os scripts `migracao:*` (todos simulam por padrão; gravar exige `--executar --confirmo-projeto=<id>`).

**Esta promoção:** `feature/midia-upload` enviada (`ae263b4..e095683`), `main` em fast-forward (`078df95..e095683`), sem force, merge com commit nem rebase. Implantação de Produção `7590226814` com `success`. Conferido por HTTP em 05/11/2026: home, blog, profissionais, loja, diretoria, doe, seja-associado e contato com 200; `/artigos` e as três páginas legais com 404 (por configuração); `/admin` sem sessão leva ao login (307); `/profissionais` com o filtro "Todos os estados" e sem nenhum link de Facebook. Conferência visual e com sessão do painel em produção: NÃO VERIFICADO.

## 8. Dívida técnica e problemas conhecidos

| Problema | Arquivo | Severidade |
|---|---|---|
| Contato mostra "enviado" sem enviar nem gravar | `src/components/BlocoContato/BlocoContato.tsx:74` | Alta antes do lançamento |
| Envio de vídeo por arquivo bloqueado: CORS do bucket não aplicado | `docs/infra/cors.json` (configuração do bucket) | Alta para o vídeo por arquivo (YouTube funciona) |
| Janelas do cadastro de profissional e de banner sem barra de salvar fixa e sem aviso de alterações não salvas | `src/app/admin/(painel)/profissionais/`, `src/app/admin/(painel)/home/` | Média (risco de perder o que foi digitado) |
| Publicar pela lista não preenche `publicadoEm` (o site mostra a data de criação) | `src/lib/gravacao/lixeira.ts` (publicar e despublicar, cerca da linha 54) | Média |
| Exclusão da conta de cliente apaga carrinho e documento antes do Authentication; falha no fim deixa login órfão | `src/lib/loja/contas.ts:55-57` | Média |
| O servidor não exige título e conteúdo do post nem confere o protocolo do link do artigo | `src/app/admin/acoes-conteudo.ts:38-47` | Média |
| Vídeos de `publico/videos/` fora da conferência de órfãs | `scripts/midia-orfas.mts` | Média |
| 5 erros de `lint:css` conhecidos | `src/components/Botao/Botao.module.css:37`, `src/components/Modal/Modal.module.css:7, 23, 37, 44` | Baixa |
| Função antiga de excluir profissional sem uso no painel (mantida pelos testes) | `src/lib/gravacao/profissionais.ts:76` (`marcarExclusaoDoProfissional`) | Baixa |
| Placeholder com cores literais | `src/components/PlaceholderImagem/PlaceholderImagem.tsx:13-14` | Baixa |
| Aviso de produto em carrinho lê a coleção `carrinhos` inteira | `src/lib/gravacao/lixeira.ts:147` | Baixa (volume atual) |
| Espaço grande entre o cabeçalho e a primeira seção nas telas de categorias e tags | telas `topicos` e `loja/categorias` do painel | Baixa |
| Resumo do post não é recalculado ao editar o corpo | `src/lib/gravacao/posts.ts` | Baixa |
| Recuperação de senha esconde falhas operacionais | `src/components/FormularioRecuperarSenha/FormularioRecuperarSenha.tsx:47` | Baixa |
| 3 avisos de `<img>` sem `next/image` | `blog/[slug]/page.tsx`, `CardPost.tsx`, `Logo.tsx` | Baixa |
| "Carrinho (n)" conta produtos esgotados ou retirados | menu da loja | Baixa |
| Carrossel sem botão de pausa visível | `src/components/Hero/` | Baixa |
| Avisos `MaxListenersExceededWarning` nos envios em massa ao Storage | scripts de migração | Baixa |
| Tokens diferentes do design system original (pesos, `--section-space`, raio de 10px) | `src/styles/tokens.css` | Decisão de design, não regressão |

## 9. Pendências que dependem de pessoas

Os itens marcados com (*) foram informados pelo responsável neste pedido e não têm registro no repositório; o detalhe de cada um é NÃO VERIFICADO.

| Pendência | Quem resolve |
|---|---|
| WhatsApp dos profissionais e o consentimento para exibir (*) | ABTE e profissionais |
| Minicurrículos (apresentações): a maioria dos cards está sem apresentação; os 8 do lote 1 entraram sem (*) | Profissionais |
| Fotos da Naíla e da Dra. Bárbara (posições 1 e 8 do lote 1, hoje com o ícone de usuário) | Profissionais |
| Foto maior para a posição 3 do lote 1 (hoje 176 x 320 px) | Profissional |
| Confirmação dos registros profissionais (*) | ABTE |
| Dr. Jacks Tenório (*) | ABTE |
| Telefone fixo da Dra. Bárbara (*) (o cadastro só tem campo de WhatsApp) | ABTE e profissional |
| Scoliosis Day (*) | ABTE |
| Um perfil de Instagram citado pelo responsável, a confirmar (*) (identificador omitido aqui por não estar no site) | ABTE |
| Prints do WhatsApp (*) | Responsável |
| Conferência de menores das imagens importadas e texto final do aviso de menores | ABTE e assessoria jurídica |
| Textos legais (privacidade, termos, acessibilidade) | ABTE e assessoria jurídica |
| Chave Pix, titular e exibição do CNPJ | ABTE |
| Vídeo de Quem Somos, versões celular e tablet dos banners, destinos dos banners | ABTE |
| Resumos, links e PDFs dos 4 artigos científicos; autoria dos posts | ABTE |
| Números oficiais, depoimentos, logos de parceiros, logo em vetor, fotos | ABTE |

**Decisões em aberto** (nunca assumir): forma de doação (P1); hospedagem (P3) e região de produção; domínio; serviço de e-mail do contato; papéis do painel (P7); associação definitiva (P8, hoje Google Forms provisório); newsletter; área de membros; comentários no blog; marca "Tratando Escoliose"; link da diretoria no menu; repositório público ou privado; frete, recorrência, recibo e nota fiscal se o pagamento for ativado.

## 10. Etapas do roteiro

| Etapa | Situação | O que falta |
|---|---|---|
| 1 Base | Concluída | |
| 2 Páginas estáticas | Concluída | Conteúdo oficial; `/doe` depende da chave Pix |
| 3 Modelo de dados | Parcial | Coleção `usuarios` e cadastro de usuários pelo painel; tela do registro de alterações. Lixeira, registro e configurações já existem |
| 4 Painel | Quase concluída | Tela da diretoria; barra fixa e aviso nas janelas; CORS do vídeo |
| 5 Páginas dinâmicas | Concluída | Busca de profissionais por nome, cidade e método (se pedida) |
| 6 Migração | Executada no `abte-dev` | PDFs, GIF e AVIF, revisão editorial, redirecionamentos (na etapa 9) |
| 7 Loja com pagamento | Desativada | Só com pedido explícito (Stripe) |
| 8 Doação online | Desativada | Só com pedido explícito (Stripe) |
| 9 SEO e lançamento | Não iniciada | Ver abaixo |

**Para o lançamento:** projeto Firebase de produção na conta da ABTE (e migração dos dados para ele); hospedagem definitiva e região; domínio e DNS; serviço de e-mail do formulário de contato; decisão sobre newsletter; chave Pix; textos legais publicados e `VERSAO_DO_CONSENTIMENTO` atualizada; redirecionamentos do Wix ativados; remoção do `noindex` e do `robots.txt` provisório, com sitemap; alerta de orçamento; retirada de imagens de exemplo. Pagamento online continua desativado.

## 11. Próximos passos sugeridos

1. **Conferir o site publicado** em 390 e 1280 px e o painel com sessão, depois desta promoção (o relatório só conferiu por HTTP).
2. **Aplicar o CORS do bucket** (`docs/infra/cors.json`) para liberar o vídeo por arquivo, com a orientação passo a passo.
3. **Barra fixa e aviso de alterações** nas janelas de profissional e de banner, que são as telas mais usadas no dia a dia.
4. **Preencher `publicadoEm` ao publicar** pela lista e pela barra de salvar, com teste.
5. **Validações no servidor** (título e conteúdo do post, link do artigo) e **ordem da exclusão da conta** de cliente.
6. **Definir o serviço de e-mail do contato** e implementar o envio real, sem continuar mostrando sucesso falso.
7. **Decidir sobre o repositório público** e os documentos com nomes de profissionais.
8. **Tela da diretoria** e **gestão de usuários** no painel.
9. **Etapa 9:** projeto de produção da ABTE, domínio, hospedagem, redirecionamentos e SEO.

**Riscos:** a produção atual servir dados do banco de desenvolvimento (qualquer teste no `abte-dev` aparece no site); textos legais e consentimentos ainda provisórios; dados pessoais de profissionais num repositório público; conteúdo de exemplo publicado (um artigo de exemplo, categoria "teste" e produto de teste na loja, conforme registros de 29/10/2026, situação atual NÃO VERIFICADA).
