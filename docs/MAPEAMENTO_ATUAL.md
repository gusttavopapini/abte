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

## Home: centralização total de cinco blocos (06/11/2026, só na branch, sem push)

**Exceção única e consciente** à regra "mesmo design em todas as telas": centralização total (todas as larguras) dos blocos 1 a 5 abaixo, pedida por Gustavo em 06/11/2026; pendente de confirmação da Bianca (designer). **Supera os dois registros anteriores deste dia** (centralização só até 1023px de "Juntos transformamos", `8c3cf17`, e de "Mutirões que Transformam Vidas", `67ea66e`): as media queries e as props `centralizarAteOTablet` saíram. O histórico do banner (afastamento de 10% e pilha até 1023px, 31/10/2026) continua valendo.

| Bloco | O que fica centralizado |
|---|---|
| 1. `#o-que-fazemos` | Título e parágrafo, cada um na sua coluna a partir de 768px (sem empilhar) |
| 2. Dois `CardPublico` | Ícone, título, texto e botão; botão na largura do texto (também em `/componentes`) |
| 3. `#mutiroes` | Título da seção; número e rótulo em cada card de `Estatisticas`, com o número no alto e o rótulo embaixo (também em `/componentes`) |
| 4. Quem Somos | Ícone e título de Missão, Visão e Valores (na mesma linha, como antes) e o texto |
| 5. "Faça parte dessa rede" | Título, texto e botão dentro da caixa; a caixa continua no mesmo lugar sobre a foto |

Só alinhamento: cores, tipografia, textos, números, ordem, colunas e grades não mudaram. Parágrafos centralizados com `max-width: calc(var(--content-max) / 2)` e `margin-inline: auto` (não há token em `ch`; é a medida do `CabecalhoDePagina`). **Arquivos:** `src/app/page.tsx`, `src/app/page.module.css`, `src/components/CardPublico/CardPublico.tsx` e `CardPublico.module.css`, `src/components/Estatisticas/Estatisticas.tsx` e `Estatisticas.module.css`.

**Conferido** (build de produção local lendo o `abte-dev`, Chrome headless, movimento reduzido) em 360, 390, 768, 1023, 1024, 1280 e 1710 px: 0 elementos fora do centro nos cinco blocos (texto, ícones e botões a no máximo 1px do centro do card ou da coluna; antes, 8 a 28 por largura); ordem dos elementos igual à de antes nas 7 larguras; nenhum texto cortado; botões com o mesmo tamanho de antes (56px de altura); sem rolagem lateral; status 200 e 0 erros de console. A única mudança de quebra de linha: o texto de Missão em 1710px passou de 2 para 3 linhas, por causa do limite de largura do parágrafo. `/componentes` também conferida (cards de público centralizados, sem rolagem). Validação: typecheck e build passam; lint 0 erros e 4 avisos; lint:css os 5 erros conhecidos; `test:unidade` 458, `test:sessao` 197, `test:regras` 118. Capturas fora do Git.

**Observações visuais, sem mudança:** a partir de 1024px, os cards de Missão, Visão e Valores ficam largos (até 1262px em 1710) com o texto curto no meio e bastante espaço dos lados; em `#o-que-fazemos`, título e parágrafo ficam centralizados em colunas separadas, alinhados pelo topo.

**Levantamento (não alterado):**
- **Parágrafos centralizados com mais de 5 linhas (todo o site):** só na home, no celular e no tablet: texto do card "Para pacientes e famílias" (7 linhas em 360 e 768px), texto de Missão (8 linhas em 360 e 7 em 390) e texto de "Faça parte dessa rede" (7 em 360 e 6 em 390). Nenhum nas outras páginas.
- **Texto menor que 24px sobre #76ACF5:** texto do card "Para pacientes e famílias" (18px a 22px até 1280px; chega a 24px perto de 1710) e rótulos dos cards de estatística azuis, o 1º e o 4º (16px a 20px em todas as larguras). Os números (40px ou mais), o título do card (24px ou mais) e o botão (sobre `--color-primary`) estão dentro da regra.
- **Seções que ainda ficam à esquerda** (medido em 390 e 1280 px; substitui a tabela do primeiro registro de hoje):

| Página | Seção | O que fica à esquerda | Arquivo |
|---|---|---|---|
| Home, `/loja` e produto | Produtos em destaque, grade da loja e relacionados | Título, preço e "Esgotado" do card de produto | `src/components/CardProduto/CardProduto.module.css` |
| `/profissionais` | Grade de cards | Nome, registro, local, etiquetas, apresentação e "Ver mais"; rótulo "Estado" do filtro | `src/components/CardProfissional/CardProfissional.module.css`, `src/app/profissionais/` |
| `/blog` | Grade de posts | Título, data e botão do card | `src/components/CardPost/CardPost.module.css` |
| Post | Cabeçalho | "Voltar", H1 e linha de dados | `src/app/blog/[slug]/page.module.css` |
| `/artigos` (desligado na produção) | Tópicos e lista | Botão do card de categoria e conteúdo do card de artigo | `src/components/CardCategoriaArtigo/CardCategoriaArtigo.module.css`, `src/components/CardArtigo/CardArtigo.module.css` |
| `/loja` | Acima da grade | "N produtos", ordem e etiquetas dos filtros | `src/app/loja/_componentes/FiltroDaLoja/FiltroDaLoja.module.css` |
| Produto | Ficha e relacionados | H1, preço, descrição, botão do carrinho e o título "Produtos relacionados" | `src/app/loja/produto/[slug]/page.module.css` |
| `/diretoria` | Períodos | Título do período e nome e cargo nos cards | `src/app/diretoria/page.module.css`, `src/components/CardMembroDiretoria/CardMembroDiretoria.module.css` |
| Entrar e Criar conta (loja) | Abertura | H1 e texto de abertura | `src/app/loja/entrar/page.tsx`, `src/app/loja/cadastro/page.tsx` |
| Página não encontrada | Conteúdo | H1 e botão | `src/app/not-found.tsx` |

Não entram na lista, com recomendação de manter à esquerda: o corpo dos posts (leitura longa) e os formulários (contato, entrar, cadastro). Também fica de fora o texto do banner a partir de 1024px, cuja posição é escolhida por slide no painel. `/doe`, `/seja-associado` e os filtros de categoria do blog já são centralizados.

## Ajustes de 06/11/2026 (partes A, B, C e F; só na branch, sem push)

**A. Ortesistas e psicólogos como parceiros** (áudio da Patrícia, 31/10/2026: pelo estatuto, membros da ABTE são só médicos e fisioterapeutas). `ROTULOS_DOS_TIPOS` e `rotuloDoTipo` em `src/config/profissionais.ts`: "Ortesistas parceiros" e "Psicólogos parceiros"; Fisioterapeutas, Médicos e Outros iguais ("Outros" é decisão em aberto). Usado no submenu de Profissionais (`src/config/navegacao.ts`, desktop e tela cheia), nos botões do filtro de `/profissionais` e no texto das opções do tipo no formulário do painel (o `value` continua o tipo). `TAGS_DE_PROFISSIONAIS`, `profissional.tipo`, `?tag=`, endereços, importadores e dados não mudaram. Nenhum texto fixo do site trata ortesistas ou psicólogos como membros ou associados (busca em `src`; os textos com "membros" e "associados" são "Fisioterapeutas membros" e "Médicos associados", nos números da home). Fora do pedido, sem mudança: a coluna "Tipo" da lista de profissionais do painel mostra o valor gravado ("Ortesistas"). Teste novo: `testes/unidade/rotulos-dos-tipos.test.mts` (5).

