// Constantes da sessão, sem segredos: usadas no servidor e no proxy.

// "__session" é o único nome de cookie repassado pelo Firebase Hosting ao
// servidor; usar esse nome evita problema se a hospedagem for o Firebase.
export const NOME_COOKIE_SESSAO = "__session";

// Validade da sessão do painel: 5 dias (PROPOSTA).
export const VALIDADE_SESSAO_MS = 5 * 24 * 60 * 60 * 1000;

export const ROTA_LOGIN = "/admin/entrar";

// Sessão de cliente da loja: cookie separado do painel, com nome e caminho
// próprios (o navegador só o envia para /loja e rotas filhas). Mesmas flags de
// segurança do painel. Atenção: no Firebase Hosting clássico só o cookie
// "__session" chega ao servidor; se essa for a hospedagem, este cookie terá de
// se chamar "__session" com caminho /loja (pendência no CLAUDE.md).
export const NOME_COOKIE_CLIENTE = "abte_cliente";
export const CAMINHO_COOKIE_CLIENTE = "/loja";
export const VALIDADE_SESSAO_CLIENTE_MS = 5 * 24 * 60 * 60 * 1000;
export const ROTA_ENTRAR_LOJA = "/loja/entrar";
