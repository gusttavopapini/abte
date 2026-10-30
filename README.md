# Site da ABTE

Site e painel da ABTE, Associação Brasileira de Tratamento da Escoliose, em Next.js e Firebase.

## Contexto e continuidade

Em 30/10/2026, o responsável pediu novo mapeamento e retomada neste chat do Codex. Comece pelo mapa atual, preservando o trabalho existente e considerando as datas dos registros históricos.

- [Mapeamento atual](docs/MAPEAMENTO_ATUAL.md): referência de 30/10 para implementação, produção, testes, pendências e continuidade.
- [Resumo histórico de continuidade para o Claude](docs/CONTINUIDADE_CLAUDE.md): transferência anterior; contém trechos superados pelo mapa atual.
- [AGENTS.md](AGENTS.md): instruções de trabalho do repositório.
- [Contexto do projeto para o Codex](docs/CONTEXTO_CODEX.md): objetivo, arquitetura, estado verificado, pendências e próximos passos.
- [CLAUDE.md](CLAUDE.md): histórico detalhado das etapas e decisões. Considere as datas dos registros; o nome do arquivo não exige outro assistente.

O projeto tem site público, painel responsivo, biblioteca de mídia, home e páginas institucionais editáveis, configurações de Artigos/Pix, loja com filtros, conta e carrinho. A migração principal já foi executada. A conferência pública de 30/10 encontrou 71 posts, cinco artigos e nove produtos nas listagens; páginas legais ainda não publicadas retornam 404. Revisão editorial, estabilização e lançamento continuam pendentes. Pagamento online permanece fora do escopo registrado. Há cinco commits de implementação locais após a produção `dfe8d8d`; consulte o mapa antes de promover.

## Desenvolvimento

Requisitos: Node.js 22.18 ou superior; Java para os testes com emuladores Firebase.

Para rodar localmente:

1. `npm install`
2. Copie `.env.example` para `.env.local` e preencha (veja as instruções no próprio arquivo). O `.env.local` nunca vai para o Git.
3. `npm run dev` e abra http://localhost:3000

Para conferir o código:

- `npm run typecheck`, `npm run lint` e `npm run lint:css`
- `npm run test:unidade` (testes rápidos, sem emulador)
- `npm run test:regras` (regras do Firestore e do Storage nos emuladores; exige Java)
- `npm run test:sessao` (sessões, gravações e migração nos emuladores)
- `npm run build` (compilação de produção)

As credenciais e os dados privados da migração ficam fora do Git. Os testes de integração usam projetos demonstrativos; confira o ambiente antes de executar comandos que gravem ou publiquem dados.