**B. Novo texto da Missão** (Patrícia, 31/10/2026): "Reunir fisioterapeutas, médicos, ortesistas, psicólogos e demais profissionais engajados no Tratamento Conservador da Escoliose Baseado em Evidências, para trocar informações, criar ações de conscientização e promover tratamentos de qualidade em todo o território nacional." O texto só existia num lugar do código (`VALORES` em `src/app/page.tsx`, card Missão de Quem Somos); não há página "Sobre" nem metadados com a Missão. Leitura (sem gravar) do `abte-dev` em 06/11/2026: o texto antigo não aparece em `posts` (71), `artigos` (5), `paginasInstitucionais` (0), `configuracoes` (2), `profissionais` (104), `diretoria` (7) nem `produtos` (10).

**C. Espaço entre título e texto em "Juntos transformamos"** (`#o-que-fazemos`). Medido antes: com título e texto empilhados (até 767px), 96px entre eles (o `gap` de `--space-64` da `.gradeLadoALado` mais a margem de `--space-32` do título); nas outras seções da home, título e texto ficam a 16px ("Produtos em destaque" e "Faça parte dessa rede", pela `.tituloCompacto`). Agora, até 767px, `row-gap: var(--space-16)` e o título sem margem embaixo, só nesta seção: 16px. A partir de 768px (título e texto lado a lado) nada muda: 64px entre as colunas e 64px até os cards; a centralização de `1688cbb` continua.

**F. Página não encontrada e Diretoria centralizadas, em todas as larguras** (mesma exceção do registro "centralização total de cinco blocos", ampliada; também no `CLAUDE.md`, tabela E). Página não encontrada (`src/app/not-found.module.css`): título e o botão "Voltar para o início" centralizados (a página não tem parágrafo; nenhum texto foi criado). Diretoria: título de cada período (`src/app/diretoria/page.module.css`) e, em cada card, nome e cargo (`CardMembroDiretoria.module.css`); a foto já ocupa a largura do card. Ordem, cores, tamanhos, colunas (1, 2 e 4) e textos sem mudança; a última linha incompleta da grade continua começando à esquerda. Continuam à esquerda: cards de profissionais, produtos e posts, ficha do produto, filtro da loja e formulários.

**Conferência de A, B, C e F** (build de produção local lendo o `abte-dev`, Chrome headless, movimento reduzido) em 360, 390, 768, 1023, 1024, 1280 e 1710 px:
- Submenu de Profissionais (desktop e tela cheia): "Fisioterapeutas", "Médicos", "Ortesistas parceiros", "Psicólogos parceiros" e "Outros", com os mesmos endereços (`?tag=Ortesistas`, `?tag=Psicólogos`); cada item numa linha, dentro da tela, com 44px de altura. Filtro de `/profissionais` com os mesmos rótulos, `?tag=Ortesistas` marcado e filtrando, nenhum botão cortado, 44px até 767px.
- Missão nova na home nas 7 larguras.
- "Juntos transformamos": título e texto a 16px até 767px (antes 96px; a seção ficou 80px mais baixa); a partir de 768px, 64px entre as colunas, 64px até os cards e a mesma altura da seção de antes; centralização mantida.
- Página não encontrada e Diretoria: título, botão, períodos, nomes e cargos a 0px do centro; ordem, largura e altura dos cards iguais às de antes.
- Sem rolagem lateral e 0 erros de console, exceto o aviso do próprio navegador de que a página não encontrada responde 404 (esperado, igual a antes).

Validação: typecheck e build passam; lint 0 erros e 4 avisos; lint:css os 5 erros conhecidos (`Botao` e `Modal`); `test:unidade` 463 (5 novos), `test:sessao` 197, `test:regras` 118.

## Lista da ABTE, partes G, H, I e L e levantamentos D, E, J e K (06/11/2026, só na branch, sem push)

**G. Instagram de uma profissional (dado no `abte-dev`, a única gravação autorizada).** Perfil pedido no item 4 do PDF (documento `fI3ZEsDk1XooXCj35bSq`): só o Instagram trocado pelo perfil novo informado pela ABTE, pelo mesmo caminho do painel (`validarProfissional` e `gravarProfissional`), com simulação antes e a garantia de que só o Instagram mudaria. Registro em `logAlteracoes`: ação "editar", campos `["instagram"]`, resumo "Instagram atualizado a pedido da ABTE.", autor "Ajuste por script a pedido da ABTE (06/11/2026)", papel "sistema". `/profissionais` (dinâmica) já mostra o novo. Busca só para relatar: o perfil antigo não aparece em `paginasInstitucionais`, `posts`, `artigos`, `diretoria`, `configuracoes`, `produtos`, categorias nem `midias`, nem no código; continua só no domínio do e-mail da própria profissional (não alterado) e nos arquivos privados do site antigo. Script local: `tmp-migracao/instagram-patricia.mts` (fora do Git).

**H. Banners da home (`c44c0d5`).** Roteiro `tmp-migracao/auditoria/banners.mjs` no build local lendo o `abte-dev` (2 banners com título e as três versões), em 360, 390, 768, 1023, 1024, 1280 e 1710 px e com movimento reduzido em 390 e 1280:
- Funcionava e continua: setas e pontos pelo mouse, Enter e espaço na seta (o foco fica na seta), toque nas setas até 1023px, troca automática a cada 6 s, pausa com o mouse em cima e com o foco do teclado, nenhuma troca e nenhuma transição com movimento reduzido, mesma altura do banner em todos os slides (a da janela), imagem com `object-fit: cover` (sem distorção), sem rolagem lateral, 0 erros de console e de janela (sem laço do ResizeObserver). O "título cortado" que a medida apontou de 1023px em diante era falso positivo: só o desenho das letras passa 2 a 4 px da caixa, sem esconder nada.
- **Corrigido, pulo de layout:** a partir de 1024px o texto descia 26px uns 300 ms depois de carregar, porque o espaço reservado para o header até o JavaScript publicar a altura real era `--space-96` (96px) e o header tem 148px. A reserva passou à mesma conta do header (padding da `.barra` e logo de 100px). CLS medido no carregamento: 0,0154 (1024), 0,0126 (1280) e 0,0085 (1710) para 0.
- **Corrigido, acessibilidade:** o ponto do slide à vista ganhou `aria-current="true"` (antes nenhum ponto dizia qual era o atual).
- **Só relatado (decisão de design):** não há botão de pausa visível (pendência antiga); de 768 a 1023px os pontos têm 12px (a regra de 44px vale até 767px); no tablet e no celular, a área da imagem muda de altura entre os slides conforme o tamanho do texto (até 50px), porque a imagem ocupa o que sobra do painel branco, como desenhado; o primeiro banner do `abte-dev` tem o texto alternativo "banner" (dado do painel).

