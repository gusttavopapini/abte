// Papéis do painel, gravados como custom claim "papel" no Firebase Authentication.
// Este arquivo não tem segredos nem imports: pode ser usado no servidor, em
// scripts e nos testes de unidade.
export const PAPEIS_DO_PAINEL = ["administrador", "editor"] as const;

export type PapelDoPainel = (typeof PAPEIS_DO_PAINEL)[number];

export function ehPapelDoPainel(valor: unknown): valor is PapelDoPainel {
  return typeof valor === "string" && (PAPEIS_DO_PAINEL as readonly string[]).includes(valor);
}

export type DecisaoDeAcesso =
  | { permitido: true; papel: PapelDoPainel }
  | { permitido: false; motivo: "sem-sessao" | "sem-papel" };

// Decide se uma sessão pode usar o painel. Falha fechada: sem sessão, sem
// papel ou com qualquer valor que não seja um papel conhecido, o acesso é
// negado. Administrador e editor passam (ainda não há área exclusiva).
export function decidirAcessoAoPainel(sessao: { papel?: unknown } | null): DecisaoDeAcesso {
  if (!sessao) return { permitido: false, motivo: "sem-sessao" };
  if (!ehPapelDoPainel(sessao.papel)) return { permitido: false, motivo: "sem-papel" };
  return { permitido: true, papel: sessao.papel };
}
