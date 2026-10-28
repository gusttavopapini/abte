# ABTE: resumo de continuidade para o Claude

**Atualizado em 28/10/2026.** Este documento reúne a visão do projeto, a auditoria e as entregas concluídas nesta colaboração. As informações de produção são da última conferência registrada em 28/10; confira eventuais mudanças posteriores antes de agir.

## 1. Pedido mais recente e forma de trabalho

O responsável pediu um resumo completo para **continuar o projeto no Claude**. Essa decisão substitui a preferência anterior de trabalhar exclusivamente pelo Codex. Não exigir o uso exclusivo de uma ferramenta por causa de instruções históricas.

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
| Último commit de implementação | `8aa4f16` |
| Último deployment de produção conferido | `7395076667` |
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
- Home com imagens/vídeo provisórios e números a confirmar; associação/doação e textos legais/consentimento definitivos pendentes.
- Exemplos continuam públicos; sua remoção não foi solicitada.

### Lançamento

- Há 131 propostas de redirects do Wix ainda sem aplicação.
- Noindex global e robots temporário continuam ativos. O site é acessível sem login, mas liberação de indexação é outra etapa.
- Faltam sitemap, metadados finais, preparação de domínio/ambientes, recuperação, operação e custos.
- Há pendências de acessibilidade anteriores, como pausa visível do carrossel e estado acessível do filtro de profissionais.

## 7. Git: atenção ao ponteiro local

Na conferência de preparação deste resumo:

- `HEAD`, `origin/main` e `origin/feature/midia-upload`: **`8aa4f16`**.
- Branch de trabalho: **`feature/midia-upload`**.
- `main` **local**: ainda `207c9b1`, 140 commits atrás da referência remota.
- Os três commits de implementação feitos nesta colaboração foram enviados para ambas as branches remotas, sem forçar histórico.
- Não há mudança de lógica pendente no diretório de trabalho. Há documentação local alterada/nova, incluindo este resumo, que ainda não foi commitada.

Não usar a `main` local antiga como se fosse a produção atual. Conferir o diff e preservar a documentação antes de trocar branch ou sincronizar. Nenhum reset, limpeza ou novo deploy é necessário apenas para ler este resumo.

A integração GitHub-Vercel publica `main`. A credencial local de acesso direto à API da Vercel retornou 403; as publicações foram concluídas pela integração GitHub existente, sem criar novas credenciais.

## 8. Onde encontrar a implementação recente

- Blog: `src/app/blog/page.tsx`, `page.module.css`, `src/lib/buscaBlog.ts` e `src/components/CardPost/`.
- Testes da busca: `testes/unidade/busca-blog.test.mts`.
- Profissionais: `src/components/CardProfissional/`, `src/components/Icones/Icones.tsx` e `src/styles/tokens.css`.
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

Os **487 testes** são a execução completa de **26/10**. Os seis testes da busca foram acrescentados em 28/10; houve uma execução pertinente de 23 testes nessa entrega, sem nova execução integral de todas as suítes. As compilações posteriores foram feitas em cópias isoladas com `--webpack`; isso não equivale a validar novamente o caminho padrão local com Turbopack.

As sete falhas históricas de Stylelint em Botao/Hero/Modal não foram corrigidas nesta colaboração. Os arquivos modificados nas entregas visuais passaram nas verificações específicas.

## 10. Convenções para preservar

- Consultar a documentação instalada do Next.js 16 em `node_modules/next/dist/docs/` antes de alterar as APIs relevantes.
- Manter CSS Modules, componentes próprios, tokens e ausência de kits de UI. Decisões de design de 25/10 e 28/10 superam parte dos documentos originais.
- Preservar o acesso ao Firebase pelo servidor, a checagem de sessão/papel e a separação de sessões loja/painel.
- Não exibir nem versionar `.env*`, chaves, tokens, dados pessoais ou arquivos privados da migração. Credenciais existentes não devem ser sobrescritas durante a retomada.
- Não inventar dados institucionais, Pix, contatos, textos legais finais, autoria ou conclusões científicas.
- Não considerar o projeto finalizado apenas porque todas as publicações cadastradas estão visíveis.

**Próxima frente técnica sugerida:** estabilizar contato e exclusão de conta; depois completar a operação do painel e fechar conteúdo/lançamento. O próximo pedido do responsável determina o trabalho a executar.