**I. Movimento e interações (`2f9d6a8`).** Inventário das animações públicas:

| Onde | O que anima | Duração e curva (antes) | Agora |
|---|---|---|---|
| Entrada ao rolar (`Revelar`) | opacidade e transform, uma vez por elemento, IntersectionObserver | 600 ms, cascata de 120 ms | sem mudança (já correto) |
| Header | transform (esconder) e cor de fundo | 300 ms ease-in-out; rolagem ouvida uma vez por quadro, passiva (precisa da direção) | sem mudança |
| Banner | opacidade entre slides; fundo das setas e pontos | 0,5 s; 0,3 s | 0,5 s; setas e pontos na constante |
| Cards de post, produto, artigo, categoria de artigo, público, estatística e Missão/Visão/Valores | transform e sombra no hover | 0,4 s cubic-bezier | constante; só com mouse; foco de teclado igual ao hover nos cards com link |
| Card do profissional | borda, sombra, transform | 180 ms ease | constante; pressionado desce para -2px |
| Botão (`Botao`) | cor e fundo | 150 ms ease-out | constante, mais pressionado (desce 1px) |
| Links (`.realce`, texto corrido, setas), menu, rodapé, contatos, filtros e menu da loja, vídeo | cor, fundo, transform | 150 a 200 ms, ease-out ou ease | constante |
| Filtro de tipo de `/profissionais` | `transition: all` | 0,2 s | só cor e fundo, na constante |
| Menu de desktop, menu em tela cheia, modal, menu da loja, painel e grupos do filtro da loja, cascata da grade da loja | entradas e saídas | 200 a 450 ms | sem mudança (movimentos maiores, com valores próprios) |

- **Constante única:** o `tokens.css` não tem token de movimento, então ficaram `--interacao-duracao: 200ms` e `--interacao-curva: cubic-bezier(0.25, 0.1, 0.25, 1)` em `:root` no `globals.css` (`--realce-duracao` aponta para a primeira). PROPOSTA pendente da designer.
- **Corrigido:** a elevação dos cards ficava presa depois de um toque no celular (agora só com `hover: hover` e `pointer: fine`; conferido com toque emulado: o card não levanta).
- Nada usa `will-change`; a sombra dos cards continua animando junto com o transform (com `overflow: hidden` no card, uma sombra em pseudo-elemento seria cortada), o que o Lighthouse não aponta como animação não composta.
- Mantidos, com o motivo: o filtro da loja anima `grid-template-rows` (abrir e fechar grupos) e o `top` da barra que acompanha o header; trocar por transform mudaria o comportamento.
- **Conferido** (roteiro `tmp-migracao/auditoria/movimento.mjs`) em 360, 390, 768, 1023, 1024, 1280 e 1710 px, nas páginas inicial, `/profissionais`, `/blog`, `/loja`, `/diretoria`, `/contato` e `/artigos` (404 no `abte-dev`, esperado): status, um H1, sem rolagem lateral, blocos revelados ao rolar, nenhum `transition: all`, nenhum `will-change`, 0 erros de console; card levanta com mouse e com foco de teclado, 200 ms na curva única; botão pressionado desce 1px; com movimento reduzido, 0 elementos com transição ou animação e nada escondido. 393 de 395 (as 2 "falhas" eram do roteiro: em 360 e 390 o headless usa mouse de verdade, e o card levanta como deve).
- **Lighthouse da home, celular** (build local lendo o `abte-dev`, 3 rodadas): antes, desempenho 88, 92 e 92 e CLS 0,000; depois, 88, 87 e 90 e CLS 0,000, sem animação não composta. A diferença está dentro da variação: o LCP (3,3 a 4,0 s) é o download da imagem do banner direto do Storage, sem CDN (pendência da etapa 9). No computador, depois: desempenho 90 e CLS 0,000; o ganho de CLS (0,013 para 0) é o da parte H.

**L. Painel (`c28f232`).**
- Componente novo `JanelaDeFormulario` (`src/app/admin/_componentes/`): com alteração não salva, fechar pelo "x", Esc, clique fora ou Cancelar abre "Descartar as alterações?" no próprio painel ("Continuar editando" ou "Descartar e fechar"), sem alerta do navegador; fechar a aba continua com o aviso do navegador, como nas páginas de formulário. A alteração é percebida pelos campos (input e change) e pelo que não passa por campo (foto escolhida, Subir e Descer). Usado no cadastro de profissional, no banner e nas imagens das seções da home.
- Cadastro de profissional e banner: a caixa "Mostrar no site"/"Ativo" deu lugar à `BarraDeSalvar` com Cancelar, "Salvar como oculto" (profissional) ou "Salvar como inativo" (banner) e "Salvar e ativar", mais a linha "Situação atual". O botão usado manda ou não `ativo=sim`, o mesmo campo de antes; ações de servidor, permissões, `logAlteracoes` e regras sem mudança.
- Topo das telas: medido em 13 telas e 7 larguras, o primeiro bloco fica a 24px do cabeçalho nas listas, nos formulários e nas categorias da loja, e estava a 88px nas categorias e tags do blog e dos artigos (o `gap` de 64px entre as seções somado aos 24px do cabeçalho). Agora 24px; as duas seções continuam a 64px uma da outra. Ficam como estão (seções próprias): visão geral 56px, home, mídia e páginas 48px. A distância maior do topo em 390px nas telas de tópicos, profissionais e configurações é o "Voltar" que quebra para cima da trilha longa, não espaço vazio.
- **Conferido** nos emuladores (`demo-abte-e2e`, dados fictícios; roteiros `tmp-migracao/painel/janelas-l.mjs` e `topo-l3.mjs`) em 360, 390, 768, 1023, 1024, 1280 e 1710 px: 175 de 175 nas janelas (barra com os três botões presa ao pé da janela, 44px até 767px, nada fora da tela; sem alteração o Esc fecha direto; com alteração, Esc, "x", clique fora e Cancelar pedem confirmação, o foco entra na confirmação, Esc nela volta à edição com o texto mantido, "Descartar e fechar" fecha tudo; no banner, Descer conta como alteração) e 9 de 9 na gravação ("Salvar como oculto" grava `ativo=false`, "Salvar e ativar" grava `true` com o registro `["ativo"]`; o mesmo nos banners). Telas de tópicos com 24px em todas as larguras, 0 erros de console.

**Validação** (saída completa guardada fora do Git): typecheck e build passam; lint 0 erros e 4 avisos (os 12 erros que apareceram vinham de três scripts locais de levantamento de hoje em `tmp-migracao/`, marcados como scripts locais); lint:css os 5 erros conhecidos (`Botao` e `Modal`); `test:unidade` 463, `test:sessao` 197, `test:regras` 118.

### Levantamentos (nada executado nem publicado)

