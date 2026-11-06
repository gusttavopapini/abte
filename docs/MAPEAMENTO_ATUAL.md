# ABTE — mapeamento atual e continuidade

**Revisão: 30/10/2026. Código analisado: `1a19af4`. Promoção posterior em 31/10/2026 (`e533db8`): ver o último registro deste arquivo; as seções 2, 8 e 10 descrevem o estado anterior a ela.** Este é o ponto de entrada atual do projeto. Para as correções posteriores, veja o registro de retomada ao fim deste arquivo. Reúne a implementação existente, as entregas anteriores, o estado conferido de produção e as pendências. Registros antigos permanecem como histórico, com suas respectivas datas.

## 1. Continuidade e objetivo

Em 30/10, o responsável pediu: “refaça o mapeamento de tudo o que foi feito e vamos prosseguir aqui”. A continuidade voltou a este chat no Codex, substituindo o encaminhamento ao Claude de 28/10. Não há exigência permanente de assistente exclusivo: vale o pedido humano mais recente.

O projeto reconstrói o portal da **ABTE, Associação Brasileira de Tratamento da Escoliose**, para substituir o Wix por site e painel próprios. O público inclui pacientes, familiares e profissionais de saúde. O responsável acompanha por revisão visual e capturas; comunicar em português claro.

Este remapeamento revisou o histórico, a documentação, as áreas públicas e administrativas, a arquitetura e os testes. Não publicou código, não executou migrações, não alterou dados reais e não configurou infraestrutura. As alterações desta etapa são de documentação.

## 2. Estado do código, GitHub e produção

