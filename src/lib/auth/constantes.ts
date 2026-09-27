// Constantes da sessão, sem segredos: usadas no servidor e no proxy.

// "__session" é o único nome de cookie repassado pelo Firebase Hosting ao
// servidor; usar esse nome evita problema se a hospedagem for o Firebase.
export const NOME_COOKIE_SESSAO = "__session";

// Validade da sessão do painel: 5 dias (PROPOSTA).
export const VALIDADE_SESSAO_MS = 5 * 24 * 60 * 60 * 1000;

export const ROTA_LOGIN = "/admin/entrar";