**D. Telefone, WhatsApp e dados do site antigo** (só leitura; detalhe em `tmp-migracao/levantamento-contatos-2026-11-06.json`, script `levantar-contatos-d.mts`). Os 96 do `profissionais.json` têm documento no `abte-dev` pela `origem.chave`, nenhum na lixeira. Comparado com o que a migração gravou (`converterProfissional`):
- WhatsApp: 63 iguais à importação, 32 vazios (o site antigo não tinha), 1 vazio porque o número não passou na validação (posição no arquivo privado).
- Instagram: 91 iguais, 4 vazios, 1 editado depois (parte G).
- E-mail: 67 iguais, 29 vazios. Cidades: 92 iguais, 4 vazias.
- Registro: 73 iguais, 19 sem registro no site antigo, 4 vazios de propósito (conselho deduzido ou ausente).
- Editados à mão no painel depois da importação: nenhum. A única edição é a do script da parte G.
- WhatsApp só em `whatsappLink`: 17, todos links encurtados com apelido (whats.link), sem número: nenhum pode ser importado sem inventar (todos com o WhatsApp vazio hoje; nomes só no levantamento privado em `tmp-migracao/`).
- Telefones no site antigo: 6 cadastros (4 profissionais e 2 empresas de órteses), 10 números (6 fixos e 4 celulares), nenhum igual ao WhatsApp de hoje.
- Lote 1: um cadastro tem número fixo no campo WhatsApp.

**Plano da D (não executado):** (a) WhatsApp pelo `whatsappLink`: hoje não há nenhum link com número; os 17 encurtados ficam numa lista para a ABTE pedir o número a cada profissional (abrir os links resolveria o número no site do encurtador, o que só deve ser feito com autorização); (b) campo opcional `telefone` em `DadosDoProfissional` (texto, validado como telefone brasileiro com DDD ou internacional com +, padronizado só com dígitos como o WhatsApp), campo "Telefone, com DDD" no formulário do painel, `telefone` na lista fechada `CAMPOS_PUBLICOS_DO_PROFISSIONAL` e no teste dela, `ContatosProfissional` com link `tel:` e rótulo "Telefone" (44px até 767px, mesmo estilo dos outros contatos), "pelo menos um contato" passando a aceitar telefone; (c) importador `scripts/importar-telefones.mts` no padrão dos anteriores (simula por padrão; `--executar --confirmo-projeto=abte-dev`; `--desfazer --execucao=ID`; idempotente pela `origem.chave` e pela execução; nunca sobrescreve campo preenchido; uma linha em `logAlteracoes` por documento, com origem e execução); (d) testes de unidade (validação, campos públicos, conversão) e de sessão no emulador (simular, executar, repetir sem mudança, desfazer, não sobrescrever); (e) opção, sem executar: mover o fixo do cadastro do lote 1 do WhatsApp para `telefone` (hoje o botão de WhatsApp leva a um número fixo). **Decisão em aberto:** um telefone por profissional ou vários (6 cadastros têm 2 números); qual entra quando há fixo e celular.

**E. Imagens públicas que não são foto real da ABTE** (só leitura; olhadas uma a uma).

| Página e seção | Componente | Mídia ou caminho | Tamanho atual | Proporção pedida | Observação |
|---|---|---|---|---|---|
| Home, banner 1 (computador) | `Hero` / `ConteudoDoSlide` | `00KlTLTRLEoKrzZGZBVa` | 2560 x 1431 (1,79) | 16:9, 1920 x 1080 | parece imagem de banco ou gerada (médica lendo exame) |
| Home, banner 1 (tablet) | idem | `1tkTICjE8Dcg0Cpojgap` | 1485 x 1980 (3:4, em pé) | 4:3 deitada, 1536 x 1152 | a mesma cena; proporção diferente da recomendada |
| Home, banner 1 (celular) | idem | `mubBQAhj0cEB8TksfAU1` | 1440 x 2560 (9:16) | 4:5, 1080 x 1350 | a mesma cena; recortada no celular |
| Home, banner 2 (computador, tablet e celular) | idem | `zDQPtJzkr9GsCdvEsbr8`, `YLKypVwofkSuuQSSRJnP`, `boQ4RfmUEmGWgZPrRqax` | 2560 x 1431, 1485 x 1980 e 1440 x 2560 | 16:9, 4:3 e 4:5 | parece imagem de banco ou gerada (três profissionais com tablet e coluna) |
| Home, "Faça parte dessa rede" | `src/app/page.tsx` (`secao-faca-parte`) | `JbfPMi2stheuExZBkWg0` | 2560 x 1024 (2,5) | 2:1, 2400 x 1200; celular 3:5, 960 x 1600 (não enviada) | foto de palestra que parece de banco |
| Home, carrossel padrão | `src/lib/site/banners.ts` | picsum.photos | 1920 x 800 | 16:9 | só aparece sem banner ativo no painel |
| Home, "Mutirões" e "Faça parte" sem imagem | `PlaceholderImagem` | bloco "IMAGEM" | | | só aparece sem imagem no painel |
| Cards sem imagem (post, produto, artigo, categoria, diretoria) | `PlaceholderImagem` | bloco "IMAGEM" | | 16:9, 3:4 ou 1:1 | hoje: 1 produto de teste sem imagem e 1 post sem capa (a original era GIF) |
| `/componentes` (interna, noindex) | página de revisão | picsum.photos | | | exemplo |

Parecem reais e ficam fora da lista: "Mutirões" (`1xL6A7PAIloNZDmSR9c6`, 1200 x 1600, 3:4 em pé, enquanto a recomendação é 5:4 deitada, 1500 x 1200, e celular 5:7; a pessoa aparece de costas e sem camisa, o que pede conferir a autorização) e a capa do vídeo (`R8dlySeke9fWnYVOqfaq`, 1064 x 1912, 9:16, camiseta da ABTE). Fotos de profissionais, produtos, posts e diretoria vêm do site antigo ou do cadastro e não foram tratadas como fictícias.