| Referência | Estado conferido em 30/10 |
|---|---|
| Repositório | `gusttavopapini/abte` |
| Site público | [abte-lovat.vercel.app](https://abte-lovat.vercel.app) |
| Branch local de trabalho | `feature/midia-upload`, HEAD `1a19af438b5f436f442f001bfbdb89914ba03840` |
| Branch remota de trabalho | `f9b16509b8e6d88cb9fd953c2b3a13d15672bcb8` |
| `main` remota | `dfe8d8d998df45c6d65f0d8b3de040035f8a674c` |
| Último deployment de Produção no GitHub | `7449312744`, `success`, código `dfe8d8d`, criado em 30/10 às 18h34 de Recife |
| `main` local | `207c9b1`, 203 commits atrás da referência remota |
| Árvore antes deste remapeamento | Limpa; as cinco implementações locais já estavam em commits |

Branches remotas e deployment foram consultados diretamente no GitHub, sem `fetch`, push ou promoção. HEAD está seis commits à frente da `main` remota: um registro de documentação e **cinco commits de implementação ainda locais**. Esses cinco commits não estão na produção conferida.

**Não partir da `main` local antiga nem promovê-la.** Antes de editar ou publicar, reconferir Git e mudanças concorrentes. Os documentos atualizados nesta revisão ficam inicialmente sem commit.

### Cinco implementações locais posteriores à produção

| Commit | O que existe no HEAD |
|---|---|
| `58ab0ca` | Validador compartilhado dos links do banner, opções de páginas, mensagens de erro que somem ao corrigir os campos |
| `433388a` | Texto do banner alinhado ao container/logo, título menor e ajuste para manter palavras inteiras |
| `6564aae` | Botão Configurações do site em todo o painel, com formulário compartilhado em modal, só para administrador |
| `334dbf9` | Vídeo com capa e play central, capa automática do YouTube, suporte a `/live/`, envio retomável até 1 GB em partes de 8 MB |
| `1a19af4` | Modal renderizado no `body` por portal, foco inicial sem campos escondidos e Escape tratado pela janela superior |

## 3. Conferência pública desta revisão

Leitura anônima por HTTP do domínio público, sem login nem envio de formulários:

| Página | Resultado |
|---|---|
| Home, blog, artigos, profissionais, loja, diretoria, contato, doação e associação | HTTP 200, um H1 por página |
| Blog | 71 links distintos de posts na listagem |
| Artigos | Cinco links distintos de artigos na listagem |
| Loja | Nove links distintos de produtos na listagem |
| Privacidade, termos e acessibilidade | HTTP 404; páginas ainda não publicadas no novo modelo |
| `/admin/home` e `/admin/configuracoes`, sem sessão | Redirecionam ao login |
| `/doe` | Sem botão “Copiar chave” no HTML público conferido |
| `robots.txt` e metadados | Continuam bloqueando indexação (`Disallow: /`, `noindex, nofollow`) |

Essa conferência confirma acessibilidade e listagens no momento da leitura. Não equivale a conferir novamente cada detalhe das 71 publicações, a todos os filtros ou às interações visuais. A verificação completa de 88 páginas/filtros registrada em 28/10 continua sendo evidência daquela data. Não foram lidos documentos privados do Firebase nesta revisão.

## 4. Arquitetura e organização

| Camada | Implementação |
|---|---|
| Aplicação | Next.js 16.3.6, App Router, React 19.2.8, TypeScript estrito |
| Interface | CSS Modules, componentes próprios, Public Sans, tokens em `src/styles/tokens.css`; sem kit pronto de UI |
| Identidade e dados | Firebase Authentication, Firestore e Storage; Admin SDK no servidor |
| Imagens | Sharp, WebP e variantes de tamanho; biblioteca com alt, origem, uso e lixeira |
| Sessões | Cookie do painel separado do cookie de cliente da loja; validação no servidor e checagem de revogação |
| Ferramentas | npm e lockfile; Node mínimo 22.18; Java para emuladores |
| Inventário atual | 335 arquivos em `src`, 43 arquivos `page.tsx`, 66 arquivos de testes e 18 scripts |

Firestore nega acesso direto do navegador, inclusive de administradores. Ações administrativas verificam sessão e papel antes de ler/gravar. O SDK web é usado para autenticação, sem oferecer acesso direto às coleções.

**Imagens** são processadas e enviadas pelo servidor. **Vídeos** têm uma exceção deliberada: o servidor autoriza um caminho específico por política assinada ou sessão retomável, e o navegador envia o arquivo diretamente ao bucket. As regras continuam negando escrita genérica. Não reintroduzir a afirmação antiga de que nenhum arquivo pode ser enviado do navegador ao Storage.

Papéis atuais: administrador e editor gerenciam conteúdo e home/vídeo. Configurações do site, páginas institucionais e exclusão definitiva de mídia são restritas ao administrador. Cliente da loja não recebe papel do painel.

Pastas principais:

- `src/app/`: páginas públicas, painel, ações de servidor e loja.
- `src/components/`: componentes públicos compartilhados, incluindo Hero, Modal, cards, vídeo e Pix.
- `src/app/admin/_componentes/`: formulários, tabelas, imagem do item, configurações e estrutura do painel.
- `src/lib/dados/`: leituras tipadas e caches de configurações/páginas.
- `src/lib/gravacao/`: gravações, validações de referências e transações.
- `src/lib/auth/`: sessões, cookies, papéis e permissões.
- `src/lib/midia/`: processamento, regras, dono, variantes e biblioteca.
- `src/lib/site/`: regras de home, banners, vídeo, âncoras, configurações e páginas.
- `src/lib/loja/`: conta e carrinho; `src/lib/filtrosDaLoja.ts`: filtros e URL.
- `src/lib/migracao/` e `scripts/`: importação, conferência e operações auxiliares.
- `testes/unidade`, `testes/regras`, `testes/sessao`: testes puros e com emuladores.

Coleções centrais: posts, artigos, profissionais, diretoria, produtos, classificações de cada área, midias, clientes, carrinhos, logAlteracoes, configuracoes (`home` e `site`) e paginasInstitucionais.

Segredos e dados privados permanecem fora do Git: `.env*` (exceto modelo), `docs/dados-privados/` e `tmp-migracao/`. Não copiar valores para relatórios. O portal publicado usa o ambiente de desenvolvimento documentado; a preparação do ambiente institucional de produção continua separada do deploy do código.

## 5. O que já está implementado

### Site e home

- Header responsivo, menus de profissionais, rodapé, layouts e estados de página.
- Cabeçalhos das páginas internas centralizados, ritmo vertical compartilhado e sistema de hover sem sublinhado.
- Banner de tela cheia com ponto de foco; até oito slides administráveis, ordem e ativação.
- Imagens de banner para computador, tablet e celular, com substituição quando faltar uma versão.
- Título, trecho em destaque, subtítulo, posição do texto, botão e destino: página, URL externa ou seção da home.
- Imagens de Mutirões e Faça parte com versões computador/celular e reutilização da biblioteca.
- Quem Somos com missão, visão e valores; vídeo vertical por arquivo ou YouTube.
- Produtos em destaque: até quatro elegíveis; seção não aparece quando não houver produtos válidos.
- Diretoria pública agrupada por período. O link no menu/rodapé segue pendência de decisão histórica.

Home configurável não significa conteúdo final preenchido. Imagens, textos, vídeo e números institucionais devem ser conferidos com a ABTE.

### Blog e artigos

- Posts com conteúdo integral, Markdown restrito, capa, categorias, tags e páginas individuais.
- Títulos menores, prévia limitada a 120 caracteres em palavra inteira e até três linhas.
- Busca do blog por título, resumo e corpo, com todas as palavras, sem distinção de acentos/caixa; categoria e busca se preservam na URL.
- Artigos com autores, imagem, resumo/link quando preenchidos e classificação temática.
- Cards de artigos padronizados; retirada da data de importação e do rótulo de ranking sem medição.
- Administrador pode desativar Artigos em `configuracoes/site`: menus e links somem e as rotas de lista, detalhes e categorias retornam 404. **Atualmente, a listagem pública conferida está ativa.**

Em 28/10 foram publicados 69 posts e quatro artigos que ainda eram rascunhos; os dois posts e o artigo de exemplo anteriores foram preservados. Resultado naquela conferência: 71 posts e cinco artigos, sem rascunhos. Foram criadas duas categorias temáticas e 11 tags para os quatro artigos científicos: três em Exercícios e fisioterapia e um em Gestação e escoliose. Um slug duplicado de exemplo recebeu `-2`.

Os quatro artigos importados não ganharam textos científicos, resumos ou links de origem inventados. Na última conferência editorial registrada, resumo textual e URL de origem desses quatro ainda faltavam. Cinco artigos cadastrados incluem um exemplo; não significam cinco científicos.

### Profissionais

- Cards únicos com foto, nome, registro, localização, telerreabilitação, etiquetas pequenas por método e contatos com ícones/cores.
- Apresentação curta de até 140 caracteres; card/Ver mais abre popup com dados e texto completo.
- Lista fechada dos campos públicos enviados ao navegador, preservando campos internos.
- Filtro por tipo de profissional. Busca por nome/local/método ainda não existe.
- Em 28/10 foram conferidos 96 profissionais e 241 contatos antes/depois dos ajustes, sem mudança dos destinos; números não recontados no banco nesta revisão.

### Loja

- Catálogo, páginas de produto, galeria, preço, desconto, selos, disponibilidade e relacionados.
- Filtros por busca, categoria, físico/digital, disponibilidade, preço, promoção, selos e ordem; contagens e etiquetas; estado compartilhável pela URL.
- Barra lateral no desktop e painel no celular/tablet; grade final de até quatro colunas.
- Menu flutuante com Produtos, Carrinho e Entrar/Minha conta, coordenado com o botão móvel de filtros.
- Cadastro/login/recuperação de senha, conta de cliente e carrinho persistido na conta.
- Carrinho guarda id/quantidade; preço e disponibilidade são lidos no servidor.

**Não há checkout, pagamento online, pedidos, cupons ou webhooks.** O botão de finalizar segue indisponível. Stripe aparece como decisão futura. A descrição antiga “só vitrine” foi superada pela conta/carrinho, sem autorizar pagamento.

### Associação, doação, legais e contato

- Associação tem Google Forms separados para médicos e fisioterapeutas, definidos por decisão provisória de 30/10.
- Pix estático pode ser preenchido pelo administrador: tipo, chave, favorecido e orientação. Há cópia da chave; sem QR Code, gateway ou registro automático de doações.
- Privacidade, termos e acessibilidade podem ser editados em Markdown restrito e publicados pelo painel. Sem publicação, ficam fora do rodapé e retornam 404. Publicação sem corpo usa o texto preliminar anterior; com corpo vale o conteúdo do painel.
- Contato tem formulário e consentimento visual, mas o envio real ainda não está implementado.

### Painel e biblioteca

- Login e acesso por papel; painel responsivo com lateral no desktop e gaveta no celular.
- Visão geral, busca/filtro de situação nas tabelas, estados vazios, trilhas e mensagens em português.
- Formulários divididos em seções, contadores, barra de salvar e aviso ao sair com alterações.
- Gestão de posts/artigos/classificações, profissionais, produtos/categorias e biblioteca de imagens.
- Envio de imagem no próprio cadastro, alt obrigatório, aviso de menores, reordenação de galeria e reutilização de imagens.
- Vínculo `dono` da mídia ao item/campo; biblioteca mostra enviada por/usada em e filtra o tipo de item.
- `/admin/home`, `/admin/configuracoes`, `/admin/paginas` e editor por slug.
- Lixeira/restauração e exclusão definitiva de mídia com restrição de papel; ferramentas de conferência de órfãs.
- Configurações e páginas usam cache com etiquetas, `updateTag` e revalidação para refletir salvamento na primeira visita.
- Logs já cobrem algumas áreas, incluindo home/configurações/páginas/mídia/profissionais/categorias de artigos e categorias de posts; cobertura ainda não é geral.

## 6. Linha do tempo consolidada

| Data | Entregas principais |
|---|---|
| 02–25/10 | Base própria, autenticação, painel/conteúdo/mídia, loja com conta/carrinho, páginas dinâmicas e migração do Wix |
| 26/10 | Auditoria ampla, 487 testes aprovados na época, diagnóstico e backlog |
| 27/10 | Contextualização em AGENTS, README e contexto do Codex |
| 28/10 | Publicação/catalogação; cards e busca do blog; cards e popup dos profissionais; produtos em destaque e card de produto |
| 29/10 | Filtros da loja, quatro colunas, menu flutuante; reformulação de home/cabeçalhos/artigos e espaçamento |
| 29–30/10 | Hover global; imagens enviadas por item; home administrável; revisão móvel e de usabilidade do painel |
| 30/10 | Versões responsivas de imagens, foco/banner de tela cheia; associação por Forms; Artigos opcional; Pix; páginas editáveis; texto/âncoras nos banners; vídeo administrável |
| Após última promoção de 30/10 | Cinco commits locais de banner, configurações em modal, vídeo com capa/1 GB e correção do Modal |
| Este remapeamento | Reconferência do código/GitHub/site/testes, reprodução de perda da confirmação do vídeo e atualização de contexto; sem promoção ou mudança de dados |

Desde `8aa4f16`, o histórico revisado tem 69 commits (incluindo documentação). As entregas foram promovidas em lotes; a última promoção foi `dfe8d8d`. Não confundir cada registro antigo “sem promover” com o estado final depois da promoção posterior.

## 7. Migração: concluído e pendente

Relatórios de execução anteriores registram 267 mídias, 96 profissionais, nove produtos, 69 posts, quatro artigos e sete membros da diretoria importados. Há conteúdo de exemplo adicional. Classificação dos posts e títulos/autores dos artigos foram tratados antes da publicação de 28/10.

**Não repetir importação, publicação ou classificação automaticamente.** A revisão atual não executou scripts operacionais. Comandos de execução/reversão no histórico são referências, não autorizações atuais.

Pendências históricas ainda não encerradas por evidência nova: 13 PDFs (oito de artigos e cinco de folhetos), uma capa GIF e uma imagem de corpo AVIF recusadas, páginas institucionais antigas apenas convertidas para referência e 131 redirecionamentos propostos ainda não ativados. Revisões editoriais e de autoria/menores permanecem separadas da publicação técnica.

## 8. Problemas confirmados e trabalho restante

### Prioridade imediata: estabilizar o código local antes de promover

1. **Confirmação de menores no vídeo:** `src/lib/gravacao/videoQuemSomos.ts`, função `salvarVideoQuemSomos`, substitui o objeto inteiro, mas só acrescenta autor/data quando a marcação muda de falso para verdadeiro. Reprodução com a função real e Firestore em memória confirmou: primeira gravação preserva a confirmação; segunda gravação do mesmo vídeo apaga autor/data. Trocar a fonte mantendo a marcação também não recria o registro. Corrigir a preservação e definir tratamento de nova fonte; cobrir com teste de comportamento.
2. **Teste desatualizado de vídeo:** `testes/sessao/video-quem-somos.test.mts:75` ainda espera 60 MB na política, enquanto o código atual aceita 1 GB. Ajustar a expectativa ao requisito aprovado e preservar testes reais de limite/recusa. Não reduzir o limite apenas para fazer o teste passar.
3. **Envio real de vídeo e CORS:** `docs/infra/cors.json` contém POST/PUT/DELETE para o fluxo atual. A configuração efetiva do bucket não foi conferida/aplicada nesta revisão. Validar em ambiente apropriado antes de declarar upload em produção pronto. YouTube independe desse upload.
4. **Revisão visual dos cinco commits locais:** compilação/testes não substituem interação no navegador; conferir banner, modal global/aninhado, foco/Escape, capa e envio/cancelamento/retomada antes da promoção.

### Correções funcionais antigas que continuam no código

| Problema | Local principal e consequência |
|---|---|
| Contato com falso sucesso | `src/components/BlocoContato/BlocoContato.tsx:61`: apenas muda o estado para enviado; não envia nem grava. Serviço/destinatário ainda precisam de definição |
| Exclusão parcial de cliente | `src/lib/loja/contas.ts:54`: apaga carrinho e documento antes do Authentication; falha final deixa login órfão, e a sessão exige o documento ausente |
| Validação incompleta no servidor | `src/app/admin/acoes-conteudo.ts:38`: leitor limita tipo/tamanho, mas não exige efetivamente título e corpo obrigatório de post; link do artigo sem validação de protocolo |
| Resumo antigo do post | `src/lib/gravacao/posts.ts:77`: editar corpo não recalcula o resumo persistido; limitar a prévia visual não resolveu esse dado editorial |
| Exclusão de tópico concorrente | `src/lib/gravacao/topicos.ts:195`: verifica uso antes da transação; outro cadastro pode passar a usar o tópico nesse intervalo |
| Recuperação de senha | `src/components/FormularioRecuperarSenha/FormularioRecuperarSenha.tsx:47`: mascara falhas operacionais além de usuário inexistente, exceto erro de rede |

### Recursos ainda incompletos

- Gestão de usuários/papéis, diretoria pelo painel e visualizador de logs.
- Logs das gravações de posts, artigos, produtos, tags e categorias de produto.
- Excluir/restaurar posts e artigos pelo painel.
- Filtros/busca de profissionais por nome, estado/cidade e método; estado acessível do filtro atual (`aria-pressed`).
- Pausa visível e persistente do carrossel; hoje pausa por mouse/foco/aba oculta/movimento reduzido.
- Vídeos antigos/removidos fora da coleção de imagens: o script de órfãs não cobre `publico/videos/`; definir limpeza e retenção.
- Verificação do vídeo usa tamanho/tipo dos metadados; não equivale a analisar assinatura e codec do conteúdo.
- Sinalização de subitem ativo de profissionais por `?tag=` e pequena inconsistência de metadata da doação (“Em breve” mesmo com Pix configurado).

### Conteúdo, decisões e lançamento

- Publicar textos legais revisados pela ABTE; hoje as três páginas públicas retornam 404 por configuração.
- Receber/preencher dados oficiais do Pix; confirmar associação e seus formulários.
- Conferir vídeo/capas/legendas, imagens e autorização de uso/menores; atualizar política se usar serviços externos.
- Confirmar números institucionais e conteúdo de exemplo; não inventar nem excluir exemplos sem pedido.
- Completar revisão editorial dos profissionais, autoria dos posts e fontes/resumos/PDFs dos artigos.
- Preparar domínio, ambiente Firebase institucional, backups/monitoramento/custos, metadados/sitemap e redirecionamentos.
- Remover bloqueio de indexação somente na etapa de lançamento autorizada. Site acessível publicamente continua fora dos buscadores por decisão temporária.
- Checkout, pagamentos online e doações com gateway continuam fora do escopo atual.

## 9. Verificações desta revisão

**Data: 30/10.** TypeScript e linters executados no projeto; testes e build adicional em cópia isolada de arquivos versionados, sem `.env`, credenciais ou dados de migração. Emuladores somente com projetos `demo-*`.

| Verificação | Resultado |
|---|---|
| TypeScript (`--incremental false`) | Aprovado |
| Unidade | 425/425 aprovados |
| Regras Firestore/Storage | 103/103 aprovados |
| Sessão/integração | 158/159 aprovados; uma falha na expectativa antiga de 60 MB do teste de vídeo |
| ESLint | Zero erros; três avisos de imagens em `src` e um aviso de variável em script local ignorado de `tmp-migracao` |
| Stylelint | Cinco erros conhecidos: Botao (uma cor literal) e Modal (duas cores e dois tamanhos de fonte); não corrigidos nesta revisão |
| Build | Webpack aprovado em cópia sem credenciais; leituras de configuração no pré-render usaram fallback, com mensagens de credenciais ausentes. Não valida conteúdo real ou upload remoto |
| Produção | GitHub e 15 endereços públicos/administrativos por HTTP; sem testes visuais/interativos novos |
| Novo achado de vídeo | Reproduzido com função real e mock em memória; sem banco/bucket/rede |

A primeira tentativa de unidade não pôde concluir o teste de servidor HTTP por restrição de porta local; foi encerrada e substituída pela execução isolada aprovada. A primeira execução combinada de integração usou um projeto demo diferente do previsto no login e teve falhas de ambiente; a suíte de sessões foi repetida com `demo-abte-sessao`. Não atribuir essas falhas de configuração à aplicação.

Os números históricos 487 (26/10) e 674 (última promoção) não representam o resultado do HEAD atual. Resultado atual: **686 testes aprovados e um reprovado, de 687 executados**, sem contar duas vezes as repetições de ambiente. O teste de limite de vídeo falhou; a perda da confirmação também foi reproduzida separadamente.

## 10. Ordem de continuidade

1. Corrigir preservação da confirmação do vídeo e alinhar o teste ao limite de 1 GB.
2. Conferir o fluxo de vídeo/CORS e os cinco commits locais no navegador; só então preparar uma promoção concreta para revisão.
3. Corrigir exclusão parcial da conta e validações no servidor; tratar resumo e concorrência de tópicos com testes pertinentes.
4. Implementar o envio real do contato depois de definida a entrega, sem continuar informando sucesso sem envio.
5. Finalizar conteúdo/legal/Pix/editorial e os recursos administrativos necessários ao lançamento.
6. Preparar ambiente institucional, domínio, SEO e operação. Pagamentos ficam para mudança explícita de escopo.

Antes de trabalhar, conferir `git status` e a branch. Preservar alterações locais, não reimportar dados, não executar comandos históricos de promoção/reversão. Usar a documentação instalada do Next.js pertinente à mudança e atualizar este mapa ao concluir cada etapa.

## 11. Documentos e evidências

- `AGENTS.md`: convenções de trabalho e bloco gerenciado do Next.js.
- `CLAUDE.md`: histórico detalhado datado; nome do arquivo não determina o assistente.
- `docs/CONTEXTO_CODEX.md`: auditoria/contextualização inicial e entregas de 28/10.
- `docs/CONTINUIDADE_CLAUDE.md`: resumo histórico da transferência anterior, com trechos superados por este mapa.
- Documentos de design e tokens: referências com exceções posteriores registradas; não restaurar regras antigas automaticamente.
- Relatórios públicos anteriores: diagnóstico de 26/10, publicação de 28/10 e capturas dos cards/busca.
- Evidências desta revisão no workspace: `work/remapeamento-2026-10-30/` (logs de unidade, integração, sessão e build; resposta pública resumida; reprodução da confirmação do vídeo). Não incluem credenciais.

O projeto tem base funcional ampla e conteúdo público, mas ainda precisa de estabilização, conteúdo oficial e preparação de lançamento. Publicação de posts ou sucesso de deployment não significam conclusão do projeto inteiro.


## Retomada no Codex em 30/10/2026: ajustes A a D

Continuidade a partir de `1a19af4`, preservando os cinco commits locais anteriores. Nenhuma migração, gravação no abte-dev, alteração de regras ou configuração do bucket executada nesta etapa.

- A: `/blog` já era aceito; mensagens antigas e campos confusos foram tratados no commit anterior. Nesta retomada, validador compartilhado recusa HTTPS malformado e escapes percentuais inválidos; erro de botão sem destino passa ao campo de link. Testes ampliados.
- B: mesma `.container` do cabeçalho e Hero, agora com safe-area; coluna respeita metade do espaço no desktop; piso de 24px e atualização ao redimensionar a altura. Prévia usa unidades relativas à tela virtual. Medidas de 390/768/1024/1280/1440/1710: título 30/41,38/49,09/50,4/56/69,74px. Diferença logo/texto 0px também em1536 e1600; nenhuma palavra partida, conjunto dentro do Hero e sem rolagem lateral. Em1024, o título longo conferido ocupa cinco linhas: não foi cortado para impor quatro. Matriz adicional concluída: dois títulos, três alinhamentos e seis larguras,36/36 cenários aprovados. Revisão geral pública31/31; total109 verificações de navegador (42+36+31), além das oito medidas detalhadas do Hero.
- C: botão de configurações movido da lateral para barra superior no desktop; gaveta móvel preservada. Cancelar Pix restaura os quatro campos da última gravação bem-sucedida. Ligar/desligar Artigos,404/200, menus, modal aninhado e Escape conferidos em emulador. `/artigos` não tem filtros nem paginação; não foram criados. Sitemap ainda ausente.
- D: limite único de1GB preservado e teste antigo de60MB atualizado. Gravação conserva autor/data da confirmação de menores em edições da mesma fonte e renova ao trocar a fonte; desmarcar remove os campos. Novo teste de regressão. Capa automática avisa quando o recorte difere de9:16. Play central: diferença inferior a1px nas seis larguras; zero chamadas YouTube/ytimg antes do clique; aviso de1GB e prévias do painel conferidos. Upload real do bucket depende de CORS e não foi executado.

Verificações:426 unidade,160 sessão e103 regras aprovados (689); typecheck e buildWebpack aprovados. ESLint sem erros, três avisos de imagens no código e um aviso no roteiro local ignorado. Stylelint mantém os cinco erros conhecidos em Botao/Modal, sem novos. Navegador:42/42 verificações de interação; oito medidas do Hero com dados fictícios. Evidências no workspace da tarefa, pasta `work/retomada-ajustes-2026-10-30/`.

CORS não executado: `gcloud storage buckets update gs://NOME_DO_BUCKET --cors-file=docs/infra/cors.json`. Substituir pelo bucket correto antes de executar. Sem segredos no relatório. Código desta retomada não promovido; produção conferida anteriormente permanece em `dfe8d8d`. A matriz visual foi concluída. A tentativa de promoção foi bloqueada pela revisão automática por exigir autorização humana explícita para a publicação específica. Nenhum push para main foi executado. Correções salvas na branch remota em826d512; o commit posterior registra este resultado.


## Ajuste posterior de30/10: setas laterais do banner

A pedido do responsável, as duas setas voltaram às laterais do Hero, centralizadas verticalmente e afastadas20px das bordas, respeitando safe-area. Indicadores continuam no centro inferior. Conferência isolada em390,768,1280 e1710px: diferença vertical0px, margens20px, avançar/voltar funcionando, sem rolagem horizontal e controles com pelo menos44px. ESLint e Stylelint dos dois arquivos passam. Nenhum dado alterado e nenhuma publicação em produção realizada nesta etapa.


## Correção de sobreposição das setas em30/10

O pedido posterior substitui o alinhamento exato do texto ao logo quando necessário para separar controles e conteúdo. Desktop/tablet: botões laterais de64px e faixa livre de100px por lado (recuo20, botão64, folga16), com safe-area. Celular: botões laterais de44px na faixa inferior, separada do conteúdo. Indicadores continuam centralizados na base. Conferência com título longo, descrição e botão:18/18 cenários (três alinhamentos, larguras320/390/768/1024/1280/1710), sem interseções entre setas e conteúdo, sem rolagem horizontal e com controles dentro do banner. Stylelint do arquivo aprovado. O primeiro teste anterior tinha slides sem texto e não cobria esta colisão; a conferência atual inclui conteúdo. Sem alteração de dados ou publicação nesta etapa.


## Promoção de 31/10/2026

Pedido do responsável: "Faça deploy de tudo agora pra o git". Fast-forward `dfe8d8d..e533db8` (14 commits, 41 arquivos), sem merge e sem force; `main` e `feature/midia-upload` em `e533db8`; deployment de Produção `7460049147` com `success`. Este registro é um commit posterior, só na branch. Nenhum dado, regra ou configuração de bucket foi alterado; nenhum script de migração rodou.

Verificações antes de promover: typecheck e build aprovados; 426 unidade, 160 sessão e 103 regras (689); ESLint 0 erros e 4 avisos; Stylelint com os 5 erros conhecidos. Varredura das 1571 linhas novas: 0 segredos, 0 de 96 nomes de profissionais, 0 endereços do Wix, 0 caminhos da máquina, 0 arquivos privados; os e-mails são exemplos e os acertos de telefone são o limite de 1 GB em bytes e um id de deployment.

Produção conferida com navegador em 390 e 1280 px, sem login: home, `/blog`, `/artigos`, `/profissionais`, `/loja`, `/diretoria`, `/contato`, `/doe` e `/seja-associado` (18 de 18) com status 200, um H1, 0 erros de console, 0 imagens quebradas e sem rolagem lateral; Hero na altura da janela; setas de 44 px em 390 e de 64 px em 1280. `/admin/home` e `/admin/configuracoes` sem sessão levam ao login; `robots.txt` continua bloqueando tudo; as três páginas legais respondem 404 (não publicadas). Painel com sessão não foi conferido em produção.

**Envio de vídeo por arquivo pendente:** preflight CORS do bucket `abte-dev.firebasestorage.app` a partir da origem de produção (31/10/2026) sem nenhum cabeçalho `Access-Control-Allow-*`, então o navegador bloqueia o envio até aplicar `docs/infra/cors.json`. O vídeo pelo YouTube não depende disso.

**Desfazer, se preciso:** `git revert --no-edit dfe8d8d..e533db8`, depois `git push origin feature/midia-upload` e `git push origin feature/midia-upload:main` (não executado).


## Banner da home em 31/10/2026

**Promovido no mesmo dia a pedido do responsável ("Faça deploy agora"):** fast-forward `e533db8..078df95`, sem force; deployment de Produção `7460665889` com `success`. Produção conferida em 390, 768, 1023, 1024, 1280 e 1920 px, sem login: 36 de 42 páginas sem falha; as 6 falhas são `/artigos` com 404, porque o interruptor do painel está desligado (`artigosAtivo` false, gravado antes do deploy, 0 links para Artigos na home). Os 2 banners reais têm texto: razão 0,100 a partir de 1024px, centros a 0px e degradê para cima até 1023px, 0 palavras partidas e setas sem sobrepor o texto. **Desfazer:** Instant Rollback da Vercel para o deployment de `e533db8` (GitHub `7460049147`), ou `git revert --no-edit 078df95` seguido dos dois pushes (não executado).

A partir de 1024px, texto à esquerda ou à direita a 10% da largura do banner, coluna de 40% do banner (até 768px) e título limitado a 4vw; "centro" sem mudança. Até 1023px, degradê de baixo para cima no fundo da `.linhaDoTexto` (a caixa ocupa 68% da altura e cresce com o texto, para o trecho de 85% sempre chegar ao topo do texto), texto centralizado na parte de baixo em qualquer posição e pontos azuis nos slides com texto, porque os brancos sumiriam na base branca. A prévia do painel usa as mesmas regras por formato, sem depender da largura da janela. `TituloAjustavel` mede a caixa do texto e reduz a fonte se o conjunto não couber na altura. Nenhum dado, regra ou script alterado.

Verificado com build local e emuladores (`demo-abte-e2e`, dados e imagens fictícios), em 9 larguras, dois títulos e três posições: 72 medições, 66 interações com clique real e 60 de 64 conferências extras, com capturas em `tmp-migracao/capturas/banner-3110/`. Linha de base igual: lint 0 erros e 4 avisos, lint:css 5 erros, 426 de unidade; `test:sessao` e `test:regras` não rodaram por não haver mudança em ações ou regras.

Pendências: celular deitado (844x390) e o caso de 90 e 200 caracteres em 320x568 passam da faixa do cabeçalho (deitado, o texto não cobre o logo nem o menu); título de 90 caracteres com 5 linhas no computador; com 6 ou mais banners em 390px, a área de toque dos pontos alcança as setas (limite de 8 banners, medidas de toque que já existiam; resolvido abaixo).


## Banner em pilha até 1023px em 31/10/2026 (só na branch, sem promover)

Até 1023px, o banner virou pilha: imagem em cima, faixa de transição na base dela e painel branco com o texto centralizado, setas e pontos no fluxo (oito pontos quebram linha, sem encostar nas setas). Substitui o degradê sobre a foto inteira. Campo novo `pontoDeFocoVertical` ("topo", "centro" ou "base", ausente vale "centro"), sem migração e com `firestore.rules` sem mudança. Recomendações: celular 4:5 (1080 x 1350 px), tablet 4:3 (1536 x 1152 px) e computador 16:9. De 1024px em diante, 0 pixels diferentes em 30 capturas.

Verificado com build local e emuladores (`demo-abte-e2e`, imagens fictícias com marcador): marcador sem interseção com a faixa e o painel em 20 de 20 casos com foco vertical "centro" (360, 390, 430, 768 e 1023 px), 95 de 95 interações, 3 de 3 com oito pontos e 42 de 42 na prévia do painel. `test:unidade` 430, `test:sessao` 162, `test:regras` 103; lint e lint:css iguais à linha de base. Capturas em `tmp-migracao/capturas/banner-pilha-3110/`.

Pendências: os banners reais só têm a versão de computador, com o foco que está gravado, então o assunto só aparece depois de ajustar o foco no painel ou enviar as versões novas (nenhum dado foi alterado); em 360x640, o cabeçalho e o véu ocupam 180px de uma imagem de 282px a 313px; em 1023x768, a imagem fica entre 2,54:1 e 2,92:1, e uma arte 4:3 mostra cerca de 46% da altura.


## Cadastro de profissionais em lote em 04/11/2026 (lote 1, só no `abte-dev`)

Script novo `npm run cadastro:profissionais-lote` (`scripts/cadastrar-profissionais-lote.mts` e `src/lib/migracao/profissionaisLote.ts`), separado da migração do site antigo, que continua sem mudança. Os dados passam pelo `validarProfissional` do painel (montado como o formulário) e são gravados pelo `gravarProfissional`, que ganhou opções só para scripts (campos extras e a marca de migração no registro); `importarImagem` aceita `dono` e `resumo`. Nada mudou no comportamento do painel.

Execução `20261104-042619-f33e` no `abte-dev`, depois da simulação limpa: 8 profissionais criados (7 fisioterapeutas e 1 médica), todos ativos, ordem 0, sem telerreabilitação, métodos e apresentação; 0 recusados e 0 possíveis duplicados entre os 96 anteriores; 6 fotos enviadas e ligadas (dono, alt provisório e conferência de menores pendente), 1 delas reduzida como no navegador (arquivo de 9 MB, maior que 2560 px) e 1 de baixa resolução (176 x 320 px, só a variante de 176 px); 2 sem foto (posições 1 e 8 do arquivo). 20 linhas em `logAlteracoes`, todas da migração. Projeto com 104 profissionais, 104 ativos. **Desfazer:** `npm run cadastro:profissionais-lote -- --desfazer --execucao=20261104-042619-f33e` (simula) e com `--executar --confirmo-projeto=abte-dev`.

Conferido com o build de produção local lendo o `abte-dev`: `/profissionais` com status 200, um H1, 104 cards (69 fisioterapeutas e 24 médicos nos filtros) e o placeholder nos 3 sem foto; o profissional da Bolívia sem UF aparece com "cidade / Bolívia". A página não tem filtro por estado (só por tipo) nem página individual (o detalhe é o popup do card).

Verificações: typecheck e build passam; lint 0 erros e 4 avisos e lint:css 5 erros (iguais à linha de base); `test:unidade` 430, `test:sessao` 170 (8 novos), `test:regras` 103.

Pendências: fotos das posições 1 e 8 (quando chegarem, pôr na pasta do lote e repetir o comando com `--executar`, que só envia e liga as fotos); foto de baixa resolução na posição 3 (pedir uma maior); os profissionais aparecem na produção atual, que lê o `abte-dev`.


## Profissional sem foto com ícone em 04/11/2026 (só na branch, sem promover)

No card e no popup dos profissionais, o quadro preto "IMAGEM" deu lugar ao componente `FotoAusenteProfissional`: fundo `--color-bg`, ícone de usuário em SVG próprio (cabeça e ombros) preenchido com `--color-surface-soft`, com metade da largura do quadro e centralizado, sem raio próprio, borda ou sombra, `aria-hidden`. Ocupa o mesmo quadro 1:1 da foto (o contêiner do card e do popup não mudou). `PlaceholderImagem` e os outros cards continuam iguais. Não existe página individual do profissional.

Conferido com o build de produção local lendo o `abte-dev`, Chrome headless em 390, 768, 1280 e 1710 px: 104 cards, 3 sem foto (os 2 do lote 1 e o 1 antigo sem foto) e 101 com foto; quadro igual ao contêiner da foto (356, 354, 288 e 391,5 px de lado), mesma altura dos cards da linha e mesma caixa de foto na linha, ícone a 0 px do centro, fundo branco, preenchimento #ADD8E6 calculado, raio 0, sem sombra; popup com o quadro quadrado e dentro da tela; nenhum "IMAGEM" na página, 0 erros e sem rolagem lateral. Capturas em `tmp-migracao/capturas/foto-ausente/`.


## Painel: ações completas de conteúdo (a partir de 04/11/2026, só na branch, sem promover)

Plano aprovado pelo responsável em 04/11/2026, em etapas com commit próprio e parada para o "segue". Decisões: o editor cria, edita, duplica, publica, despublica, move para a lixeira e restaura; só o administrador exclui de vez, sem exceção; páginas institucionais não são criadas nem excluídas; raio pelo token `--radius`; post e artigo na lixeira viram rascunho (o site público só olha o status) e voltam como rascunho; banner com lixeira dentro do documento da home; excluir de vez não apaga imagens e recusa item em uso; produto guardado em carrinho é excluído com aviso (o carrinho guarda só id e quantidade, sem pagamento); duplicar sai como rascunho, "Cópia de ...", sem slug; tags e categorias da loja ficam sem publicar e despublicar.

**Etapa 1a (base comum):** ações `conteudo.editar`, `conteudo.publicar`, `conteudo.excluir`, `conteudo.restaurar`, `conteudo.excluirDeVez` (só administrador) e `registro.ver` na tabela `PERMISSOES`; regras puras em `src/lib/lixeira.ts` (situação de cada coleção, confirmação reforçada com EXCLUIR ou o nome, mensagens); gravação comum em `src/lib/gravacao/lixeira.ts` (publicar e despublicar, lixeira, restaurar e excluir de vez, cada uma com o registro na mesma transação; vínculos que impedem: tópicos usados por posts, artigos ou produtos, inclusive na lixeira, e profissional na diretoria ou como autor de post); janela `ConfirmacaoDoPainel` sobre o `Modal`. Ainda sem uso nas telas (etapas 1b em diante). Testes: 11 de unidade (`testes/unidade/lixeira.test.mts`) e 7 no emulador (`testes/sessao/lixeira.test.mts`). `test:unidade` 441, `test:sessao` 177, `test:regras` 103; lint e lint:css iguais à linha de base.

**Etapa 1b (blog e artigos):** ações de servidor comuns em `src/app/admin/acoes-lixeira.ts` (publicar e despublicar, mover para a lixeira, restaurar, excluir de vez e duplicar), cada uma com `exigirPapelDoPainel()` e a permissão da tabela antes de ler ou gravar; recusa do editor em "Excluir de vez" volta como mensagem. Listas `/admin/blog` e `/admin/artigos` com o menu "Ações" por linha (`AcoesDoItem`: Editar, Ver no site quando publicado, Publicar ou Despublicar, Duplicar, Mover para a lixeira; na lixeira, Restaurar, Abrir e, só para o administrador, Excluir de vez), a parte "Lixeira (n)" abaixo da lista e a caixa de mensagens (`MensagensDoPainel`). Selo "Na lixeira" (tracejado). Formulário de item na lixeira com o aviso "Este item está na lixeira", o botão Restaurar e "Salvar e publicar" desligado; o servidor também recusa publicar item na lixeira. Criar, editar, duplicar, lixeira e restaurar de posts e artigos gravam em `logAlteracoes`. `excluidoEm` passou a ser lido nos posts e artigos (só campo novo; as páginas públicas continuam pela situação). Duplicar: "Cópia de ...", rascunho, slug novo nos posts, sem `publicadoEm` nem dados da migração; capa, categoria e tags só se ainda disponíveis (artigo com a categoria na lixeira não é duplicado).

Conferido no navegador (build de produção local contra os emuladores, `demo-abte-e2e`, dados fictícios), 107 de 107: em 390, 768, 1280 e 1710 px, o menu abre pela seta, move o foco com as setas, Home e End, fecha com Esc e devolve o foco; menu dentro da tela e itens com 44 px; janela de lixeira e janela reforçada com o foco dentro, Tab e Shift+Tab presos, Esc fecha e o foco volta ao botão "Ações"; a reforçada só libera com EXCLUIR. Fluxos em 1280: post e artigo na lixeira saem de `/blog` e `/artigos` e o endereço responde 404; restaurados, voltam como rascunho e continuam 404; duplicar cria a cópia como rascunho com o link "Editar a cópia"; publicar e despublicar pela lista mudam o site e o foco volta ao botão; excluir de vez pelo nome; formulário na lixeira com o aviso e o Restaurar; editor move para a lixeira e não vê "Excluir de vez". Corrigido no caminho: o botão "Ações" ficava desligado durante a ação e perdia o foco. Capturas em `tmp-migracao/capturas/painel-1b/`.

Testes: `test:unidade` 444, `test:sessao` 183 (6 novos de blog e artigos), `test:regras` 109 (6 novos: navegador sem acesso à lixeira de posts e artigos, para visitante, administrador e editor). Lint e lint:css iguais à linha de base.

Pendências registradas: (1) publicar não preenche a data de publicação (comportamento de antes, sem mudança: sem `publicadoEm`, o site mostra a data de criação); (2) o aviso de produto em carrinho lê a coleção `carrinhos` inteira para contar (aceitável no volume atual; rever se crescer); (3) os 5 erros conhecidos de lint:css em `Botao` e `Modal`; (4) a gaveta do menu do painel tem `role="dialog"` e `aria-modal` sempre na página, fechada e inerte (não aparece para leitores de tela por estar inerte; rever na etapa 3); (5) a busca da lista não procura na parte "Lixeira" (filtros com contagem na etapa 2).

**Etapa 1c (profissionais, produtos e banners):** as três telas usam o menu "Ações" (`AcoesDoItem`, que passou a aceitar operações e textos próprios, para os banners, e "Editar" por janela, para profissionais e banners), a caixa de mensagens e a parte "Lixeira". Profissionais: ativar e desativar, lixeira, restaurar (volta com a situação que tinha) e excluir de vez, recusado com mensagem se o profissional estiver ligado à diretoria ou indicado como autor de post. Produtos: publicar e despublicar, lixeira, restaurar, excluir de vez com o aviso de carrinho (o carrinho não é alterado; nenhum toque em pagamento) e duplicar ("Cópia de ...", fora da loja, slug novo, só as imagens disponíveis); o salvar foi para `gravarProduto` (`lib/gravacao/produtos.ts`) e passou a gravar no registro de alterações. Banners: `excluidoEm` no próprio banner dentro de `configuracoes/home`; lixeira desativa e leva o banner para o fim; restaurar volta desativado, no fim da lista; ativar e desativar pelo menu; excluir de vez só da lixeira, com a confirmação reforçada (EXCLUIR ou o nome); o limite de 8 conta os da lixeira; o formulário recusa ativar banner na lixeira; o site já ignorava banner inativo e agora também ignora o da lixeira. Ações novas em `acoes-home.ts` (`ativarOuDesativarBanner`, `moverBannerParaALixeira`, `restaurarBannerDaHome`, `excluirBannerDaHomeDeVez`, com `home.editar` e a permissão de conteúdo); saíram `excluirBannerDaHome`, `excluirProfissional`, `restaurarProfissional`, `excluirProduto` e `restaurarProduto` (o menu comum faz isso). O menu de ações abre para a direita quando, alinhado à direita, sairia da tela (achado em 768 px nos cartões dos banners).

Conferido no navegador (build de produção local contra os emuladores, `demo-abte-e2e`, dados fictícios), 130 de 130: nas três telas, em 390, 768, 1280 e 1710 px, menu pelo teclado com os itens certos, dentro da tela e com 44 px, Esc devolve o foco, janela de lixeira com o foco preso e Esc devolvendo o foco, "Editar" abrindo a janela do formulário e devolvendo o foco ao fechar, sem erros no console. Fluxos: profissional na lixeira sai de `/profissionais` e volta ao restaurar; desativar e ativar pela lista; excluir de vez recusado para o da diretoria e para o autor de post, com a mensagem na janela; produto na lixeira sai de `/loja` e a página dá 404; duplicar fora da loja; excluir de vez com o aviso do carrinho; banner na lixeira sai da home, restaurado continua fora (desativado), ativado volta, excluído de vez. Editor: sem "Excluir de vez" no menu e, chamando a ação direto pelo navegador (pelo identificador da ação no build), recebe "Só o administrador pode excluir de vez." para profissional, produto e banner, sem nada apagado. A conferência da 1b refeita depois da mudança no menu: 107 de 107. Capturas em `tmp-migracao/capturas/painel-1c/`.

Testes: `test:unidade` 444, `test:sessao` 188 (5 novos, `testes/sessao/lixeira-1c.test.mts`; os de banner antigos passaram a usar lixeira e excluir de vez), `test:regras` 115 (6 novos). Lint e lint:css iguais à linha de base.

Pendências: `marcarExclusaoDoProfissional` (`lib/gravacao/profissionais.ts`) ficou sem uso no painel, mantido porque os testes de sessão o usam; o profissional restaurado volta ativo se estava ativo (os produtos também voltam com a situação que tinham), diferente de posts e artigos, que voltam como rascunho; o campo de confirmação da janela reforçada usa o estilo do `Campo`, sem contorno sobre o fundo branco da janela quando sem foco (visual de antes do componente).

**Ajuste (04/11/2026): contorno do campo da confirmação reforçada.** O campo onde se digita EXCLUIR tem contorno de 1px em `--color-placeholder` também sem foco (contraste de cerca de 4,9:1 com o branco), com o anel `--focus-ring` por cima ao focar; o erro continua em caixa branca. Só nesse campo (classe `campoDaConfirmacao` em `ConfirmacaoDoPainel`). Conferido em 390, 768, 1280 e 1710 px (16 de 16): contorno em repouso, anel de foco, erro "Item não encontrado" em caixa branca, sem rolagem lateral. Capturas em `tmp-migracao/capturas/campo-confirmacao/`. **Pendência da etapa 3:** todos os campos de formulário do painel precisam de contorno visível em repouso (hoje o `Campo` é branco e sem borda, e some sobre as caixas brancas).

**Etapa 1d (tópicos: categorias e tags do blog, dos artigos e da loja):** o `GerenciadorDeTopicos` passou a ter o menu "Ações" em cada item (o formulário de nome, ordem, imagem e "Ativa" continua com o botão Salvar), a caixa de mensagens e a parte "Lixeira (n)" com o selo. Ativar e desativar só nas categorias de post e de artigo (campo `ativa` que já existia), pelas ações comuns; tags e categorias da loja sem situação e sem campo novo. Lixeira e restaurar por ações novas em `acoes-topicos.ts` (`moverTopicoParaALixeira`, `restaurarTopicoDaLixeira`, com a permissão de conteúdo), que mantêm as regras dos tópicos: em uso por post, artigo ou produto (inclusive na lixeira) não vai para a lixeira, e nome repetido não é restaurado. Excluir de vez pelas ações comuns, só administrador, com a confirmação reforçada, recusado se o tópico estiver em uso (inclusive por item na lixeira). Saíram `excluirTopico` e `restaurarTopico` (formulários). Tags e categorias da loja passaram a gravar no registro de alterações (antes só as categorias de artigo e de post), com "Tag criada." ou "Categoria criada."; o resumo da lixeira passou a "movida para a lixeira".

Conferido no navegador (build de produção local contra os emuladores, `demo-abte-e2e`, dados fictícios), 118 de 118: nas três telas e nas quatro larguras, menu pelo teclado com os itens certos (tags sem ativar), dentro da tela e com 44 px, Esc devolve o foco, janela de lixeira com o foco preso, sem erros no console. Fluxos: categoria de post desativada some dos filtros de `/blog` e volta ao ativar; tag em uso por post não vai para a lixeira (mensagem); excluir de vez recusado para a tag usada por post na lixeira (mensagem com o título do post); categoria livre para a lixeira e excluída de vez; categoria de artigos na lixeira faz a página dela responder 404 e, restaurada, 200; categoria de artigo desativada some de `/artigos`; categoria da loja em uso recusada e a livre na lixeira fora de `/loja`. Editor: na lixeira só "Restaurar" e, chamando `excluirItemDeVez` direto pelo navegador para três tópicos, recebe "Só o administrador pode excluir de vez." sem nada apagado. Capturas em `tmp-migracao/capturas/painel-1d/`.

Testes: `test:unidade` 444, `test:sessao` 195 (`testes/sessao/lixeira-1d.test.mts`, 7 novos; os de tópicos ajustados ao registro em todos os tipos), `test:regras` 118 (3 novos). Lint e lint:css iguais à linha de base.

Observações: como tópico em uso não vai para a lixeira, "some do site" só se vê nas páginas próprias das categorias (as de artigo têm página) e nos filtros, que já mostram só categorias com item publicado; as tags não têm página própria. Na rodada de validação do ajuste do campo (commit `e949a68`), um teste de `test:sessao` falhou uma vez e não se repetiu em quatro rodadas seguidas (o nome não foi guardado; provável disputa de porta logo depois de desligar os emuladores da conferência no navegador).

**Fechamento da etapa 1 (04/11/2026):** `test:sessao` rodado 3 vezes seguidas com a saída completa guardada: 195 de 195 nas três. A falha isolada da rodada de validação do commit `e949a68` não se repetiu em sete execuções; nenhum teste instável identificado.

**Etapa 2 (listas):** componente `ListaDoPainel` (`src/app/admin/_componentes/ListaDoPainel/`), usado em blog, artigos, profissionais (Ativos e Ocultos) e produtos (Na loja e Fora da loja). Filtro de situação com contagem (Todos é tudo fora da lixeira; Publicados; Rascunhos; Lixeira), em botões com `aria-pressed`; busca pelo título (e categoria, tipo ou local, conforme a lista) que também procura na lixeira: as contagens acompanham a busca e, fora do filtro Lixeira, um aviso diz quantos resultados estão lá, com o botão "Ver os resultados da lixeira"; ordenação por lista (data, título, categoria, ordem do site ou da loja); "Mostrar mais" de 20 em 20, com o foco na primeira linha nova; filtro, busca e ordem no endereço (recarregar mantém). Seleção de várias linhas (caixa por linha com área de 44 px e "Selecionar os N mostrados") com despublicar (ou desativar), mover para a lixeira e, no filtro Lixeira, restaurar, sempre com confirmação que lista os selecionados e resumo do resultado ("3 posts foram para a lixeira.", "1 já estava assim", e os que não puderam, com o motivo). Excluir de vez nunca é em lote. Ação `aplicarAcaoEmLote` (`acoes-lixeira.ts`), com a permissão de cada ação e até 100 itens; gravação item a item (`aplicarEmLote`, `lib/gravacao/lixeira.ts`), cada um com a própria linha no registro. A parte "Lixeira" separada, a busca antiga (`BuscaNaTabela`) e a `LinhaDoPainel` saíram. Tópicos e banners continuam no formato da etapa 1 (não são tabelas).

Conferido no navegador (build de produção local contra os emuladores, `demo-abte-e2e`, 45 posts fictícios), 88 de 88: em 390, 768, 1280 e 1710 px, contagens dos filtros, 20 linhas e o mais recente primeiro, "Mostrar mais" pelo teclado com o foco na 21ª linha, busca "arquivo" com as contagens e o aviso da lixeira, resultados dentro da lixeira, endereço e recarga mantendo filtro e busca, ordem de Z a A, filtro e seleção pelo teclado, áreas de 44 px, sem rolagem lateral e sem erros; profissionais, produtos e artigos com as contagens e a ordem do site ou da loja. Em 1280: confirmação do lote com os nomes e o foco dentro, Esc cancela, 3 posts para a lixeira (saem de `/blog`), despublicar misto ("1 post foi despublicado. 1 já estava assim."), restaurar os 8 da lixeira, lixeira vazia com orientação; editor desativando em lote. Capturas em `tmp-migracao/capturas/painel-2/`. Corrigido no caminho: a legenda da ordem ficava toda em minúsculas.

Testes: `test:unidade` 447 (resumo do lote, seleção e permissões da ação), `test:sessao` 197 (lote no emulador), `test:regras` 118. Lint e lint:css iguais à linha de base.

**Etapa 3 (navegação e diagramação), commits `d92e371` a `90dd8fb` e o desta correção:**
- **Contorno dos campos:** todo campo de texto, seleção e área de texto do painel tem borda de 1px em `--color-placeholder` também sem foco, inclusive nas janelas e na tela de entrar (`src/app/admin/painel.css`, ligado pelo marcador `.painel-raiz` no layout do `/admin`); o site público não muda.
- **Menu lateral agrupado:** Visão geral; Conteúdo (Home, Blog, Categorias e tags do blog, Artigos, Categorias e tags dos artigos, Páginas); Pessoas (Profissionais); Loja (Produtos, Categorias da loja); Mídia; Configurações. Ícones em SVG próprio (`IconesDoPainel.tsx`), subitens recuados e sem ícone, item atual destacado com `aria-current`; Páginas e Configurações só para o administrador.
- **Gaveta (até 1023px):** só tem `role="dialog"`, `aria-modal` e `aria-label` enquanto está aberta (antes ficavam na página o tempo todo, mesmo fechada).
- **Trilha e Voltar:** toda tela tem a trilha a partir da Visão geral e o link "Voltar para ..." (sempre o passo anterior).
- **Barra de salvar:** produtos e páginas institucionais passaram a ter "Salvar como rascunho" e "Salvar e publicar", com a situação atual escrita, como posts e artigos. Saíram a caixa "Publicado" do produto e o interruptor "Publicada" da página. Produto na lixeira tem o aviso com Restaurar, e publicar fica desligado e é recusado no servidor.
- **Visão geral:** atalhos para criar post, artigo, profissional (abre o cadastro, `?novo=1`) e produto; publicados, rascunhos e lixeira de cada área com links para a lista filtrada; imagens na lixeira; as 10 últimas alterações do registro (quando, área, resumo e nome de quem fez, sem e-mail nem valores, conferida a permissão `registro.ver`); atalhos das áreas.

Conferido no navegador (build de produção local contra os emuladores, `demo-abte-e2e`, dados fictícios), 36 de 36:
- **As 19 telas do painel, em 390, 768, 1280 e 1710 px:** status 200, um H1, sem rolagem lateral, trilha desde a Visão geral com "Voltar para", todos os campos visíveis com o contorno na cor do token e sem erros no console.
- **Menu:** grupos com títulos ligados às listas, 9 ícones, subitem atual destacado e nenhum id repetido.
- **Gaveta em 390:** fechada, sem role e sem nenhum diálogo na página; aberta, com o foco dentro e o Tab preso; Esc fecha e devolve o foco.
- **Visão geral:** seções, atalhos, contagens e links filtrados; últimas alterações em ordem; "Novo profissional" abre o cadastro com os campos contornados.
- **Barras de salvar:** no produto, "Salvar como rascunho" tira o produto da loja e "Salvar e publicar" o devolve; a barra fica presa ao pé; sair com alteração não salva faz o navegador perguntar antes. Na página institucional, publicar responde 200 e rascunho responde 404.
- **Editor:** o menu dele não tem Páginas nem Configurações, e ele vê as últimas alterações.
- **Tela de entrar:** campos com contorno.
- **Medição extra em 390 px nas 19 telas e na gaveta aberta:** nenhum controle abaixo de 44 px, exceto os campos de arquivo escondidos (1 px), acionados pelo botão visível de 44 px, como já registrado antes. A visão geral não mostra e-mail nem identificador.

Corrigido nesta conferência: os subitens do menu não ficavam recuados (a regra geral do link anulava o recuo) e faltava o espaço em "Rascunhos: 10" na visão geral.

Validação com a saída completa guardada: typecheck e build passam; lint 0 erros e 4 avisos; lint:css os 5 erros conhecidos (`Botao` e `Modal`); `test:unidade` 449, `test:sessao` 197, `test:regras` 118.

Não verificado: leitor de tela real; dados reais do `abte-dev`.

Pendências:
- O cadastro de profissional e o de banner abrem em janela e continuam com a caixa "Ativo", sem a barra fixa nem os dois botões, porque não são páginas de formulário.
- As janelas não têm o aviso de alterações não salvas.
- Há um espaço grande entre o cabeçalho e a primeira seção das telas de categorias e tags (de antes).
- Os campos de arquivo escondidos têm 1 px, com o botão visível de 44 px.

## Profissionais: filtro por estado e perfil sem Facebook (04/11/2026, só na branch, sem promover)

**O que mudou:**
- **Campos públicos** (`src/lib/profissionaisPublicos.ts`): passam a levar `pais` e `uf` (a UF só no Brasil; fora dele, vazia, nunca inventada) e não levam mais o `facebook`. A lista fechada e o teste foram atualizados. O Facebook saiu do card e do popup (`ContatosProfissional` mostra só WhatsApp, Instagram e e-mail, com o botão de WhatsApp igual); o dado continua no cadastro e no formulário do painel.
- **Nomes das UFs:** por extenso em `NOMES_DAS_UFS` (`src/config/profissionais.ts`), para os 27 códigos.
- **Regras do filtro** em `src/lib/filtroDeProfissionais.ts` (puras, testadas):
  - As opções nascem dos dados: "Todos os estados"; os estados com profissional em ordem alfabética pelo nome ("São Paulo (SP)"); depois os países de fora do Brasil com profissional.
  - O endereço vale `?uf=SP` ou `?pais=BO`, só se estiver entre as opções; com os dois, vale a UF; valor inválido cai em "Todos os estados".
  - O estado se combina com o tipo (`?tag=`). Profissional do Brasil sem UF só aparece em "Todos os estados".
- **Página** (`ProfissionaisClient.tsx`):
  - Select nativo "Estado", com rótulo ligado, abaixo dos botões de tipo.
  - Região `aria-live="polite"` com a quantidade; sem resultado, "Nenhum profissional encontrado com esses filtros." em caixa branca e o botão "Limpar filtros", que limpa tipo e estado e devolve o foco ao seletor.
  - Os botões de tipo ganharam `aria-pressed` (pendência antiga resolvida).

**Dados atuais do `abte-dev`** (só leitura, contagem sem nomes): 104 profissionais ativos fora da lixeira. Opções: 17 estados (AL 4, AM 1, CE 4, DF 3, GO 2, MT 3, MS 4, MG 12, PB 1, PR 1, PE 6, PI 4, RJ 4, RS 1, SC 6, SP 38, SE 5), Bolívia 2 e Paraguai 1; 2 do Brasil sem UF, que só aparecem em "Todos os estados". A soma dá 104.

**Conferido no navegador** (build local contra os emuladores, dados fictícios com um Facebook cadastrado), 66 de 66:
- O HTML e os dados da página não têm o Facebook.
- Em 390, 768, 1280 e 1710 px: um H1, sem rolagem lateral, opções nascidas dos dados, rótulo ligado e quantidade anunciada, card sem Facebook e com os outros contatos.
- Tab chega ao seletor; SP pelo endereço; combinação com Médicos; sem resultado com a caixa branca; "Limpar filtros" pelo teclado volta tudo e foca o seletor; Bolívia pelo endereço; valor inválido cai em todos; popup sem Facebook; controles com 44 px em 390; sem erros no console.
- Capturas em `tmp-migracao/capturas/filtro-estado/`.

Não verificado: escolher o estado só pelo teclado em 768, 1280 e 1710 px. Nessas larguras a seta abre a lista nativa do navegador, que o roteiro automático não opera; a escolha foi feita pelo valor. Em 390 px, a seta escolheu Alagoas direto.

Validação com a saída completa guardada: typecheck e build passam; lint 0 erros e 4 avisos; lint:css os 5 erros conhecidos; `test:unidade` 458 (9 novos), `test:sessao` 197, `test:regras` 118.

## Home: "Juntos transformamos" centralizada até 1023px (06/11/2026, só na branch, sem push)

**Exceção de design consciente**, no mesmo espírito da centralização do banner até 1023px. Escopo exato: só a seção `#o-que-fazemos` da home, só até 1023px e só o alinhamento. Título e parágrafo da seção ficam centralizados (`.centralizadoAteOTablet` em `src/app/page.module.css`); nos dois `CardPublico`, a prop nova `centralizarAteOTablet` liga a classe `.centralizado` (`CardPublico.module.css`), que centraliza ícone, título, texto e botão em coluna, com o botão na largura do texto. Cores, tipografia, textos, ordem dos elementos, colunas e espaçamentos não mudaram. A página `/componentes` continua com o card como antes.

**Onde a seção muda de colunas:** a 768px (título e parágrafo lado a lado e os dois cards lado a lado de 768px em diante). Então de 768 a 1023px o alinhamento é centralizado dentro de cada coluna; até 767px, tudo empilhado e centralizado.

**Conferido** (build de produção local lendo o `abte-dev`, Chrome headless, movimento reduzido) em 360, 390, 768, 1023, 1024 e 1280 px: até 1023px, título, parágrafo e cards com `text-align: center` e ícone, título, texto e botão a 0px do centro do card; cards com a mesma largura (328, 358, 356 e 480,4 px), 24px entre eles e a 16px (19,1px em 1023) da borda; botão com 56px de altura; sem rolagem lateral; status 200 e 0 erros de console. De 1024px em diante, a captura da seção é idêntica pixel a pixel à de antes (0 bytes diferentes em 1024 e 1280). Validação: typecheck e build passam; lint 0 erros e 4 avisos; lint:css os 5 erros conhecidos; `test:unidade` 458, `test:sessao` 197, `test:regras` 118.

**Observações de antes, sem mudança:** (1) o texto do card "Para pacientes e famílias" usa `tipo-texto-lg` sobre `--color-surface-strong` (#76ACF5) e fica com 18px a 22px até 1280px, abaixo dos 24px da regra do #76ACF5; o título do card (`tipo-texto-xl`, mínimo 24px) e o botão (sobre `--color-primary`) estão dentro da regra; nada foi alterado, por ser mudança de tipografia. (2) Em 360 e 768px os dois cards têm alturas diferentes (495/444 e 515/460), igual antes da mudança, porque o card não ocupa a altura do invólucro de entrada.

**Levantamento para decisão (não alterado):** seções públicas com texto ou botão à esquerda até 1023px (medido em 390 e 768 px), candidatas ao mesmo tratamento:

| Página | Seção | O que fica à esquerda | Arquivo |
|---|---|---|---|
| Home | Mutirões que Transformam Vidas | Título e os 4 cards de números (número e legenda) | `src/app/page.tsx`, `src/app/page.module.css` (`.colunaCentralizada`), `src/components/Estatisticas/Estatisticas.module.css` |
| Home | Quem Somos | Missão, Visão e Valores (título e texto de cada bloco) | `src/app/page.module.css` (`.cardValor`) |
| Home | Faça parte dessa rede | Título, texto e o botão "Quero me associar" na caixa sobre a imagem | `src/app/page.module.css` (`.caixaFlutuanteConteudo`, `.botoesDaChamada`) |
| Home e loja | Produtos em destaque, grade da loja e relacionados | Conteúdo do card de produto (título, preço, "Esgotado") | `src/components/CardProduto/CardProduto.module.css` |
| Profissionais | Grade de cards | Nome, registro, local, etiquetas, apresentação e "Ver mais" | `src/components/CardProfissional/CardProfissional.module.css` |
| Blog | Grade de posts | Título, data e "Ler mais" do card | `src/components/CardPost/CardPost.module.css` |
| Post | Cabeçalho | Link "Voltar", H1 e linha de dados (o corpo do texto deve continuar à esquerda, por ser leitura longa) | `src/app/blog/[slug]/page.module.css` |
| Artigos | Tópicos e lista | Botões dos cards de categoria e conteúdo dos cards de artigo | `src/components/CardCategoriaArtigo/CardCategoriaArtigo.module.css`, `src/components/CardArtigo/CardArtigo.module.css` |
| Loja | Acima da grade | "N produtos", ordem e etiquetas dos filtros | `src/app/loja/_componentes/FiltroDaLoja/FiltroDaLoja.module.css` |
| Produto | Ficha e relacionados | H1, preço, descrição, botão do carrinho e o título "Produtos relacionados" | `src/app/loja/produto/[slug]/page.module.css` |
| Diretoria | Períodos | Título do período e nome e cargo nos cards | `src/app/diretoria/page.module.css`, `src/components/CardMembroDiretoria/CardMembroDiretoria.module.css` |
| Entrar e Criar conta (loja) | Cabeçalho | H1 e texto de abertura (os campos do formulário devem continuar à esquerda) | `src/app/loja/entrar/page.tsx`, `src/app/loja/cadastro/page.tsx` |
| Página não encontrada | Conteúdo | H1 e botão de voltar | `src/app/not-found.tsx` |

Ficam de fora por não terem nada à esquerda: `/doe` e `/seja-associado`. Não são candidatos: formulários (contato, entrar, cadastro), cujos rótulos e campos ficam melhores à esquerda, e o corpo dos posts. Os filtros de categoria do blog já são centralizados (falso positivo da medição automática).

## Home: "Mutirões que Transformam Vidas" centralizada até 1023px (06/11/2026, só na branch, sem push)

Mesma exceção de design e mesmo padrão da seção "Juntos transformamos" (registro anterior), agora valendo para as duas seções: `#o-que-fazemos` e `#mutiroes`, só até 1023px e só o alinhamento. O título usa a mesma classe `.centralizadoAteOTablet` (`src/app/page.module.css`); o componente `Estatisticas` ganhou a prop `centralizarAteOTablet`, que liga `.centralizado` e centraliza número e legenda em cada card (`Estatisticas.module.css`). A distribuição vertical (número no alto, legenda embaixo), a grade 2x2, as cores em xadrez, os tamanhos, os espaçamentos, os números e a ordem não mudaram. A página `/componentes` continua como antes. A seção passa a duas colunas (números e imagem) a 768px, então de 768 a 1023px os números ficam centralizados dentro da coluna deles.

**Conferido** (build de produção local lendo o `abte-dev`, Chrome headless, movimento reduzido) em 360, 390, 768, 1023, 1024 e 1280 px: até 1023px, título e o texto de cada número e legenda a 0px do centro; grade com 2 colunas e 16px; cards com 192 a 194px de altura, número a 20px do topo e legenda a 20px da base, como antes; legendas de 1 a 3 linhas dentro do card; sem rolagem lateral; status 200 e 0 erros de console. De 1024px em diante, a captura da seção é idêntica pixel a pixel à de antes. Até 1023px, fora da coluna dos números, as únicas diferenças de pixels estão na foto ao lado (ruído de decodificação na captura; a foto é a mesma). Validação: typecheck e build passam; lint 0 erros e 4 avisos; lint:css os 5 erros conhecidos; `test:unidade` 458, `test:sessao` 197, `test:regras` 118.

**Observações de antes, sem mudança:** (1) as legendas usam `tipo-texto` (16px a cerca de 19px até 1280px) também nos cards em `--color-surface-strong` (#76ACF5), o 1º e o 4º, abaixo dos 24px da regra do #76ACF5; o comentário do componente diz "Legendas com 24px fixos", mas o código não aplica. O número (40px ou mais) está dentro da regra. Nada foi alterado, por ser mudança de tipografia. (2) Os números +45, 500, 69 e 23 estão escritos no código (`src/app/page.tsx`, linhas 161 a 164, desde 27/09/2026), não vêm de dado cadastrado nem do painel; números oficiais continuam decisão em aberto da ABTE. O comentário do `Estatisticas` pede "00" até a confirmação, o que o código também não segue.

O levantamento das outras seções com texto ou botão à esquerda até 1023px está no registro anterior; esta seção sai da lista.
