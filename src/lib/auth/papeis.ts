// Papéis do painel, gravados como custom claim "papel" no Firebase Authentication.
// Este arquivo não tem segredos nem imports: pode ser usado no servidor, em
// scripts e nos testes de unidade.
export const PAPEIS_DO_PAINEL = ["administrador", "editor"] as const;

export type PapelDoPainel = (typeof PAPEIS_DO_PAINEL)[number];

export function ehPapelDoPainel(valor: unknown): valor is PapelDoPainel {
  return typeof valor === "string" && (PAPEIS_DO_PAINEL as readonly string[]).includes(valor);
}

// Ações do painel que nem todo papel pode executar. Ponto ÚNICO das permissões
// por papel: para mudar quem pode o quê, mude só a tabela PERMISSOES.
export type AcaoDoPainel =
  | "midia.enviar"
  | "midia.editar"
  | "midia.excluir"
  | "midia.restaurar"
  | "midia.excluirDeVez"
  | "home.editar"
  | "configuracoes.editar"
  | "paginas.editar"
  // Conteúdo (posts, artigos, profissionais, produtos, tópicos e banners),
  // 04/11/2026: criar, editar e duplicar; publicar e despublicar (ou ativar
  // e desativar); mover para a lixeira; restaurar; excluir de vez.
  | "conteudo.editar"
  | "conteudo.publicar"
  | "conteudo.excluir"
  | "conteudo.restaurar"
  | "conteudo.excluirDeVez"
  // Últimas alterações do registro na visão geral (04/11/2026).
  | "registro.ver"
  // Pedidos da loja e frete fixo (08/11/2026, pagamento pela Stripe).
  | "pedidos.ver"
  | "pedidos.editar"
  | "loja.configurar";

// PROVISÓRIO (pendência P7 no CLAUDE.md, depende da diretoria): administrador
// e editor enviam, editam, excluem para a lixeira e restauram mídia; só o
// administrador exclui de vez.
const PERMISSOES: Record<AcaoDoPainel, readonly PapelDoPainel[]> = {
  "midia.enviar": ["administrador", "editor"],
  "midia.editar": ["administrador", "editor"],
  "midia.excluir": ["administrador", "editor"],
  "midia.restaurar": ["administrador", "editor"],
  "midia.excluirDeVez": ["administrador"],
  // Imagens e banners da home (29/10/2026, /admin/home).
  "home.editar": ["administrador", "editor"],
  // Configurações do site (Artigos no site e Pix), 30/10/2026: só administrador.
  "configuracoes.editar": ["administrador"],
  // Páginas institucionais (acessibilidade, privacidade e termos), 30/10/2026:
  // só administrador.
  "paginas.editar": ["administrador"],
  // Conteúdo (decisão do responsável de 04/11/2026): o editor faz tudo,
  // menos excluir de vez, que fica só com o administrador, sem exceção.
  "conteudo.editar": ["administrador", "editor"],
  "conteudo.publicar": ["administrador", "editor"],
  "conteudo.excluir": ["administrador", "editor"],
  "conteudo.restaurar": ["administrador", "editor"],
  "conteudo.excluirDeVez": ["administrador"],
  "registro.ver": ["administrador", "editor"],
  // Pedidos (ver, marcar como enviado ou entregue) e frete fixo da loja,
  // 08/11/2026: só administrador.
  "pedidos.ver": ["administrador"],
  "pedidos.editar": ["administrador"],
  "loja.configurar": ["administrador"],
};

export function papelPodeExecutar(papel: PapelDoPainel, acao: AcaoDoPainel): boolean {
  return PERMISSOES[acao].includes(papel);
}

type DecisaoDeAcesso =
  | { permitido: true; papel: PapelDoPainel }
  | { permitido: false; motivo: "sem-sessao" | "sem-papel" | "sem-permissao" };

// Decide se uma sessão pode usar o painel e, se for informada, executar uma
// ação. Falha fechada: sem sessão, sem papel, com qualquer valor que não seja
// um papel conhecido ou com papel que não pode executar a ação, o acesso é
// negado. Sem ação, administrador e editor passam.
export function decidirAcessoAoPainel(sessao: { papel?: unknown } | null, acao?: AcaoDoPainel): DecisaoDeAcesso {
  if (!sessao) return { permitido: false, motivo: "sem-sessao" };
  if (!ehPapelDoPainel(sessao.papel)) return { permitido: false, motivo: "sem-papel" };
  if (acao && !papelPodeExecutar(sessao.papel, acao)) return { permitido: false, motivo: "sem-permissao" };
  return { permitido: true, papel: sessao.papel };
}