**J. Vídeo institucional.**
- Hoje: `configuracoes/home.videoQuemSomos` é um arquivo do Storage (`publico/videos/dnFfRkulJsyF9Yq4Vimq/video.mp4`, MP4, 367,5 MB, 4min16s, 1080 x 1920, gravado em 31/10/2026), descrição "Conheça a ABTE", **sem legenda** (`legendaCaminho` vazio e nenhuma faixa embutida). A orientação do painel recomenda até 2 minutos.
- Site antigo: `mapa-site-antigo.jsonl` e as páginas coletadas não registram nenhum vídeo; a página inicial (onde ficava o vídeo) não foi coletada, então não dá para afirmar pelos dados locais se o vídeo da Danúbia com a Bruna no início existia lá nem se o atual está cortado.
- **Quem aparece:** quadros conferidos em 0,5, 4, 10, 20, 30, 60, 120 e 250 s mostram pelo menos 5 pessoas diferentes, cada uma sozinha na tela com o logo da ABTE na roupa, e o logo animado no fim; nos primeiros 10 s aparece uma só pessoa, sem cena de duas pessoas juntas. A fala começa no segundo 0 ("Tratar a escoliose exige..."), sem apresentação: isso sugere, sem provar, que o início pode ter sido cortado. Não houve identificação por rosto: quem é a Danúbia e quem é a Bruna, e se a cena das duas existe em outra versão, a ABTE precisa confirmar.
- **Legenda em rascunho (NÃO publicada):** `docs/dados-privados/video/legenda-ptbr.vtt` (fora do Git), WebVTT pt-BR com 54 blocos de até 2 linhas (cerca de 42 caracteres; uma linha com 44), 582 palavras, gerada no Mac com faster-whisper 1.1.1, modelo medium, idioma pt, num ambiente virtual em `tmp-migracao/whisper-venv` (nada no `package.json`; o áudio foi decodificado no script porque o PyAV novo não aceita um parâmetro do faster-whisper). Palavras de baixa confiança em `legenda-ptbr-revisao.json`. Vídeo baixado do Storage público para `docs/dados-privados/video/video-quem-somos.mp4`.
- **Para revisão humana na legenda:** "A BTE" e "BTE" (deve ser ABTE, em todo o texto); "buidato" (cuidado); "hortesistas" (ortesistas); "convinticado" (provavelmente "com indicação"); "assenso" (acesso); "Mude a Curva" (nome do projeto); "encontro tratando escoliose" (nome do encontro, maiúsculas); "Triagem Nacional de Escoliose"; "A realidade é o princípio" (provavelmente "A evidência"); trechos com palavra faltando: "pressupõe entre as diferentes áreas", "Somos uma associação por diferentes profissionais", "em torno de um comum"; "ultrapasse" (ultrapassa); "tornou -se" e "pós -operatório" (espaço a mais antes do hífen).
- **CORS:** o `gcloud` não está instalado nesta máquina; nada foi aplicado. `docs/infra/cors.json` libera `https://abte-lovat.vercel.app` e `http://localhost:3000`, métodos POST, PUT e DELETE. Comando pronto (para quem tem o `gcloud` autenticado com acesso ao `abte-dev`): `gcloud storage buckets update gs://abte-dev.firebasestorage.app --cors-file=docs/infra/cors.json` e, para conferir, `gcloud storage buckets describe gs://abte-dev.firebasestorage.app --format="default(cors_config)"`.
- **Achado para antes de publicar a legenda:** o Storage hoje não devolve `Access-Control-Allow-Origin` (conferido com uma requisição pública do vídeo), e o `<video>` do site não tem `crossorigin`. Navegadores bloqueiam `<track>` de outro domínio nessas condições, então a legenda provavelmente não apareceria. Será preciso incluir GET no `cors.json` (para as origens do site) e `crossOrigin="anonymous"` no `VideoVertical`, e conferir no navegador. Não feito: J é só levantamento.

**K. Fotos do Scoliosis Day** (projeto `scoliosisday-9ebd4`, só leitura pela mesma consulta pública que o site do evento faz; nada alterado lá). 4 edições publicadas: 41 fotos de galeria (2820 x 1880 a 6000 x 4000) e 9 imagens de banner com o degradê do evento (640 x 960 a 1920 x 1080), 50 no total, baixadas em resolução original para `docs/dados-privados/fotos-scoliosis-day/` (fora do Git), com `indice.json` e a folha de contato `folha-de-contato.html` (miniaturas numeradas, resolução, proporção e a vaga sugerida). Fotos de grupo: 12 e 32 (grupos grandes), 3, 19, 30, 31 e 36 (3 a 5 pessoas no palco ou na tribuna); quem é do grupo da ABTE ou da diretoria precisa ser confirmado pela ABTE (não houve identificação por rosto). Excluída das sugestões: 20 (o telão mostra costas nuas de pacientes com órtese, que podem ser crianças ou adolescentes). Fora das sugestões: os banners com degradê (5 a 7, 17, 18, 33 e 45 a 50). Nenhuma foto do evento mostra criança ou adolescente na plateia ou no palco, pelo que se vê.

**Próximo passo concreto:** aprovação do responsável para executar a D (com a decisão de um ou vários telefones), para corrigir o carregamento da legenda (CORS com GET e `crossOrigin`) e publicá-la depois da revisão, e para trocar as imagens da parte E pelas fotos escolhidas (com a autorização de uso de imagem).


## Auditoria de código de 06/11/2026 — Codex

O pedido atual foi revisar o projeto pelo código fonte, sem Claude Chrome, corrigir anomalias e entregar relatório. Ver `docs/AUDITORIA_2026-11-06.md` para escopo, histórico, correções e riscos. Os números e estados de produção registrados acima continuam históricos: não houve consulta nem gravação em dados reais nesta auditoria.

- Preservado o trabalho local ainda sem commit de telefones dos profissionais; importação não executada.
- Next.js e eslint-config-next atualizados de 16.3.6 para 16.4.5; lockfile e instalação limpa verificados. Nenhum alerta crítico permanece no npm audit, mas restam 42 pacotes com alertas (13 nas dependências de produção).
- Corrigidos tipagem/teste de telefones, duplicação sem tópicos, continuidade de ações em lote, regras de tópicos nas ações genéricas, confirmação de exclusão e concorrência da lixeira em posts/artigos. Listas e detalhes públicos agora excluem explicitamente itens da lixeira.
- Desfazer telefones passou a conferir o documento na transação; teste reproduz a preservação de edição concorrente.
- Contato deixou de anunciar entrega inexistente; envio real continua pendente. Player/CORS de legendas ajustados no código; configuração do bucket não aplicada.
- Resolvidos os cinco erros antigos de Stylelint e duas referências a cores inexistentes no detalhe do blog.
- Validação isolada: TypeScript aprovado; ESLint 0 erros/3 avisos de imagens; Stylelint 0 erros; 477 testes de unidade + 207 de integração/sessão + 118 de regras = 802 aprovados. Build 16.4.5 aprovado, 32 páginas estáticas, sem credenciais reais.
- Próximo trabalho: dependências restantes, recuperação de falha parcial na exclusão de conta, validação editorial no servidor e integração de contato. Conferências de produção e publicação são etapas separadas.

## Promoção e telefones (07/11/2026)

- **Promoção para a produção** (pedido do responsável: "Faça deploy agora!"): fast-forward de `70e11ab` para `bc0af2f` na `main` e na `feature/midia-upload` (deployment de Produção `7621549553`, sucesso) e depois para `f3e4bd9` (deployment `7621613550`, sucesso). Entraram as partes de 06/11 (home centralizada, parceiros, Missão, H, I, L), as correções da auditoria de 06/11 (outra sessão; Next.js 16.4.5, tokens de `Botao` e `Modal`, CORS com GET e HEAD no arquivo, `crossOrigin` no vídeo só com legenda; relatório em `docs/AUDITORIA_2026-11-06.md`) e os telefones. Antes do push, os commits locais com nomes de profissionais no mapa e um caminho da máquina no relatório da auditoria foram reescritos (só local, nunca enviados); varredura de `70e11ab..f3e4bd9`: 0 nomes de profissionais, 0 e-mails reais, 0 chaves, 0 caminhos da máquina, 0 arquivos privados.
- **Validação antes do push**, com tudo junto: typecheck e build passam; lint 0 erros e 4 avisos; lint:css 0 erros (a auditoria tirou os 5 conhecidos); `test:unidade` 477, `test:sessao` 211, `test:regras` 118.
- **Produção conferida** em 390 e 1280 px (home, `/profissionais`, `/blog`, `/loja`, `/diretoria`, `/contato`, `/doe`): 14 de 14 com status 200, um H1, sem rolagem lateral, 0 erros de console; Instagram novo da parte G; ponto atual do banner anunciado; `/admin` sem sessão leva ao login (307).
- **Telefones no `abte-dev`** (`npm run migracao:telefones`, execução `20261107-131039-c60b`): 6 cadastros do site antigo (9 números; 1 número inválido ficou de fora) e o fixo do cadastro do lote 1 passou do WhatsApp para Telefones. Os 2 fixos que o site antigo listava como WhatsApp (médicos) ficaram como estão: a regra passou a valer só para cadastros em lote. Repetir não grava nada; a produção mostra os 10 telefones com link `tel:`. Desfazer: `npm run migracao:telefones -- --desfazer --execucao=20261107-131039-c60b` (simula) e com `--executar --confirmo-projeto=abte-dev`.
- **Pendente:** legenda do vídeo (revisão do rascunho e publicação; o Storage ainda não manda CORS, então o arquivo precisa ir com o CORS aplicado no bucket ou ser servido pelo próprio site) e troca das fotos fictícias da home pelas do Scoliosis Day (decisão: "Faça parte dessa rede" com a foto 32 e os 2 banners com fotos do evento). Durante esta promoção, outra sessão fez o commit `a888581` (rodapé centralizado, pedido de 07/11), que entrou junto no último push: produção em `24065fd` (deployment `7621637230`, sucesso), conferida de novo (14 de 14 páginas; rodapé centralizado em 360 a 1710 px, sem rolagem lateral e sem erros); lint:css sem erros.

## Quatro correções visuais (08/11/2026)

Pedido do responsável, com as alterações feitas pelo assistente do projeto e aprovadas; validadas, com um commit para cada uma, e promovidas para a produção.

- **Rodapé** (`src/components/Rodape/Rodape.module.css`): a partir de 1024px, título, links, e-mail e "Siga nosso Instagram" à esquerda dentro de cada coluna (como em 10/10/2026); até 1023px, tudo centralizado (bloco `@media (max-width: 1023px)`). Logo e frase de direitos centralizados em todas as larguras. Supera o rodapé todo centralizado de 07/11/2026 no desktop.
- **Seletor "Estado" de `/profissionais`** (`ProfissionaisClient.tsx` e `page.module.css`): `appearance: none`, contorno de 1px em `--color-primary`, `var(--radius)`, fundo branco, mesma fonte e respiro das etiquetas de tipo (6px, como `.tag`), seta com o `IconeSeta` por cima do campo e sem clique, foco com `--focus-ring` e 44px até 767px. `?uf=` e `?pais=` como antes.
- **Menu do desktop** (`MenuDesktop.module.css`): pílula do hover com 12px (1,5 x `--space-8`) além da caixa da fonte (1em) nos quatro lados. Em "Profissionais", a pílula fica no `.grupo` e cobre texto e seta (o link do grupo não desenha a dele): aparece no hover só com mouse, com o foco de teclado e com o submenu aberto.
- **Estatísticas da home** (`Estatisticas.module.css`): número com `flex: 1`, centralizado no espaço livre acima do rótulo, e `--font-weight-bold` (400).
- **Navegador** (build de produção local lendo o `abte-dev`; Chrome headless e WebKit 18.2 do Playwright, instalado só na pasta temporária da sessão, fora do projeto), em 360, 390, 768, 1023, 1024, 1280 e 1710 px, home e `/profissionais`: rodapé com desvio 0px (centro até 1023, borda esquerda da coluna a partir de 1024), logo e direitos a 0px do centro; seletor com a mesma altura das etiquetas (44px até 767px; de 34,4 a 36,4px acima; no WebKit o seletor fica de 0,4 a 0,9px mais alto que a etiqueta a partir de 768px, diferença abaixo de 1px), seta dentro do campo e no meio da altura, foco pelo Tab com o anel, troca pelo teclado e pela lista, `?tag=` mantido junto com `?uf=` e `?pais=`; pílula do menu com 12/12/12/12px nos quatro itens, a cerca de 52px das bordas do header branco, hover sem mover os vizinhos, uma pílula só no grupo; submenu abre e fecha com o mouse, com o toque (primeiro toque abre, segundo segue o link), com Enter e Espaço (alternam; o foco na seta já abre, como antes) e com Esc (o foco volta à seta); números a no máximo 1px do centro do espaço livre, peso 400; sem rolagem lateral e 0 erros de console. Capturas em `tmp-migracao/capturas/correcoes-0811/` (fora do Git).
- **"1 Issue" do servidor de desenvolvimento:** aviso de hidratação do React em `/profissionais` ("A tree hydrated but some attributes ... didn't match"): a grade de cards (`Revelar`, `data-revelar`) chega ao React já com `data-visivel=""`, posto pelo observador de revelação antes da hidratação. Não vem destas correções (a grade não foi mexida) e não aparece no build de produção (0 erros de console). Não corrigido. No mesmo log, só avisos antigos do `next/image` (carregador sem `width` e imagem de LCP sem `loading="eager"`).
- **Verificações:** typecheck e build passam; lint 0 erros e 4 avisos; lint:css 0 erros; `test:unidade` 477.
- **Publicação das quatro correções (08/11/2026):** commits `3e81d4d` (rodapé), `65f6938` (seletor de estado), `4174374` (menu) e `376c4f3` (estatísticas e este registro); push da `feature/midia-upload` e fast-forward da `main` de `502d646` para `376c4f3`, sem force. Deployment de Produção `7631511990` com sucesso. Produção conferida em 390 e 1280 px (home e `/profissionais`, Chrome e WebKit): status 200, rodapé centralizado em 390 e à esquerda nas colunas em 1280 (desvio 0px; logo e direitos no centro), seletor com a altura das etiquetas (44px em 390), `?tag=` mantido com `?uf=` e `?pais=`, pílula do menu 12/12/12/12px, toque no menu (primeiro toque abre, segundo segue o link), números das estatísticas no centro e peso 400, sem rolagem lateral e 0 erros de console.

## Reforma visual da loja (08/11/2026, só local, sem push)

Pedido do responsável: lista `/loja` e página do produto no molde de loja virtual (hierarquia de imagem inteira, preço em destaque, título curto e caixa de compra separada), só com os tokens e a identidade da ABTE. Nenhum dado, regra, rota, ação de servidor ou fluxo mudou; pagamento continua desativado. Três commits locais, um por parte, para conferir no localhost antes de promover.

- **Parte 1, card de produto** (`CardProduto`, `PrecoProduto`; vale na lista, nos relacionados e em "Produtos em destaque" da home): o card inteiro é um único link (sem link dentro de link); cartão branco com `var(--radius)`, sem borda; imagem 1:1 com `object-fit: contain` sobre branco e respiro de `--space-16` (produto inteiro, sem recorte); selo no canto superior esquerdo (`--font-size-small`, `--color-primary`, `--color-on-primary`); preço antigo riscado (`--font-size-small`, `--color-placeholder`), preço atual (`--font-size-text-xl`, `--font-weight-bold`) e, na mesma linha, o desconto calculado dos dois preços ("20% OFF", `--color-success`, função pura `percentualDeDesconto` em `lib/produtos.ts`, com 3 testes); nome em `--font-size-text`, no máximo 2 linhas com reticências (no HTML o nome vem antes do preço, para o leitor de tela anunciar o link pelo nome; a ordem visual vem do CSS); linha pequena "Produto digital" e "Esgotado". Hover: a elevação de card do site, só com mouse; foco: `--focus-ring` no card inteiro. O card recebeu o campo `digital`.
- **Parte 2, lista `/loja`:** cabeçalho igual (`CabecalhoDePagina`). A partir de 1024px, coluna de filtros de 260px (`calc(var(--space-20) * 13)`) num único painel branco (raio e `--panel-padding`), título "Filtros" em `--font-size-text-xl`; os grupos deixaram de ser cartões e ficam separados só por espaço (Busca, Categoria, Tipo, Disponibilidade, Preço e Ofertas continuam todos, com as contagens à direita). Busca branca com contorno de 1px em `--color-primary`. Barra acima da grade: "N produtos" à esquerda e, à direita, os links da loja e "Ordenar por" no padrão do seletor de estado de `/profissionais` (sem aparência nativa, contorno de 1px, fundo branco, raio, `IconeSeta`, 44px até 767px). Grade nova `grade-da-loja` (globals.css): 4 colunas a partir de 1280px, 3 de 1024 a 1279px e 2 até 1023px (também no celular), com `--gutter`; o design-system.md (seção 9) não define a grade da lista com filtros, então valeu o pedido; o 1279px é um breakpoint fora dos dois do design (767 e 1023px). Até 1023px, o painel de filtros continua o mesmo diálogo, agora branco, aberto por um botão "Filtros" na barra (com a quantidade de filtros ativos), no lugar do botão flutuante, que cobria os cards. **Menu flutuante "⋮" (`MenuDaLoja`) removido:** no lugar, links discretos (`LinksDaLoja`, com as mesmas opções de `opcoesDoMenuDaLoja`: Carrinho com a quantidade e Entrar ou Minha conta, mais Produtos fora da lista e do produto), na barra da lista, no topo da página do produto e no topo do carrinho, da conta, de entrar, do cadastro e de recuperar a senha. Saíram também a reserva de espaço dos flutuantes no rodapé (`LayoutPublico`) e a variável `--fab-distancia`. Nenhum elemento fixo sobra nas páginas da loja.
- **Parte 3, página do produto:** topo com "Voltar para a loja", a trilha "Loja > Categoria > Nome" (`--font-size-small`; a categoria leva a `/loja?categoria=<slug>`; separador só visual) e os links da loja. Painel branco com galeria, informações e caixa de compra: 3 colunas (45/30/25) a partir de 1024px, 2 no tablet (galeria à esquerda; informações e, abaixo, a caixa) e 1 no celular, sempre nessa ordem. Galeria: principal 1:1, inteira, sobre branco; miniaturas de 64px em coluna à esquerda (1024px ou mais) ou em linha abaixo, cada uma botão com "Ver imagem N de M", `aria-current` e contorno `--color-primary` na atual (antes: `aria-pressed` e o alt no nome); sem miniaturas com uma imagem só. Informações: selo, H1 em `--font-size-h3`, "Disponível · Produto físico", preço como no card com o atual em `--font-size-h2`, resumo com os 2 primeiros parágrafos da descrição cadastrada e "Ver descrição completa" (âncora `#descricao`, só quando há mais texto). Caixa de compra: contorno de 1px em `--color-surface-soft`, `--card-padding`, preço atual, disponibilidade e tipo, a mesma ação de antes (`AdicionarAoCarrinho` com o botão na largura da caixa e a quantidade com contorno; ou "Entre na sua conta da loja para adicionar ao carrinho"; ou o aviso de esgotado) e o aviso "Em breve" compacto (`--font-size-small`, caixa branca, texto sem mudança). Abaixo: "Descrição" (H2 em `--font-size-h3`), um parágrafo por linha, largura máxima de 704px (`calc(var(--space-64) * 11)`, cerca de 70 caracteres; não há token em ch); "Produtos relacionados" (H2 em `--font-size-h3`) com os cards novos na `grade-da-loja` (continuam até 3, regra `escolherRelacionados`).
- **Fora dos tokens:** só o respiro de 6px do seletor de ordem e do botão "Filtros" (o mesmo da etiqueta de tipo e do seletor de estado), o `translateY(-4px)` e a sombra da elevação de hover (copiados do card de antes) e a borda de 2px das miniaturas.
- **Navegador** (build de produção local lendo o `abte-dev`, Chrome e WebKit 18.2 do Playwright, em 360, 390, 768, 1023, 1024, 1280 e 1710 px; lista e 3 produtos: com selo, com promoção e digital, e com 5 imagens): status 200, um H1, sem rolagem lateral e 0 erros de console em todas; 2, 2, 2, 2, 3, 4 e 4 colunas; em todos os cards, imagem quadrada com `contain` e inteira dentro da caixa, preço visível dentro do card, nenhum link aninhado, nome em até 2 linhas e nada cobrindo o card (nenhum elemento fixo na página); ordem por menor preço (9,90; 19,90; 29,90; 39,99) e categoria pela coluna (a partir de 1024px) ou pelo painel (até 1023px: abre pelo botão com o foco dentro, Esc fecha e devolve o foco, "Filtrar" aplica), sempre pelo endereço, com a ordem mantida; busca vai para `?busca=`; página do produto em 3, 2 e 1 colunas como previsto; galeria por clique, Enter, Espaço (com o anel de foco) e toque; aviso "Em breve" igual. Entrar, cadastro, recuperar senha, carrinho e conta (sem sessão vão para entrar, como antes) com os links e a página atual marcada; home com os 4 cards novos; `/loja` sem JavaScript com o formulário visível e o filtro pela URL. **Não conferido:** o botão "Adicionar ao carrinho" com cliente logado (exigiria criar conta de cliente no `abte-dev`); o componente só mudou de estilo. Capturas antes e depois (lista e produto `kit-abte`, 1280 e 390 px, Chrome e WebKit) em `tmp-migracao/loja/` (fora do Git).
- **Verificações:** typecheck e build passam; lint 0 erros e 4 avisos; lint:css 0 erros; `test:unidade` 480 (3 novos); `test:sessao` 211.
- **Próximo passo:** o responsável confere no localhost; promover só com novo pedido.

## Entrega de 08/11/2026: legenda e contato

Branch `entrega/fotos-legenda-contato` (worktree próprio), sem push. Nenhuma mudança nas regras do Firestore ou do Storage, no CORS do bucket nem em `configuracoes/home`.

### Legenda do vídeo "Conheça a ABTE"

- **Revisão** (arquivo privado, fora do Git): `docs/dados-privados/video/legenda-ptbr-revisada.vtt`, 54 blocos de até 2 linhas (até 45 caracteres por linha), mesmos tempos do rascunho. Correções pedidas: "BTE" e "A BTE" viram "ABTE" (com "a ABTE", "Na ABTE" e "da ABTE" no meio da frase), "cuidado", "ortesistas", "tornou-se", "pós-operatório" (a palavra "pós" passou para o bloco seguinte, junto do resto) e "pós-cirúrgica", "Tratando Escoliose" e "Triagem Nacional de Escoliose". Trechos ouvidos de novo com o modelo large-v3 (faster-whisper, só aqueles tempos, com margem): "quando indicado" (1:52), "ultrapassa os limites de uma única especialidade" (2:00 a 2:05), "pressupõe comunicação entre as diferentes áreas" (2:15), "associação com diferentes profissionais" (2:36), "quando ultrapassa" (2:54), "pós-cirúrgica gratuita em parceria" (3:11), "em torno de um propósito comum, o de ampliar o acesso" (3:38 a 3:41) e "tratamento da escoliose" (0:34).
- **Ainda duvidoso:** 1:31, "A realidade é o princípio que norteia...": o large-v3 ouviu igual, com e sem o nome da ABTE no contexto; pelo sentido pode ser "A evidência", mas não foi trocado. Ver também a lista no relatório da entrega.
- **Servida pelo próprio site:** rota `src/app/api/legenda/[id]/route.ts` (Node), que aceita só o id da pasta (20 letras e números, `caminhoDaLegendaPeloId` em `src/lib/site/videoQuemSomos.ts`) e lê pelo Admin SDK só `publico/videos/{id}/legenda.vtt`, o caminho do envio do painel. Confere tipo `text/vtt`, até 200 KB e o início `WEBVTT`; devolve `text/vtt; charset=utf-8` com `Cache-Control: public, max-age=14400` (4 horas); o resto, 404 "Legenda não encontrada." (falha de leitura: 503, sem cache). A home aponta a faixa para `/api/legenda/{id}` (`enderecoDaLegenda`), e o `VideoVertical` deixou de usar `crossOrigin`: o vídeo do Storage carrega como mídia de outro domínio, e a faixa vem do mesmo domínio da página. Testes de unidade em `testes/unidade/legenda-do-video.test.mts`.
- **Arquivo no Storage do `abte-dev`:** `publico/videos/amGO6ClG9Xx5GGmfy601/legenda.vtt` (6154 bytes, `text/vtt`). **`legendaCaminho` NÃO foi preenchido**: preencher com esse caminho (pelo painel, ou gravando o campo) só depois que o código estiver em produção. Antes disso, a home de produção montaria a faixa pelo endereço direto do Storage, que o navegador recusa.
- **Validação:** typecheck e build passam; lint 0 erros e 3 avisos; lint:css 0 erros; `test:unidade` 484 de 484. Build de produção local (`next start`, porta 3120) lendo o `abte-dev`: rota com id inválido, inexistente ou com `../` dá 404; com o id acima dá 200, `text/vtt`, conteúdo igual ao arquivo. Chrome headless e WebKit (Playwright), em 390 e 1280 px: home com status 200, vídeo real tocando pelo play (readyState 4, sem atributo `crossorigin`), um vídeo do Storage sem `crossOrigin` com a faixa `/api/legenda/amGO6ClG9Xx5GGmfy601`: vídeo readyState 4, faixa readyState 2 com 54 cues, 0 erros de console.

### Formulário de contato funcionando

- **Envio:** o "Fale com a ABTE" (`BlocoContato`, na `/contato`) chama a ação de servidor pública `src/app/contato/acoes.ts`, que valida de novo (`validarMensagemDeContato` em `src/lib/contato.ts`: nome e sobrenome até 80, e-mail válido até 254 e gravado em minúsculas, assunto opcional até 150, mensagem obrigatória até 5000, consentimento obrigatório; espaços e caracteres de controle limpos) e grava em `mensagensDeContato` (`src/lib/gravacao/contato.ts`): `nome`, `sobrenome`, `email`, `assunto`, `mensagem`, `consentimento`, `criadoEm`, `lida` (false), `lidaEm` e `lidaPor` (null). O sucesso só aparece depois de gravar. Envio repetido: o mesmo e-mail há menos de 60 s é recusado ("Recebemos uma mensagem deste e-mail há menos de um minuto..."), conferido na mesma transação, com consulta só pelo e-mail (índice simples). Erros por campo e mensagens em caixa branca (`Mensagem`), foco no primeiro campo com erro ou no aviso. A mensagem passou a ser obrigatória, com limite no campo. Não existia campo-isca, e nenhum foi criado. E-mail automático: fica para depois.
- **Painel:** permissão nova `mensagens.ler` (só administrador) na tabela `PERMISSOES`; item "Mensagens" (ícone de envelope) no menu, só para o administrador, como "Configurações". `/admin/mensagens`: as mais recentes primeiro (até 200), contagem de não lidas, as não lidas com borda e a etiqueta "Não lida". `/admin/mensagens/[id]`: nome, e-mail (link `mailto:`), assunto, data em horário de Brasília, situação e o texto; "Marcar como lida" (`src/app/admin/acoes-mensagens.ts`, começa por `exigirPapelDoPainel("mensagens.ler")`) grava `lida`, `lidaEm` e `lidaPor` e uma linha em `logAlteracoes` (campo `lida`, sem o texto nem o e-mail). Abrir a mensagem não marca como lida. O editor que abre o endereço vê só a explicação.
- **Regras:** o curinga do `firestore.rules` já nega tudo; bloco novo em `testes/regras/firestore.test.mts` (visitante, logado sem papel, administrador e editor não leem, criam, alteram nem apagam).
- **Testes:** `testes/unidade/contato.test.mts` (10: validação, limites, envio repetido, data, permissão e a primeira linha das ações); `testes/sessao/mensagens-contato.test.mts` (projeto `demo-abte-contato`: sessão e papel, gravação com o intervalo, lista e marcar como lida com o registro). **Os testes de sessão e de regras foram escritos, mas NÃO rodados nesta entrega** (emuladores reservados para outra tarefa).
- **Validação:** typecheck e build passam; lint 0 erros e 3 avisos; lint:css 0 erros; `test:unidade` 494 de 494. Build local (porta 3120) no Chrome headless em 390 e 1280 px: `/contato` com status 200, um H1, formulário vazio com 5 erros e o foco no nome; sem a mensagem e com e-mail inválido, foco no e-mail e erros nos dois; campos e botão com 44 px em 390; sem rolagem lateral; 0 erros de console. Nenhuma mensagem foi enviada ao `abte-dev` (o envio de verdade fica coberto pelo teste de sessão). `/admin/mensagens` sem sessão leva ao login (307). As telas do painel não foram abertas com sessão no navegador.
- **Falta:** rodar `test:sessao` e `test:regras`; conferir as telas do painel com sessão; e-mail automático; a política de privacidade deve citar a guarda das mensagens de contato (texto da ABTE e da assessoria, sem nada inventado aqui).
